// safeNext decides where to send someone after they sign in.
//
// The destination arrives in the URL (/login?next=/bookings), which means an
// attacker can write it. Without this check, a link to
// findaspace.gh/login?next=https://findaspace-login.com sends a freshly signed
// in user straight to a phishing page that looks like it came from us.
//
// Only same-origin paths survive. Protocol-relative URLs (//evil.com) and
// backslash tricks (/\evil.com, which some browsers normalise to //evil.com)
// are rejected, because they look like paths and are not.

const FALLBACK = '/';

export function safeNext(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') {
    return FALLBACK;
  }
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return FALLBACK;
  }
  // Control characters and backslashes have no business in a path we
  // generated, and are the raw material of most parser-confusion bypasses.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) {
    return FALLBACK;
  }
  try {
    // Resolving against a dummy origin catches anything that escapes it.
    const url = new URL(next, 'http://findaspace.invalid');
    if (url.origin !== 'http://findaspace.invalid') {
      return FALLBACK;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return FALLBACK;
  }
}
