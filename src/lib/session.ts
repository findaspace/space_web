import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { unwrap, type User } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import { serverApi } from '@/lib/api/server';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

function loginUrl(returnTo: string): string {
  return `/login?next=${encodeURIComponent(returnTo)}`;
}

// requireUser is how a protected page proves someone is signed in. Each page
// calls it itself rather than trusting a layout or the proxy, because a route
// moved to a different folder, or a matcher that no longer covers it, would
// otherwise become public without anyone noticing.
//
// It asks the API rather than trusting the cookie. The cookie proves a token
// exists; only space_api can say whether the account behind it is still
// active.
export async function requireUser(returnTo: string): Promise<User> {
  if (!(await cookies()).has(ACCESS_COOKIE)) {
    redirect(loginUrl(returnTo));
  }

  try {
    const client = await serverApi();
    return await unwrap(client.GET('/v1/me'));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect(loginUrl(returnTo));
    }
    // The API being down is not the same as being signed out. Signing people
    // out during an outage would turn a blip into everyone re-entering codes,
    // and every one of those codes is an SMS the business pays for.
    throw err;
  }
}
