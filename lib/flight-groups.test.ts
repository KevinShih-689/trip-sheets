import { describe, expect, it } from 'vitest';
import { FLIGHT_TONES, groupFlights } from './flight-groups';
import type { Flight } from './types';

function flight(direction: string, traveler: string, flightNo: string): Flight {
  return {
    direction,
    traveler,
    date: '2026/12/14',
    airline: 'EVA',
    flightNo,
    from: '台北',
    departTime: '6:30',
    to: '關西',
    arriveTime: '9:55',
    terminal: '2',
    priceTwd: null,
    baggage: '',
    note: '',
  };
}

const LIVE: Flight[] = [
  flight('去程', '高', 'BR178'),
  flight('回程', '高', 'BR131'),
  flight('去程', '施', 'CI156'),
  flight('回程', '施', 'CI153'),
];

describe('groupFlights — one page per direction, one row per traveler', () => {
  it('puts outbound on page 1 and return on page 2, travelers in first-seen order', () => {
    const layout = groupFlights(LIVE);
    expect(layout.travelers.map((t) => t.name)).toEqual(['高', '施']);
    expect(layout.pages.map((p) => p.label)).toEqual(['去程', '回程']);
    expect(layout.pages[0]?.rows.map((r) => r.map((f) => f.flightNo))).toEqual([
      ['BR178'],
      ['CI156'],
    ]);
    expect(layout.pages[1]?.rows.map((r) => r.map((f) => f.flightNo))).toEqual([
      ['BR131'],
      ['CI153'],
    ]);
  });

  it('assigns tones by traveler order: red first, blue second', () => {
    const layout = groupFlights(LIVE);
    expect(layout.travelers.map((t) => t.tone)).toEqual(['red', 'blue']);
  });

  it('cycles tones when there are more travelers than tones', () => {
    const many = Array.from({ length: FLIGHT_TONES.length + 1 }, (_, i) =>
      flight('去程', `p${i}`, `X${i}`),
    );
    const tones = groupFlights(many).travelers.map((t) => t.tone);
    expect(tones[FLIGHT_TONES.length]).toBe(FLIGHT_TONES[0]);
  });

  it('keeps an empty row when a traveler has no flight on a page (rows never shift)', () => {
    const layout = groupFlights([
      flight('去程', '高', 'BR178'),
      flight('去程', '施', 'CI156'),
      flight('回程', '施', 'CI153'),
    ]);
    expect(layout.pages[1]?.rows.map((r) => r.length)).toEqual([0, 1]);
  });

  it('orders return after outbound even if listed first, and appends other directions', () => {
    const layout = groupFlights([
      flight('回程', '高', 'R1'),
      flight('轉機', '高', 'T1'),
      flight('去程', '高', 'O1'),
    ]);
    expect(layout.pages.map((p) => p.label)).toEqual(['去程', '回程', '轉機']);
  });

  it('returns no pages for no flights', () => {
    expect(groupFlights([])).toEqual({ travelers: [], pages: [] });
  });
});
