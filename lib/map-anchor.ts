/**
 * 地圖定錨的目標與 Embed iframe src 組裝。
 *
 * 「定錨」與「基準錨」的定義見 CONTEXT.md:未選取任何項目時地圖停在基準錨,
 * 點擊項目才定錨該項目。推薦與行程兩個 Tab 共用同一組 anchor 語彙,兩邊的
 * 地圖行為才會一致。
 *
 * 仍然只用 Google Maps Embed API(ADR-0002):前端只需要一把免費、以 referrer
 * 限制的 key,不必為 GCP 綁卡。座標定錨走 Embed 的 view 模式,不是 JS API。
 */

import { ANCHOR_ZOOM, BASE_ANCHOR_ZOOM } from './constants';
import type { ItineraryItem, LatLng, Store } from './types';

/** 地圖要看的位置:文字查詢(place)或座標(view) */
export type MapAnchor =
  | { readonly kind: 'place'; readonly query: string; readonly zoom: number }
  | { readonly kind: 'view'; readonly center: LatLng; readonly zoom: number };

/** 選取的推薦店家 */
export function storeAnchor(store: Pick<Store, 'name' | 'address'>): MapAnchor {
  const query = store.address !== '' ? `${store.name} ${store.address}` : store.name;
  return { kind: 'place', query, zoom: ANCHOR_ZOOM };
}

/**
 * 選取的行程項目。行程沒有座標,只能以文字查詢定錨;該筆自己的區域比當日
 * 主要區域精確,故優先使用。
 */
export function itineraryAnchor(
  item: Pick<ItineraryItem, 'name' | 'area'>,
  mainArea: string,
): MapAnchor {
  const area = item.area !== '' ? item.area : mainArea;
  const query = area !== '' ? `${item.name} ${area}` : item.name;
  return { kind: 'place', query, zoom: ANCHOR_ZOOM };
}

/** 當日區域的基準錨;沒有設定區域時無錨可用 */
export function areaAnchor(mainArea: string): MapAnchor | null {
  if (mainArea === '') return null;
  return { kind: 'place', query: `${mainArea} 日本`, zoom: BASE_ANCHOR_ZOOM };
}

/** 目前位置模式開啟時的基準錨 */
export function deviceAnchor(center: LatLng): MapAnchor {
  return { kind: 'view', center, zoom: BASE_ANCHOR_ZOOM };
}

/** 有 key 走 Embed API;無 key 時的 keyless fallback(本機開發用) */
export function anchorSrc(anchor: MapAnchor): string {
  const key = process.env.NEXT_PUBLIC_GMAPS_EMBED_KEY;

  if (anchor.kind === 'view') {
    const center = `${anchor.center.lat},${anchor.center.lng}`;
    if (key) {
      return `https://www.google.com/maps/embed/v1/view?key=${key}&center=${encodeURIComponent(center)}&zoom=${anchor.zoom}&language=zh-TW`;
    }
    return keylessSrc(center, anchor.zoom);
  }

  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(anchor.query)}&zoom=${anchor.zoom}&language=zh-TW`;
  }
  return keylessSrc(anchor.query, anchor.zoom);
}

function keylessSrc(query: string, zoom: number): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=zh-TW&output=embed`;
}
