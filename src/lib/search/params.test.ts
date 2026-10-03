import { describe, expect, it } from 'vitest';

import { hasFilters, hrefFor, parseSearch, toApiQuery } from './params';

const p = (qs: string) => parseSearch(new URLSearchParams(qs));

describe('parseSearch', () => {
  it('defaults to an unfiltered search', () => {
    expect(p('')).toEqual({ q: '', sort: 'relevance', type: undefined, mode: undefined, max: undefined, cursor: undefined, view: undefined });
  });

  it('reads a full shared link', () => {
    expect(p('q=Madina&type=room&mode=monthly&max=1500&sort=price_asc')).toMatchObject({
      q: 'Madina', type: 'room', mode: 'monthly', max: 1500, sort: 'price_asc',
    });
  });

  // Everything in a URL was written by whoever sent it.
  it('drops values it does not recognise', () => {
    const s = p('type=castle&mode=unsupported&sort=random&max=-5');
    expect(s.type).toBeUndefined();
    expect(s.mode).toBeUndefined();
    expect(s.sort).toBe('relevance');
    expect(s.max).toBeUndefined();
  });

  it('drops a budget when no mode is chosen', () => {
    expect(p('max=1500').max).toBeUndefined();
  });

  it.each(['1.5', '1e5', '0', '99999999999', 'abc', ' 500'])('rejects the budget %j', (raw) => {
    expect(p(`mode=monthly&max=${encodeURIComponent(raw)}`).max).toBeUndefined();
  });

  it('trims and caps the text query', () => {
    expect(p('q=%20%20East%20Legon%20%20').q).toBe('East Legon');
    expect(p(`q=${'a'.repeat(200)}`).q).toHaveLength(80);
  });

  it('keeps a well-formed cursor and drops junk', () => {
    expect(p('cursor=MTIzOmFiYw').cursor).toBe('MTIzOmFiYw');
    expect(p('cursor=../../etc').cursor).toBeUndefined();
    expect(p(`cursor=${'a'.repeat(300)}`).cursor).toBeUndefined();
  });

  it('accepts the record form Next.js passes to pages', () => {
    expect(parseSearch({ type: ['shop', 'room'], q: undefined }).type).toBe('shop');
  });
});

describe('toApiQuery', () => {
  it('translates the human URL into what space_api reads', () => {
    expect(toApiQuery(p('q=Madina&type=room&mode=monthly&max=1500&sort=price_asc'))).toEqual({
      q: 'Madina', type: 'room', mode: 'term', price_period:'month', max_price: 150000, sort: 'price_asc', limit: 20,
    });
  });

  it('sends nothing for defaults, so the API applies its own', () => {
    expect(toApiQuery(p(''))).toEqual({ limit: 20 });
  });

  it('maps nightly through unchanged', () => {
    expect(toApiQuery(p('mode=nightly&max=300'))).toMatchObject({ mode: 'nightly', max_price: 30000 });
  });
});

describe('hrefFor', () => {
  const base = p('q=Madina&type=room&mode=monthly&max=1500&cursor=MTIz');

  it('builds the same link for the same search, in a fixed order', () => {
    expect(hrefFor(p('sort=newest&q=Osu&type=shop'))).toBe('/?q=Osu&type=shop&sort=newest');
  });

  it('is just / for an unfiltered search', () => {
    expect(hrefFor(p(''))).toBe('/');
  });

  // A new filter is a new search; resuming halfway through the old results
  // would show page three of something the user never asked for.
  it('drops the cursor when a filter changes', () => {
    expect(hrefFor(base, { type: 'shop' })).toBe('/?q=Madina&type=shop&mode=monthly&max=1500');
  });

  it('keeps everything when only the cursor moves', () => {
    expect(hrefFor(base, { cursor: 'NDU2' })).toBe('/?q=Madina&type=room&mode=monthly&max=1500&cursor=NDU2');
  });

  it('drops the budget when the mode changes', () => {
    expect(hrefFor(base, { mode: 'nightly' })).toBe('/?q=Madina&type=room&mode=nightly');
  });

  it('clears a category', () => {
    expect(hrefFor(base, { type: undefined })).toBe('/?q=Madina&mode=monthly&max=1500');
  });
});

describe('hasFilters', () => {
  it('is false only for the default search', () => {
    expect(hasFilters(p(''))).toBe(false);
    expect(hasFilters(p('type=room'))).toBe(true);
    expect(hasFilters(p('sort=newest'))).toBe(true);
  });
});

describe('view', () => {
  it('reads the map view and ignores anything else', () => {
    expect(p('view=map').view).toBe('map');
    expect(p('view=satellite').view).toBeUndefined();
  });

  // Filtering from the map must keep the map open, not throw the user back
  // to the list.
  it('survives a filter change', () => {
    expect(hrefFor(p('type=room&view=map'), { type: 'shop' })).toBe('/?type=shop&view=map');
  });

  it('is left out of what the API is asked', () => {
    expect(toApiQuery(p('view=map&type=room'))).toEqual({ type: 'room', limit: 20 });
  });

  it('can be closed', () => {
    expect(hrefFor(p('type=room&view=map'), { view: undefined })).toBe('/?type=room');
  });
});

describe('budget from the search pill', () => {
  it('sets both the period and the limit', () => {
    expect(p('budget=monthly-1500')).toMatchObject({ mode: 'monthly', max: 1500 });
  });

  it('is ignored when it does not match an explicitly chosen period', () => {
    expect(p('mode=nightly&budget=monthly-1500')).toMatchObject({ mode: 'nightly', max: undefined });
  });

  it('refuses anything else', () => {
    expect(p('budget=weekly-10')).toMatchObject({ mode: undefined, max: undefined });
    expect(p('budget=monthly-abc').max).toBeUndefined();
  });

  it('comes out as the plain period and limit in shared links', () => {
    expect(hrefFor(p('budget=monthly-1500&type=room'))).toBe('/?type=room&mode=monthly&max=1500');
  });
});
