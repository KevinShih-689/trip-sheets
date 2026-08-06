/**
 * Pure tab-name → date resolution for the trip sheet.
 *
 * Date tabs are named `M.D (週幾)` (e.g. `12.14 (一)`). They carry no year, so
 * the trip year is inferred at build time by testing candidate years against
 * the weekday written in each tab name — the year in which every tab's month/day
 * lands on its stated weekday. This lets the site render whatever date tabs the
 * sheet currently has, with no code change.
 *
 * No IO here: failures throw `SheetSchemaError` so callers/tests handle them.
 */
import { ZH_WEEKDAYS } from './constants';
import { SheetSchemaError } from './sheet-error';

/** Date-tab naming rule: `M.D (週幾)`. Detection only — not a generator. */
export const DATE_TAB_RE = /^(\d{1,2})\.(\d{1,2}) \(([一二三四五六日])\)$/;

const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

export interface DateTab {
  readonly tab: string; // 原始 tab 名,batchGet range 直接沿用
  readonly isoDate: string; // 'YYYY-MM-DD'(零填充)
}

interface ParsedTab {
  readonly tab: string;
  readonly month: number;
  readonly day: number;
  readonly weekdayZh: string;
}

/** Parse a single tab name; returns null for non-date tabs. */
export function parseDateTabName(
  tab: string,
): { month: number; day: number; weekdayZh: string } | null {
  const m = DATE_TAB_RE.exec(tab);
  if (!m) return null;
  return { month: Number(m[1]), day: Number(m[2]), weekdayZh: m[3] as string };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** True when (year, month, day) is a real calendar date landing on `weekdayZh`. */
function matchesYear(year: number, p: ParsedTab): boolean {
  const d = new Date(year, p.month - 1, p.day);
  if (d.getMonth() + 1 !== p.month || d.getDate() !== p.day) return false; // 擋掉 2.30 這類
  return ZH_WEEKDAYS[d.getDay()] === p.weekdayZh;
}

/** Human-readable reason a tab fails in a given year (for the error message). */
function reasonForFailure(year: number, p: ParsedTab): string | null {
  const d = new Date(year, p.month - 1, p.day);
  if (d.getMonth() + 1 !== p.month || d.getDate() !== p.day) {
    return `「${p.tab}」在 ${year} 年不是合法日期`;
  }
  const actual = ZH_WEEKDAYS[d.getDay()];
  if (actual !== p.weekdayZh) {
    return `「${p.tab}」:${isoOf(year, p.month, p.day)} 實際為星期${actual}(tab 寫星期${p.weekdayZh})`;
  }
  return null;
}

/**
 * Resolve the trip's date tabs from all sheet tab names.
 * Throws `SheetSchemaError` on: no date tab, no consistent year, or duplicate dates.
 * Returned list is sorted ascending by isoDate (non-contiguous dates are allowed).
 */
export function resolveDateTabs(
  tabNames: readonly string[],
  referenceDate: Date,
): readonly DateTab[] {
  const parsed: ParsedTab[] = [];
  for (const tab of tabNames) {
    const p = parseDateTabName(tab);
    if (p) parsed.push({ tab, ...p });
  }

  if (parsed.length === 0) {
    throw new SheetSchemaError(
      '找不到任何日期 tab(格式須為 `M.D (週幾)`,例如 `12.14 (一)`)。',
    );
  }

  const refYear = referenceDate.getFullYear();
  const candidateYears = [refYear - 1, refYear, refYear + 1];
  const qualifyingYears = candidateYears.filter((year) =>
    parsed.every((p) => matchesYear(year, p)),
  );

  if (qualifyingYears.length === 0) {
    const diffs = parsed
      .map((p) => reasonForFailure(refYear, p))
      .filter((r): r is string => r !== null);
    throw new SheetSchemaError(
      `無法從日期 tab 的星期推斷出一致的年份(以 ${refYear} 年檢查):\n${diffs.join('\n')}\n` +
        '請確認每個 tab 的星期與實際日期相符;跨年旅程目前不支援。',
    );
  }

  // 幾乎不可能有多個合格年份(多天旅程星期在 ±1 年窗內不會重複);防禦性取距 referenceDate 最近者。
  const year = qualifyingYears.reduce((best, y) => {
    const first = parsed[0] as ParsedTab;
    const dist = (yr: number): number =>
      Math.abs(new Date(yr, first.month - 1, first.day).getTime() - referenceDate.getTime());
    return dist(y) < dist(best) ? y : best;
  }, qualifyingYears[0] as number);

  const seen = new Set<string>();
  const tabs: DateTab[] = parsed.map((p) => {
    const isoDate = isoOf(year, p.month, p.day);
    if (seen.has(isoDate)) {
      throw new SheetSchemaError(`日期 tab 重複:多個 tab 對應到 ${isoDate}。`);
    }
    seen.add(isoDate);
    return { tab: p.tab, isoDate };
  });

  return tabs.slice().sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

function partsOf(isoDate: string): { year: number; month: number; day: number } {
  const [y, m, d] = isoDate.split('-').map(Number);
  return { year: y as number, month: m as number, day: d as number };
}

/**
 * Derive the eyebrow label from sorted ISO dates:
 * same month → `DEC 14 - 19 · 2026`; cross month → `NOV 30 - DEC 2 · 2026`;
 * single day → `DEC 14 · 2026`. Year is taken from the first date.
 */
export function buildEyebrow(isoDates: readonly string[]): string {
  if (isoDates.length === 0) return '';
  const start = partsOf(isoDates[0] as string);
  const end = partsOf(isoDates[isoDates.length - 1] as string);
  const startMon = MONTH_ABBR[start.month - 1];
  const endMon = MONTH_ABBR[end.month - 1];

  if (isoDates.length === 1) {
    return `${startMon} ${start.day} · ${start.year}`;
  }
  if (start.month === end.month) {
    return `${startMon} ${start.day} - ${end.day} · ${start.year}`;
  }
  return `${startMon} ${start.day} - ${endMon} ${end.day} · ${start.year}`;
}

/** Derive the splash label from the first date: `WORLD 12-14` (no zero-padding). */
export function buildSplashWorld(isoDates: readonly string[]): string {
  if (isoDates.length === 0) return '';
  const { month, day } = partsOf(isoDates[0] as string);
  return `WORLD ${month}-${day}`;
}
