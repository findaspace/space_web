// The rules a new listing must satisfy, mirrored from space_api's database
// constraints so the form can say what is wrong immediately instead of after a
// round trip. The API is still the authority: these only make the common
// mistakes fail fast, in the host's own words.

export type Mode = 'term' | 'nightly' | 'flexible';

export const MIN_TITLE = 8;
export const MAX_OCCUPANCY = 500;
// Application cap. Applicable advance-rent rules depend on the tenancy.
export const MAX_ADVANCE_MONTHS = 6;
export const MAX_PHOTOS = 20;

// A price above this is almost certainly a typo, such as an extra zero, and
// worth catching before a renter sees GHS 130,000 a month.
const MAX_PRICE_CEDIS = 1_000_000;

// Mirrors spaces_period_matches_mode. Monthly for a lease, nightly for a stay.
export function periodFor(mode: Mode): 'month' | 'night' | 'hour' {
  return mode === 'term' ? 'month' : mode==='flexible' ? 'hour' : 'night';
}

// parseCedis turns what a host typed into minor units. It accepts the ways
// people actually write prices ("1300", "1,300", "1300.50", "GHS 1,300") and
// refuses anything ambiguous rather than guessing at it.
export function parseCedis(input: string): number | null {
  const cleaned = input.replace(/ghs|gh₵|₵|cedis?/gi, '').replace(/[\s,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > MAX_PRICE_CEDIS * 100) {
    return null;
  }
  return minor;
}

// defaultTitle writes the title for the host, so posting stays at three
// questions. "Chamber and hall in Madina" is what a renter would search for
// anyway, and the host can change it later.
export function defaultTitle(kindLabel: string, locality: string): string {
  const place = locality.trim();
  const title = place ? `${kindLabel} in ${place}` : kindLabel;
  return title.length >= MIN_TITLE ? title : `${title} to rent`;
}

export type Draft = {
  type?: string;
  mode?: Mode;
  latitude?: number;
  longitude?: number;
  locality: string;
  landmark: string;
  price: string;
  advanceMonths: number;
  occupancy: number;
  photos: number;
};

export type DraftErrors = Partial<Record<'photos' | 'type' | 'mode' | 'location' | 'locality' | 'price' | 'occupancy' | 'advance', string>>;

export function validateDraft(d: Draft, allowedModes: readonly string[]): DraftErrors {
  const e: DraftErrors = {};

  if (d.photos < 1) e.photos = 'Add at least one photo. Listings with photos are the ones that get rented.';
  if (d.photos > MAX_PHOTOS) e.photos = `Up to ${MAX_PHOTOS} photos per listing.`;
  if (!d.type) e.type = 'Choose what kind of space this is.';
  if (!d.mode) e.mode = 'Choose how it is rented.';
  else if (d.type && !allowedModes.includes(d.mode)) {
    e.mode = d.mode === 'nightly' ? 'This kind of space can only be rented monthly.' : 'This kind of space can only be rented by the night.';
  }
  if (d.latitude === undefined || d.longitude === undefined || !Number.isFinite(d.latitude) || !Number.isFinite(d.longitude) || Math.abs(d.latitude) > 90 || Math.abs(d.longitude) > 180) {
    e.location = 'Add the location, so renters can see how far it is from places they know.';
  }
  if (!d.locality.trim()) e.locality = 'Which area is it in? For example Madina or East Legon.';
  if (parseCedis(d.price) === null) e.price = 'Enter the price in cedis, for example 1,300.';
  if (!Number.isInteger(d.occupancy) || d.occupancy < 1 || d.occupancy > MAX_OCCUPANCY) {
    e.occupancy = `Between 1 and ${MAX_OCCUPANCY} people.`;
  }
  if (d.mode === 'term' && (d.advanceMonths < 0 || d.advanceMonths > MAX_ADVANCE_MONTHS)) {
    e.advance = `Between 0 and ${MAX_ADVANCE_MONTHS} months.`;
  }
  return e;
}

// GPS accuracy, in metres, beyond which the fix is too rough to route walk
// times from. Indoors, a phone can report a point a street or two away.
export const ROUGH_FIX_METRES = 100;

export function describeAccuracy(metres: number): 'good' | 'rough' {
  return metres <= ROUGH_FIX_METRES ? 'good' : 'rough';
}
