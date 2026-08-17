'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
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
  title: string;
  eyebrow: string;
}

/** 響應式導覽:<1024 底部 tab bar(mobile 定稿)/ ≥1024 左側 sidebar(desktop 定稿) */
export function AppNav({ days, generatedAt, totalYen, title, eyebrow }: Props): React.JSX.Element {
  const pathname = usePathname();
  const daysScrollRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href);
  };

  // 切到某日頁時,把該日 tab 捲進底部 bar 可視範圍(天數多時尤其需要)。
  // Desktop 下 .bottom-nav 為 display:none,scrollIntoView 無副作用。
  useEffect(() => {
    const container = daysScrollRef.current;
    if (!container) return;
    const active = container.querySelector('[data-active="true"]');
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [pathname]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="side-nav">
        <div className="brand">
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 8,
              letterSpacing: '0.06em',
              color: 'var(--faint)',
            }}
          >
            {eyebrow}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 9 }}>{title}</div>
        </div>
        <div className="snav">
          <Link href="/" className={isActive('/') ? 'sitem on' : 'sitem'}>
            總覽
          </Link>
          {days.map((d) => (
            <Link
              key={d.date}
              href={`/day/${d.date}`}
              className={isActive(`/day/${d.date}`) ? 'sitem on' : 'sitem'}
            >
              <span className="snum">{d.dayNum}</span>
              <span className="sarea">{d.area || '─'}</span>
            </Link>
          ))}
          <Link href="/backlog" className={isActive('/backlog') ? 'sitem on' : 'sitem'}>
            行前資訊
          </Link>
        </div>
        <div className="sfoot">
          <div style={{ fontSize: 11, color: 'var(--faint)' }}>
            資料更新於 {formatGeneratedAt(generatedAt)}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-plex)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--yellow)',
              marginTop: 6,
            }}
          >
            Σ {formatYen(totalYen)}
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ──
          「總覽」固定最左、「行前」固定最右;中間日期 tab 可水平捲動。 */}
      <nav className="bottom-nav">
        <MobileTab href="/" active={isActive('/')} label="總覽" fixed />
        <div className="bottom-nav-days" ref={daysScrollRef}>
          {days.map((d) => (
            <MobileTab
              key={d.date}
              href={`/day/${d.date}`}
              active={isActive(`/day/${d.date}`)}
              label={d.dayNum}
              mono
            />
          ))}
        </div>
        <MobileTab href="/backlog" active={isActive('/backlog')} label="行前" fixed />
      </nav>
    </>
  );
}

function MobileTab({
  href,
  active,
  label,
  mono = false,
  fixed = false,
}: {
  href: string;
  active: boolean;
  label: string;
  mono?: boolean;
  fixed?: boolean;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      data-active={active}
      className={fixed ? 'mtab mtab-fixed' : 'mtab'}
      style={{ color: 'inherit' }}
    >
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
