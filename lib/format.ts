export function formatYen(n: number): string {
  return `¥${n.toLocaleString('en-US')}`;
}

export function dayCostSum(costs: readonly (number | null)[]): number {
  return costs.reduce<number>((sum, c) => sum + (c ?? 0), 0);
}

/** '2026-12-15' → '12.15' */
export function shortDate(isoDate: string): string {
  return `${Number(isoDate.slice(5, 7))}.${Number(isoDate.slice(8))}`;
}

export function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
