import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { provider, callbackURL, readFlow, seal, unseal, flowCookie, flowOptions } from '@/lib/oauth';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/lib/session-cookies';
import { clientFrom, forwardHeaders } from '@/lib/forwarded';
import { api, unwrap } from '@/lib/api/client';

const resultSchema = z.object({ code: z.string().max(4096), state: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_at: z.iso.datetime(), refresh_expires_at: z.iso.datetime() });
const incomingSchema = z.object({ id_token: z.string().min(1).max(16384) });
const resultCookie = 'fs_apple_result';
// Apple posts cross-site, so normal Lax session cookies are intentionally
// absent. Store only the code, then use a same-site GET to restore that context.
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
 const name = (await params).provider;
 if (name !== 'apple' || !provider(name)) return new Response('Not found', { status: 404 });
 try {
  const reader = request.body?.getReader(); if (!reader) throw new Error('Empty response');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const item = await reader.read(); if (item.done) break; length += item.value.length; if (length > 8192) { await reader.cancel(); throw new Error('Response too large'); } chunks.push(item.value); }
  const form = new URLSearchParams(Buffer.concat(chunks).toString());
  const values = resultSchema.parse({ code: form.get('code'), state: form.get('state') });
  const store = await cookies(); readFlow(store.get(flowCookie(values.state))?.value ?? '', name, values.state);
  store.set(resultCookie, seal(values), { ...flowOptions(name), sameSite: 'lax', maxAge: 60 });
  return NextResponse.redirect(new URL('/auth/callback/apple?complete=1', env.SPACE_SITE_URL), 303);
 } catch { return failed('/login', 'cancelled'); }
}
function failed(path: string, error: string) {
 const response = NextResponse.redirect(new URL(`${path}?error=${error}`, env.SPACE_SITE_URL), 303);
 response.headers.set('Cache-Control', 'private, no-store'); return response;
}
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
 const name = (await params).provider; const config = provider(name); const store = await cookies();
 let failurePath = '/login';
 try {
  if (!config) throw new Error('Unavailable provider');
  const url = new URL(request.url);
  const values = resultSchema.parse(name === 'apple' ? unseal(store.get(resultCookie)?.value ?? '') : { code: url.searchParams.get('code'), state: url.searchParams.get('state') });
  if (name === 'apple') store.set(resultCookie, '', { ...flowOptions(name), maxAge: 0 });
  const flow = readFlow(store.get(flowCookie(values.state))?.value ?? '', name, values.state);
  store.set(flowCookie(values.state), '', { ...flowOptions(name), maxAge: 0 });
  if (flow.user) {
   failurePath = '/account';
   const me = await unwrap(api({ token: store.get(ACCESS_COOKIE)?.value, forwarded: clientFrom(request.headers) }).GET('/v1/me'));
   if (me.id !== flow.user) throw new Error('Account changed during linking');
  }
  const body = new URLSearchParams({ grant_type: 'authorization_code', code: values.code, client_id: config.id, client_secret: config.secret, redirect_uri: callbackURL(name) });
  if (name !== 'apple') body.set('code_verifier', flow.verifier);
  const exchange = await fetch(config.token, { method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!exchange.ok) throw new Error('Code exchange failed');
  const external = incomingSchema.parse(await exchange.json());
  const response = await fetch(new URL(flow.user ? '/v1/me/sign-in-methods' : '/v1/auth/external', env.SPACE_API_URL), {
   method: 'POST', headers: { ...forwardHeaders(env.SPACE_BFF_SECRET, clientFrom(request.headers)), 'Content-Type': 'application/json', ...(flow.user ? { Authorization: `Bearer ${store.get(ACCESS_COOKIE)?.value ?? ''}` } : {}) },
   body: JSON.stringify({ provider: name, id_token: external.id_token, nonce: flow.nonce }), cache: 'no-store', signal: AbortSignal.timeout(env.SPACE_API_TIMEOUT_MS), redirect: 'error',
  });
  if (response.status === 409) return failed(failurePath, 'connected');
  if (response.status === 403 && flow.user) return failed(failurePath, 'reauth');
  if (!response.ok) throw new Error('Sign-in verification failed');
  const tokens = tokenSchema.parse(await response.json());
  store.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_at));
  store.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(tokens.refresh_expires_at));
  const redirect = NextResponse.redirect(new URL(flow.next, env.SPACE_SITE_URL), 303); redirect.headers.set('Cache-Control', 'private, no-store'); return redirect;
 } catch { return failed(failurePath, 'signin'); }
}
