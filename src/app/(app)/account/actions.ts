'use server';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';

// updateName sets the name the other party sees. The API is the authority on
// what is allowed; it refuses phone numbers, emails and links in a name, since
// a name is visible before booking, when messages hide exactly those.
export async function updateName(name: string): Promise<ActionResult<{ name: string }>> {
  const trimmed = String(name).trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { ok: false, error: 'Use between 2 and 60 characters.' };
  }
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    const user = await unwrap(api.PATCH('/v1/me', { body: { display_name: trimmed } }));
    return { ok: true, data: { name: user.display_name } };
  } catch (err) {
    return failure(err, { 422: 'Use your name only. Phone numbers, emails and links are not allowed in a name.' });
  }
}
