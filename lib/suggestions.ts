import { distanceKm } from './haversine';
import { classifyStore, type StoreTypeKey } from './store-types';
import type { LatLng, Store } from './types';

/** 一筆推薦店家搜尋結果:店家本身 + 相對搜尋中心的距離與解析後的類型 */
export interface SuggestedStore extends Store {
  readonly distanceKm: number;
  readonly type: StoreTypeKey;
}

export interface SuggestionQuery {
  /** 搜尋中心:區域中心或裝置目前位置(spec §4.2) */
  readonly center: LatLng;
  readonly radiusKm: number;
  readonly type: StoreTypeKey;
}

/**
 * 推薦店家搜尋 = 類型過濾 + 半徑過濾 + 距離升冪排序,純本地運算。
 * 回傳新陣列,不動輸入。
 */
export function selectSuggestions(
  stores: readonly Store[],
  query: SuggestionQuery,
): SuggestedStore[] {
  return stores
    .map((store) => ({
      ...store,
      type: classifyStore(store.types),
      distanceKm: distanceKm(query.center, { lat: store.lat, lng: store.lng }),
    }))
    .filter((store) => store.type === query.type && store.distanceKm <= query.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
