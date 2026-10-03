import { describe, expect, it } from 'vitest';

import { perLabel, whereLabel } from './format';

describe('perLabel', () => {
  it('covers every price period the API can return', () => {
    expect(perLabel('night')).toBe('/night');
    expect(perLabel('week')).toBe('/wk');
    expect(perLabel('month')).toBe('/mo');
    expect(perLabel('year')).toBe('/yr');
  });
});

describe('whereLabel', () => {
  it('uses the routed walk when there is one', () => {
    expect(whereLabel({ locality: 'Madina', landmark_name: 'Madina Market', walk_minutes: 6 })).toBe(
      '6 min walk to Madina Market',
    );
  });

  // An unrouted listing must not show a made-up distance.
  it('falls back to the locality, never a guessed distance', () => {
    expect(whereLabel({ locality: 'Madina' })).toBe('Madina');
    expect(whereLabel({ locality: 'Madina', landmark_name: 'Madina Market' })).toBe('Madina');
  });
});
