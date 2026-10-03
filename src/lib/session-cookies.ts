// Cookie names and options, shared by the proxy and by Server Actions.
//
// Deliberately free of next/headers and server-only, because the proxy runs
// outside the React server environment and cannot import either.

export const ACCESS_COOKIE = 'fs_at';
export const REFRESH_COOKIE = 'fs_rt';

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
};

// cookieOptions makes a cookie live exactly as long as the token inside it.
//
// httpOnly: page JavaScript can never read the token, so a script injected
// through any future XSS bug cannot steal a session.
//
// sameSite lax: sent when someone follows a link to us, which a shared WhatsApp
// link needs, but never on a cross-site form POST, which is what a forged
// request would be.
//
// path /: the refresh cookie has to reach the proxy on every page, because
// that is where an expired access token gets replaced. Limiting it to an auth
// path would mean a redirect round trip on every expiry.
export function cookieOptions(expiresAt: string, now: number = Date.now()): CookieOptions {
  const expiry = Date.parse(expiresAt);
  const maxAge = Number.isFinite(expiry) ? Math.max(0, Math.floor((expiry - now) / 1000)) : 0;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}
