import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { values, me } = vi.hoisted(() => ({ values: new Map<string,string>(), me: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name:string) => values.has(name) ? {value:values.get(name)} : undefined, set: (name:string,value:string) => { values.set(name,value); } }) }));
vi.mock('@/lib/env', () => ({ env: { SPACE_BFF_SECRET:'test-secret-at-least-thirty-two-characters',SPACE_SITE_URL:'https://findaspace.site',SPACE_API_URL:'https://api.findaspace.site',SPACE_API_TIMEOUT_MS:1000 } }));
vi.mock('@/lib/api/client', () => ({ api: () => ({ GET:me }), unwrap: async (value:unknown) => await value }));
import { GET, POST } from '@/app/auth/callback/[provider]/route';
import { flowCookie, random, seal, unseal } from '@/lib/oauth';
const params = (provider:string) => ({params:Promise.resolve({provider})});
const tokens = {access_token:'new-access',refresh_token:'new-refresh',expires_at:new Date(Date.now()+60000).toISOString(),refresh_expires_at:new Date(Date.now()+86400000).toISOString()};
const flow = (provider='google', user:string|null=null) => ({provider,state:random(),nonce:random(),verifier:random(),next:'/saved',user,created:Date.now()});
beforeEach(()=>{values.clear();for(const name of ['GOOGLE','APPLE','MICROSOFT']){vi.stubEnv(`SPACE_${name}_CLIENT_ID`,'client');vi.stubEnv(`SPACE_${name}_CLIENT_SECRET`,'server-only-secret');}});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetAllMocks();});
describe('provider callback handling',()=>{
 it('exchanges the code server-side and sets the common HttpOnly session',async()=>{
  const transaction=flow();values.set(flowCookie(transaction.state),seal(transaction));
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id_token:'verified-by-api'}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify(tokens),{status:200}));vi.stubGlobal('fetch',fetchMock);
  const res=await GET(new Request(`https://findaspace.site/auth/callback/google?code=one-time-code&state=${transaction.state}`),params('google'));
  expect(res.headers.get('location')).toBe('https://findaspace.site/saved');
  expect(values.get('fs_at')).toBe('new-access');expect(values.get(flowCookie(transaction.state))).toBe('');
  const body=fetchMock.mock.calls[0]![1].body as URLSearchParams;expect(body.get('code_verifier')).toBe(transaction.verifier);
  expect(fetchMock.mock.calls[1]![0].toString()).toBe('https://api.findaspace.site/v1/auth/external');
  expect(res.headers.get('cache-control')).toBe('private, no-store');
 });
 it('does not exchange a code without the matching browser transaction',async()=>{
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  const res=await GET(new Request(`https://findaspace.site/auth/callback/google?code=stolen&state=${random()}`),params('google'));
  expect(res.headers.get('location')).toContain('/login?error=signin');expect(fetchMock).not.toHaveBeenCalled();
 });
 it('refuses linking if the active account changed during the redirect',async()=>{
  const transaction=flow('google','original-user');values.set(flowCookie(transaction.state),seal(transaction));me.mockResolvedValue({id:'different-user'});
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  const res=await GET(new Request(`https://findaspace.site/auth/callback/google?code=code&state=${transaction.state}`),params('google'));
  expect(res.headers.get('location')).toContain('/account?error=signin');expect(fetchMock).not.toHaveBeenCalled();
 });
 it('preserves the existing session on an account-link conflict',async()=>{
  const transaction=flow('microsoft','original-user');values.set(flowCookie(transaction.state),seal(transaction));values.set('fs_at','original-access');values.set('fs_rt','original-refresh');me.mockResolvedValue({id:'original-user'});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id_token:'provider-token'}),{status:200})).mockResolvedValueOnce(new Response('{}',{status:409})));
  const res=await GET(new Request(`https://findaspace.site/auth/callback/microsoft?code=code&state=${transaction.state}`),params('microsoft'));
  expect(res.headers.get('location')).toContain('error=connected');expect(values.get('fs_at')).toBe('original-access');expect(values.get('fs_rt')).toBe('original-refresh');
 });
 it('handles Apple form_post without depending on Lax session cookies',async()=>{
  const transaction=flow('apple');values.set(flowCookie(transaction.state),seal(transaction));
  const res=await POST(new Request('https://findaspace.site/auth/callback/apple',{method:'POST',body:new URLSearchParams({code:'apple-code',state:transaction.state})}),params('apple'));
  expect(res.status).toBe(303);expect(res.headers.get('location')).toBe('https://findaspace.site/auth/callback/apple?complete=1');
  expect(unseal(values.get('fs_apple_result')!)).toEqual({code:'apple-code',state:transaction.state});
 });
 it('rejects oversized Apple callback bodies',async()=>{
  const res=await POST(new Request('https://findaspace.site/auth/callback/apple',{method:'POST',body:'x'.repeat(9000)}),params('apple'));
  expect(res.headers.get('location')).toContain('/login?error=cancelled');expect(values.has('fs_apple_result')).toBe(false);
 });
});
