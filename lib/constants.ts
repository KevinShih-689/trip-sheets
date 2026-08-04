export const TRIP_YEAR = 2026;
export const TRIP_MONTH = 12;
export const TRIP_START_DAY = 14;
export const TRIP_END_DAY = 19;

export const TRIP_DATES: readonly string[] = Array.from(
  { length: TRIP_END_DAY - TRIP_START_DAY + 1 },
  (_, i) => `${TRIP_YEAR}-${TRIP_MONTH}-${TRIP_START_DAY + i}`,
);

export const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** Google Sheets 上的日期 tab 名稱,如 `12.14 (一)` */
export function dayTabName(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const wk = ZH_WEEKDAYS[d.getDay()] ?? '?';
  return `${d.getMonth() + 1}.${d.getDate()} (${wk})`;
}

export const SHEETS_EDIT_URL_ENV = 'NEXT_PUBLIC_SHEETS_URL';

/** Backlog tab 四個表格的固定列位(1-indexed,見 spec §3.1.2) */
export const BACKLOG_LAYOUT = {
  flights: { headerRow: 2, dataStart: 3, dataEndMax: 7 },
  rooms: { headerRow: 8, dataStart: 9, dataEndMax: 14 },
  usj: { headerRow: 15, dataStart: 16, dataEndMax: 21 },
  bnb: { headerRow: 22, dataStart: 23, dataEndMax: 40 },
} as const;
