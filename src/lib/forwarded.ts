// Who is actually making the request, as far as space_api is concerned.
//
// Every call from this app reaches the API from the hosting platform's servers,
// not from the user. Without forwarding, the API would see one IP for every
// user in the country, so a per-IP limit of fifteen login codes would become
// fifteen codes for everyone combined.
export type Forwarded = {
  ip?: string;
  userAgent?: string;
};

// clientFrom reads the caller from the incoming request's headers.
//
// The last x-forwarded-for entry is used, not the first. Vercel documents
// overwriting the header to prevent spoofing, in which case there is only one
// entry and first and last are the same. If a proxy ever appends instead, the
// last entry is the one added by infrastructure; the first is whatever the
// client chose to send, and is worthless for rate limiting.
export function clientFrom(headers: Headers): Forwarded {
  const xff = headers.get('x-forwarded-for');
  const ip = xff
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .at(-1);

  const userAgent = headers.get('user-agent') ?? undefined;
  return { ip: ip || undefined, userAgent };
}

// forwardHeaders builds what space_api needs to see the real caller, plus the
// secret that tells it to believe the forwarded IP. The API ignores
// X-Forwarded-For from anyone who cannot present the secret, since any client
// can write that header.
export function forwardHeaders(secret: string, forwarded?: Forwarded): Record<string, string> {
  const headers: Record<string, string> = { 'X-Space-BFF': secret };
  if (forwarded?.ip) {
    headers['X-Forwarded-For'] = forwarded.ip;
  }
  if (forwarded?.userAgent) {
    headers['User-Agent'] = forwarded.userAgent;
  }
  return headers;
}
