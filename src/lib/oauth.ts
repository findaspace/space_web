import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, createPrivateKey, sign } from 'node:crypto';
import { z } from 'zod';
import { env } from './env';

export const providerNames = ['google', 'microsoft', 'apple'] as const;
export type ProviderName = typeof providerNames[number];
export const labels: Record<ProviderName, string> = { google: 'Google', microsoft: 'Microsoft', apple: 'Apple' };
export function provider(name: string) {
 if (!providerNames.includes(name as ProviderName)) return null;
 const id = process.env[`SPACE_${name.toUpperCase()}_CLIENT_ID`];
 let secret = process.env[`SPACE_${name.toUpperCase()}_CLIENT_SECRET`];
 if (name === 'apple' && id && process.env.SPACE_APPLE_PRIVATE_KEY && process.env.SPACE_APPLE_TEAM_ID && process.env.SPACE_APPLE_KEY_ID) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: process.env.SPACE_APPLE_KEY_ID })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: process.env.SPACE_APPLE_TEAM_ID, sub: id, aud: 'https://appleid.apple.com', iat: now, exp: now + 3600 })).toString('base64url');
  const input = `${header}.${claims}`;
  const key = createPrivateKey(process.env.SPACE_APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'));
  secret = `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
 }
 if (!id?.trim() || !secret?.trim()) return null;
 const endpoints = {
  google: ['https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token'],
  microsoft: ['https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'https://login.microsoftonline.com/common/oauth2/v2.0/token'],
  apple: ['https://appleid.apple.com/auth/authorize', 'https://appleid.apple.com/auth/token'],
 }[name as ProviderName];
 return { name: name as ProviderName, id, secret, authorize: endpoints[0]!, token: endpoints[1]! };
}
export function enabledProviders() { return providerNames.filter(name => provider(name)); }
const flowSchema = z.object({ provider: z.enum(providerNames), state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), nonce: z.string().min(32).max(128), verifier: z.string().min(43).max(128), next: z.string(), user: z.string().nullable(), created: z.number() });
export type OAuthFlow = z.infer<typeof flowSchema>;
const key = () => createHash('sha256').update(`findaspace-oauth-cookie-v1:${env.SPACE_BFF_SECRET}`).digest();
export function seal(value: unknown): string {
 const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
 const bytes = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
 return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64url');
}
export function unseal(value: string): unknown {
 const bytes = Buffer.from(value, 'base64url');
 const cipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12)); cipher.setAuthTag(bytes.subarray(12, 28));
 return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
}
export function readFlow(value: string, name: string, state: string): OAuthFlow {
 const flow = flowSchema.parse(unseal(value));
 if (flow.provider !== name || flow.state !== state || flow.created > Date.now() || Date.now() - flow.created > 600000) throw new Error('Invalid sign-in transaction');
 return flow;
}
export const random = () => randomBytes(32).toString('base64url');
export const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
export const callbackURL = (name: string) => new URL(`/auth/callback/${name}`, env.SPACE_SITE_URL).toString();
export const flowCookie = (state: string) => `fs_oidc_${state}`;
export const flowOptions = (name: string) => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax', path: `/auth/callback/${name}`, maxAge: 600 });
