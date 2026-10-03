'use server';

import { z } from 'zod';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type Quote = components['schemas']['Quote'];
type Status = components['schemas']['Booking']['status'];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.uuid();

const request = z.object({
  checkIn: isoDate.optional(),
  checkOut: isoDate.optional(),
  startsOn: isoDate.optional(),
  months: z.number().int().min(1).max(60).optional(),
  guests: z.number().int().min(1).max(500),
});

type Request = z.infer<typeof request>;

// The quote is for display. The price that is charged is computed again by
// space_api when the booking is created, from the same inputs, so a tampered
// quote on the page can never change what anyone pays.
export async function getQuote(slug: string, input: Request): Promise<ActionResult<Quote>> {
  const parsed = request.safeParse(input);
  if (!parsed.success || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return { ok: false, error: 'Choose your dates.' };
  }
  const q = parsed.data;
  const api = await actionClient();
  if (!api) return signedOut;

  try {
    const quote = await unwrap(
      api.GET('/v1/listings/{slug}/quote', {
        params: {
          path: { slug },
          query: {
            check_in: q.checkIn, check_out: q.checkOut,
            starts_on: q.startsOn, months: q.months, guests: q.guests,
          },
        },
      }),
    );
    return { ok: true, data: quote };
  } catch (err) {
    return failure(err, { 409: 'Those dates are no longer available.' });
  }
}

// createBooking holds the dates (nightly) or sends the request (term).
//
// The idempotency key is made once per form in the browser and sent with every
// attempt. A double tap, or a retry after the connection dropped mid-request,
// returns the booking the first attempt made instead of creating a second one
// that would also hold the dates.
export async function createBooking(
  spaceId: string,
  input: Request,
  idempotencyKey: string,
): Promise<ActionResult<{ id: string; status: Status }>> {
  const parsed = request.safeParse(input);
  if (!uuid.safeParse(spaceId).success || !parsed.success || !/^[\w-]{8,100}$/.test(idempotencyKey)) {
    return { ok: false, error: 'Some details are missing. Check the dates and try again.' };
  }
  const q = parsed.data;
  const api = await actionClient();
  if (!api) return signedOut;

  try {
    const b = await unwrap(
      api.POST('/v1/bookings', {
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: {
          space_id: spaceId,
          check_in: q.checkIn, check_out: q.checkOut,
          starts_on: q.startsOn, months: q.months, guests: q.guests,
        },
      }),
    );
    return { ok: true, data: { id: b.id, status: b.status } };
  } catch (err) {
    return failure(err, { 409: 'Someone has just booked those dates. Choose different ones.' });
  }
}

// startPayment returns where to send the guest: Paystack's checkout. Calling it
// again resumes the open attempt rather than starting a second charge.
export async function startPayment(bookingId: string): Promise<ActionResult<{ url: string }>> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: 'Unknown booking.' };
  const api = await actionClient();
  if (!api) return signedOut;

  try {
    const intent = await unwrap(api.POST('/v1/bookings/{id}/pay', { params: { path: { id: bookingId } } }));
    // Only a real web address is followed. The browser navigates wherever this
    // points, so anything else is refused rather than trusted.
    const url = new URL(intent.authorization_url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, error: 'Payment could not be started.' };
    }
    return { ok: true, data: { url: url.toString() } };
  } catch (err) {
    return failure(err, { 409: 'This booking cannot be paid right now. Refresh to see its latest status.' });
  }
}

export async function bookingStatus(bookingId: string): Promise<ActionResult<Status>> {
  if (!uuid.safeParse(bookingId).success) return { ok: false, error: 'Unknown booking.' };
  const api = await actionClient();
  if (!api) return signedOut;

  try {
    const b = await unwrap(api.GET('/v1/bookings/{id}', { params: { path: { id: bookingId } } }));
    return { ok: true, data: b.status };
  } catch (err) {
    return failure(err);
  }
}
