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
  sectionOwner,
  splitDirection,
  findHeaderRow,
  readTableRows,
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
  it('skips rows with a blank name and keeps reading the rows after them', () => {
    const rows = dayRowsWith([
      [
        '10:00',
        '景點',
        '大阪城',
        '大阪',
        '地鐵',
        '09:00-17:00',
        '600',
        '不需預約',
        'https://x',
        '',
      ],
      ['12:00', '餐廳', '', '', '', '', '', '', '', ''], // empty name → skipped
      ['13:00', '景點', '通天閣', '', '', '', '', '', '', ''], // still read
    ]);
    const day = parseDayTab('2026-12-14', '12.14 (一)', rows);
    expect(day.items.map((i) => i.name)).toEqual(['大阪城', '通天閣']);
    expect(day.mainArea).toBe('大阪・難波');
    expect(day.accommodation).toBe('Hotel X');
  });

  it('reads past fully-blank rows left as placeholders (live 12.15 / 12.16 layout)', () => {
    const rows = dayRowsWith([
      [],
      [],
      ['', '', '退房', '', '', '', '', '', '', ''],
      [],
      ['20:30-21:00', '餐廳', 'Ushiram', '', '電車', '', '', '待預約', '', ''],
      [],
      ['', '', '', '', '', '當日預估花費小計', '', '', '', ''], // template footer row
    ]);
    const day = parseDayTab('2026-12-16', '12.16 (三)', rows);
    expect(day.items.map((i) => i.name)).toEqual(['退房', 'Ushiram']);
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
    rows[6] = [
      '時段',
      '種類',
      '名稱',
      '區域',
      '交通方式 / 車程',
      '營業時間',
      '預估費用 (¥)',
      '預約狀態',
      '地圖 / 官網連結',
      '備註',
    ];
    expect(() => parseDayTab('2026-12-14', '12.14 (一)', rows)).toThrow(SheetSchemaError);
  });
});

describe('splitDirection / sectionOwner — traveler attribution', () => {
  it('splits a traveler in full- or half-width parentheses off the direction', () => {
    expect(splitDirection('去程（施）')).toEqual({ direction: '去程', traveler: '施' });
    expect(splitDirection('回程 (施)')).toEqual({ direction: '回程', traveler: '施' });
    expect(splitDirection('回程(施）')).toEqual({ direction: '回程', traveler: '施' });
  });

  it('returns a null traveler when the direction has no parentheses', () => {
    expect(splitDirection('去程')).toEqual({ direction: '去程', traveler: null });
    expect(splitDirection('')).toEqual({ direction: '', traveler: null });
  });

  it('reads the owner after the dash in a section title', () => {
    expect(sectionOwner(['✈️ 機票資訊 - 高'])).toBe('高');
    expect(sectionOwner(['✈️ 機票資訊-高 '])).toBe('高');
    expect(sectionOwner(['✈️ 機票資訊'])).toBe('');
    expect(sectionOwner(undefined)).toBe('');
  });

  it('parseFlight uses the parenthesised traveler, else the default', () => {
    expect(parseFlight(['去程（施）'], '高')).toMatchObject({ direction: '去程', traveler: '施' });
    expect(parseFlight(['去程'], '高')).toMatchObject({ direction: '去程', traveler: '高' });
    expect(parseFlight(['去程'])).toMatchObject({ traveler: '' });
  });
});

describe('sensitive-field filtering (spec §3.2)', () => {
  it('parseFlight drops the PNR column (index 9) entirely', () => {
    // index:      0     1            2       3        4       5       6       7       8    9(PNR)    10     11    12
    const row: Row = [
      '去程',
      '2026/12/14',
      'JAL',
      'JL812',
      'KIX',
      '10:00',
      'TPE',
      '12:30',
      'T1',
      'ABC123',
      '18,000',
      '23kg',
      'note',
    ];
    const flight = parseFlight(row);
    expect(Object.keys(flight)).not.toContain('pnr');
    expect(JSON.stringify(flight)).not.toContain('ABC123');
    expect(flight.priceTwd).toBe(18000);
    expect(flight.baggage).toBe('23kg');
  });

  it('parseRoom drops the booking reference (訂單編號, index 8) entirely', () => {
    // index:     0        1       2            3            4    5         6       7           8(訂單編號)  9        10           11          12
    const row: Row = [
      'Hotel X',
      '難波',
      '2026/12/14',
      '2026/12/16',
      '2',
      '雙人房',
      '30000',
      'Booking',
      'ORD-9988',
      '已付全額',
      '2026/12/01',
      '大阪市...',
      'note',
    ];
    const room = parseRoom(row);
    expect(JSON.stringify(room)).not.toContain('ORD-9988');
    expect(room.paymentStatus).toBe('已付全額');
    expect(room.freeCancelDeadline).toBe('2026/12/01');
  });
});

describe('readTableRows — Backlog table boundary', () => {
  const rows: Row[] = [['title'], ['header'], ['去程', 'a'], ['回程', 'b'], ['next title']];

  it('stops at the exclusive end index and does not cross into the next table', () => {
    const out = readTableRows(rows, 2, 4);
    expect(out.map((r) => r[0])).toEqual(['去程', '回程']);
  });

  it('stops early on a fully-blank row', () => {
    const withBlank: Row[] = [...rows.slice(0, 4), [], ['stray']];
    expect(readTableRows(withBlank, 2, withBlank.length)).toHaveLength(2);
  });

  it('clamps an end index past the fetched range', () => {
    expect(readTableRows(rows, 2, 100)).toHaveLength(3);
  });
});

describe('findHeaderRow — locate a table by its header text', () => {
  const rows: Row[] = [
    ['✈️ 機票資訊'],
    [...FLIGHT_HEADERS],
    ['去程'],
    ['🏨 房間資訊'],
    [...ROOM_HEADERS],
  ];

  it('returns the 0-based index of the first exact header match at or after fromIdx', () => {
    expect(findHeaderRow('Backlog', rows, FLIGHT_HEADERS, 0)).toBe(1);
    expect(findHeaderRow('Backlog', rows, ROOM_HEADERS, 2)).toBe(4);
  });

  it('does not match a header that sits before fromIdx', () => {
    expect(() => findHeaderRow('Backlog', rows, FLIGHT_HEADERS, 2)).toThrow(SheetSchemaError);
  });

  it('reports the per-column diff when the first column matches but others drifted', () => {
    const drifted: string[] = [...ROOM_HEADERS];
    drifted[8] = '訂單號';
    const withDrift: Row[] = [...rows.slice(0, 4), drifted];
    expect(() => findHeaderRow('Backlog', withDrift, ROOM_HEADERS, 2)).toThrow(
      /第 5 列第 9 欄:預期「訂單編號」,實際「訂單號」/,
    );
  });

  it('names the missing table when no row starts with its first header', () => {
    expect(() => findHeaderRow('Backlog', rows, USJ_HEADERS, 0)).toThrow(/找不到表頭「項目」/);
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

  /** Live sheet layout (2026-11-02): every table has a title row right above its header. */
  function liveBacklogRows(): Row[] {
    return [
      ['✈️ 機票資訊 - 高'],
      [...FLIGHT_HEADERS],
      ['去程', '2026/12/14', 'EVA', 'BR178'],
      ['回程', '2026/12/20', 'EVA', 'BR131'],
      ['去程（施）', '2026/12/12', 'CAL', 'CI156'],
      ['回程（施）', '2026/12/20', 'CAL', 'CI153'],
      ['🏨 房間資訊 - 施'], // row 7: directly below the 4th flight
      [...ROOM_HEADERS],
      ['FDS ZEAL', '', '12/12', '12/14', '2'],
      ["La'gent Hotel Osaka Bay", '', '12/14', '12/16', '2'],
      ['KIX Direct', 'KIX Direct', '12/16', '12/20', '4'],
      [],
      [],
      [],
      ['🎢 環球影城資訊 - 杰'],
      [...USJ_HEADERS], // row 16 (template: 15)
      ['門票 (Studio Pass)', '12/15', '一般+快通', '4'],
      ['快速通關 (Express Pass)', '4'],
      ['早鳥入場券'],
      ['App 抽選 / 整理券'],
      [],
      ['🏠 民宿口袋名單(候選比較)'],
      [...BNB_HEADERS], // row 23 (template: 22)
      ['民宿 A', '難波'],
    ];
  }

  it('locates tables by header on the live layout and never reads a title row as data', () => {
    const backlog = parseBacklog(liveBacklogRows());
    expect(backlog.flights.map((f) => [f.direction, f.traveler])).toEqual([
      ['去程', '高'],
      ['回程', '高'],
      ['去程', '施'],
      ['回程', '施'],
    ]);
    expect(backlog.rooms).toHaveLength(3);
    expect(backlog.usj.map((u) => u.item)).toEqual([
      '門票 (Studio Pass)',
      '快速通關 (Express Pass)',
      '早鳥入場券',
      'App 抽選 / 整理券',
    ]);
    expect(backlog.bnbCandidates.map((b) => b.name)).toEqual(['民宿 A']);
  });

  it('still parses the original template layout (headers on rows 2 / 8 / 15 / 22)', () => {
    const rows = backlogRows();
    rows[0] = ['✈️ 機票資訊'];
    rows[2] = ['去程', '2026/12/14'];
    rows[6] = ['🏨 房間資訊(已訂住宿)'];
    rows[13] = ['🎢 環球影城資訊'];
    rows[15] = ['門票 (Studio Pass)'];
    rows[20] = ['🏠 民宿口袋名單(候選比較)'];
    const backlog = parseBacklog(rows);
    expect(backlog.flights).toHaveLength(1);
    expect(backlog.usj).toHaveLength(1);
  });

  it('parses an all-empty backlog into empty arrays', () => {
    const backlog = parseBacklog(backlogRows());
    expect(backlog.flights).toEqual([]);
    expect(backlog.rooms).toEqual([]);
    expect(backlog.usj).toEqual([]);
    expect(backlog.bnbCandidates).toEqual([]);
  });

  it('buildTripData validates and returns a well-formed TripData', () => {
    const dayInputs = [{ isoDate: '2026-12-14', tab: '12.14 (一)', rows: dayRowsWith([]) }];
    const data = buildTripData({
      title: '大阪・六日',
      dayInputs,
      backlogRows: backlogRows(),
      generatedAt: '2026-08-04T06:00:00.000Z',
    });
    expect(data.generatedAt).toBe('2026-08-04T06:00:00.000Z');
    expect(data.days).toHaveLength(1);
    expect(data.days[0]?.weekdayZh).toBe('一');
  });

  it('buildTripData sets meta.title and derives eyebrow/splashWorld from dates', () => {
    const dayInputs = [
      { isoDate: '2026-12-19', tab: '12.19 (六)', rows: dayRowsWith([]) },
      { isoDate: '2026-12-14', tab: '12.14 (一)', rows: dayRowsWith([]) },
    ];
    const data = buildTripData({
      title: '  大阪・六日  ',
      dayInputs,
      backlogRows: backlogRows(),
      generatedAt: 'now',
    });
    expect(data.meta.title).toBe('大阪・六日'); // trimmed
    expect(data.meta.eyebrow).toBe('DEC 14 - 19 · 2026');
    expect(data.meta.splashWorld).toBe('WORLD 12-14');
    // days 依日期升冪排序
    expect(data.days.map((d) => d.date)).toEqual(['2026-12-14', '2026-12-19']);
  });

  it('buildTripData throws SheetSchemaError on an empty title', () => {
    const dayInputs = [{ isoDate: '2026-12-14', tab: '12.14 (一)', rows: dayRowsWith([]) }];
    expect(() =>
      buildTripData({ title: '   ', dayInputs, backlogRows: backlogRows(), generatedAt: 'now' }),
    ).toThrow(SheetSchemaError);
  });

  it('buildTripData throws SheetSchemaError when a backlog header drifted', () => {
    const rows = backlogRows();
    const driftedRoomHeader: string[] = [...ROOM_HEADERS];
    driftedRoomHeader[8] = '訂單號'; // was 訂單編號
    rows[7] = driftedRoomHeader;
    const dayInputs = [{ isoDate: '2026-12-14', tab: '12.14 (一)', rows: dayRowsWith([]) }];
    expect(() =>
      buildTripData({ title: '大阪・六日', dayInputs, backlogRows: rows, generatedAt: 'now' }),
    ).toThrow(SheetSchemaError);
  });
});
