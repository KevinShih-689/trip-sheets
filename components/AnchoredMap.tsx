'use client';

import { useEffect, useState } from 'react';
import { anchorSrc, type MapAnchor } from '@/lib/map-anchor';

/**
 * 定錨地圖(spec §4.3 / ADR-0002):以 Embed iframe 呈現目前的定錨目標。
 * 換定錨 = 換 iframe src,同一時刻只有一個 marker;重新定錨會重置視角。
 *
 * 推薦與行程兩個 Tab 共用這個組件,兩邊的地圖行為才會一致 —— 呼叫端只需要
 * 決定「現在該看哪裡」(選取的項目,或未選取時的基準錨)。
 */
export function AnchoredMap({
  anchor,
  label,
  emptyText,
  minHeight,
}: {
  /** 要看的位置;null = 無錨可用,顯示 emptyText 佔位 */
  anchor: MapAnchor | null;
  /** 無障礙標題用的地點名稱(店名或區域名) */
  label: string;
  emptyText: string;
  minHeight?: number;
}): React.JSX.Element {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = (): void => setOnline(true);
    const off = (): void => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!online || anchor === null) {
    return (
      <div className="map-stripes map-placeholder" style={{ minHeight }}>
        <span className="map-pin" />
        <span className="map-placeholder-text">
          {online ? emptyText : '[ 離線中,地圖無法載入 ]'}
        </span>
      </div>
    );
  }

  return (
    <iframe
      title={`地圖:${label}`}
      src={anchorSrc(anchor)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{
        border: 0,
        width: '100%',
        height: '100%',
        minHeight,
        display: 'block',
        filter: 'saturate(0.85)',
      }}
    />
  );
}
