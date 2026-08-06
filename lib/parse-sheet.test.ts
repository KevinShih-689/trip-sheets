import { describe, expect, it } from 'vitest';
import {
  BNB_HEADERS,
  DAY_HEADERS,
  FLIGHT_HEADERS,
  ROOM_HEADERS,
  SheetSchemaError,
  USJ_HEADERS,
  assertHeaders,
  buildTripData,
  numOrNull,
  parseBacklog,
  parseDayTab,
  parseFlight,
  parseRoom,
  sliceTable,
  type Row,
} from './parse-sheet';

// Blank rows 0..5 (info block), header at row index 6 (spec: row 7).
function dayRowsWith(items: Row[]): Row[] {
  const blank: Row = [];
  return [
    ['日期', '2026-12-14'],
    ['當日主要活動區域', '大阪・難波'],
    ['當晚住宿', 'Hotel X'],
    ['當日重點 / 提醒', '早點出發'],
    blank,
    blank,
    [...DAY_HEADERS],
    ...items,
  ];
}

describe('numOrNull', () => {
  it('strips currency/commas and parses numbers', () => {
    expect(numOrNull('¥1,970')).toBe(1970);
    expect(numOrNull('  2000 ')).toBe(2000);
  });
  it('returns null for empty or non-numeric', () => {
    expect(numOrNull('')).toBeNull();
    expect(numOrNull('免費')).toBeNull();
  });
});

describe('assertHeaders — schema-drift guard (spec §3.1.3)', () => {
  it('passes when headers match exactly', () => {
    expect(() => assertHeaders('Backlog', 2, [...FLIGHT_HEADERS], FLIGHT_HEADERS)).not.toThrow();
  });

  it('throws SheetSchemaError with column/row diff on a renamed column', () => {
    const drifted: string[] = [...FLIGHT_HEADERS];
    drifted[3] = '航班號碼'; // was 航班編號
    expect(() => assertHeaders('Backlog', 2, drifted, FLIGHT_HEADERS)).toThrow(SheetSchemaError);
    try {
      assertHeaders('Backlog', 2, drifted, FLIGHT_HEADERS);
    } catch (err) {
      expect((err as Error).message).toContain('第 2 列第 4 欄');
      expect((err as Error).message).toContain('預期「航班編號」');
      expect((err as Error).message).toContain('實際「航班號碼」');
    }
  });

  it('throws when a column is missing (shorter row)', () => {
    expect(() => assertHeaders('Day', 7, DAY_HEADERS.slice(0, 5), DAY_HEADERS)).toThrow(
      SheetSchemaError,
    );
  });
});

describe('parseDayTab — row termination', () => {
  it('reads rows until the first blank name (spec §3.1.1)', () => {
    const rows = dayRowsWith([
      ['10:00', '景點', '大阪城', '大阪', '地鐵', '09:00-17:00', '600', '不需預約', 'https://x', ''],
      ['12:00', '餐廳', '', '', '', '', '', '', '', ''], // empty name → stop
      ['13:00', '景點', '通天閣', '', '', '', '', '', '', ''], // must NOT be read
    ]);
    const day = parseDayTab('2026-12-14', '12.14 (一)', rows);
    expect(day.items).toHaveLength(1);
    expect(day.items[0]?.name).toBe('大阪城');
    expect(day.mainArea).toBe('大阪・難波');
    expect(day.accommodation).toBe('Hotel X');
  });

  it('normalizes cost and coerces unknown enums to null', () => {
    const rows = dayRowsWith([
      ['10:00', '外星分類', '謎之地', '', '', '', '¥1,200', '亂填', '', ''],
    ]);
    const day = parseDayTab('2026-12-14', '12.14 (一)', rows);
    expect(day.items[0]?.category).toBeNull();
    expect(day.items[0]?.reservationStatus).toBeNull();
    expect(day.items[0]?.estimatedCostJpy).toBe(1200);
  });

  it('throws when the itinerary header row drifted', () => {
    const rows = dayRowsWith([]);
    rows[6] = ['時段', '種類', '名稱', '區域', '交通方式 / 車程', '營業時間', '預估費用 (¥)', '預約狀態', '地圖 / 官網連結', '備註'];
    expect(() => parseDayTab('2026-12-14', '12.14 (一)', rows)).toThrow(SheetSchemaError);
  });
});

describe('sensitive-field filtering (spec §3.2)', () => {
  it('parseFlight drops the PNR column (index 9) entirely', () => {
    // index:      0     1            2       3        4       5       6       7       8    9(PNR)    10     11    12
    const row: Row = ['去程', '2026/12/14', 'JAL', 'JL812', 'KIX', '10:00', 'TPE', '12:30', 'T1', 'ABC123', '18,000', '23kg', 'note'];
    const flight = parseFlight(row);
    expect(Object.keys(flight)).not.toContain('pnr');
    expect(JSON.stringify(flight)).not.toContain('ABC123');
    expect(flight.priceTwd).toBe(18000);
    expect(flight.baggage).toBe('23kg');
  });

  it('parseRoom drops the booking reference (訂單編號, index 8) entirely', () => {
    // index:     0        1       2            3            4    5         6       7           8(訂單編號)  9        10           11          12
    const row: Row = ['Hotel X', '難波', '2026/12/14', '2026/12/16', '2', '雙人房', '30000', 'Booking', 'ORD-9988', '已付全額', '2026/12/01', '大阪市...', 'note'];
    const room = parseRoom(row);
    expect(JSON.stringify(room)).not.toContain('ORD-9988');
    expect(room.paymentStatus).toBe('已付全額');
    expect(room.freeCancelDeadline).toBe('2026/12/01');
  });
});

describe('sliceTable — Backlog table boundary (spec §3.1.2)', () => {
  const rows: Row[] = [];
  // flights data rows 3..4 (index 2..3), then a row that belongs to the next table area
  rows[2] = ['去程', 'a'];
  rows[3] = ['回程', 'b'];
  // rows[4..6] would be beyond dataEndMax (7) boundary anyway

  it('stops at dataEndMax and does not cross into the next table', () => {
    const out = sliceTable(rows, 3, 7); // flights: dataStart 3, dataEndMax 7
    expect(out).toHaveLength(2);
    expect(out[0]?.[0]).toBe('去程');
  });

  it('stops early on a fully-blank row', () => {
    const withBlank: Row[] = [...rows];
    withBlank[4] = [];
    withBlank[5] = ['stray'];
    const out = sliceTable(withBlank, 3, 20);
    expect(out).toHaveLength(2); // blank at index 4 stops it
  });
});

describe('parseBacklog + buildTripData integration', () => {
  // Build a minimal but header-correct Backlog tab.
  function backlogRows(): Row[] {
    const rows: Row[] = Array.from({ length: 40 }, () => [] as Row);
    rows[1] = [...FLIGHT_HEADERS]; // row 2
    rows[7] = [...ROOM_HEADERS]; // row 8
    rows[14] = [...USJ_HEADERS]; // row 15
    rows[21] = [...BNB_HEADERS]; // row 22
    return rows;
  }

  it('parses an all-empty backlog into empty arrays', () => {
    const backlog = parseBacklog(backlogRows());
    expect(backlog.flights).toEqual([]);
    expect(backlog.rooms).toEqual([]);
    expect(backlog.usj).toEqual([]);
    expect(backlog.bnbCandidates).toEqual([]);
  });

  it('buildTripData validates and returns a well-formed TripData', () => {
    const days = [
      { isoDate: '2026-12-14', tab: '12.14 (一)', rows: dayRowsWith([]) },
    ];
    const data = buildTripData(days, backlogRows(), '2026-08-04T06:00:00.000Z');
    expect(data.generatedAt).toBe('2026-08-04T06:00:00.000Z');
    expect(data.days).toHaveLength(1);
    expect(data.days[0]?.weekdayZh).toBe('一');
  });

  it('buildTripData throws SheetSchemaError when a backlog header drifted', () => {
    const rows = backlogRows();
    const driftedRoomHeader: string[] = [...ROOM_HEADERS];
    driftedRoomHeader[8] = '訂單號'; // was 訂單編號
    rows[7] = driftedRoomHeader;
    const days = [{ isoDate: '2026-12-14', tab: '12.14 (一)', rows: dayRowsWith([]) }];
    expect(() => buildTripData(days, rows, 'now')).toThrow(SheetSchemaError);
  });
});
