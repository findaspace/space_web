import { describe, expect, it } from 'vitest';

import { GROUPS } from './groups';
import { CATEGORIES, hasFilters, hrefFor, parseSearch, toApiQuery } from './params';

const parse = (query: string) => parseSearch(new URLSearchParams(query));
describe('purpose groups', () => {
  it('maps every supported space type exactly once', () => { const types = GROUPS.flatMap((g) => [...g.types]); expect([...types].sort()).toEqual(CATEGORIES.map((c) => c.value).sort()); expect(new Set(types).size).toBe(types.length); });
  it('sends group types as a single comma-separated API parameter', () => { expect(toApiQuery(parse('group=workspaces')).type).toBe('office,shop,warehouse'); });
  it('lets a specific subtype narrow a group', () => { expect(toApiQuery(parse('group=homes&type=room')).type).toBe('room'); });
  it('drops the old subtype and cursor when moving groups', () => { expect(hrefFor(parse('group=homes&type=room&cursor=MTIz'), { group: 'workspaces' })).toBe('/?group=workspaces'); });
  it('maps the new sports group to supported API types',()=>{expect(parse('group=sports').group).toBe('sports');expect(toApiQuery(parse('group=sports')).type).toBe('football_pitch,sports_court,sports_facility');expect(parse('group=unknown').group).toBeUndefined();});
  it('treats groups and map view as results pages', () => { expect(hasFilters(parse('group=hostels'))).toBe(true); expect(hasFilters(parse('view=map'))).toBe(true); });
});
