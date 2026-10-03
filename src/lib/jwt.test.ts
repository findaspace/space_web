import { describe, expect, it } from 'vitest';

import { decodeExpiry, needsRefresh } from './jwt';

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (payload: unknown) => `${b64({ alg: 'EdDSA' })}.${b64(payload)}.signature`;

describe('decodeExpiry', () => {
  it('reads exp from a well-formed token', () => {
    expect(decodeExpiry(token({ sub: 'u1', exp: 1_900_000_000 }))).toBe(1_900_000_000);
  });

  // Every malformed shape returns null instead of throwing, because this runs
  // in the proxy on every request and one bad cookie must not take a page down.
  it.each([
    ['empty string', ''],
    ['two segments', 'a.b'],
    ['four segments', 'a.b.c.d'],
    ['payload not base64 json', 'a.!!!.c'],
    ['payload is an array', `x.${b64([1, 2])}.y`],
    ['exp is a string', token({ exp: '1900000000' })],
    ['no exp at all', token({ sub: 'u1' })],
  ])('returns null for %s', (_, t) => {
    expect(decodeExpiry(t)).toBeNull();
  });
});

describe('needsRefresh', () => {
  const now = 1_800_000_000;

  it('refreshes when there is no token', () => {
    expect(needsRefresh(undefined, now)).toBe(true);
  });

  it('keeps a token with comfortable time left', () => {
    expect(needsRefresh(token({ exp: now + 600 }), now)).toBe(false);
  });

  it('refreshes inside the skew window, before actual expiry', () => {
    expect(needsRefresh(token({ exp: now + 10 }), now)).toBe(true);
  });

  it('refreshes an expired token', () => {
    expect(needsRefresh(token({ exp: now - 1 }), now)).toBe(true);
  });

  it('refreshes a token it cannot read', () => {
    expect(needsRefresh('garbage', now)).toBe(true);
  });
});
