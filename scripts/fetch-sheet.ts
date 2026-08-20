/**
 * Sheets API → data/trip-data.json(spec §3.4)
 *
 * IO + CLI wrapper only. All parsing, header-drift validation, and sensitive-
 * field filtering live in `lib/parse-sheet.ts` (pure, unit-tested).
 * 需要環境變數 SHEET_ID。憑證改由 ADC 提供:CI 以 Workload Identity Federation
 * 取得短期 token,不再有任何長期私鑰。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { google } from 'googleapis';
import { BACKLOG_TAB } from '../lib/constants';
import { SheetSchemaError, buildTripData, type DayInput, type Row } from '../lib/parse-sheet';
import { resolveDateTabs } from '../lib/sheet-tabs';

function fail(message: string): never {
  console.error(`\n[fetch-sheet] FAILED: ${message}`);
  process.exit(1);
}

/**
 * ADC 找不到憑證時丟出的原始訊息對人沒有任何指引,換成這個專案實際的兩條路。
 */
function explain(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('Could not load the default credentials')) return message;
  return (
    '找不到 Google 憑證(本機不再保留服務帳戶私鑰)。\n' +
    '  → 本機開發:改用 `pnpm fetch-sheet:sample`\n' +
    '  → 取得真實資料:在 GitHub 手動觸發 auth-check workflow'
  );
}

async function main(): Promise<void> {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) fail('缺少環境變數 SHEET_ID');

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 先取試算表 metadata:標題(→ meta.title)與所有 tab 名稱(→ 動態日期偵測)。
  const metaRes = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'properties.title,sheets.properties.title',
  });
  const title = metaRes.data.properties?.title ?? '';
  const tabNames = (metaRes.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => typeof t === 'string');

  if (!tabNames.includes(BACKLOG_TAB)) fail(`Sheet 中找不到「${BACKLOG_TAB}」tab`);

  let dateTabs;
  try {
    dateTabs = resolveDateTabs(tabNames, new Date());
  } catch (err) {
    if (err instanceof SheetSchemaError) fail(err.message);
    throw err;
  }

  const dayRanges = dateTabs.map((t) => `'${t.tab}'!A1:J200`);
  const ranges = [...dayRanges, `'${BACKLOG_TAB}'!A1:M60`];

  console.log(
    `[fetch-sheet] 偵測到 ${dateTabs.length} 個日期 tab` +
      `(${dateTabs[0]?.isoDate} ~ ${dateTabs[dateTabs.length - 1]?.isoDate})、標題「${title}」`,
  );
  console.log(`[fetch-sheet] batchGet ${ranges.length} ranges from sheet ${sheetId.slice(0, 8)}…`);
  const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: sheetId, ranges });
  const valueRanges = res.data.valueRanges ?? [];
  if (valueRanges.length !== ranges.length) {
    fail(`API 回傳 range 數量不符:預期 ${ranges.length},實際 ${valueRanges.length}`);
  }

  const dayInputs: DayInput[] = dateTabs.map((t, i) => ({
    isoDate: t.isoDate,
    tab: t.tab,
    rows: (valueRanges[i]?.values ?? []) as Row[],
  }));
  const backlogRows = (valueRanges[dateTabs.length]?.values ?? []) as Row[];

  let data;
  try {
    data = buildTripData({ title, dayInputs, backlogRows, generatedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof SheetSchemaError) fail(err.message);
    throw err;
  }

  const outPath = join(process.cwd(), 'data', 'trip-data.json');
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  console.log(
    `[fetch-sheet] OK → ${outPath}(${data.days.reduce((n, d) => n + d.items.length, 0)} 筆行程、` +
      `${data.backlog.flights.length} 航班、${data.backlog.rooms.length} 住宿)`,
  );
}

main().catch((err: unknown) => {
  fail(explain(err));
});
