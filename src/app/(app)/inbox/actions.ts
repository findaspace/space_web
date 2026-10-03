'use server';

import { z } from 'zod';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import type { components } from '@/lib/api/schema';

type Message = components['schemas']['Message'];

const uuid = z.uuid();
const messageBody = z.string().trim().min(1).max(4000);

function messageFailure(err: unknown): ActionResult<never> {
  if (err instanceof ApiError && err.status === 422 && err.problem.title === 'cannot message yourself') {
    return { ok: false, error: 'This is your own listing.' };
  }
  return failure(err, { 404: 'This conversation is no longer available.' });
}

// sendToHost opens a conversation about a listing, or continues the one this
// guest already has about it: the API keeps one conversation per listing and
// guest, so asking twice lands in the same place.
export async function sendToHost(spaceId: string, text: string): Promise<ActionResult<{ threadId: string }>> {
  const body = messageBody.safeParse(text);
  if (!uuid.safeParse(spaceId).success || !body.success) return { ok: false, error: 'Write a message first.' };
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    const res = await unwrap(api.POST('/v1/spaces/{id}/messages', { params: { path: { id: spaceId } }, body: { body: body.data } }));
    return { ok: true, data: { threadId: res.thread_id } };
  } catch (err) {
    return messageFailure(err);
  }
}

export async function reply(threadId: string, text: string): Promise<ActionResult<Message>> {
  const body = messageBody.safeParse(text);
  if (!uuid.safeParse(threadId).success || !body.success) return { ok: false, error: 'Write a message first.' };
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    const m = await unwrap(api.POST('/v1/threads/{id}/messages', { params: { path: { id: threadId } }, body: { body: body.data } }));
    return { ok: true, data: m };
  } catch (err) {
    return messageFailure(err);
  }
}

// page fetches newest-first: with no cursor, the latest messages (what polling
// wants); with one, the page before it (what scrolling back wants).
export async function messagePage(
  threadId: string,
  before?: string,
): Promise<ActionResult<{ messages: Message[]; nextBefore?: string }>> {
  if (!uuid.safeParse(threadId).success || (before !== undefined && !uuid.safeParse(before).success)) {
    return { ok: false, error: 'Unknown conversation.' };
  }
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    const res = await unwrap(
      api.GET('/v1/threads/{id}/messages', { params: { path: { id: threadId }, query: { before, limit: 30 } } }),
    );
    return { ok: true, data: { messages: res.messages, nextBefore: res.next_before } };
  } catch (err) {
    return messageFailure(err);
  }
}

export async function markThreadRead(threadId: string): Promise<void> {
  if (!uuid.safeParse(threadId).success) return;
  const api = await actionClient();
  if (!api) return;
  // Best effort: a read marker that fails to save costs nothing but a dot.
  await unwrap(api.POST('/v1/threads/{id}/read', { params: { path: { id: threadId } } })).catch(() => undefined);
}

// unreadCounts feeds the dots in the header. It is polled, so it asks for as
// little as possible: one notification is enough to learn the unread count.
export async function unreadCounts(): Promise<{ messages: number; notifications: number }> {
  const api = await actionClient();
  if (!api) return { messages: 0, notifications: 0 };
  const [threads, notes] = await Promise.all([
    unwrap(api.GET('/v1/threads', { params: { query: { limit: 30 } } })).catch(() => null),
    unwrap(api.GET('/v1/notifications', { params: { query: { limit: 1 } } })).catch(() => null),
  ]);
  return {
    messages: threads?.threads.filter((t) => t.unread).length ?? 0,
    notifications: notes?.unread ?? 0,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!uuid.safeParse(id).success) return;
  const api = await actionClient();
  if (!api) return;
  await unwrap(api.POST('/v1/notifications/{id}/read', { params: { path: { id } } })).catch(() => undefined);
}

export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  const api = await actionClient();
  if (!api) return signedOut;
  try {
    await unwrap(api.POST('/v1/notifications/read-all'));
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}
