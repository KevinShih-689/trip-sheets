/**
 * 店家清單 tab → data/stores.json(spec §2.2)
 *
 * IO + CLI wrapper only. Header resolution, merging and validation live in
 * `lib/parse-stores.ts` (pure, unit-tested).
 *
 * 只需要環境變數 SHEET_ID。Sheets、Places、Geocoding 一律以 ADC 取得的短期
 * token 呼叫;CI 的憑證來自 Workload Identity Federation,沒有任何長期金鑰。
 */
import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { google } from 'googleapis';
import { z } from 'zod';
import { STORES_TAB } from '../lib/constants';
import { geocodeUrl, parseGeocodeResponse } from '../lib/geocode';
import {
  SheetSchemaError,
  buildStoresFile,
  parseStoreRows,
  planCalls,
  storeCacheKey,
  storeSearchQuery,
  type CallPlan,
  type PlaceResult,
  type Row,
  type StoreRow,
} from '../lib/parse-stores';
import type { LatLng } from '../lib/types';

const CACHE_PATH = join(process.cwd(), '.cache', 'stores-cache.json');
const TRIP_DATA_PATH = join(process.cwd(), 'data', 'trip-data.json');
const OUT_PATH = join(process.cwd(), 'data', 'stores.json');

/**
 * 單次執行允許的 Places 呼叫上限,超過即中止。預設值對齊建議的 GCP 每日配額
 * (見 doc/setup-sop.md Part E2),用意是在撞到 Google 的配額之前先自己停下來。
 * 清單成長時以環境變數 MAX_PLACE_CALLS 覆寫。
 */
const DEFAULT_MAX_PLACE_CALLS = 400;

/** Pro 級欄位;刻意不含 rating(Enterprise 級,spec §2.2 已決議不取) */
const PLACE_FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.googleMapsUri',
].join(',');

function fail(message: string): never {
  console.error(`\n[fetch-stores] FAILED: ${message}`);
  process.exit(1);
}

const cacheSchema = z.object({
  places: z.record(
    z.string(),
    z.object({
      displayName: z.string(),
      formattedAddress: z.string(),
      lat: z.number(),
      lng: z.number(),
      types: z.array(z.string()),
      mapsUri: z.string(),
    }),
  ),
  areas: z.record(z.string(), z.object({ lat: z.number(), lng: z.number() })),
});
type Cache = z.infer<typeof cacheSchema>;

function readCache(): Cache {
  if (!existsSync(CACHE_PATH)) return { places: {}, areas: {} };
  const parsed = cacheSchema.safeParse(JSON.parse(readFileSync(CACHE_PATH, 'utf-8')));
  if (!parsed.success) {
    console.warn('[fetch-stores] 快取格式不符,忽略後全量重查');
    return { places: {}, areas: {} };
  }
  return parsed.data;
}

function writeCache(cache: Cache): void {
  mkdirSync(join(process.cwd(), '.cache'), { recursive: true });
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8');
}

/**
 * 把預估用量印到 log,並在 CI 上寫進 job summary(GitHub 的執行頁面直接看得到,
 * 不必展開 log)。
 */
function reportPlan(plan: CallPlan, storeCount: number): void {
  console.log(
    `[fetch-stores] 預計呼叫:${plan.places} 次 Places / ${plan.geocoding} 次 Geocoding` +
      `(清單共 ${storeCount} 家,其餘由快取供應)`,
  );

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(
    summaryPath,
    [
      '### 店家反查預估用量',
      '',
      '| 項目 | 次數 |',
      '| --- | ---: |',
      `| 清單店家總數 | ${storeCount} |`,
      `| 預計 Places Text Search 呼叫 | **${plan.places}** |`,
      `| 預計 Geocoding 呼叫 | ${plan.geocoding} |`,
      '',
      plan.places === 0
        ? '快取全數命中,這次部署不會呼叫任何計費 API。'
        : `${plan.places} 家未命中快取,將實際呼叫 Places API。`,
      '',
    ].join('\n'),
    'utf-8',
  );
}

/** 各日主要區域(trip-data.json 的 B2),決定 areaCenters 與 Text Search 的 location bias */
function readAreaNames(): string[] {
  if (!existsSync(TRIP_DATA_PATH)) {
    fail(`找不到 ${TRIP_DATA_PATH},請先執行 pnpm fetch-sheet`);
  }
  const schema = z.object({ days: z.array(z.object({ mainArea: z.string() })) });
  const parsed = schema.safeParse(JSON.parse(readFileSync(TRIP_DATA_PATH, 'utf-8')));
  if (!parsed.success) fail('trip-data.json 結構不符,無法取出各日區域');
  return [...new Set(parsed.data.days.map((d) => d.mainArea).filter((a) => a !== ''))];
}

async function geocodeArea(area: string, accessToken: string): Promise<LatLng | null> {
  const res = await fetch(geocodeUrl(area), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const detail = await res.text();
    fail(`Geocoding API HTTP ${res.status}(區域「${area}」):${detail.slice(0, 300)}`);
  }
  return parseGeocodeResponse(await res.json());
}

/** 以所有區域中心的外接矩形(加緩衝)當作 Text Search 的 location bias */
function boundsOf(centers: readonly LatLng[]): {
  low: { latitude: number; longitude: number };
  high: { latitude: number; longitude: number };
} | null {
  if (centers.length === 0) return null;
  const pad = 0.5; // 約 55km,足以涵蓋單一旅程的活動範圍
  const lats = centers.map((c) => c.lat);
  const lngs = centers.map((c) => c.lng);
  return {
    low: { latitude: Math.min(...lats) - pad, longitude: Math.min(...lngs) - pad },
    high: { latitude: Math.max(...lats) + pad, longitude: Math.max(...lngs) + pad },
  };
}

async function searchPlace(
  row: StoreRow,
  accessToken: string,
  bias: ReturnType<typeof boundsOf>,
): Promise<PlaceResult | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // OAuth 短期 token 取代 API 金鑰;FieldMask 不變 —— 它決定計費層級(Pro),
      // 與驗證方式無關。
      Authorization: `Bearer ${accessToken}`,
      'X-Goog-FieldMask': PLACE_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: storeSearchQuery(row),
      languageCode: 'zh-TW',
      maxResultCount: 1,
      ...(bias ? { locationBias: { rectangle: bias } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    fail(`Places API HTTP ${res.status}(店家「${row.name}」):${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      types?: string[];
      googleMapsUri?: string;
    }[];
  };
  const place = body.places?.[0];
  const lat = place?.location?.latitude;
  const lng = place?.location?.longitude;
  if (!place || typeof lat !== 'number' || typeof lng !== 'number') return null;

  return {
    displayName: place.displayName?.text ?? '',
    formattedAddress: place.formattedAddress ?? '',
    lat,
    lng,
    types: place.types ?? [],
    mapsUri: place.googleMapsUri ?? '',
  };
}

/**
 * ADC 找不到憑證時丟出的原始訊息對人沒有任何指引,換成這個專案實際的兩條路。
 */
function explain(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('Could not load the default credentials')) return message;
  return (
    '找不到 Google 憑證(本機不再保留服務帳戶私鑰)。\n' +
    '  → 本機開發:改用 `pnpm fetch-stores:sample`\n' +
    '  → 取得真實資料:在 GitHub 手動觸發 auth-check workflow'
  );
}

async function main(): Promise<void> {
  const sheetId = process.env.SHEET_ID;
  // 預檢模式:只讀試算表與快取算出預估用量,不呼叫任何計費 API
  const dryRun = process.argv.includes('--dry-run');

  if (!sheetId) fail('缺少環境變數 SHEET_ID');

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  // Maps 與 Sheets 各自一個 client:Workspace 與 Cloud 的 scope 分開要求,
  // 避免混在同一個 token 產生非預期的授權範圍。
  const mapsAuth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const metaRes = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets.properties.title',
  });
  const tabNames = (metaRes.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => typeof t === 'string');
  if (!tabNames.includes(STORES_TAB)) fail(`Sheet 中找不到「${STORES_TAB}」tab(見 spec §2.1)`);

  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${STORES_TAB}'!A1:F500`,
  });

  let rows: StoreRow[];
  try {
    rows = parseStoreRows(STORES_TAB, (valuesRes.data.values ?? []) as Row[]);
  } catch (err) {
    if (err instanceof SheetSchemaError) fail(err.message);
    throw err;
  }
  console.log(`[fetch-stores] 「${STORES_TAB}」讀到 ${rows.length} 家店`);

  const cache = readCache();
  const areaNames = readAreaNames();

  // 預檢:先算出這次要花多少額度,超過上限就在「還沒花錢」的狀態下中止。
  // 撞到 Google 的每日配額是最糟的失敗方式 —— 那時已經打掉大半清單,而快取要等
  // 迴圈全部跑完才寫入,等於白花;下次重跑又從頭來一次。
  const plan = planCalls(rows, areaNames, cache);
  reportPlan(plan, rows.length);

  const maxPlaceCalls = Number(process.env.MAX_PLACE_CALLS ?? DEFAULT_MAX_PLACE_CALLS);
  if (!Number.isFinite(maxPlaceCalls) || maxPlaceCalls <= 0) {
    fail(`MAX_PLACE_CALLS 必須是正整數,收到「${process.env.MAX_PLACE_CALLS}」`);
  }
  if (plan.places > maxPlaceCalls) {
    fail(
      `預計呼叫 ${plan.places} 次 Places,超過上限 ${maxPlaceCalls} 次,已中止(尚未產生任何費用)。\n` +
        '  → 快取可能遺失,請確認 actions/cache 是否命中;\n' +
        '  → 若清單確實變長了,請先調高 GCP 的每日配額,再調高 MAX_PLACE_CALLS。',
    );
  }

  if (dryRun) {
    console.log('[fetch-stores] 預檢通過(--dry-run,未呼叫任何計費 API)');
    return;
  }
  // 預檢通過之後才取 token —— dry-run 連憑證都不需要
  const mapsToken = await mapsAuth.getAccessToken();
  if (!mapsToken) fail('無法取得 Maps API 的存取權杖(檢查服務帳戶權限)');

  // 1) 區域中心
  const areaCenters: Record<string, LatLng> = {};
  let geocodeCalls = 0;
  for (const area of areaNames) {
    const hit = cache.areas[area];
    if (hit) {
      areaCenters[area] = hit;
      continue;
    }
    const center = await geocodeArea(area, mapsToken);
    geocodeCalls += 1;
    if (center) {
      areaCenters[area] = center;
      cache.areas[area] = center;
    } else {
      console.warn(`[fetch-stores] 區域「${area}」geocode 無結果,該日將無區域中心`);
    }
  }

  // 2) 店家反查(快取命中即跳過)
  const bias = boundsOf(Object.values(areaCenters));
  const resolved = new Map<string, PlaceResult>();
  let placeCalls = 0;
  for (const row of rows) {
    const key = storeCacheKey(row);
    const hit = cache.places[key];
    if (hit) {
      resolved.set(key, hit);
      continue;
    }
    const place = await searchPlace(row, mapsToken, bias);
    placeCalls += 1;
    if (place) {
      resolved.set(key, place);
      cache.places[key] = { ...place, types: [...place.types] };
    }
  }

  writeCache(cache);

  let built;
  try {
    built = buildStoresFile({
      rows,
      resolved,
      areaCenters,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof SheetSchemaError) fail(err.message);
    throw err;
  }

  if (built.unresolved.length > 0) {
    console.warn(
      `[fetch-stores] ${built.unresolved.length} 家店反查不到,已略過:${built.unresolved.join('、')}\n` +
        '  → 於「店家清單」tab 的「地址覆寫」欄填入正確地址可修正',
    );
  }

  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(built.file, null, 2)}\n`, 'utf-8');
  console.log(
    `[fetch-stores] OK → ${OUT_PATH}(${built.file.stores.length} 家店、` +
      `${Object.keys(areaCenters).length} 個區域中心;API 呼叫 ${placeCalls} 次 Places / ${geocodeCalls} 次 Geocoding)`,
  );
}

main().catch((err: unknown) => {
  fail(explain(err));
});
