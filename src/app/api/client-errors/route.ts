import { env } from '@/lib/env';
import { safeDigest } from '@/lib/error-reporting';

// Bounded per-process log budget, so an anonymous endpoint cannot flood logs.
// A CDN rate limit should additionally protect this path after deployment.
let windowStart = 0;
let count = 0;
const categories = new Set(['search', 'listing', 'conversation', 'account', 'hosting', 'post', 'login', 'saved', 'notifications', 'staff', 'support', 'privacy', 'other']);
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('origin') !== new URL(env.SPACE_SITE_URL).origin) return new Response(null, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return new Response(null, { status: 415, headers });
  if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); count = 0; }
  if (++count > 60) return new Response(null, { status: 429, headers });
  // Read at most 1 KiB, regardless of Content-Length or chunked encoding.
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400, headers });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 1024) { await reader.cancel(); return new Response(null, { status: 413, headers }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || !('category' in body) || typeof body.category !== 'string' || !categories.has(body.category)) return new Response(null, { status: 400, headers });
    const digest = safeDigest('digest' in body ? body.digest : undefined);
    console.error(JSON.stringify({ event: 'web_client_error', category: body.category, ...(digest ? { digest } : {}) }));
    return new Response(null, { status: 204, headers });
  } catch { return new Response(null, { status: 400, headers }); }
  finally { reader.releaseLock(); }
}
