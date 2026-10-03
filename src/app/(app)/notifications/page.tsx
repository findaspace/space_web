import type { Metadata } from 'next';

import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

import { NotificationList } from './notification-list';

export const metadata: Metadata = { title: 'Notifications', robots: { index: false } };

export default async function NotificationsPage() {
  await requireUser('/notifications');
  const client = await serverApi();
  const { notifications, unread } = await unwrap(client.GET('/v1/notifications', { params: { query: { limit: 50 } } }));

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-2xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <h1 className="text-large-title">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="mt-6 text-body text-ink-muted">Nothing yet. Bookings and payouts will show up here, and by SMS.</p>
      ) : (
        <NotificationList items={notifications} unread={unread} />
      )}
    </main>
  );
}
