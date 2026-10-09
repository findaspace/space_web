'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies';

const id = z.uuid();
const report = z.object({ reason: z.enum(['suspected_scam', 'unavailable', 'incorrect_details', 'abuse', 'other']), details: z.string().trim().max(2000) });
export async function reportListing(spaceId: string, reason: string, details: string): Promise<ActionResult<void>> {
  const body = report.safeParse({ reason, details });
  if (!id.safeParse(spaceId).success || !body.success) return { ok: false, error: 'Choose a reason and keep your explanation under 2,000 characters.' };
  const api = await actionClient(); if (!api) return signedOut;
  try {
    await unwrap(api.POST('/v1/spaces/{id}/reports', { params: { path: { id: spaceId } }, body: body.data }));
    return { ok: true, data: undefined };
  } catch (err) { return failure(err); }
}
export async function setBlock(threadId: string, blocked: boolean): Promise<ActionResult<void>> {
  if (!id.safeParse(threadId).success || typeof blocked !== 'boolean') return { ok: false, error: 'Unknown conversation.' };
  const api = await actionClient(); if (!api) return signedOut;
  try {
    const options = { params: { path: { id: threadId } } };
    await unwrap(blocked ? api.POST('/v1/threads/{id}/block', options) : api.DELETE('/v1/threads/{id}/block', options));
    return { ok: true, data: undefined };
  } catch (err) { return failure(err); }
}
export async function deleteAccount(confirmation: string): Promise<ActionResult<void>> {
  if (confirmation !== 'DELETE') return { ok: false, error: 'Type DELETE to confirm.' };
  const api = await actionClient(); if (!api) return signedOut;
  try { await unwrap(api.DELETE('/v1/me', { body: { confirmation: 'DELETE' } })); }
  catch (err) { return failure(err, { 403: 'Sign out and sign in again before deleting your account.' }); }
  const store = await cookies(); store.delete(ACCESS_COOKIE); store.delete(REFRESH_COOKIE);
  return { ok: true, data: undefined };
}
export async function reviewReport(reportId: string, status: string, note: string, withdrawListing: boolean = false): Promise<ActionResult<void>> {
  if (!id.safeParse(reportId).success || (status !== 'resolved' && status !== 'dismissed') || typeof withdrawListing !== 'boolean' || typeof note !== 'string' || note.length > 2000) return { ok: false, error: 'Invalid review.' };
  const api = await actionClient(); if (!api) return signedOut;
  try {
    await unwrap(api.POST('/v1/admin/reports/{id}/review', { params: { path: { id: reportId } }, body: { status, note, withdraw_listing: withdrawListing } }));
    return { ok: true, data: undefined };
  } catch (err) { return failure(err); }
}
