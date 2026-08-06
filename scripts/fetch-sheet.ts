/**
 * Sheets API → data/trip-data.json(spec §3.4)
 *
 * IO + CLI wrapper only. All parsing, header-drift validation, and sensitive-
 * field filtering live in `lib/parse-sheet.ts` (pure, unit-tested).
 * 需要環境變數 GOOGLE_SERVICE_ACCOUNT_KEY(JSON 字串)、SHEET_ID。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { google } from 'googleapis';
import { z } from 'zod';
import { TRIP_DATES, dayTabName } from '../lib/constants';
import { SheetSchemaError, buildTripData, type DayInput, type Row } from '../lib/parse-sheet';

function fail(message: string): never {
  console.error(`\n[fetch-sheet] FAILED: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.SHEET_ID;
  if (!keyJson) fail('缺少環境變數 GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!sheetId) fail('缺少環境變數 SHEET_ID');

  const credentialSchema = z.object({ client_email: z.string(), private_key: z.string() });
  const parsedKey = credentialSchema.safeParse(JSON.parse(keyJson));
  if (!parsedKey.success) fail('GOOGLE_SERVICE_ACCOUNT_KEY 不是合法的 service account JSON');

  const auth = new google.auth.JWT({
    email: parsedKey.data.client_email,
    key: parsedKey.data.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const dayRanges = TRIP_DATES.map((d) => `'${dayTabName(d)}'!A1:J200`);
  const ranges = [...dayRanges, `'Backlog'!A1:M60`];

  console.log(`[fetch-sheet] batchGet ${ranges.length} ranges from sheet ${sheetId.slice(0, 8)}…`);
  const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: sheetId, ranges });
  const valueRanges = res.data.valueRanges ?? [];
  if (valueRanges.length !== ranges.length) {
    fail(`API 回傳 range 數量不符:預期 ${ranges.length},實際 ${valueRanges.length}`);
  }

  const dayInputs: DayInput[] = TRIP_DATES.map((isoDate, i) => ({
    isoDate,
    tab: dayTabName(isoDate),
    rows: (valueRanges[i]?.values ?? []) as Row[],
  }));
  const backlogRows = (valueRanges[TRIP_DATES.length]?.values ?? []) as Row[];

  let data;
  try {
    data = buildTripData(dayInputs, backlogRows, new Date().toISOString());
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
  fail(err instanceof Error ? err.message : String(err));
});
