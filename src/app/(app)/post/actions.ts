'use server';

import { z } from 'zod';

import { actionClient as client, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';
import { MAX_ADVANCE_MONTHS, MAX_OCCUPANCY, MIN_TITLE } from '@/lib/post/draft';

// Every Server Action is a public endpoint that anyone can call with anything,
// so each one checks the session and validates its input itself. Ownership is
// enforced by space_api: calling these with someone else's listing id gets a
// 404 from the API, never their listing.

export type { ActionResult };

const uuid = z.uuid();

const createSchema = z.object({
  space_type: z.enum([
    'room', 'self_contained', 'chamber_and_hall', 'apartment', 'house', 'boys_quarters',
    'hostel_bed', 'shop', 'office', 'warehouse', 'event_space', 'land', 'parking','studio','football_pitch','sports_court','sports_facility',
  ]),
  rental_mode: z.enum(['term', 'nightly','flexible']),
 price_period:z.enum(['night','week','month','year','hour','day','semester','academic_year']).optional(),
  title: z.string().trim().min(MIN_TITLE).max(120),
  description: z.string().trim().max(5000).optional(),
  digital_address: z.string().trim().max(80).optional(),
  base_price_minor: z.number().int().positive(),
  deposit_minor: z.number().int().min(0).optional(),
  advance_months: z.number().int().min(0).max(MAX_ADVANCE_MONTHS),
  max_occupancy: z.number().int().min(1).max(MAX_OCCUPANCY),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locality: z.string().trim().min(1).max(80),
  landmark: z.string().trim().max(120),
});

export type CreateInput = z.infer<typeof createSchema>;

export async function createListing(input: CreateInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Some details are missing or invalid.' };
  }
  const d = parsed.data;

  const api = await client();
  if (!api) return signedOut;

  try {
    const created = await unwrap(
      api.POST('/v1/spaces', {
        body: {
          space_type: d.space_type,
          rental_mode: d.rental_mode,
          title: d.title,
          description: d.description,
          base_price_minor: d.base_price_minor,
          currency: 'GHS',
          // Mirrors spaces_period_matches_mode.
          price_period: d.price_period ?? (d.rental_mode === 'term' ? 'month' : d.rental_mode==='flexible' ? 'hour' : 'night'),
          deposit_minor: d.deposit_minor ?? 0,
          advance_months: d.rental_mode === 'term' ? d.advance_months : 0,
          max_occupancy: d.max_occupancy,
          location: {
            latitude: d.latitude,
            longitude: d.longitude,
            locality: d.locality,
            landmark: d.landmark,
            digital_address: d.digital_address,
            country: 'GH',
          },
        },
      }),
    );
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    return failure(err);
  }
}

export type Ticket = { mediaId: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number };

export async function requestUpload(spaceId: string): Promise<ActionResult<Ticket>> {
  if (!uuid.safeParse(spaceId).success) return { ok: false, error: 'Unknown listing.' };
  const api = await client();
  if (!api) return signedOut;

  try {
    // Always JPEG: the browser re-encodes every photo before it is uploaded.
    const ticket = await unwrap(
      api.POST('/v1/spaces/{id}/media', {
        params: { path: { id: spaceId } },
        body: { content_type: 'image/jpeg' },
      }),
    );
    if (ticket.method && ticket.method !== 'PUT') return { ok: false, error: 'This upload method is not supported. Please contact support.' };
    return { ok: true, data: { mediaId: ticket.media.id, uploadUrl: ticket.upload_url, headers: ticket.headers, maxBytes: ticket.max_bytes } };
  } catch (err) {
    return failure(err);
  }
}

export async function confirmUpload(spaceId: string, mediaId: string): Promise<ActionResult<null>> {
  if (!uuid.safeParse(spaceId).success || !/^[\w-]{1,64}$/.test(mediaId)) {
    return { ok: false, error: 'Unknown photo.' };
  }
  const api = await client();
  if (!api) return signedOut;

  try {
    await unwrap(
      api.POST('/v1/spaces/{id}/media/{mediaId}/confirm', { params: { path: { id: spaceId, mediaId } } }),
    );
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}

// readyPhotos counts photos the worker has finished processing. The API lists
// only ready ones, so the length is the count.
export async function readyPhotos(spaceId: string): Promise<ActionResult<number>> {
  if (!uuid.safeParse(spaceId).success) return { ok: false, error: 'Unknown listing.' };
  const api = await client();
  if (!api) return signedOut;

  try {
    const res = await unwrap(api.GET('/v1/spaces/{id}/media', { params: { path: { id: spaceId } } }));
    return { ok: true, data: res.media.length };
  } catch (err) {
    return failure(err);
  }
}

// Answers are one-tap values: strings from a field's options, or booleans.
const answers = z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), z.union([z.string().max(40), z.boolean()]));

export async function saveAttributes(
  spaceId: string,
  attributes: Record<string, string | boolean>,
): Promise<ActionResult<null>> {
  if (!uuid.safeParse(spaceId).success) return { ok: false, error: 'Unknown listing.' };
  const parsed = answers.safeParse(attributes);
  if (!parsed.success) return { ok: false, error: 'Those answers could not be saved.' };
  if (Object.keys(parsed.data).length === 0) return { ok: true, data: null };

  const api = await client();
  if (!api) return signedOut;

  try {
    await unwrap(
      api.PATCH('/v1/spaces/{id}', { params: { path: { id: spaceId } }, body: { attributes: parsed.data } }),
    );
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}

export async function submitForReview(spaceId: string): Promise<ActionResult<null>> {
  if (!uuid.safeParse(spaceId).success) return { ok: false, error: 'Unknown listing.' };
  const api = await client();
  if (!api) return signedOut;

  try {
    await unwrap(api.POST('/v1/spaces/{id}/submit', { params: { path: { id: spaceId } } }));
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}
