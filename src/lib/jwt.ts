// Reads a JWT's expiry without verifying its signature.
//
// That is safe here, and only here, because the web app makes no decision the
// token's contents could abuse. It uses the expiry to decide when to refresh;
// space_api verifies the signature on every call and makes every
// authorization decision itself. A forged or tampered expiry can do one thing:
// skip a refresh, which ends with the API answering 401 and a trip to the
// login page. There is nothing to gain by lying to this function.
//
// Verifying would mean shipping the signing key's public half to the web and
// adding a JOSE dependency, for no security the API does not already provide.

export function decodeExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload: unknown = JSON.parse(json);
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }
    const exp = (payload as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

// needsRefresh treats a token as stale slightly before it actually expires.
// A token valid for another three seconds will have expired by the time a
// slow render reaches the API, and failing mid-render is worse than
// refreshing a moment early.
export function needsRefresh(token: string | undefined, nowSeconds: number, skewSeconds = 30): boolean {
  if (!token) {
    return true;
  }
  const exp = decodeExpiry(token);
  return exp === null || exp - skewSeconds <= nowSeconds;
}
