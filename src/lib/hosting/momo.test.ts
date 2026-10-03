import { describe, expect, it } from 'vitest';

import { guessNetwork, maskNumber, nationalDigits, networkLabel } from './momo';

describe('nationalDigits', () => {
  it.each([
    ['0244123456', '244123456'],
    ['244123456', '244123456'],
    ['+233 24 412 3456', '244123456'],
    ['233-24-412-3456', '244123456'],
  ])('%s -> %s', (input, want) => {
    expect(nationalDigits(input)).toBe(want);
  });

  it.each(['', '024412345', '02441234567', 'abc'])('refuses %j', (input) => {
    expect(nationalDigits(input)).toBeNull();
  });
});

describe('guessNetwork', () => {
  it('suggests the issuing network from the prefix', () => {
    expect(guessNetwork('0244123456')).toBe('MTN');
    expect(guessNetwork('0501234567')).toBe('VOD');
    expect(guessNetwork('0271234567')).toBe('ATL');
  });

  it('makes no guess for a prefix it does not know', () => {
    expect(guessNetwork('0301234567')).toBeNull();
  });
});

describe('display', () => {
  it('shows only the last four digits', () => {
    expect(maskNumber('0244123456')).toBe('ending 3456');
  });

  it('names networks by their current brand', () => {
    expect(networkLabel('VOD')).toBe('Telecel Cash');
    expect(networkLabel('ATL')).toBe('AT Money');
  });
});
