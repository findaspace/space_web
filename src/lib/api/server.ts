import 'server-only';

import { cookies, headers } from 'next/headers';

import { clientFrom } from '@/lib/forwarded';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

import { api } from './client';

// serverApi is what pages and Server Actions use. It reads this request's
// session cookie and the caller's address, so no call site can forget either.
export async function serverApi() {
  const [store, incoming] = await Promise.all([cookies(), headers()]);
  return api({
    token: store.get(ACCESS_COOKIE)?.value,
    forwarded: clientFrom(incoming),
  });
}
