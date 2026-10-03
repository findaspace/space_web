import { describe, expect, it } from 'vitest';

import { defaultTitle, describeAccuracy, parseCedis, periodFor, validateDraft, type Draft } from './draft';
import { runLimited } from './limit';
import { quickQuestions } from './questions';

describe('parseCedis', () => {
  it.each([
    ['1300', 130000],
    ['1,300', 130000],
    ['1300.50', 130050],
    ['1300.5', 130050],
    ['GHS 1,300', 130000],
    ['₵850', 85000],
    ['  2 500 ', 250000],
    ['0.05', 5],
  ])('reads %j as %i minor units', (input, want) => {
    expect(parseCedis(input)).toBe(want);
  });

  // Anything ambiguous is refused, never guessed at: a mistaken price is the
  // most expensive typo on the platform.
  it.each(['', 'abc', '-500', '0', '1.234', '1e5', '13,00.00.1', '2000000'])('refuses %j', (input) => {
    expect(parseCedis(input)).toBeNull();
  });
});

describe('periodFor', () => {
  it('matches the database rule tying period to mode', () => {
    expect(periodFor('term')).toBe('month');
    expect(periodFor('nightly')).toBe('night');
  });
});

describe('defaultTitle', () => {
  it('reads like what a renter searches for', () => {
    expect(defaultTitle('Chamber and hall', 'Madina')).toBe('Chamber and hall in Madina');
  });

  // The database refuses titles under eight characters.
  it('never falls below the eight-character minimum', () => {
    expect(defaultTitle('Room', 'Ho')).toBe('Room in Ho');
    expect(defaultTitle('Shop', '').length).toBeGreaterThanOrEqual(8);
  });
});

describe('validateDraft', () => {
  const good: Draft = {
    type: 'chamber_and_hall', mode: 'term', latitude: 5.68, longitude: -0.16,
    locality: 'Madina', landmark: '', price: '1,300', advanceMonths: 6, occupancy: 2, photos: 3,
  };

  it('accepts a complete draft', () => {
    expect(validateDraft(good, ['term', 'nightly'])).toEqual({});
  });

  it('names every missing piece at once', () => {
    const errors = validateDraft(
      { locality: '', landmark: '', price: '', advanceMonths: 12, occupancy: 2, photos: 0 },
      [],
    );
    expect(Object.keys(errors).sort()).toEqual(['locality', 'location', 'mode', 'photos', 'price', 'type']);
  });

  // Mirrors spaces_mode_allowed_for_type: a shop cannot be rented by the night.
  it('refuses a mode the space type does not allow', () => {
    expect(validateDraft({ ...good, type: 'shop', mode: 'nightly' }, ['term']).mode).toMatch(/only be rented monthly/);
  });

  it('enforces the database ranges', () => {
    expect(validateDraft({ ...good, occupancy: 0 }, ['term']).occupancy).toBeDefined();
    expect(validateDraft({ ...good, advanceMonths: 25 }, ['term']).advance).toBeDefined();
    // The legal limit: more than six months' advance is an offence.
    expect(validateDraft({ ...good, advanceMonths: 7 }, ['term']).advance).toBeDefined();
    expect(validateDraft({ ...good, advanceMonths: 6 }, ['term']).advance).toBeUndefined();
    expect(validateDraft({ ...good, photos: 21 }, ['term']).photos).toBeDefined();
  });
});

describe('describeAccuracy', () => {
  it('flags a fix too rough to route walks from', () => {
    expect(describeAccuracy(15)).toBe('good');
    expect(describeAccuracy(400)).toBe('rough');
  });
});

describe('quickQuestions', () => {
  const fields = [
    { key: 'bedrooms', label: 'Bedrooms', kind: 'int' as const, weight: 3 },
    { key: 'furnishing', label: 'Furnishing', kind: 'enum' as const, weight: 2, options: ['none', 'full'] },
    { key: 'water_source', label: 'Water source', kind: 'enum' as const, weight: 3, options: ['pipe', 'borehole'] },
    { key: 'self_contained', label: 'Self contained', kind: 'bool' as const, weight: 3 },
    { key: 'power_backup', label: 'Power backup', kind: 'enum' as const, weight: 3, options: ['none', 'inverter'] },
    { key: 'notes', label: 'Notes', kind: 'string' as const, weight: 3 },
  ];

  // One-tap fields only, heaviest first; a number or free text needs a keyboard.
  it('asks the heaviest one-tap questions first', () => {
    expect(quickQuestions(fields, {}).map((f) => f.key)).toEqual(['water_source', 'self_contained', 'power_backup']);
  });

  it('skips what is already answered', () => {
    expect(quickQuestions(fields, { water_source: 'pipe' }).map((f) => f.key)).toEqual([
      'self_contained', 'power_backup', 'furnishing',
    ]);
  });

  it('asks nothing when the schema is unavailable', () => {
    expect(quickQuestions(undefined, {})).toEqual([]);
  });
});

describe('runLimited', () => {
  it('never runs more than the limit at once', async () => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 7 }, (_, i) => async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return i;
    });
    const results = await runLimited(tasks, 2);
    expect(peak).toBe(2);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  // One failed photo must not stop the others.
  it('lets every task settle when one fails', async () => {
    const results = await runLimited(
      [async () => 1, async () => Promise.reject(new Error('network')), async () => 3],
      2,
    );
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  });
});
