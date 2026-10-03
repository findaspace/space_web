import { NextResponse, type NextRequest } from 'next/server';

import { api, unwrap, type TokenResponse } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import { clientFrom } from '@/lib/forwarded';
import { needsRefresh } from '@/lib/jwt';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/lib/session-cookies';

// The proxy's only job is keeping a signed-in user's access token fresh.
//
// It has to happen here. Server Components can read cookies but cannot set
// them, so a page that noticed an expired token mid-render could fetch a new
// one and then have nowhere to keep it. The proxy runs before rendering and
// can write both the response the browser receives and the request the page
// is about to read.
//
// It is not an authorization layer. Every Server Action and protected page
// checks the session itself, because a matcher change can quietly take a route
// out of the proxy's reach.
export async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  // Anonymous visitors, and signed-in ones with plenty of time left, cost
  // nothing: no API call, no cookie writes.
  if (!refresh || !needsRefresh(access, Date.now() / 1000)) {
    return NextResponse.next();
  }

  let tokens: TokenResponse;
  try {
    tokens = await unwrap(
      api({ forwarded: clientFrom(request.headers) }).POST('/v1/auth/refresh', {
        body: { refresh_token: refresh },
      }),
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      // The session is over: expired, revoked, or the account suspended.
      // Clear it so the page renders signed out and redirects to login,
      // instead of retrying a dead token on every request.
      return signedOut(request);
    }
    // Anything else, including the API being unreachable, leaves the cookies
    // alone. A refresh token that is still good must not be thrown away
    // because the API blinked; the next request will try again.
    return NextResponse.next();
  }

  return withTokens(request, tokens);
}

// withTokens writes the new tokens twice, and both writes matter.
//
// The response cookies reach the browser for next time. The request cookies
// reach the page being rendered right now: without that second write, this
// render would still read the expired token it arrived with and fail, and the
// user would see an error on exactly the request that fixed their session.
function withTokens(request: NextRequest, tokens: TokenResponse): NextResponse {
  request.cookies.set(ACCESS_COOKIE, tokens.access_token);
  request.cookies.set(REFRESH_COOKIE, tokens.refresh_token);

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_at));
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(tokens.refresh_expires_at));
  return response;
}

function signedOut(request: NextRequest): NextResponse {
  request.cookies.delete(ACCESS_COOKIE);
  request.cookies.delete(REFRESH_COOKIE);

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

export const config = {
  matcher: [
    {
      // Static files never need a session.
      source: '/((?!_next/static|_next/image|favicon.ico|brand/|icons/).*)',

      // Prefetches are skipped. Next.js prefetches links in parallel, so an
      // expired token would otherwise be refreshed by several requests at
      // once, and the API reads a token used twice as a stolen one. The real
      // navigation still passes through here and refreshes. The API's grace
      // window covers whatever concurrency remains.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
