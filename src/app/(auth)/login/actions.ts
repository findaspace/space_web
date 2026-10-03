'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { unwrap, type TokenResponse } from '@/lib/api/client';
import { ApiError, STATUS_UNAVAILABLE } from '@/lib/api/problem';
import { serverApi } from '@/lib/api/server';
import { safeNext } from '@/lib/redirect';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/lib/session-cookies';

// Server Actions rather than API route handlers. They run on the server, so
// tokens never pass through the browser; Next.js rejects cross-origin calls to
// them, which handles login CSRF without a token of our own; and the form
// still submits as plain HTML before JavaScript has loaded.

export type LoginState =
  | { step: 'phone'; phone?: string; error?: string }
  | { step: 'code'; phone: string; masked: string; error?: string; resent?: boolean };

const CODE_LENGTH = 6;

export async function login(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = String(form.get('intent') ?? '');

  switch (intent) {
    case 'send':
      return sendCode(String(form.get('phone') ?? ''), false);
    case 'resend':
      return sendCode(String(form.get('phone') ?? ''), true);
    case 'change':
      return { step: 'phone', phone: String(form.get('phone') ?? '') };
    case 'verify':
      return verify(prev, form);
    default:
      return { step: 'phone' };
  }
}

async function sendCode(rawPhone: string, resent: boolean): Promise<LoginState> {
  const phone = rawPhone.trim();
  if (!phone) {
    return { step: 'phone', error: 'Enter your phone number.' };
  }

  try {
    const client = await serverApi();
    const sent = await unwrap(client.POST('/v1/auth/otp', { body: { phone } }));
    return { step: 'code', phone, masked: sent.phone, resent };
  } catch (err) {
    return { step: 'phone', phone, error: phoneError(err) };
  }
}

async function verify(prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get('phone') ?? '');
  const masked = prev.step === 'code' ? prev.masked : '';
  // iOS autofill and paste can bring spaces or dashes along with the digits.
  const code = String(form.get('code') ?? '').replace(/\D/g, '');
  const next = safeNext(String(form.get('next') ?? ''));

  if (code.length !== CODE_LENGTH) {
    return { step: 'code', phone, masked, error: `Enter the ${CODE_LENGTH}-digit code from the SMS.` };
  }

  let tokens: TokenResponse;
  try {
    const client = await serverApi();
    tokens = await unwrap(client.POST('/v1/auth/verify', { body: { phone, code } }));
  } catch (err) {
    return { step: 'code', phone, masked, error: codeError(err) };
  }

  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_at));
  store.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(tokens.refresh_expires_at));

  // redirect() works by throwing. It sits outside the try block on purpose: a
  // catch around it would swallow the redirect and leave the user staring at
  // the code form, signed in and going nowhere.
  redirect(next);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    try {
      const client = await serverApi();
      await unwrap(client.POST('/v1/auth/logout', { body: { refresh_token: refresh } }));
    } catch {
      // Best effort. The cookies go regardless: a user who pressed sign out
      // must be signed out on this device even if the API could not be told.
    }
  }

  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  redirect('/');
}

// The error helpers branch on status and field codes, never on the problem's
// title. Titles are prose written for people and may change; the status and
// the field code are the contract.

function phoneError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    throw err; // a bug here, not a user error; let the error boundary show it
  }
  if (err.status === STATUS_UNAVAILABLE) {
    return 'Findaspace is not reachable right now. Check your connection and try again.';
  }
  if (err.status === 429) {
    return 'Too many codes requested. Wait a few minutes, then try again.';
  }
  if (err.fieldErrors().phone) {
    return 'That does not look like a Ghanaian phone number. Try the format 024 123 4567.';
  }
  return 'Something went wrong sending your code. Try again.';
}

function codeError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    throw err;
  }
  if (err.status === STATUS_UNAVAILABLE) {
    return 'Findaspace is not reachable right now. Your code is still valid; try again.';
  }
  if (err.status === 429) {
    return 'Too many attempts with this code. Send a new one.';
  }
  if (err.status === 403) {
    return 'This account has been suspended.';
  }
  if (err.fieldErrors().code) {
    return 'That code is not right. Check the SMS and try again.';
  }
  // A 422 with no field error is an expired code or no code at all. Either
  // way the fix is the same, so the message does not pretend to know which.
  return 'That code has expired. Send a new one.';
}
