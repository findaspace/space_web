import { describe, expect, it } from 'vitest';

import { excerpt, nextMonthStart } from './dates';
import { facts, humanize } from './facts';

const fields = [
  { key: 'bedrooms', label: 'Bedrooms', kind: 'int' as const, weight: 3 },
  { key: 'bathrooms', label: 'Bathrooms', kind: 'int' as const, weight: 2 },
  { key: 'water_source', label: 'Water source', kind: 'enum' as const, weight: 3 },
  { key: 'self_contained', label: 'Self contained', kind: 'bool' as const, weight: 3 },
  { key: 'floor_area_sqm', label: 'Floor area', kind: 'float' as const, weight: 1, unit: 'm2' },
  { key: 'power_backup', label: 'Power backup', kind: 'enum' as const, weight: 3 },
];

describe('humanize', () => {
  it.each([
    ['semi_furnished', 'Semi furnished'],
    ['borehole', 'Borehole'],
    ['male_only', 'Male only'],
    ['', ''],
  ])('%s -> %s', (input, want) => {
    expect(humanize(input)).toBe(want);
  });
});

describe('facts', () => {
  const attrs = {
    bedrooms: 2, bathrooms: 1, water_source: 'borehole', self_contained: true,
    floor_area_sqm: 74.5, power_backup: 'inverter',
  };

  it('uses the schema labels and formats each kind', () => {
    const byKey = Object.fromEntries(facts(attrs, fields).map((f) => [f.key, f.value]));
    expect(byKey).toMatchObject({
      water_source: 'Borehole', self_contained: 'Yes', floor_area_sqm: '74.5 m²', bedrooms: '2',
    });
  });

  // Weight order puts water and power, the first questions anyone renting in
  // Ghana asks, ahead of floor area.
  it('orders by weight, keeping schema order among equals', () => {
    expect(facts(attrs, fields).map((f) => f.key)).toEqual([
      'bedrooms', 'water_source', 'self_contained', 'power_backup', 'bathrooms', 'floor_area_sqm',
    ]);
  });

  it('skips what the host did not answer', () => {
    expect(facts({ bedrooms: 3 }, fields)).toEqual([{ key: 'bedrooms', label: 'Bedrooms', value: '3' }]);
  });

  it('says No for a false boolean rather than hiding it', () => {
    expect(facts({ self_contained: false }, fields)[0]?.value).toBe('No');
  });

  // Without the schema the listing still shows its facts, just with keys made
  // readable, instead of looking empty.
  it('degrades to readable keys when the schema is unavailable', () => {
    expect(facts({ water_source: 'borehole' }, undefined)).toEqual([
      { key: 'water_source', label: 'Water source', value: 'Borehole' },
    ]);
  });
});

describe('nextMonthStart', () => {
  it('is the first of next month', () => {
    expect(nextMonthStart(new Date('2026-09-25T10:00:00Z'))).toBe('2026-10-01');
  });

  it('rolls December into January of the next year', () => {
    expect(nextMonthStart(new Date('2026-12-31T23:59:00Z'))).toBe('2027-01-01');
  });
});

describe('excerpt', () => {
  it('leaves short text alone', () => {
    expect(excerpt('Quiet compound.')).toBe('Quiet compound.');
  });

  it('cuts on a word boundary and marks the cut', () => {
    const out = excerpt('word '.repeat(60), 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('word…')).toBe(true);
  });

  it('collapses the line breaks a host typed', () => {
    expect(excerpt('Borehole water.\n\n\nInverter backup.')).toBe('Borehole water. Inverter backup.');
  });
});
