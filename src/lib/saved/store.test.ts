import { describe, expect, it } from 'vitest';

import { decodeSaved } from './store';

const listing = { slug: 'bright-room', title: 'Bright room in Madina', space_type: 'room', rental_mode: 'term', price_minor: 120000, currency: 'GHS', price_period: 'month', locality: 'Madina', latitude: 5.6, longitude: -0.1, photo_count: 1, review_count: 0, cover_url: 'https://example.com/photo.jpg' };
describe('saved snapshots', () => {
  it('recovers from corrupt or non-array storage', () => { for (const raw of [null, 'bad', '{}', 'null', '42']) expect(decodeSaved(raw)).toEqual([]); });
  it('retains a valid public listing', () => { expect(decodeSaved(JSON.stringify([listing]))).toEqual([listing]); });
  it('rejects unsafe routes and image protocols', () => { expect(decodeSaved(JSON.stringify([{ ...listing, slug: '../account' }, { ...listing, cover_url: 'javascript:alert(1)' }]))).toEqual([]); });
  it('rejects missing or invalid money and coordinates', () => { expect(decodeSaved(JSON.stringify([{ ...listing, price_minor: -1 }, { ...listing, price_minor: 1.1 }, { ...listing, latitude: '5.6' }, { ...listing, currency: 'USD' }]))).toEqual([]); });
  it('deduplicates and bounds user-controlled local storage', () => { expect(decodeSaved(JSON.stringify([listing, listing]))).toHaveLength(1); expect(decodeSaved(JSON.stringify(Array.from({ length: 110 }, (_, i) => ({ ...listing, slug: `room-${i}` }))))).toHaveLength(100); });
});
