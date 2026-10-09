import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./env', () => ({ env: { SPACE_BFF_SECRET: 'test-only-secret-at-least-thirty-two-characters', SPACE_SITE_URL: 'https://findaspace.site' } }));
import { callbackURL, challenge, enabledProviders, provider, random, readFlow, seal, unseal } from './oauth';
afterEach(() => vi.unstubAllEnvs());
const flow = () => ({ provider: 'google', state: random(), nonce: random(), verifier: random(), next: '/saved', user: null, created: Date.now() });
describe('provider sign-in transactions', () => {
 it('encrypts transaction secrets and authenticates the envelope', () => { const value=flow(); const cookie=seal(value); expect(cookie).not.toContain(value.verifier); expect(unseal(cookie)).toEqual(value); expect(()=>unseal(cookie.slice(0,-8)+'AAAAAAAA')).toThrow(); });
 it('requires the correct provider and browser state', () => { const value=flow(); const cookie=seal(value); expect(readFlow(cookie,'google',value.state)).toEqual(value); expect(()=>readFlow(cookie,'apple',value.state)).toThrow(); expect(()=>readFlow(cookie,'google','different')).toThrow(); });
 it('rejects expired and future transactions', () => { const value=flow(); expect(()=>readFlow(seal({...value,created:Date.now()-600001}),'google',value.state)).toThrow(); expect(()=>readFlow(seal({...value,created:Date.now()+60000}),'google',value.state)).toThrow(); });
 it('hides unconfigured methods and ignores arbitrary provider names', () => { for(const name of ['GOOGLE','MICROSOFT','APPLE']){vi.stubEnv(`SPACE_${name}_CLIENT_ID`,'');vi.stubEnv(`SPACE_${name}_CLIENT_SECRET`,'');} expect(enabledProviders()).toEqual([]); expect(provider('attacker')).toBeNull(); });
 it('supports all configured methods equally', () => { for(const name of ['GOOGLE','MICROSOFT','APPLE']){vi.stubEnv(`SPACE_${name}_CLIENT_ID`,'client');vi.stubEnv(`SPACE_${name}_CLIENT_SECRET`,'server-secret');} expect(enabledProviders()).toEqual(['google','microsoft','apple']); });
 it('uses a fixed callback origin and an S256 PKCE challenge', () => { expect(callbackURL('microsoft')).toBe('https://findaspace.site/auth/callback/microsoft'); expect(challenge('test')).toBe('n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg'); expect(random()).toMatch(/^[A-Za-z0-9_-]{43}$/); });
});

it('generates short-lived Apple client secrets from the server key', async () => {
 const { generateKeyPairSync, verify } = await import('node:crypto');
 const { privateKey, publicKey } = generateKeyPairSync('ec', {namedCurve:'prime256v1'});
 vi.stubEnv('SPACE_APPLE_CLIENT_ID','web-service');vi.stubEnv('SPACE_APPLE_CLIENT_SECRET','');
 vi.stubEnv('SPACE_APPLE_TEAM_ID','team-id');vi.stubEnv('SPACE_APPLE_KEY_ID','key-id');
 vi.stubEnv('SPACE_APPLE_PRIVATE_KEY',privateKey.export({format:'pem',type:'pkcs8'}).toString());
 const secret=provider('apple')!.secret!;const [header,claims,signature]=secret.split('.');
 const payload=JSON.parse(Buffer.from(claims!,'base64url').toString());
 expect(payload.iss).toBe('team-id');expect(payload.sub).toBe('web-service');expect(payload.exp-payload.iat).toBe(3600);
 expect(verify('sha256',Buffer.from(`${header}.${claims}`),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(signature!,'base64url'))).toBe(true);
});
