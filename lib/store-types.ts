/**
 * Avatar 類型選擇器的五個選項,以及 Google Places `types` → 選項的對映。
 *
 * 對映表是佔位版本(spec §3):首次 pipeline 跑完後會依真實清單的 types
 * 分布校準。Google 的原始 types 保留在 stores.json,對映只發生在前端,
 * 因此校準不需要重跑資料管線。
 */

export const STORE_TYPES = ['restaurant', 'cafe', 'shopping', 'sight', 'other'] as const;

export type StoreTypeKey = (typeof STORE_TYPES)[number];

/** 進入「推薦」Tab 時的預設類型(spec §4.2) */
export const DEFAULT_STORE_TYPE: StoreTypeKey = 'restaurant';

export const STORE_TYPE_LABELS: Record<StoreTypeKey, string> = {
  restaurant: '餐廳',
  cafe: '咖啡甜點',
  shopping: '購物',
  sight: '景點',
  other: '其他',
};

const GOOGLE_TYPES: Record<Exclude<StoreTypeKey, 'other'>, readonly string[]> = {
  cafe: ['cafe', 'bakery', 'dessert_shop', 'ice_cream_shop', 'coffee_shop'],
  sight: ['tourist_attraction', 'park', 'museum', 'place_of_worship', 'art_gallery'],
  restaurant: ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'bar'],
  shopping: ['shopping_mall', 'store', 'supermarket', 'department_store', 'convenience_store'],
};

/**
 * 比對順序即優先序:店家常同時帶多個 types(咖啡廳帶 food、市場帶 store),
 * 先命中的分類勝出,較具體的分類排在前面。
 */
const MATCH_ORDER = ['cafe', 'sight', 'restaurant', 'shopping'] as const;

export function classifyStore(types: readonly string[]): StoreTypeKey {
  const found = MATCH_ORDER.find((key) => types.some((t) => GOOGLE_TYPES[key].includes(t)));
  return found ?? 'other';
}
