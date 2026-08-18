import { describe, expect, it } from 'vitest';
import { geocodeUrl, parseGeocodeResponse } from './geocode';

describe('geocodeUrl', () => {
  it('puts the address in the path, not a query parameter', () => {
    expect(geocodeUrl('難波')).toContain(
      `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent('難波')}`,
    );
  });

  it('encodes spaces and Chinese so multi-word areas survive the path', () => {
    const url = geocodeUrl('臨空城 → KIX');
    expect(url).toContain(encodeURIComponent('臨空城 → KIX'));
    expect(url).not.toContain(' ');
  });

  it('carries the language code', () => {
    expect(geocodeUrl('難波')).toContain('languageCode=zh-TW');
  });
});

describe('parseGeocodeResponse', () => {
  it('reads the first result location', () => {
    const body = {
      results: [
        { location: { latitude: 34.6659, longitude: 135.5016 }, formattedAddress: '大阪' },
        { location: { latitude: 1, longitude: 2 } },
      ],
    };
    expect(parseGeocodeResponse(body)).toEqual({ lat: 34.6659, lng: 135.5016 });
  });

  it('treats an empty results array as no match (v4 has no ZERO_RESULTS status)', () => {
    expect(parseGeocodeResponse({ results: [] })).toBeNull();
  });

  it('returns null when results is missing entirely', () => {
    expect(parseGeocodeResponse({})).toBeNull();
  });

  it('returns null when the location block is absent', () => {
    expect(parseGeocodeResponse({ results: [{ formattedAddress: '大阪' }] })).toBeNull();
  });

  it('returns null when a coordinate is not a number', () => {
    const body = { results: [{ location: { latitude: '34.6', longitude: 135.5 } }] };
    expect(parseGeocodeResponse(body)).toBeNull();
  });

  it('survives a non-object body without throwing', () => {
    expect(parseGeocodeResponse(null)).toBeNull();
    expect(parseGeocodeResponse('nope')).toBeNull();
  });
});
