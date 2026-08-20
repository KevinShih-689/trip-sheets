import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANCHOR_ZOOM, BASE_ANCHOR_ZOOM } from './constants';
import { anchorSrc, areaAnchor, deviceAnchor, itineraryAnchor, storeAnchor } from './map-anchor';
import type { ItineraryItem, Store } from './types';

const KEY_ENV = 'NEXT_PUBLIC_GMAPS_EMBED_KEY';
const original = process.env[KEY_ENV];

function store(overrides: Partial<Store> = {}): Store {
  return {
    name: '一蘭拉麵',
    note: '',
    address: '大阪市中央区難波1-1-1',
    lat: 34.6669,
    lng: 135.5016,
    types: ['restaurant'],
    mapsUri: 'https://maps.google.com/?cid=1',
    ...overrides,
  };
}

function item(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    timeSlot: '09:00',
    category: '景點',
    name: '道頓堀',
    area: '難波',
    transport: '',
    openingHours: '',
    estimatedCostJpy: null,
    reservationStatus: null,
    link: null,
    note: '',
    ...overrides,
  };
}

beforeEach(() => {
  delete process.env[KEY_ENV];
});

afterEach(() => {
  if (original === undefined) delete process.env[KEY_ENV];
  else process.env[KEY_ENV] = original;
});

describe('anchor 建構子', () => {
  it('店家定錨帶店名與地址,zoom 為 ANCHOR_ZOOM', () => {
    expect(storeAnchor(store())).toEqual({
      kind: 'place',
      query: '一蘭拉麵 大阪市中央区難波1-1-1',
      zoom: ANCHOR_ZOOM,
    });
  });

  it('店家沒有地址時只用店名(不留下尾隨空白)', () => {
    expect(storeAnchor(store({ address: '' }))).toEqual({
      kind: 'place',
      query: '一蘭拉麵',
      zoom: ANCHOR_ZOOM,
    });
  });

  it('行程定錨用行程名稱加上該筆的區域', () => {
    expect(itineraryAnchor(item(), '梅田')).toEqual({
      kind: 'place',
      query: '道頓堀 難波',
      zoom: ANCHOR_ZOOM,
    });
  });

  it('行程沒填區域時退回當日主要區域', () => {
    expect(itineraryAnchor(item({ area: '' }), '梅田')).toEqual({
      kind: 'place',
      query: '道頓堀 梅田',
      zoom: ANCHOR_ZOOM,
    });
  });

  it('行程與當日皆無區域時只用名稱', () => {
    expect(itineraryAnchor(item({ area: '' }), '')).toEqual({
      kind: 'place',
      query: '道頓堀',
      zoom: ANCHOR_ZOOM,
    });
  });

  it('區域基準錨用「區域 日本」與 BASE_ANCHOR_ZOOM', () => {
    expect(areaAnchor('難波')).toEqual({
      kind: 'place',
      query: '難波 日本',
      zoom: BASE_ANCHOR_ZOOM,
    });
  });

  it('沒有區域時沒有區域基準錨', () => {
    expect(areaAnchor('')).toBeNull();
  });

  it('裝置基準錨用 view 模式與 BASE_ANCHOR_ZOOM', () => {
    expect(deviceAnchor({ lat: 34.6669, lng: 135.5016 })).toEqual({
      kind: 'view',
      center: { lat: 34.6669, lng: 135.5016 },
      zoom: BASE_ANCHOR_ZOOM,
    });
  });
});

describe('anchorSrc:有 Embed API key', () => {
  beforeEach(() => {
    process.env[KEY_ENV] = 'test-key';
  });

  it('place 走 embed/v1/place,query 經過編碼', () => {
    const src = anchorSrc({ kind: 'place', query: '一蘭拉麵 難波', zoom: 11 });
    expect(src).toContain('https://www.google.com/maps/embed/v1/place');
    expect(src).toContain('key=test-key');
    expect(src).toContain(`q=${encodeURIComponent('一蘭拉麵 難波')}`);
    expect(src).toContain('zoom=11');
  });

  it('view 走 embed/v1/view,以座標為中心(ADR-0002:仍是 Embed iframe)', () => {
    const src = anchorSrc({ kind: 'view', center: { lat: 34.6669, lng: 135.5016 }, zoom: 13 });
    expect(src).toContain('https://www.google.com/maps/embed/v1/view');
    expect(src).toContain('key=test-key');
    expect(src).toContain('center=34.6669%2C135.5016');
    expect(src).toContain('zoom=13');
    expect(src).not.toContain('q=');
  });
});

describe('anchorSrc:無 key 的 keyless fallback(本機開發)', () => {
  it('place 用 maps.google.com 的 q 參數', () => {
    const src = anchorSrc({ kind: 'place', query: '難波 日本', zoom: 13 });
    expect(src).toContain('https://maps.google.com/maps');
    expect(src).toContain(`q=${encodeURIComponent('難波 日本')}`);
    expect(src).toContain('z=13');
    expect(src).toContain('output=embed');
  });

  it('view 用座標當 q,仍是 keyless embed', () => {
    const src = anchorSrc({ kind: 'view', center: { lat: 34.6669, lng: 135.5016 }, zoom: 13 });
    expect(src).toContain('https://maps.google.com/maps');
    expect(src).toContain(`q=${encodeURIComponent('34.6669,135.5016')}`);
    expect(src).toContain('z=13');
    expect(src).toContain('output=embed');
  });
});
