'use client';

import { useEffect, useState } from 'react';

function mapSrc(area: string): string {
  const query = encodeURIComponent(`${area} 日本`);
  const key = process.env.NEXT_PUBLIC_GMAPS_EMBED_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${query}&zoom=13&language=zh-TW`;
  }
  // 無 key 時的 keyless fallback(本機開發用)
  return `https://maps.google.com/maps?q=${query}&z=13&hl=zh-TW&output=embed`;
}

/** Google Maps Embed iframe + 離線/無區域 placeholder(spec §4.3) */
export function MapEmbed({ area }: { area: string }): React.JSX.Element {
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

  if (!online || area === '') {
    return (
      <div
        className="map-stripes"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%', minHeight: 148 }}
      >
        <span className="map-pin" />
        <span style={{ fontFamily: 'var(--font-plex)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--faint)' }}>
          {online ? '[ 此日尚未設定活動區域 ]' : '[ 離線中,地圖無法載入 ]'}
        </span>
      </div>
    );
  }

  return (
    <iframe
      title={`地圖:${area}`}
      src={mapSrc(area)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{ border: 0, width: '100%', height: '100%', minHeight: 148, display: 'block', filter: 'saturate(0.85)' }}
    />
  );
}
