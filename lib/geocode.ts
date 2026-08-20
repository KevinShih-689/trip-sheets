/**
 * Geocoding API v4 的請求組裝與回應解析。
 *
 * 用 v4 而非 v3 的唯一理由是驗證方式:v3 只吃 API 金鑰,v4 才支援 OAuth,
 * 而消除長期金鑰正是目的。座標仍以 `LatLng` 回傳,所以快取格式與
 * `stores.json` 的 schema 完全不受影響。
 */

import type { LatLng } from './types';

const BASE = 'https://geocode.googleapis.com/v4/geocode/address';

/**
 * 非結構化地址查詢的網址。地址是**路徑片段**而非查詢參數(v3 的 `?address=`
 * 在 v4 沒有對應),所以中文與空白都必須先編碼。
 */
export function geocodeUrl(address: string, languageCode = 'zh-TW'): string {
  const url = new URL(`${BASE}/${encodeURIComponent(address)}`);
  url.searchParams.set('languageCode', languageCode);
  return url.toString();
}

/**
 * 取出第一筆結果的座標。查無地點在 v4 是空的 `results` 陣列(v3 是
 * `status: "ZERO_RESULTS"`),兩者都對映為 null 交由呼叫端警告。
 */
export function parseGeocodeResponse(body: unknown): LatLng | null {
  if (typeof body !== 'object' || body === null) return null;
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return null;

  const location = (results[0] as { location?: unknown } | undefined)?.location;
  if (typeof location !== 'object' || location === null) return null;

  const { latitude, longitude } = location as { latitude?: unknown; longitude?: unknown };
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return { lat: latitude, lng: longitude };
}
