import { describe, expect, it } from 'vitest';
import {
  SheetSchemaError,
  buildStoresFile,
  parseStoreRows,
  planCalls,
  storeCacheKey,
  storeSearchQuery,
  type PlaceResult,
  type Row,
  type StoreRow,
} from './parse-stores';

const HEADER_ZH: Row = ['店名', '備註', 'Maps URL', '地址', '地址覆寫'];
const HEADER_TAKEOUT: Row = ['Title', 'Note', 'URL', 'Address'];
/** Google Takeout 中文匯出的真實表頭 —— 注意沒有地址欄 */
const HEADER_TAKEOUT_ZH: Row = ['標題', '筆記', '網址', '標籤', '留言'];

function place(overrides: Partial<PlaceResult> = {}): PlaceResult {
  return {
    displayName: '一蘭 難波店',
    formattedAddress: '大阪市中央区難波1-1-1',
    lat: 34.665,
    lng: 135.501,
    types: ['restaurant', 'food'],
    mapsUri: 'https://maps.google.com/?cid=1',
    ...overrides,
  };
}

describe('parseStoreRows — 以表頭辨識欄位', () => {
  it('parses rows using the Chinese header row', () => {
    const rows: Row[] = [
      HEADER_ZH,
      ['一蘭 難波店', '要排隊', 'https://maps.app.goo.gl/a', '難波1-1-1', ''],
    ];
    expect(parseStoreRows('店家清單', rows)).toEqual([
      {
        name: '一蘭 難波店',
        note: '要排隊',
        mapsUrl: 'https://maps.app.goo.gl/a',
        address: '難波1-1-1',
        addressOverride: '',
      },
    ]);
  });

  it('accepts the raw Takeout CSV header row (English, no override column)', () => {
    const rows: Row[] = [HEADER_TAKEOUT, ['Ichiran', 'queue', 'https://x', 'Namba 1-1-1']];
    expect(parseStoreRows('店家清單', rows)).toEqual([
      {
        name: 'Ichiran',
        note: 'queue',
        mapsUrl: 'https://x',
        address: 'Namba 1-1-1',
        addressOverride: '',
      },
    ]);
  });

  it('tolerates reordered columns', () => {
    const rows: Row[] = [
      ['地址', '店名', '備註'],
      ['難波1-1-1', '一蘭', '要排隊'],
    ];
    expect(parseStoreRows('店家清單', rows)[0]).toMatchObject({
      name: '一蘭',
      address: '難波1-1-1',
    });
  });

  it('trims cells and skips blank / nameless rows', () => {
    const rows: Row[] = [
      HEADER_ZH,
      ['  一蘭  ', '', '', '', ''],
      [],
      ['', '沒有店名', '', '', ''],
      ['大阪王將', '', '', '', ''],
    ];
    const parsed = parseStoreRows('店家清單', rows);
    expect(parsed.map((r) => r.name)).toEqual(['一蘭', '大阪王將']);
  });

  it('throws a readable SheetSchemaError when the name column is missing', () => {
    const rows: Row[] = [
      ['備註', '地址'],
      ['x', 'y'],
    ];
    expect(() => parseStoreRows('店家清單', rows)).toThrow(SheetSchemaError);
    try {
      parseStoreRows('店家清單', rows);
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('店家清單');
      expect(message).toContain('店名');
      expect(message).toContain('備註');
    }
  });

  it('throws when the tab is empty', () => {
    expect(() => parseStoreRows('店家清單', [])).toThrow(SheetSchemaError);
  });
  it('parses the real Chinese Takeout export, which has no address column', () => {
    const rows: Row[] = [
      HEADER_TAKEOUT_ZH,
      ['一蘭 道頓堀店', '深夜也開', 'https://maps.app.goo.gl/a', '美食', '想去'],
    ];
    expect(parseStoreRows('店家清單', rows)).toEqual([
      {
        name: '一蘭 道頓堀店',
        note: '深夜也開',
        mapsUrl: 'https://maps.app.goo.gl/a',
        address: '',
        addressOverride: '',
      },
    ]);
  });

  it('ignores 標籤 and 留言 rather than misreading them as known columns', () => {
    const rows: Row[] = [
      HEADER_TAKEOUT_ZH,
      ['店A', '筆記內容', 'https://x', '標籤內容', '留言內容'],
    ];
    const [row] = parseStoreRows('店家清單', rows);
    expect(row?.note).toBe('筆記內容');
    expect(row?.address).toBe('');
  });

  it('still picks up 地址覆寫 when the user adds it to a Takeout export', () => {
    const rows: Row[] = [
      [...HEADER_TAKEOUT_ZH, '地址覆寫'],
      ['店A', '', 'https://x', '', '', '大阪市中央区難波1-1-1'],
    ];
    const [row] = parseStoreRows('店家清單', rows);
    expect(row?.addressOverride).toBe('大阪市中央区難波1-1-1');
  });
});

describe('storeSearchQuery — Text Search 查詢字串', () => {
  it('combines name with the address', () => {
    const row = { name: '一蘭', note: '', mapsUrl: '', address: '難波1-1-1', addressOverride: '' };
    expect(storeSearchQuery(row)).toBe('一蘭 難波1-1-1');
  });

  it('prefers the manual address override', () => {
    const row = {
      name: '一蘭',
      note: '',
      mapsUrl: '',
      address: '錯的地址',
      addressOverride: '對的地址',
    };
    expect(storeSearchQuery(row)).toBe('一蘭 對的地址');
  });

  it('falls back to the name alone when no address is known', () => {
    const row = { name: '一蘭', note: '', mapsUrl: '', address: '', addressOverride: '' };
    expect(storeSearchQuery(row)).toBe('一蘭');
  });
});

describe('storeCacheKey', () => {
  it('uses the Maps URL when present', () => {
    const row = {
      name: '一蘭',
      note: '',
      mapsUrl: 'https://maps.app.goo.gl/a',
      address: 'x',
      addressOverride: '',
    };
    expect(storeCacheKey(row)).toBe('https://maps.app.goo.gl/a');
  });

  it('falls back to name + address so URL-less rows still cache', () => {
    const row = { name: '一蘭', note: '', mapsUrl: '', address: '難波1-1-1', addressOverride: '' };
    expect(storeCacheKey(row)).toBe('一蘭|難波1-1-1');
  });

  it('changes when the address override changes, so a correction re-queries', () => {
    const base = {
      name: '一蘭',
      note: '',
      mapsUrl: 'https://x',
      address: 'a',
      addressOverride: '',
    };
    expect(storeCacheKey({ ...base, addressOverride: '修正後' })).not.toBe(storeCacheKey(base));
  });
});

describe('planCalls — 部署前預估計費 API 用量', () => {
  function row(overrides: Partial<StoreRow> = {}): StoreRow {
    return {
      name: '一蘭',
      note: '',
      mapsUrl: 'https://maps.app.goo.gl/a',
      address: '難波1-1-1',
      addressOverride: '',
      ...overrides,
    };
  }
  const EMPTY = { places: {}, areas: {} };

  it('counts every store and area when the cache is empty', () => {
    const rows = [row(), row({ mapsUrl: 'https://maps.app.goo.gl/b' })];
    expect(planCalls(rows, ['難波', '京都'], EMPTY)).toEqual({ places: 2, geocoding: 2 });
  });

  it('counts nothing when the cache covers everything', () => {
    const rows = [row(), row({ mapsUrl: 'https://maps.app.goo.gl/b' })];
    const cached = {
      places: { 'https://maps.app.goo.gl/a': {}, 'https://maps.app.goo.gl/b': {} },
      areas: { 難波: {}, 京都: {} },
    };
    expect(planCalls(rows, ['難波', '京都'], cached)).toEqual({ places: 0, geocoding: 0 });
  });

  it('counts only the uncached remainder', () => {
    const rows = [row(), row({ mapsUrl: 'https://maps.app.goo.gl/b' })];
    const cached = { places: { 'https://maps.app.goo.gl/a': {} }, areas: { 難波: {} } };
    expect(planCalls(rows, ['難波', '京都'], cached)).toEqual({ places: 1, geocoding: 1 });
  });

  it('counts duplicate cache keys once — the second row hits the cache the first one fills', () => {
    const rows = [row(), row({ name: '一蘭(重複列)' })];
    expect(planCalls(rows, [], EMPTY)).toEqual({ places: 1, geocoding: 0 });
  });

  it('counts a row again once its address override changes', () => {
    const cached = { places: { 'https://maps.app.goo.gl/a': {} }, areas: {} };
    expect(planCalls([row({ addressOverride: '修正後' })], [], cached).places).toBe(1);
  });
});

describe('buildStoresFile', () => {
  const rows = parseStoreRows('店家清單', [
    HEADER_ZH,
    ['一蘭 難波店', '要排隊', 'https://maps.app.goo.gl/a', '難波1-1-1', ''],
    ['查不到的店', '', 'https://maps.app.goo.gl/b', '', ''],
  ]);

  it('merges sheet notes with resolved place data and reports unresolved rows', () => {
    const resolved = new Map<string, PlaceResult>([['https://maps.app.goo.gl/a', place()]]);
    const { file, unresolved } = buildStoresFile({
      rows,
      resolved,
      areaCenters: { 難波: { lat: 34.66, lng: 135.5 } },
      generatedAt: '2026-08-12T00:00:00.000Z',
    });

    expect(file.stores).toEqual([
      {
        name: '一蘭 難波店',
        note: '要排隊',
        address: '大阪市中央区難波1-1-1',
        lat: 34.665,
        lng: 135.501,
        types: ['restaurant', 'food'],
        mapsUri: 'https://maps.google.com/?cid=1',
      },
    ]);
    expect(file.areaCenters).toEqual({ 難波: { lat: 34.66, lng: 135.5 } });
    expect(unresolved).toEqual(['查不到的店']);
  });

  it('keeps the sheet name when the place has no display name', () => {
    const resolved = new Map<string, PlaceResult>([
      ['https://maps.app.goo.gl/a', place({ displayName: '' })],
    ]);
    const { file } = buildStoresFile({ rows, resolved, areaCenters: {}, generatedAt: 'now' });
    expect(file.stores[0]?.name).toBe('一蘭 難波店');
  });

  it('throws SheetSchemaError when a resolved place fails schema validation', () => {
    const resolved = new Map<string, PlaceResult>([
      ['https://maps.app.goo.gl/a', place({ lat: Number.NaN })],
    ]);
    expect(() => buildStoresFile({ rows, resolved, areaCenters: {}, generatedAt: 'now' })).toThrow(
      SheetSchemaError,
    );
  });
});
