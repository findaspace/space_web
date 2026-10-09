import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: () => ({ POST: post }), unwrap: async (value: unknown) => { const result = await value; if (result instanceof Error) throw result; return result; } }));
import { proxy, config } from '@/proxy';
import { ApiError } from '@/lib/api/problem';

function request(access?: string, prefetch = false) {
 const headers = new Headers({ cookie: `fs_rt=refresh${access ? `; fs_at=${access}` : ''}` });
 if (prefetch) headers.set('next-router-prefetch', '1');
 return new NextRequest('https://findaspace.site/account', { headers });
}
const token = (expiry: number) => `x.${Buffer.from(JSON.stringify({ exp: expiry })).toString('base64url')}.x`;
afterEach(() => vi.resetAllMocks());
describe('session refresh', () => {
 it('keeps both browser and rendering cookies when reopening with only a refresh token', async () => {
  post.mockResolvedValue({access_token:'new-access',refresh_token:'new-refresh',expires_at:new Date(Date.now()+60000).toISOString(),refresh_expires_at:new Date(Date.now()+86400000).toISOString()});
  const req=request(); const response=await proxy(req);
  expect(req.cookies.get('fs_at')?.value).toBe('new-access');
  expect(response.cookies.get('fs_rt')?.value).toBe('new-refresh');
 });
 it('refreshes prefetched private pages rather than caching a sign-in redirect', async () => {
  post.mockResolvedValue({access_token:'new',refresh_token:'next',expires_at:new Date(Date.now()+60000).toISOString(),refresh_expires_at:new Date(Date.now()+86400000).toISOString()});
  await proxy(request(undefined,true)); expect(post).toHaveBeenCalledOnce();
  expect(config.matcher[0]).not.toHaveProperty('missing');
 });
 it('does not sign out during an API outage when reconnecting', async () => {
  post.mockRejectedValue(new Error('network unavailable'));
  const res=await proxy(request()); expect(res.status).toBe(503);
  expect(res.cookies.get('fs_rt')).toBeUndefined();
  expect(res.headers.get('cache-control')).toBe('private, no-store');
 });
 it('allows a still-valid access token during temporary refresh failure', async () => {
  post.mockRejectedValue(new Error('network unavailable'));
  expect((await proxy(request(token(Date.now()/1000+15)))).status).toBe(200);
 });
 it('clears cookies only for a confirmed invalid session', async () => {
  post.mockRejectedValue(new ApiError({status:401,title:'invalid session'}));
  const req=request(); const response=await proxy(req);
  expect(req.cookies.has('fs_rt')).toBe(false);
  expect(response.cookies.get('fs_rt')?.value).toBe('');
 });
 it('does not call the API for a fresh access token', async () => {
  await proxy(request(token(Date.now()/1000+300))); expect(post).not.toHaveBeenCalled();
 });
});
