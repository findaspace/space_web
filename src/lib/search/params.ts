import { groupFor, type Group } from './groups';

// Search state lives in the URL, so any search can be shared: "rooms in
// Madina, monthly, under GHS 1,500" becomes a link someone sends a friend on
// WhatsApp. This module is the only place that reads that URL or writes it.
//
// The URL is written for people and translated for the API. A shared link
// says ?mode=monthly&max=1500, not ?mode=term&max_price=150000, because the
// person reading it in a chat is not a database.

// Values and order match space_api's space_type enum exactly; the order is by
// what people in this market look for most, not alphabetical.
export const CATEGORIES = [
  { value:'football_pitch',label:'Football pitch' },
 {value:'sports_court',label:'Sports court'},
 {value:'sports_facility',label:'Sports facility'},
 {value:'studio',label:'Studio'},
  { value: 'room', label: 'Room' },
  { value: 'self_contained', label: 'Self contained' },
  { value: 'chamber_and_hall', label: 'Chamber and hall' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'hostel_bed', label: 'Hostel bed' },
  { value: 'shop', label: 'Shop' },
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'event_space', label: 'Event space' },
  { value: 'land', label: 'Land' },
  { value: 'parking', label: 'Parking' },
  { value: 'boys_quarters', label: 'Boys quarters' },
] as const;

export type Category = (typeof CATEGORIES)[number]['value'];

// People say monthly and nightly; the API says term and nightly.
export const MODES = [
  { value: 'monthly', label: 'Monthly', api: 'term', period:'month' },
  { value: 'nightly', label: 'Nightly', api: 'nightly', period:'night' },
 {value:'hourly',label:'Hourly',api:'flexible',period:'hour'},
 {value:'daily',label:'Daily',api:'flexible',period:'day'},
 {value:'weekly',label:'Weekly',api:'flexible',period:'week'},
 {value:'yearly',label:'Yearly',api:'term',period:'year'},
 {value:'semester',label:'Semester',api:'term',period:'semester'},
 {value:'academic_year',label:'Academic year',api:'term',period:'academic_year'},
] as const;

export type Mode = (typeof MODES)[number]['value'];

export const SORTS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'newest', label: 'Newest' },
] as const;

export type Sort = (typeof SORTS)[number]['value'];

// Budgets are only offered once a mode is chosen: a limit of GHS 500 means
// something completely different per night and per month, and applying it
// across both would hide cheap monthly rooms behind expensive nightly ones.
export const BUDGETS: Record<Mode, readonly number[]> = {
  monthly: [500, 1000, 2000, 3000, 5000, 10000],
  nightly: [100, 200, 300, 500, 1000],
 hourly:[50,100,200,500],daily:[100,200,500,1000],weekly:[500,1000,5000],yearly:[5000,10000,20000],semester:[1000,3000,5000],academic_year:[1000,3000,5000,10000],
};

export type SearchState = {
  q: string;
  group?: Group;
  type?: Category;
  mode?: Mode;
  max?: number; // whole cedis, as the URL shows it
  sort: Sort;
  cursor?: string;
  // Phones show the list or the map, and the choice lives in the URL, so a
  // map can be shared and the back button leaves it. Desktops show both.
  view?: 'map';
};

const MAX_QUERY_LENGTH = 80;
const MAX_BUDGET_CEDIS = 10_000_000;

const categoryValues = new Set<string>(CATEGORIES.map((c) => c.value));
const modeValues = new Set<string>(MODES.map((m) => m.value));
const sortValues = new Set<string>(SORTS.map((s) => s.value));

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

// parseSearch never throws and never passes through anything it does not
// recognise. A URL is written by whoever sent it, so an unknown category, a
// negative budget or a cursor full of junk is dropped rather than forwarded.
export function parseSearch(params: Params): SearchState {
  const q = (read(params, 'q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);

  const rawType = read(params, 'type');
  const group = groupFor(read(params, 'group'));
  const type = rawType && categoryValues.has(rawType) ? (rawType as Category) : undefined;

  const rawMode = read(params, 'mode');
  let mode = rawMode && modeValues.has(rawMode) ? (rawMode as Mode) : undefined;

  // The search pill sends its budget as one value carrying its own period,
  // "monthly-1500", because a budget means nothing without one. A mode given
  // separately wins.
  const budget = /^(monthly|nightly)-(\d{1,8})$/.exec(read(params, 'budget') ?? '');

  const rawSort = read(params, 'sort');
  const sort = rawSort && sortValues.has(rawSort) ? (rawSort as Sort) : 'relevance';

  // A budget without a mode is meaningless, so it is dropped with the mode.
  let max: number | undefined;
  if (!mode && budget) {
    mode = budget[1] as Mode;
  }
  const rawMax = read(params, 'max') ?? (budget && budget[1] === mode ? budget[2] : undefined);
  if (mode && rawMax && /^\d{1,8}$/.test(rawMax)) {
    const n = Number(rawMax);
    if (n > 0 && n <= MAX_BUDGET_CEDIS) {
      max = n;
    }
  }

  // Cursors are opaque base64url from space_api. Anything else is either a
  // mangled link or an attempt to feed the API garbage.
  const rawCursor = read(params, 'cursor');
  const cursor = rawCursor && /^[A-Za-z0-9_-]{1,200}$/.test(rawCursor) ? rawCursor : undefined;

  const view = read(params, 'view') === 'map' ? ('map' as const) : undefined;

  return { q, type, mode, max, sort, cursor, view, ...(group ? { group: group.value } : {}) };
}

// The exact query space_api's GET /v1/search reads.
export type ApiSearchQuery = {
  q?: string;
  type?: string;
  mode?: 'term' | 'nightly' | 'flexible';
 price_period?: 'night'|'week'|'month'|'year'|'hour'|'day'|'semester'|'academic_year';
  max_price?: number;
  sort?: Sort;
  cursor?: string;
  limit: number;
};

export const PAGE_SIZE = 20;

export function toApiQuery(state: SearchState): ApiSearchQuery {
  const query: ApiSearchQuery = { limit: PAGE_SIZE };
  if (state.q) query.q = state.q;
  // One string, never an array: the API reads this parameter with a single
  // Get, so type=room&type=shop would silently drop everything after the
  // first value.
  if (state.type) query.type = state.type;
  else if (state.group) query.type = groupFor(state.group)?.types.join(',');
  if (state.mode) { const selected=MODES.find((m)=>m.value===state.mode)!;query.mode=selected.api;query.price_period=selected.period; }
  if (state.mode && state.max) query.max_price = state.max * 100;
  if (state.sort !== 'relevance') query.sort = state.sort;
  if (state.cursor) query.cursor = state.cursor;
  return query;
}

// hrefFor builds the URL for a search. Defaults are left out so shared links
// stay short, the keys come out in a fixed order so the same search is always
// the same link, and the cursor is dropped whenever a filter changes: a new
// search starts at the first page, not partway through the old one.
export function hrefFor(state: SearchState, change: Partial<SearchState> = {}): string {
  const filterChanged = Object.keys(change).some((k) => k !== 'cursor');
  const next: SearchState = { ...state, ...change };
  if (filterChanged && !('cursor' in change)) {
    next.cursor = undefined;
  }
  // Switching mode invalidates a budget chosen for the other mode.
  if ('group' in change && change.group !== state.group && !('type' in change)) next.type = undefined;
  if ('mode' in change && change.mode !== state.mode && !('max' in change)) {
    next.max = undefined;
  }

  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.group) params.set('group', next.group);
  if (next.type) params.set('type', next.type);
  if (next.mode) params.set('mode', next.mode);
  if (next.mode && next.max) params.set('max', String(next.max));
  if (next.sort !== 'relevance') params.set('sort', next.sort);
  if (next.cursor) params.set('cursor', next.cursor);
  if (next.view) params.set('view', next.view);

  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export function hasFilters(state: SearchState): boolean {
  return Boolean(state.q || state.group || state.type || state.mode || state.view || state.sort !== 'relevance');
}
