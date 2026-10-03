'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { components } from '@/lib/api/schema';
import { notificationHref } from '@/lib/inbox/messages';

import { markAllNotificationsRead, markNotificationRead } from '../inbox/actions';

type Notification = components['schemas']['Notification'];

const when = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Accra' });

export function NotificationList({ items, unread }: { items: Notification[]; unread: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function readAll() {
    setBusy(true);
    await markAllNotificationsRead();
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      {unread > 0 ? (
        <button type="button" onClick={readAll} disabled={busy} className="mt-2 min-h-11 text-subheadline font-semibold text-state-ink">
          Mark all read
        </button>
      ) : null}
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={notificationHref(n.event, n.data)}
              // Marking read happens alongside the navigation, never instead of it.
              onClick={() => {
                if (!n.read) void markNotificationRead(n.id);
              }}
              className="flex gap-3 px-4 py-3 active:bg-sunk"
            >
              <span aria-hidden="true" className={`mt-2 size-2.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-state'}`} />
              <div className="min-w-0">
                <p className={`text-headline ${n.read ? 'font-normal text-ink-muted' : ''}`}>{n.title}</p>
                <p className="text-subheadline text-ink-muted">{n.body}</p>
                <p className="tabular mt-0.5 text-footnote text-ink-subtle">{when.format(new Date(n.created_at))}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
