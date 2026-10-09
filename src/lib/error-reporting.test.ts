import { describe, expect, it } from 'vitest';
import { routeCategory, safeDigest } from './error-reporting';
describe('Privacy of error telemetry', () => {
  it('groups private identifiers instead of recording them', () => {
    expect(routeCategory('/inbox/a-private-conversation-id')).toBe('conversation');
    expect(routeCategory('/s/a-host-property-address')).toBe('listing');
    expect(routeCategory('/account')).toBe('account');
    expect(routeCategory('/unknown-personal-path')).toBe('other');
  });
  it('rejects text, URLs and oversized digest values', () => {
    expect(safeDigest('128349-a')).toBe('128349-a');
    for (const value of ['alice@example.com', 'https://private.invalid', 'a'.repeat(81), null, {}, 'Error: secret']) expect(safeDigest(value)).toBeUndefined();
  });
});
