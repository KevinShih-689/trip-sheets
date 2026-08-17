'use client';

import { CrosshairIcon } from './icons';
import { GEO_RADIUS_KM } from '@/lib/constants';

/**
 * 目前位置模式開關(spec §4.5)。開啟時以 active 樣式明確告知使用者
 * 目前搜尋中心是裝置位置而非當日區域。
 */
export function LocationToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={active ? 'loc-toggle on' : 'loc-toggle'}
      aria-pressed={active}
      aria-label={active ? `目前位置模式:開啟(${GEO_RADIUS_KM}km 內)` : '目前位置模式:關閉'}
      onClick={onToggle}
    >
      <CrosshairIcon size={22} />
    </button>
  );
}
