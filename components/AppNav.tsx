'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * useLinkStatus 只能在 <Link> 的子樹裡呼叫,但要上色的 className 掛在 Link 自己身上。
 * 這顆不渲染任何東西的探針把 pending 狀態回報給外層,兩邊就都拿得到。
 */
function LinkPendingProbe({ onChange }: { onChange: (pending: boolean) => void }): null {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);
  return null;
}

/** 回傳 [pending, probe]:把 probe 放進 <Link> 裡,pending 就會跟著導覽狀態走。 */
function useLinkPending(): [boolean, React.JSX.Element] {
  const [pending, setPending] = useState(false);
  const onChange = useCallback((next: boolean): void => setPending(next), []);
  return [pending, <LinkPendingProbe key="probe" onChange={onChange} />];
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
          <SideItem href="/" active={isActive('/')}>
            總覽
          </SideItem>
          {days.map((d) => (
            <SideItem key={d.date} href={`/day/${d.date}`} active={isActive(`/day/${d.date}`)}>
              <span className="snum">{d.dayNum}</span>
              <span className="sarea">{d.area || '─'}</span>
            </SideItem>
          ))}
          <SideItem href="/backlog" active={isActive('/backlog')}>
            行前資訊
          </SideItem>
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

function SideItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [pending, probe] = useLinkPending();
  // 導覽中先套上跟選取態相同的樣式,再由 CSS 的 navpulse 區分兩者
  return (
    <Link href={href} data-pending={pending} className={active || pending ? 'sitem on' : 'sitem'}>
      {probe}
      {children}
    </Link>
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
  const [pending, probe] = useLinkPending();
  const lit = active || pending;
  return (
    <Link
      href={href}
      data-active={active}
      className={fixed ? 'mtab mtab-fixed' : 'mtab'}
      style={{ color: 'inherit' }}
    >
      {probe}
      <span
        className="mtab-face"
        data-pending={pending}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'var(--tabbar-h)',
          borderTop: `2px solid ${lit ? 'var(--yellow)' : 'transparent'}`,
          color: lit ? 'var(--yellow)' : 'var(--faint)',
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
