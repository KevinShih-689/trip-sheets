'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TRIP_EYEBROW, TRIP_TITLE } from '@/lib/constants';
import { formatGeneratedAt, formatYen } from '@/lib/format';

export interface NavDay {
  date: string;
  dayNum: string;
  area: string;
}

interface Props {
  days: readonly NavDay[];
  generatedAt: string;
  totalYen: number;
}

/** 響應式導覽:<1024 底部 tab bar(mobile 定稿)/ ≥1024 左側 sidebar(desktop 定稿) */
export function AppNav({ days, generatedAt, totalYen }: Props): React.JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="side-nav">
        <div className="brand">
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, letterSpacing: '0.06em', color: 'var(--faint)' }}>
            {TRIP_EYEBROW}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 9 }}>{TRIP_TITLE}</div>
        </div>
        <div className="snav">
          <Link href="/" className={isActive('/') ? 'sitem on' : 'sitem'}>
            總覽
          </Link>
          {days.map((d) => (
            <Link key={d.date} href={`/day/${d.date}`} className={isActive(`/day/${d.date}`) ? 'sitem on' : 'sitem'}>
              <span className="snum">{d.dayNum}</span>
              <span className="sarea">{d.area || '─'}</span>
            </Link>
          ))}
          <Link href="/backlog" className={isActive('/backlog') ? 'sitem on' : 'sitem'}>
            行前資訊
          </Link>
        </div>
        <div className="sfoot">
          <div style={{ fontSize: 11, color: 'var(--faint)' }}>資料更新於 {formatGeneratedAt(generatedAt)}</div>
          <div style={{ fontFamily: 'var(--font-plex)', fontSize: 13, fontWeight: 500, color: 'var(--yellow)', marginTop: 6 }}>
            Σ {formatYen(totalYen)}
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          display: 'flex',
          alignItems: 'stretch',
          borderTop: '1px solid var(--line)',
          background: '#0D0F17',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 100,
        }}
      >
        <MobileTab href="/" active={isActive('/')} label="總覽" />
        {days.map((d) => (
          <MobileTab key={d.date} href={`/day/${d.date}`} active={isActive(`/day/${d.date}`)} label={d.dayNum} mono />
        ))}
        <MobileTab href="/backlog" active={isActive('/backlog')} label="行前" />
      </nav>
    </>
  );
}

function MobileTab({ href, active, label, mono = false }: { href: string; active: boolean; label: string; mono?: boolean }): React.JSX.Element {
  return (
    <Link href={href} style={{ flex: 1, color: 'inherit' }}>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'var(--tabbar-h)',
          borderTop: `2px solid ${active ? 'var(--yellow)' : 'transparent'}`,
          color: active ? 'var(--yellow)' : 'var(--faint)',
          fontFamily: mono ? 'var(--font-plex)' : 'inherit',
          fontSize: mono ? 15 : 13,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </Link>
  );
}
