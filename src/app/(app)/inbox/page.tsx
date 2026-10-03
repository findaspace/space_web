import type { Metadata } from 'next';
import Link from 'next/link';

import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { preview } from '@/lib/inbox/messages';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Inbox', robots: { index: false } };

const when = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' });

export default async function InboxPage() {
  await requireUser('/inbox');
  const client = await serverApi();
  const { threads } = await unwrap(client.GET('/v1/threads', { params: { query: { limit: 50 } } }));

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-2xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <h1 className="text-large-title">Inbox</h1>

      {threads.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-title-3">No conversations yet</p>
          <p className="mt-2 text-body text-ink-muted">Message a host from any listing, and the conversation appears here.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {threads.map((t) => {
            const other = t.with?.display_name || (t.role === 'host' ? 'Guest' : 'Host');
            return (
              <li key={t.id}>
                <Link href={`/inbox/${t.id}`} className="flex min-h-16 items-start gap-3 px-4 py-3 active:bg-sunk">
                  <span
                    aria-hidden="true"
                    className={`mt-2 size-2.5 shrink-0 rounded-full ${t.unread ? 'bg-state' : 'bg-transparent'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate text-headline ${t.unread ? '' : 'font-normal'}`}>
                        {other}
                        {t.unread ? <span className="sr-only"> (unread)</span> : null}
                      </p>
                      {t.last_message_at ? (
                        <span className="tabular shrink-0 text-footnote text-ink-subtle">{when.format(new Date(t.last_message_at))}</span>
                      ) : null}
                    </div>
                    {t.space ? <p className="truncate text-footnote text-ink-muted">{t.space.title}</p> : null}
                    {t.last_message ? (
                      <p className={`mt-0.5 truncate text-subheadline ${t.unread ? 'text-ink' : 'text-ink-muted'}`}>{preview(t.last_message)}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
