'use server';

import { revalidatePath } from 'next/cache';
import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';
import { ApiError } from '@/lib/api/problem';
export type PhoneState = { sent: boolean; phone: string; error?: string; done?: boolean };
export async function connectPhone(previous: PhoneState, form: FormData): Promise<PhoneState> {
 await requireUser('/account');
 const phone = String(form.get('phone') ?? previous.phone).trim();
 const verify = form.get('intent') === 'verify';
 try {
  const client = await serverApi();
  if (!verify) { await unwrap(client.POST('/v1/auth/otp', { body: { phone } })); return { sent: true, phone }; }
  await unwrap(client.POST('/v1/me/phone', { body: { phone, code: String(form.get('code') ?? '').replace(/\D/g, '') } }));
 } catch (error) {
  if (!(error instanceof ApiError)) throw error;
  return { sent: previous.sent, phone, error: error.status === 409 ? 'That number belongs to an existing account. Sign in with it, then connect your other methods there.' : error.status === 403 ? 'Please sign out and sign in again before connecting a phone.' : error.status === 429 ? 'Please wait before trying again.' : 'We couldn’t verify that number. Check the number and code, then try again.' };
 }
 revalidatePath('/account'); return { sent: false, phone, done: true };
}
