/**
 * @vitest-environment jsdom
 *
 * 導覽回饋(useLinkStatus):被點的 tab 要在新頁面就緒之前就先亮起來。
 * 靜態 export 下,目標路由的 loading.tsx 要等該路由的 RSC payload 到齊才畫得出來,
 * 所以「點下去到換頁」之間唯一的即時回饋就是這裡 —— 值得用測試釘住。
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNav, type NavDay } from './AppNav';

const mockPathname = vi.hoisted(() => ({ value: '/' }));
const mockPending = vi.hoisted(() => ({ value: false }));

vi.mock('next/navigation', () => ({
  usePathname: (): string => mockPathname.value,
}));

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({
      children,
      href,
      ...rest
    }: {
      children: React.ReactNode;
      href: string;
    } & Record<string, unknown>): React.JSX.Element =>
      createElement('a', { href, ...rest }, children),
    useLinkStatus: (): { pending: boolean } => ({ pending: mockPending.value }),
  };
});

const DAYS: readonly NavDay[] = [
  { date: '2026-12-14', dayNum: '14', area: '難波' },
  { date: '2026-12-15', dayNum: '15', area: '梅田' },
];

function renderNav(): void {
  render(
    <AppNav
      days={DAYS}
      generatedAt="2026-08-31T00:00:00Z"
      totalYen={12000}
      title="大阪"
      eyebrow="TRIP"
    />,
  );
}

/** 底部 tab bar 裡代表某一天的那顆按鈕外觀元素 */
function mobileTabFace(dayNum: string): HTMLElement {
  const faces = screen.getAllByText(dayNum).filter((el) => el.classList.contains('mtab-face'));
  const face = faces[0];
  if (!face) throw new Error(`找不到 ${dayNum} 的 mtab-face`);
  return face;
}

beforeEach(() => {
  mockPathname.value = '/';
  mockPending.value = false;
});
afterEach(cleanup);

describe('AppNav 的導覽中回饋', () => {
  it('沒有導覽進行時,未選取的 tab 維持 faint 色且不標記 pending', () => {
    renderNav();
    const face = mobileTabFace('14');
    expect(face.dataset.pending).toBe('false');
    expect(face.style.color).toBe('var(--faint)');
  });

  it('導覽進行中,被點的 tab 立刻亮成 yellow 並標上 data-pending', () => {
    mockPending.value = true;
    renderNav();
    const face = mobileTabFace('14');
    expect(face.dataset.pending).toBe('true');
    expect(face.style.color).toBe('var(--yellow)');
    expect(face.style.borderTop).toContain('var(--yellow)');
  });

  it('sidebar 項目在導覽進行中同樣套用選取樣式', () => {
    mockPending.value = true;
    renderNav();
    const item = document.querySelector('a.sitem[href="/day/2026-12-14"]');
    expect(item?.className).toContain('on');
    expect(item?.getAttribute('data-pending')).toBe('true');
  });

  it('data-active 只跟著目前路徑走,不受 pending 影響(捲動定位靠它)', () => {
    mockPending.value = true;
    mockPathname.value = '/day/2026-12-15';
    renderNav();
    expect(mobileTabFace('15').closest('a')?.dataset.active).toBe('true');
    expect(mobileTabFace('14').closest('a')?.dataset.active).toBe('false');
  });
});
