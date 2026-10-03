import { describe, expect, it } from 'vitest';

import { safeNext } from './redirect';

describe('safeNext', () => {
  it.each([
    ['/bookings', '/bookings'],
    ['/s/room-in-madina-a1b2c3', '/s/room-in-madina-a1b2c3'],
    ['/search?q=madina&type=room', '/search?q=madina&type=room'],
    ['/account#payouts', '/account#payouts'],
  ])('keeps the same-origin path %s', (input, want) => {
    expect(safeNext(input)).toBe(want);
  });

  // Each of these is a known open-redirect bypass. All must land on the home
  // page, never on another site.
  it.each([
    ['absolute url', 'https://evil.example/login'],
    ['protocol relative', '//evil.example'],
    ['backslash variant', '/\\evil.example'],
    ['encoded tab trick', '/\t/evil.example'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['no leading slash', 'evil.example'],
    ['data url', 'data:text/html,<script>alert(1)</script>'],
    ['empty', ''],
    ['missing', null],
  ])('rejects %s', (_, input) => {
    expect(safeNext(input)).toBe('/');
  });
});
