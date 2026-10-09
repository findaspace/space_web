import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { provider, random, challenge, callbackURL, seal, flowCookie, flowOptions } from '@/lib/oauth';
import { safeNext } from '@/lib/redirect';
import { requireUser } from '@/lib/session';

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
 if (request.headers.get('origin') !== new URL(env.SPACE_SITE_URL).origin) return new Response('Request rejected', { status: 403 });
 const name = (await params).provider; const config = provider(name);
 if (!config) return NextResponse.redirect(new URL('/login?error=unavailable', env.SPACE_SITE_URL), 303);
 if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return new Response('Unsupported form', {status:415});
 const reader = request.body?.getReader(); if (!reader) return new Response('Empty form', {status:400});
 const chunks: Uint8Array[] = []; let size = 0;
 while (true) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > 4096) { await reader.cancel(); return new Response('Form too large', {status:413}); } chunks.push(item.value); }
 const form = new URLSearchParams(Buffer.concat(chunks).toString()); const link = form.get('intent') === 'link';
 const user = link ? await requireUser('/account') : null;
 const flow = { provider: config.name, state: random(), nonce: random(), verifier: random(), next: link ? '/account' : safeNext(String(form.get('next') ?? '/')), user: user?.id ?? null, created: Date.now() };
 const url = new URL(config.authorize);
 url.search = new URLSearchParams({ client_id: config.id, redirect_uri: callbackURL(name), response_type: 'code', scope: name === 'apple' ? 'name email' : 'openid email profile', state: flow.state, nonce: flow.nonce }).toString();
 if (name === 'apple') url.searchParams.set('response_mode', 'form_post');
 else { url.searchParams.set('code_challenge', challenge(flow.verifier)); url.searchParams.set('code_challenge_method', 'S256'); }
 const response = NextResponse.redirect(url, 303);
 response.headers.set('Cache-Control', 'private, no-store');
 (await cookies()).set(flowCookie(flow.state), seal(flow), flowOptions(name));
 return response;
}
