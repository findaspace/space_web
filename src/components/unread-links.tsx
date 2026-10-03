'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { unreadCounts } from '@/app/(app)/inbox/actions';

import { BellIcon, ChatIcon } from './ui/icons';

// How often the header re-checks for unread messages and notifications.
const POLL_MS = 60_000;

// The inbox and bell, with a dot when something is unread. The counts load
// after the page, never blocking it, and polling pauses while the tab is
// hidden, so a signed-in phone in a pocket makes no requests.
export function UnreadLinks() {
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      const next = await unreadCounts();
      if (alive) setCounts(next);
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-1" aria-label="Messages and notifications">
      <IconLink href="/inbox" label="Inbox" count={counts.messages}>
        <ChatIcon />
      </IconLink>
      <IconLink href="/notifications" label="Notifications" count={counts.notifications}>
        <BellIcon />
      </IconLink>
    </div>
  );
}

function IconLink({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative flex size-11 items-center justify-center rounded-full active:bg-sunk">
      {children}
      <span className="sr-only">
        {label}
        {count > 0 ? `, ${count} unread` : ''}
      </span>
      {count > 0 ? <span aria-hidden="true" className="absolute top-2 right-2 size-2.5 rounded-full bg-state ring-2 ring-paper" /> : null}
    </Link>
  );
}
