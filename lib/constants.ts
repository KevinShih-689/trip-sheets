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

/** 收藏清單貼上的分頁(Takeout CSV 內容),見 spec §2.1 */
export const STORES_TAB = '店家清單';

/** 推薦店家搜尋半徑(km):目前位置模式關閉時以區域中心、開啟時以裝置位置(spec §4.2) */
export const AREA_RADIUS_KM = 5;
export const GEO_RADIUS_KM = 3;

/** 定錨到單一項目(店家/行程)的 zoom 級距(spec §4.3) */
export const ANCHOR_ZOOM = 11;

/**
 * 基準錨的 zoom 級距(spec §4.3):未選取任何項目時看的是「這一帶」而非某個點,
 * 故比單點定錨拉遠一級,與總覽地圖同級。
 */
export const BASE_ANCHOR_ZOOM = 13;

/**
 * 搜尋 skeleton 的最短顯示時間(ms)。過濾本身是本地運算(毫秒級),
 * 但 spec §4.2 要求每次搜尋都有 loading 回饋;低於此值畫面會閃爍。
 */
export const SEARCH_SKELETON_MS = 260;

/** 取得裝置位置的逾時(ms),逾時後退回區域中心(spec §4.2) */
export const GEOLOCATION_TIMEOUT_MS = 8000;

export const SHEETS_EDIT_URL_ENV = 'NEXT_PUBLIC_SHEETS_URL';

/** Backlog tab 四個表格的固定列位(1-indexed,見 spec §3.1.2) */
export const BACKLOG_LAYOUT = {
  flights: { headerRow: 2, dataStart: 3, dataEndMax: 7 },
  rooms: { headerRow: 8, dataStart: 9, dataEndMax: 14 },
  usj: { headerRow: 15, dataStart: 16, dataEndMax: 21 },
  bnb: { headerRow: 22, dataStart: 23, dataEndMax: 40 },
} as const;
