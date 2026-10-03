'use server';

import { z } from 'zod';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import { nationalDigits } from '@/lib/hosting/momo';
import { parseCedis } from '@/lib/post/draft';

const uuid = z.uuid();

// Approving starts the guest's payment window. The API checks that the caller
// is this booking's host; a stranger calling this gets a 404, not a booking.
export async function approveBooking(id: string): Promise<ActionResult<null>> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Unknown booking.' };
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    await unwrap(api.POST('/v1/bookings/{id}/approve', { params: { path: { id } } }));
    return { ok: true, data: null };
  } catch (err) {
    return failure(err, {
      409: 'This request can no longer be approved. It may have expired, or the guest cancelled.',
    });
  }
}

export async function declineBooking(id: string, reason: string): Promise<ActionResult<null>> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Unknown booking.' };
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    await unwrap(
      api.POST('/v1/bookings/{id}/decline', {
        params: { path: { id } },
        body: { reason: reason.trim().slice(0, 200) },
      }),
    );
    return { ok: true, data: null };
  } catch (err) {
    return failure(err, { 409: 'This request has already been answered or has expired.' });
  }
}

const account = z.object({
  bankCode: z.enum(['MTN', 'VOD', 'ATL']),
  number: z.string().max(20),
  name: z.string().trim().min(2).max(80),
});

export async function savePayoutAccount(input: z.infer<typeof account>): Promise<ActionResult<null>> {
  const parsed = account.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Check the network, number and name.' };
  const national = nationalDigits(parsed.data.number);
  if (!national) {
    return { ok: false, error: 'Enter the mobile money number, for example 024 412 3456.', fields: { number: 'invalid' } };
  }

  const api = await actionClient();
  if (!api) return signedOut;
  try {
    await unwrap(
      api.PUT('/v1/payouts/account', {
        body: {
          channel: 'mobile_money',
          bank_code: parsed.data.bankCode,
          account_number: `0${national}`,
          account_name: parsed.data.name,
        },
      }),
    );
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}

const PAYOUT_RULES: Record<string, string> = {
  insufficient: 'That is more than you can withdraw right now.',
  min: 'The smallest withdrawal is GHS 1.',
  max: 'The largest single withdrawal is GHS 100,000.',
};

// The amount arrives as the text the host typed and is parsed here, on the
// server, with the same rules as every other price on the platform.
export async function requestPayout(amount: string): Promise<ActionResult<null>> {
  const minor = parseCedis(String(amount).slice(0, 20));
  if (minor === null) return { ok: false, error: 'Enter an amount in cedis, for example 1,300.' };

  const api = await actionClient();
  if (!api) return signedOut;
  try {
    await unwrap(api.POST('/v1/payouts', { body: { amount_minor: minor } }));
    return { ok: true, data: null };
  } catch (err) {
    // Each payout rule gets its own plain sentence, keyed on the API's stable
    // field code rather than its wording.
    if (err instanceof ApiError) {
      const code = err.problem.errors?.find((e) => e.field === 'amount_minor')?.code;
      const said = code ? PAYOUT_RULES[code] : undefined;
      if (said) return { ok: false, status: err.status, error: said };
      if (err.status === 409 && err.problem.title === 'no payout account') {
        return { ok: false, status: 409, error: 'Add a mobile money number before withdrawing.' };
      }
    }
    return failure(err, { 409: 'A withdrawal is already on its way. Wait for it to arrive first.' });
  }
}
