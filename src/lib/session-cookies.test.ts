import { describe, expect, it } from 'vitest';

import { cookieOptions } from './session-cookies';

describe('cookieOptions', () => {
  const now = Date.parse('2026-09-25T12:00:00Z');

  it('lives exactly as long as the token', () => {
    expect(cookieOptions('2026-09-25T12:15:00Z', now).maxAge).toBe(900);
  });

  // An expired or unreadable expiry must produce a cookie the browser drops
  // immediately, never one that lingers with a dead token in it.
  it('expires immediately for a past or invalid timestamp', () => {
    expect(cookieOptions('2026-09-25T11:00:00Z', now).maxAge).toBe(0);
    expect(cookieOptions('not a date', now).maxAge).toBe(0);
  });

  it('is never readable by page JavaScript and never sent cross-site on POST', () => {
    const o = cookieOptions('2026-09-25T12:15:00Z', now);
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe('lax');
    expect(o.path).toBe('/');
  });
});
