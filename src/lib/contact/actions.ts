'use server';

import { z } from 'zod';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';

export type Contact = { name: string; phone: string };

// revealContact is the one way a number leaves the platform, and it requires
// a signed-in, phone-verified account: the API records who saw which number
// and limits how many a day, so a reported scam can be traced and the host
// directory cannot be scraped.
export async function revealContact(spaceId: string): Promise<ActionResult<Contact>> {
  if (!z.uuid().safeParse(spaceId).success) return { ok: false, error: 'Unknown listing.' };
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    const c = await unwrap(api.GET('/v1/spaces/{id}/contact', { params: { path: { id: spaceId } } }));
    return { ok: true, data: { name: c.display_name, phone: c.phone } };
  } catch (err) {
    return failure(err, {
      404: 'This listing is no longer available.',
      429: 'You have viewed a lot of numbers today. Chat with the owner here instead, or try again tomorrow.',
    });
  }
}
