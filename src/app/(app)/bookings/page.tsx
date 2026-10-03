import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { formatShort } from '@/lib/booking/dates';
import { describe } from '@/lib/booking/status';
import { formatMinor } from '@/lib/money';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'My bookings', robots: { index: false } };

const TONE = {
  state: 'bg-state-wash text-state-ink',
  muted: 'bg-sunk text-ink-muted',
  danger: 'bg-danger-wash text-danger',
} as const;

export default async function BookingsPage() {
  // Read the request first. Checked before anything dynamic, the switch made
  // Next.js prerender this page at build time, baking in whatever the setting
  // was then and caching it for a year: flipping it later would do nothing.
  await connection();
  if (!features.payments) notFound();
  await requireUser('/bookings');
  const client = await serverApi();
  const { bookings } = await unwrap(client.GET('/v1/bookings', { params: { query: { limit: 50 } } }));

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-3xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <h1 className="text-large-title">My bookings</h1>

      {bookings.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-title-3">No bookings yet</p>
          <p className="mt-2 text-body text-ink-muted">When you reserve or request a space, it appears here.</p>
          <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-md bg-action px-6 text-headline text-on-action">
            Find a space
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {bookings.map((b) => {
            const d = describe(b);
            return (
              <li key={b.id}>
                <Link href={`/bookings/${b.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-sunk">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-headline">{b.space?.title ?? `Booking ${b.reference}`}</p>
                    <p className="tabular mt-0.5 text-footnote text-ink-muted">
                      {formatShort(b.starts_on)}
                      {b.rental_mode === 'nightly' ? ` to ${formatShort(b.ends_on)}` : ` · ${b.months} months`} ·{' '}
                      {formatMinor(b.due_now_minor)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold ${TONE[d.tone]}`}>
                    {d.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
