import { describe, expect, it } from 'vitest';

import { clientFrom, forwardHeaders } from './forwarded';

describe('clientFrom', () => {
  it('reads a single forwarded IP', () => {
    expect(clientFrom(new Headers({ 'x-forwarded-for': '41.66.1.2' })).ip).toBe('41.66.1.2');
  });

  // A client can send any x-forwarded-for it likes. If a proxy appends the real
  // address, the real one is last; taking the first would let a user choose
  // their own rate-limit bucket.
  it('takes the last entry, which infrastructure added', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 41.66.1.2' });
    expect(clientFrom(h).ip).toBe('41.66.1.2');
  });

  it('handles IPv6 and stray whitespace', () => {
    const h = new Headers({ 'x-forwarded-for': ' 2c0f:fe38::1 ' });
    expect(clientFrom(h).ip).toBe('2c0f:fe38::1');
  });

  it('returns nothing rather than an empty string when absent', () => {
    expect(clientFrom(new Headers()).ip).toBeUndefined();
    expect(clientFrom(new Headers({ 'x-forwarded-for': ' , ' })).ip).toBeUndefined();
  });

  it('carries the user agent so sessions show the real device', () => {
    const h = new Headers({ 'user-agent': 'Mozilla/5.0 (Linux; Android 13; TECNO)' });
    expect(clientFrom(h).userAgent).toContain('TECNO');
  });
});

describe('forwardHeaders', () => {
  it('always sends the secret, and the caller only when known', () => {
    expect(forwardHeaders('s'.repeat(32))).toEqual({ 'X-Space-BFF': 's'.repeat(32) });
    expect(forwardHeaders('s'.repeat(32), { ip: '41.66.1.2', userAgent: 'UA' })).toEqual({
      'X-Space-BFF': 's'.repeat(32),
      'X-Forwarded-For': '41.66.1.2',
      'User-Agent': 'UA',
    });
  });
});
