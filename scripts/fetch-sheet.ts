/**
 * Sheets API → data/trip-data.json(spec §3.4)
 *
 * 唯一的資料邊界:表頭驗證(§3.1.3)、正規化、敏感欄位過濾(§3.2)都在此層。
 * 需要環境變數 GOOGLE_SERVICE_ACCOUNT_KEY(JSON 字串)、SHEET_ID。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { google } from 'googleapis';
import { z } from 'zod';
import { BACKLOG_LAYOUT, TRIP_DATES, dayTabName } from '../lib/constants';
import {
  CATEGORIES,
  RESERVATION_STATUSES,
  tripDataSchema,
} from '../lib/schema';
import type {
  BnbCandidate,
  Flight,
  ItineraryItem,
  Room,
  TripData,
  TripDay,
  UsjTicket,
} from '../lib/types';

type Row = readonly string[];

const DAY_HEADERS = [
  '時段',
  '類型',
  '名稱',
  '區域',
  '交通方式 / 車程',
  '營業時間',
  '預估費用 (¥)',
  '預約狀態',
  '地圖 / 官網連結',
  '備註',
] as const;

const FLIGHT_HEADERS = [
  '方向', '日期', '航空公司', '航班編號', '出發機場', '出發時間',
  '抵達機場', '抵達時間', '航廈', '訂位代號 (PNR)', '票價 (TWD)', '行李額度', '備註',
] as const;

const ROOM_HEADERS = [
  '住宿名稱', '區域', '入住日', '退房日', '晚數', '房型 / 人數', '總價',
  '訂房平台', '訂單編號', '付款狀態', '免費取消期限', '地址 / 連結', '備註',
] as const;

const USJ_HEADERS = [
  '項目', '使用日期', '票種 / 名稱', '張數', '單價', '總價',
  '購買平台', '購買狀態', '取票 / 入場方式', '備註',
] as const;

const BNB_HEADERS = [
  '名稱', '區域 / 最近車站', '距車站步行', '房型 / 可住人數', '每晚價格',
  '總價 (估)', '評分', '優點', '缺點', '連結', '狀態', '備註',
] as const;

function fail(message: string): never {
  console.error(`\n[fetch-sheet] FAILED: ${message}`);
  process.exit(1);
}

function cell(row: Row | undefined, index: number): string {
  return (row?.[index] ?? '').trim();
}

function numOrNull(value: string): number | null {
  const cleaned = value.replace(/[,¥$\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: string): string | null {
  return value === '' ? null : value;
}

function enumOrNull<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function isRowEmpty(row: Row | undefined): boolean {
  return !row || row.every((c) => c.trim() === '');
}

/** 表頭漂移防護(spec §3.1.3):逐欄比對,不符即列出差異並中止 */
function assertHeaders(tab: string, rowNo: number, actual: Row | undefined, expected: readonly string[]): void {
  const diffs: string[] = [];
  expected.forEach((exp, i) => {
    const got = cell(actual, i);
    if (got !== exp) diffs.push(`  第 ${rowNo} 列第 ${i + 1} 欄:預期「${exp}」,實際「${got}」`);
  });
  if (diffs.length > 0) {
    fail(`tab「${tab}」表頭與 schema 不符(spec §3.1):\n${diffs.join('\n')}`);
  }
}

function parseDayTab(isoDate: string, tab: string, rows: readonly Row[]): TripDay {
  // 資訊區塊 A1:B4(spec §3.1.1)
  const infoValue = (rowIdx: number): string => cell(rows[rowIdx], 1);
  assertHeaders(tab, 7, rows[6], DAY_HEADERS);

  const items: ItineraryItem[] = [];
  for (let r = 7; r < rows.length; r += 1) {
    const row = rows[r];
    if (isRowEmpty(row)) break;
    const name = cell(row, 2);
    if (name === '') break; // 名稱為必填,以此判斷資料列結束
    items.push({
      timeSlot: cell(row, 0),
      category: enumOrNull(cell(row, 1), CATEGORIES),
      name,
      area: cell(row, 3),
      transport: cell(row, 4),
      openingHours: cell(row, 5),
      estimatedCostJpy: numOrNull(cell(row, 6)),
      reservationStatus: enumOrNull(cell(row, 7), RESERVATION_STATUSES),
      link: strOrNull(cell(row, 8)),
      note: cell(row, 9),
    });
  }

  const d = new Date(`${isoDate}T00:00:00`);
  const weekdayZh = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()] ?? '?';
  return {
    date: isoDate,
    weekdayZh,
    mainArea: infoValue(1),
    accommodation: infoValue(2),
    highlight: infoValue(3),
    items,
  };
}

function sliceTable(rows: readonly Row[], dataStart: number, dataEndMax: number): readonly Row[] {
  // 列號 1-indexed → array 0-indexed;讀到整列空白或下一表格邊界為止(spec §3.1.2)
  const out: Row[] = [];
  for (let r = dataStart - 1; r < Math.min(dataEndMax, rows.length); r += 1) {
    const row = rows[r];
    if (isRowEmpty(row)) break;
    out.push([...(row ?? [])]);
  }
  return out;
}

// 敏感欄位過濾(spec §3.2):PNR(index 9)與訂單編號(index 8)刻意不映射,
// 回傳型別中不存在對應欄位,型別層面保證不外洩。
function parseFlight(row: Row): Flight {
  return {
    direction: cell(row, 0),
    date: cell(row, 1),
    airline: cell(row, 2),
    flightNo: cell(row, 3),
    from: cell(row, 4),
    departTime: cell(row, 5),
    to: cell(row, 6),
    arriveTime: cell(row, 7),
    terminal: cell(row, 8),
    priceTwd: numOrNull(cell(row, 10)),
    baggage: cell(row, 11),
    note: cell(row, 12),
  };
}

function parseRoom(row: Row): Room {
  return {
    name: cell(row, 0),
    area: cell(row, 1),
    checkIn: cell(row, 2),
    checkOut: cell(row, 3),
    nights: numOrNull(cell(row, 4)),
    roomType: cell(row, 5),
    totalPrice: cell(row, 6),
    platform: cell(row, 7),
    paymentStatus: cell(row, 9),
    freeCancelDeadline: cell(row, 10),
    addressOrLink: cell(row, 11),
    note: cell(row, 12),
  };
}

function parseUsj(row: Row): UsjTicket {
  return {
    item: cell(row, 0),
    useDate: cell(row, 1),
    ticketName: cell(row, 2),
    quantity: numOrNull(cell(row, 3)),
    unitPrice: numOrNull(cell(row, 4)),
    totalPrice: numOrNull(cell(row, 5)),
    platform: cell(row, 6),
    purchaseStatus: cell(row, 7),
    redemption: cell(row, 8),
    note: cell(row, 9),
  };
}

function parseBnb(row: Row): BnbCandidate {
  return {
    name: cell(row, 0),
    areaStation: cell(row, 1),
    walkToStation: cell(row, 2),
    roomType: cell(row, 3),
    pricePerNight: cell(row, 4),
    totalPriceEst: cell(row, 5),
    rating: cell(row, 6),
    pros: cell(row, 7),
    cons: cell(row, 8),
    link: strOrNull(cell(row, 9)),
    status: cell(row, 10),
    note: cell(row, 11),
  };
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

  const days: TripDay[] = TRIP_DATES.map((isoDate, i) => {
    const rows = (valueRanges[i]?.values ?? []) as Row[];
    return parseDayTab(isoDate, dayTabName(isoDate), rows);
  });

  const backlogRows = (valueRanges[TRIP_DATES.length]?.values ?? []) as Row[];
  const L = BACKLOG_LAYOUT;
  assertHeaders('Backlog', L.flights.headerRow, backlogRows[L.flights.headerRow - 1], FLIGHT_HEADERS);
  assertHeaders('Backlog', L.rooms.headerRow, backlogRows[L.rooms.headerRow - 1], ROOM_HEADERS);
  assertHeaders('Backlog', L.usj.headerRow, backlogRows[L.usj.headerRow - 1], USJ_HEADERS);
  assertHeaders('Backlog', L.bnb.headerRow, backlogRows[L.bnb.headerRow - 1], BNB_HEADERS);

  const data: TripData = {
    generatedAt: new Date().toISOString(),
    days,
    backlog: {
      flights: sliceTable(backlogRows, L.flights.dataStart, L.flights.dataEndMax).map(parseFlight),
      rooms: sliceTable(backlogRows, L.rooms.dataStart, L.rooms.dataEndMax).map(parseRoom),
      usj: sliceTable(backlogRows, L.usj.dataStart, L.usj.dataEndMax).map(parseUsj),
      bnbCandidates: sliceTable(backlogRows, L.bnb.dataStart, L.bnb.dataEndMax).map(parseBnb),
    },
  };

  const validated = tripDataSchema.safeParse(data);
  if (!validated.success) {
    fail(`zod 驗證失敗:\n${validated.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }

  const outPath = join(process.cwd(), 'data', 'trip-data.json');
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(validated.data, null, 2)}\n`, 'utf-8');
  console.log(
    `[fetch-sheet] OK → ${outPath}(${days.reduce((n, d) => n + d.items.length, 0)} 筆行程、` +
      `${validated.data.backlog.flights.length} 航班、${validated.data.backlog.rooms.length} 住宿)`,
  );
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
