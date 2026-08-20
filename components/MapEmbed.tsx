'use client';

import { AnchoredMap } from './AnchoredMap';
import { areaAnchor } from '@/lib/map-anchor';

/** 區域地圖:總覽頁用的固定視角地圖,等同於「只有基準錨、不會被選取改變」的定錨地圖 */
export function MapEmbed({ area }: { area: string }): React.JSX.Element {
  return (
    <AnchoredMap
      anchor={areaAnchor(area)}
      label={area}
      emptyText="[ 此日尚未設定活動區域 ]"
      minHeight={148}
    />
  );
}
