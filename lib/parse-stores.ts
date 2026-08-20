/**
 * Pure parsing / validation for the 店家清單 tab → data/stores.json.
 *
 * This is the testable core of `scripts/fetch-stores.ts`: no IO, no
 * `process.exit`. Failures throw `SheetSchemaError`, same contract as
 * `parse-sheet.ts`.
 *
 * Columns are resolved BY HEADER NAME, not by position: the tab is populated by
 * pasting a Google Takeout CSV whose column order and language we don't control.
 */
import { storesFileSchema } from './schema';
import { SheetSchemaError } from './sheet-error';
import type { LatLng, Store, StoresFile } from './types';

export type Row = readonly string[];

export { SheetSchemaError };

/** 一列收藏清單原始資料(尚未經 Places 反查) */
export interface StoreRow {
  readonly name: string;
  readonly note: string;
  readonly mapsUrl: string;
  readonly address: string;
  /** 反查誤配時的人工修正,優先於 `address` */
  readonly addressOverride: string;
}

/** Places API (New) Text Search 取回的欄位(僅 Pro 級,不含評分) */
export interface PlaceResult {
  readonly displayName: string;
  readonly formattedAddress: string;
  readonly lat: number;
  readonly lng: number;
  readonly types: readonly string[];
  readonly mapsUri: string;
}

/**
 * 表頭別名。涵蓋三種來源:Google Takeout 的中文匯出(標題/筆記/網址/標籤/留言)、
 * 英文匯出(Title/Note/URL/…),以及使用者自行改寫的欄名。
 *
 * 注意 Takeout **不匯出地址** —— 中文匯出只有上述五欄。地址因此是選填,缺漏時
 * Text Search 只以店名查詢(見 `storeSearchQuery`);要提高命中率就手動補
 * 「地址覆寫」欄。「標籤」與「留言」用不到,未列入別名即自動忽略。
 */
const COLUMN_ALIASES = {
  name: ['店名', '名稱', '標題', 'title', 'name'],
  note: ['備註', '註記', '筆記', 'note', 'comment'],
  mapsUrl: ['maps url', '網址', '連結', 'url', 'link'],
  address: ['地址', 'address'],
  addressOverride: ['地址覆寫', 'address override'],
} as const satisfies Record<keyof StoreRow, readonly string[]>;

type ColumnKey = keyof StoreRow;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function cell(row: Row | undefined, index: number | undefined): string {
  if (index === undefined) return '';
  return (row?.[index] ?? '').trim();
}

/** Map each known column to its index in the header row; unknown columns stay undefined. */
function resolveColumns(tab: string, header: Row): Partial<Record<ColumnKey, number>> {
  const normalized = header.map(normalizeHeader);
  const found: Partial<Record<ColumnKey, number>> = {};

  (Object.keys(COLUMN_ALIASES) as ColumnKey[]).forEach((key) => {
    const aliases: readonly string[] = COLUMN_ALIASES[key];
    const index = normalized.findIndex((h) => h !== '' && aliases.includes(h));
    if (index !== -1) found[key] = index;
  });

  if (found.name === undefined) {
    throw new SheetSchemaError(
      `tab「${tab}」找不到店名欄位。` +
        `預期表頭包含下列其一:${COLUMN_ALIASES.name.join('、')};` +
        `實際表頭:${header.length > 0 ? header.map((h) => `「${h.trim()}」`).join('、') : '(空白)'}。\n` +
        '請確認第 1 列保留了 Takeout CSV 的表頭列。',
    );
  }
  return found;
}

/**
 * Parse the 店家清單 tab. Row 1 is the header; data starts at row 2.
 * Rows without a name are skipped (blank spacer rows, stray notes).
 */
export function parseStoreRows(tab: string, rows: readonly Row[]): StoreRow[] {
  const header = rows[0];
  if (!header || header.every((c) => c.trim() === '')) {
    throw new SheetSchemaError(`tab「${tab}」是空的,或第 1 列不是表頭列。`);
  }
  const col = resolveColumns(tab, header);

  const parsed: StoreRow[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const name = cell(row, col.name);
    if (name === '') continue;
    parsed.push({
      name,
      note: cell(row, col.note),
      mapsUrl: cell(row, col.mapsUrl),
      address: cell(row, col.address),
      addressOverride: cell(row, col.addressOverride),
    });
  }
  return parsed;
}

/** Text Search 查詢字串:店名 + 地址(覆寫優先),地址缺漏時退為店名。 */
export function storeSearchQuery(row: StoreRow): string {
  const address = row.addressOverride !== '' ? row.addressOverride : row.address;
  return address === '' ? row.name : `${row.name} ${address}`;
}

/**
 * 反查快取的 key。Maps URL 是收藏清單裡唯一穩定的識別碼;沒有 URL 時退為
 * 店名+地址。地址覆寫納入 key,人工修正後才會重新查詢而非沿用錯誤結果。
 */
export function storeCacheKey(row: StoreRow): string {
  const base = row.mapsUrl !== '' ? row.mapsUrl : `${row.name}|${row.address}`;
  return row.addressOverride === '' ? base : `${base}|${row.addressOverride}`;
}

/** 一次執行預計要打的計費 API 次數 */
export interface CallPlan {
  readonly places: number;
  readonly geocoding: number;
}

/**
 * 預估這次執行會呼叫幾次計費 API:未命中快取的店家與區域數。
 *
 * 一次呼叫對應一個**相異**的快取 key —— 兩列共用同一個 Maps URL 時,第一列查完
 * 就寫進快取、第二列直接命中,因此只算一次(與 fetch-stores 主迴圈行為一致)。
 */
export function planCalls(
  rows: readonly StoreRow[],
  areaNames: readonly string[],
  cached: {
    readonly places: Readonly<Record<string, unknown>>;
    readonly areas: Readonly<Record<string, unknown>>;
  },
): CallPlan {
  const pending = new Set<string>();
  for (const row of rows) {
    const key = storeCacheKey(row);
    if (!(key in cached.places)) pending.add(key);
  }
  return {
    places: pending.size,
    geocoding: areaNames.filter((area) => !(area in cached.areas)).length,
  };
}

export interface BuildStoresFileInput {
  readonly rows: readonly StoreRow[];
  /** Places 反查結果,以 `storeCacheKey` 為 key */
  readonly resolved: ReadonlyMap<string, PlaceResult>;
  /** 區域名(各日 B2)→ 座標 */
  readonly areaCenters: Readonly<Record<string, LatLng>>;
  readonly generatedAt: string;
}

export interface BuildStoresFileResult {
  readonly file: StoresFile;
  /** 反查不到、已從輸出略過的店名(呼叫端負責提示) */
  readonly unresolved: string[];
}

/**
 * Merge sheet rows with their resolved place data into the validated stores file.
 * Rows that could not be resolved are dropped and reported — a store with no
 * coordinates can't be distance-filtered, so it has no place in the output.
 */
export function buildStoresFile(input: BuildStoresFileInput): BuildStoresFileResult {
  const { rows, resolved, areaCenters, generatedAt } = input;

  const unresolved: string[] = [];
  const stores: Store[] = [];

  rows.forEach((row) => {
    const place = resolved.get(storeCacheKey(row));
    if (!place) {
      unresolved.push(row.name);
      return;
    }
    stores.push({
      name: place.displayName !== '' ? place.displayName : row.name,
      note: row.note,
      address: place.formattedAddress !== '' ? place.formattedAddress : row.address,
      lat: place.lat,
      lng: place.lng,
      types: [...place.types],
      mapsUri: place.mapsUri,
    });
  });

  const validated = storesFileSchema.safeParse({ generatedAt, stores, areaCenters });
  if (!validated.success) {
    throw new SheetSchemaError(
      `stores.json zod 驗證失敗:\n${validated.error.issues
        .map((i) => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return { file: validated.data, unresolved };
}
