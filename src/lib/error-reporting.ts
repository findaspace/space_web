// Error telemetry never includes URLs, queries, messages, names or tokens.
export function routeCategory(path: string): string {
  if (path === '/') return 'search';
  if (path.startsWith('/s/')) return 'listing';
  if (path.startsWith('/inbox/')) return 'conversation';
  for (const group of ['account', 'hosting', 'post', 'login', 'saved', 'notifications', 'staff', 'support', 'privacy']) if (path === `/${group}` || path.startsWith(`/${group}/`)) return group;
  return 'other';
}
export function safeDigest(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : undefined;
}
export function reportPageError(digest?: string) {
  if (typeof window === 'undefined') return;
  void fetch('/api/client-errors', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true,
    body: JSON.stringify({ category: routeCategory(window.location.pathname), digest: safeDigest(digest) }),
  }).catch(() => {});
}
