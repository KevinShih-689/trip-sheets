/**
 * Arrange flights for the pre-trip page: one page per direction (outbound,
 * then return, then any other direction in first-seen order), and within each
 * page one row per traveler (first-seen order). A traveler with no flight on a
 * page keeps an empty row, so each traveler stays on the same row — and the
 * same colour — on every page.
 */
import type { Flight } from './types';

export const FLIGHT_TONES = ['red', 'blue', 'green', 'yellow'] as const;
export type FlightTone = (typeof FLIGHT_TONES)[number];

export interface Traveler {
  readonly name: string;
  readonly tone: FlightTone;
}

export interface FlightPage {
  readonly label: string;
  /** rows[i] holds travelers[i]'s flights on this page (possibly empty). */
  readonly rows: readonly (readonly Flight[])[];
}

export interface FlightLayout {
  readonly travelers: readonly Traveler[];
  readonly pages: readonly FlightPage[];
}

const OUTBOUND = '去程';
const RETURN = '回程';

/** 「去程…」/「回程…」 collapse to one page each; anything else keeps its own label. */
function pageLabel(direction: string): string {
  if (direction.startsWith('去')) return OUTBOUND;
  if (direction.startsWith('回')) return RETURN;
  return direction;
}

function pageRank(label: string): number {
  if (label === OUTBOUND) return 0;
  if (label === RETURN) return 1;
  return 2;
}

function uniqueInOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function groupFlights(flights: readonly Flight[]): FlightLayout {
  const names = uniqueInOrder(flights.map((f) => f.traveler));
  const travelers = names.map((name, i) => ({
    name,
    tone: FLIGHT_TONES[i % FLIGHT_TONES.length] as FlightTone,
  }));

  const labels = uniqueInOrder(flights.map((f) => pageLabel(f.direction)));
  // Stable sort: outbound, return, then other directions in first-seen order.
  const ordered = labels
    .map((label, i) => ({ label, i }))
    .sort((a, b) => pageRank(a.label) - pageRank(b.label) || a.i - b.i)
    .map((p) => p.label);

  const pages = ordered.map((label) => ({
    label,
    rows: names.map((name) =>
      flights.filter((f) => f.traveler === name && pageLabel(f.direction) === label),
    ),
  }));

  return { travelers, pages };
}
