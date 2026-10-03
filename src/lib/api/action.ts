import 'server-only';

import { cookies } from 'next/headers';

import { ApiError, STATUS_UNAVAILABLE } from './problem';
import { serverApi } from './server';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

// Shared by every Server Action. Each action is a public endpoint anyone can
// call with anything, so each checks the session and validates its own input;
// these helpers only make the answers consistent.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string>; signedOut?: boolean; status?: number };

export const signedOut: ActionResult<never> = {
  ok: false,
  error: 'Your session ended. Sign in again to continue.',
  signedOut: true,
};

// actionClient returns an API client for the signed-in user, or null.
export async function actionClient() {
  if (!(await cookies()).has(ACCESS_COOKIE)) {
    return null;
  }
  return serverApi();
}

// failure turns an API error into something a person can act on. Anything that
// is not an ApiError is a bug here, not a user mistake, and is rethrown so it
// surfaces instead of hiding behind a friendly message.
export function failure(err: unknown, messages: Partial<Record<number, string>> = {}): ActionResult<never> {
  if (!(err instanceof ApiError)) {
    throw err;
  }
  if (err.status === 401) {
    return signedOut;
  }
  if (err.status === STATUS_UNAVAILABLE) {
    return { ok: false, error: 'Findaspace is not reachable. Check your connection and try again.' };
  }
  // Many API errors carry a generic title ("invalid payout") with the useful
  // sentence on the field that failed. Showing the title would tell a person
  // nothing, so the first field's explanation is preferred over it.
  const fields = err.fieldErrors();
  const firstField = Object.values(fields)[0];
  const sentence = firstField ? firstField.charAt(0).toUpperCase() + firstField.slice(1) + (/[.!?]$/.test(firstField) ? '' : '.') : undefined;

  return {
    ok: false,
    status: err.status,
    error: messages[err.status] ?? err.problem.detail ?? sentence ?? err.problem.title,
    fields,
  };
}
