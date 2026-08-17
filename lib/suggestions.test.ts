import { describe, expect, it } from 'vitest';
import { formatDistanceKm } from './format';
import { distanceKm } from './haversine';
import { DEFAULT_STORE_TYPE, classifyStore } from './store-types';
import { selectSuggestions } from './suggestions';
import type { Store } from './types';

const NAMBA = { lat: 34.6659, lng: 135.5016 };
const UMEDA = { lat: 34.7025, lng: 135.4959 };

function store(overrides: Partial<Store> = {}): Store {
  return {
    name: '店',
    note: '',
    address: '',
    lat: NAMBA.lat,
    lng: NAMBA.lng,
    types: ['restaurant'],
    mapsUri: '',
    ...overrides,
  };
}

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(NAMBA, NAMBA)).toBe(0);
  });

  it('matches the known 難波 → 梅田 distance (~4.1km)', () => {
    expect(distanceKm(NAMBA, UMEDA)).toBeCloseTo(4.1, 0);
  });

  it('is symmetric', () => {
    expect(distanceKm(NAMBA, UMEDA)).toBeCloseTo(distanceKm(UMEDA, NAMBA), 10);
  });
});

describe('classifyStore — Google types → Avatar 五類', () => {
  it('classifies each group by its Google types', () => {
    expect(classifyStore(['restaurant', 'food'])).toBe('restaurant');
    expect(classifyStore(['cafe'])).toBe('cafe');
    expect(classifyStore(['bakery', 'food'])).toBe('cafe');
    expect(classifyStore(['shopping_mall'])).toBe('shopping');
    expect(classifyStore(['tourist_attraction'])).toBe('sight');
    expect(classifyStore(['museum'])).toBe('sight');
  });

  it('falls back to 其他 for unknown or empty types', () => {
    expect(classifyStore(['dentist'])).toBe('other');
    expect(classifyStore([])).toBe('other');
  });

  it('prefers the more specific group when types overlap', () => {
    // 咖啡店常同時帶 food/restaurant,不應被歸為餐廳
    expect(classifyStore(['cafe', 'food', 'restaurant'])).toBe('cafe');
    // 市場同時帶 store 與 tourist_attraction,以景點為主
    expect(classifyStore(['tourist_attraction', 'store', 'food'])).toBe('sight');
  });

  it('defaults to 餐廳 as the initial Avatar selection', () => {
    expect(DEFAULT_STORE_TYPE).toBe('restaurant');
  });
});

describe('selectSuggestions — 類型 × 距離過濾,依距離排序', () => {
  const near = store({ name: '近的餐廳', lat: 34.6669, lng: 135.5016 }); // ~0.1km
  const far = store({ name: '遠的餐廳', ...UMEDA }); // ~4.1km
  const outOfRange = store({ name: '京都的餐廳', lat: 35.0116, lng: 135.7681 }); // ~50km
  const cafe = store({ name: '咖啡', types: ['cafe'], lat: 34.6665, lng: 135.5016 });

  it('keeps only stores of the requested type within the radius, nearest first', () => {
    const result = selectSuggestions([far, outOfRange, near, cafe], {
      center: NAMBA,
      radiusKm: 5,
      type: 'restaurant',
    });
    expect(result.map((s) => s.name)).toEqual(['近的餐廳', '遠的餐廳']);
  });

  it('applies the tighter radius of the device-location mode', () => {
    const result = selectSuggestions([near, far], {
      center: NAMBA,
      radiusKm: 3,
      type: 'restaurant',
    });
    expect(result.map((s) => s.name)).toEqual(['近的餐廳']);
  });

  it('annotates each result with its distance and resolved type', () => {
    const [first] = selectSuggestions([near], { center: NAMBA, radiusKm: 5, type: 'restaurant' });
    expect(first?.distanceKm).toBeCloseTo(0.11, 1);
    expect(first?.type).toBe('restaurant');
  });

  it('returns an empty array when nothing matches', () => {
    expect(selectSuggestions([near], { center: NAMBA, radiusKm: 5, type: 'shopping' })).toEqual([]);
    expect(selectSuggestions([], { center: NAMBA, radiusKm: 5, type: 'restaurant' })).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [far, near];
    const snapshot = [...input];
    selectSuggestions(input, { center: NAMBA, radiusKm: 5, type: 'restaurant' });
    expect(input).toEqual(snapshot);
  });
});

describe('formatDistanceKm', () => {
  it('renders one decimal place with a km suffix', () => {
    expect(formatDistanceKm(1.24)).toBe('1.2km');
    expect(formatDistanceKm(0.05)).toBe('0.1km');
    expect(formatDistanceKm(0)).toBe('0.0km');
  });
});
