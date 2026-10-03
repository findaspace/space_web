import { describe, expect, it } from 'vitest';

import { formatMinor } from './money';

describe('formatMinor', () => {
  it.each([
    [0, 'GHS 0'],
    [100, 'GHS 1'],
    [85000, 'GHS 850'],
    [450000, 'GHS 4,500'],
    [1820000, 'GHS 18,200'],
    [123456789, 'GHS 1,234,567.89'],
    [5, 'GHS 0.05'],
    [150, 'GHS 1.50'],
  ])('formats %i as %s', (minor, want) => {
    expect(formatMinor(minor)).toBe(want);
  });

  // The pesewa that floating point loses. 1234567.89 is not representable in
  // binary, and dividing first then rounding is how a total goes off by one.
  it('never loses a pesewa to floating point', () => {
    expect(formatMinor(123456789)).toBe('GHS 1,234,567.89');
    expect(formatMinor(19)).toBe('GHS 0.19');
    expect(formatMinor(1000001)).toBe('GHS 10,000.01');
  });

  it('puts the sign before the currency', () => {
    expect(formatMinor(-100000)).toBe('-GHS 1,000');
  });

  it('can drop the currency inside a labelled column', () => {
    expect(formatMinor(450000, { currency: false })).toBe('4,500');
  });

  // A float here means someone divided by 100 upstream and the value is
  // already wrong. Refusing it is better than printing a plausible number.
  it('refuses anything that is not an integer of minor units', () => {
    expect(() => formatMinor(45.5)).toThrow(RangeError);
    expect(() => formatMinor(Number.NaN)).toThrow(RangeError);
    expect(() => formatMinor(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });

  // The cedi sign is outside GSM-7 and space_api's SMS receipts avoid it, so
  // the screen avoids it too and the two always read the same.
  it('writes GHS, never the cedi sign', () => {
    expect(formatMinor(450000)).not.toContain('₵');
  });
});
