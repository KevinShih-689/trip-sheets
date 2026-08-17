import { describe, expect, it } from 'vitest';
import { SheetSchemaError } from './sheet-error';
import { buildEyebrow, buildSplashWorld, parseDateTabName, resolveDateTabs } from './sheet-tabs';

// build 當年參考日:用固定日期讓年份推斷可重現
const REF = new Date(2026, 7, 6); // 2026-08-06(local)

describe('parseDateTabName', () => {
  it('parses a well-formed date tab', () => {
    expect(parseDateTabName('12.14 (一)')).toEqual({ month: 12, day: 14, weekdayZh: '一' });
    expect(parseDateTabName('3.5 (四)')).toEqual({ month: 3, day: 5, weekdayZh: '四' });
  });

  it('returns null for non-date tabs and malformed names', () => {
    expect(parseDateTabName('Backlog')).toBeNull();
    expect(parseDateTabName('Config')).toBeNull();
    expect(parseDateTabName('12.14(一)')).toBeNull(); // 缺空格
    expect(parseDateTabName('12.14 (月)')).toBeNull(); // 非合法星期字
    expect(parseDateTabName('12.14')).toBeNull(); // 缺星期
    expect(parseDateTabName('')).toBeNull();
  });
});

describe('resolveDateTabs', () => {
  it('resolves the trip year from weekdays, ignoring non-date tabs', () => {
    const tabs = resolveDateTabs(['12.15 (二)', '12.14 (一)', 'Backlog'], REF);
    expect(tabs).toEqual([
      { tab: '12.14 (一)', isoDate: '2026-12-14' },
      { tab: '12.15 (二)', isoDate: '2026-12-15' },
    ]);
  });

  it('zero-pads single-digit month and day', () => {
    const tabs = resolveDateTabs(['3.5 (四)'], REF);
    expect(tabs).toEqual([{ tab: '3.5 (四)', isoDate: '2026-03-05' }]);
  });

  it('allows non-contiguous dates', () => {
    const tabs = resolveDateTabs(['12.14 (一)', '12.16 (三)'], REF);
    expect(tabs.map((t) => t.isoDate)).toEqual(['2026-12-14', '2026-12-16']);
  });

  it('throws when no date tab exists', () => {
    expect(() => resolveDateTabs(['Backlog', 'Config'], REF)).toThrow(SheetSchemaError);
  });

  it('throws when weekdays are internally inconsistent (no year satisfies all tabs)', () => {
    // 連續兩天不可能同為星期一 → 任何候選年份都無解
    const tabs = ['12.14 (一)', '12.15 (一)'];
    expect(() => resolveDateTabs(tabs, REF)).toThrow(SheetSchemaError);
    try {
      resolveDateTabs(tabs, REF);
    } catch (err) {
      expect((err as Error).message).toContain('12.15 (一)');
    }
  });

  it('throws on an impossible calendar date', () => {
    expect(() => resolveDateTabs(['2.30 (一)'], REF)).toThrow(SheetSchemaError);
  });

  it('throws on duplicate dates', () => {
    expect(() => resolveDateTabs(['12.14 (一)', '12.14 (一)'], REF)).toThrow(SheetSchemaError);
  });
});

describe('buildEyebrow', () => {
  it('formats a same-month range', () => {
    expect(buildEyebrow(['2026-12-14', '2026-12-19'])).toBe('DEC 14 - 19 · 2026');
  });

  it('formats a cross-month range', () => {
    expect(buildEyebrow(['2026-11-30', '2026-12-02'])).toBe('NOV 30 - DEC 2 · 2026');
  });

  it('formats a single day', () => {
    expect(buildEyebrow(['2026-12-14'])).toBe('DEC 14 · 2026');
  });

  it('returns empty string for no dates', () => {
    expect(buildEyebrow([])).toBe('');
  });
});

describe('buildSplashWorld', () => {
  it('derives month-day from the first date without zero-padding', () => {
    expect(buildSplashWorld(['2026-12-14', '2026-12-19'])).toBe('WORLD 12-14');
    expect(buildSplashWorld(['2026-03-05'])).toBe('WORLD 3-5');
  });

  it('returns empty string for no dates', () => {
    expect(buildSplashWorld([])).toBe('');
  });
});
