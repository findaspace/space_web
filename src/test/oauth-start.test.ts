import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { values, requireUser }=vi.hoisted(()=>({values:new Map<string,string>(),requireUser:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({set:(name:string,value:string)=>{values.set(name,value);}})}));
vi.mock('@/lib/env',()=>({env:{SPACE_SITE_URL:'https://findaspace.site',SPACE_BFF_SECRET:'test-only-server-secret-at-least-32-characters'}}));
vi.mock('@/lib/session',()=>({requireUser}));
import { POST } from '@/app/auth/start/[provider]/route';
import { unseal } from '@/lib/oauth';
const params={params:Promise.resolve({provider:'google'})};
const request=(origin='https://findaspace.site',body=new URLSearchParams({next:'/saved'}))=>new Request('https://findaspace.site/auth/start/google',{method:'POST',headers:{origin},body});
beforeEach(()=>{values.clear();vi.stubEnv('SPACE_GOOGLE_CLIENT_ID','client');vi.stubEnv('SPACE_GOOGLE_CLIENT_SECRET','server-secret');});
afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks();});
it('rejects cross-origin starts before creating a transaction',async()=>{expect((await POST(request('https://attacker.example'),params)).status).toBe(403);expect(values.size).toBe(0);});
it('sends state, nonce and PKCE while keeping the secret off the redirect URL',async()=>{
 const result=await POST(request(),params);const url=new URL(result.headers.get('location')!);
 expect(url.origin).toBe('https://accounts.google.com');expect(url.searchParams.get('code_challenge_method')).toBe('S256');expect(url.searchParams.has('client_secret')).toBe(false);
 const transaction=unseal([...values.values()][0]!) as {state:string;user:string|null;next:string};expect(transaction.state).toBe(url.searchParams.get('state'));expect(transaction.user).toBeNull();expect(transaction.next).toBe('/saved');
});
it('binds a linking transaction to the authenticated account',async()=>{requireUser.mockResolvedValue({id:'original-user'});await POST(request(undefined,new URLSearchParams({intent:'link'})),params);expect((unseal([...values.values()][0]!) as {user:string}).user).toBe('original-user');});
it('sanitizes the return URL',async()=>{await POST(request(undefined,new URLSearchParams({next:'https://attacker.example'})),params);expect((unseal([...values.values()][0]!) as {next:string}).next).toBe('/');});
