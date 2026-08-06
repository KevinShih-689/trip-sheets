/**
 * Sheet 結構契約(非旅程內容)。
 *
 * 旅程標題、日期與天數已改由 Google Sheet 驅動(標題取試算表名稱、日期由 tab
 * 名稱偵測),見 `lib/sheet-tabs.ts`。此檔只保留與 Sheet 結構相關、無法從資料
 * 推得的常數:星期字表、Backlog tab 名與其固定版面。
 */

export const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** Backlog tab 名稱(彙整航班/住宿/USJ/民宿候選的固定分頁) */
export const BACKLOG_TAB = 'Backlog';

export const SHEETS_EDIT_URL_ENV = 'NEXT_PUBLIC_SHEETS_URL';

/** Backlog tab 四個表格的固定列位(1-indexed,見 spec §3.1.2) */
export const BACKLOG_LAYOUT = {
  flights: { headerRow: 2, dataStart: 3, dataEndMax: 7 },
  rooms: { headerRow: 8, dataStart: 9, dataEndMax: 14 },
  usj: { headerRow: 15, dataStart: 16, dataEndMax: 21 },
  bnb: { headerRow: 22, dataStart: 23, dataEndMax: 40 },
} as const;
