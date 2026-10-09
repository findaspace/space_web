import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { features } from '@/lib/features';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

import { BlockPerson } from './block-person';
import { Conversation } from './conversation';

export const metadata: Metadata = { title: 'Conversation', robots: { index: false } };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/inbox/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const client = await serverApi();
  let page;
  try {
    page = await unwrap(client.GET('/v1/threads/{id}/messages', { params: { path: { id }, query: { limit: 30 } } }));
  } catch (err) {
    // Someone else's conversation is a 404 from the API, so it is one here too.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const boundary = await unwrap(client.GET('/v1/threads/{id}/safety', { params: { path: { id } } }));
  const other = page.thread?.with?.display_name || (page.thread?.role === 'host' ? 'Guest' : 'Host');

  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-6 lg:pt-10">
      <Link href="/inbox" className="text-subheadline font-semibold text-state-ink">
        Inbox
      </Link>
      <h1 className="mt-3 text-title-1">{other}</h1>
      {page.thread?.space ? (
        <Link href={`/s/${page.thread.space.slug}`} className="text-subheadline text-ink-muted underline-offset-2 hover:underline">
          {page.thread.space.title}
        </Link>
      ) : null}

      <BlockPerson threadId={id} blocked={boundary.blocked} />
      <div className="mt-6 flex-1">
        {/* Newest first from the API; a conversation reads oldest first. */}
        <Conversation key={String(boundary.messaging_allowed)} messagingAllowed={boundary.messaging_allowed} threadId={id} viewerId={user.id} initial={[...page.messages].reverse()} initialBefore={page.next_before} paymentsEnabled={features.payments} />
      </div>
    </main>
  );
}
