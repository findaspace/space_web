import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { unwrap } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';
import { formatDate, formatDeadline, formatShort } from '@/lib/booking/dates';
import { formatMinor } from '@/lib/money';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

import { Decision } from './decision';

type Booking = components['schemas']['Booking'];

export const metadata: Metadata = { title: 'Bookings', robots: { index: false } };

const memberSince = new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric' });

function when(b: Booking): string {
  return b.rental_mode === 'nightly'
    ? `${formatShort(b.starts_on)} to ${formatShort(b.ends_on)} · ${b.nights} night${b.nights === 1 ? '' : 's'}`
    : `From ${formatDate(b.starts_on)} · ${b.months} months`;
}

// Requests come first because they are the only thing here with a clock on
// them: an unanswered lease request expires, and the guest goes elsewhere.
export default async function HostBookingsPage() {

  // Read the request first. Checked before anything dynamic, the switch made
  // Next.js prerender this page at build time, baking in whatever the setting
  // was then and caching it for a year: flipping it later would do nothing.
  await connection();
  if (!features.payments) notFound();
  await requireUser('/hosting/bookings');
  const client = await serverApi();
  const { bookings } = await unwrap(client.GET('/v1/bookings', { params: { query: { role: 'host', limit: 100 } } }));

  const requests = bookings.filter((b) => b.status === 'held' && b.rental_mode === 'term');
  const upcoming = bookings.filter((b) => ['approved', 'confirmed', 'active'].includes(b.status) || (b.status === 'held' && b.rental_mode === 'nightly'));
  const past = bookings.filter((b) => !requests.includes(b) && !upcoming.includes(b));

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-3xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <Link href="/hosting" className="text-subheadline font-semibold text-state-ink">
        Hosting
      </Link>
      <h1 className="mt-3 text-large-title">Bookings</h1>

      <Section title="Needs your answer" empty="No requests waiting.">
        {requests.map((b) => {
          const name = b.guest?.display_name || 'A guest';
          return (
            <li key={b.id} className="rounded-lg border border-state bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-headline">{name}</p>
                  {b.guest ? (
                    <p className="text-footnote text-ink-muted">
                      Member since {memberSince.format(new Date(b.guest.member_since))}
                      {b.guest.phone_verified ? ' · Phone verified' : ''}
                    </p>
                  ) : null}
                </div>
                {b.hold_expires_at ? (
                  <p className="shrink-0 text-right text-footnote font-semibold text-state-ink">
                    Answer by
                    <br />
                    {formatDeadline(b.hold_expires_at)}
                  </p>
                ) : null}
              </div>
              <p className="mt-3 text-subheadline">{b.space?.title}</p>
              <p className="tabular text-footnote text-ink-muted">
                {when(b)} · {b.guests} {b.guests === 1 ? 'person' : 'people'} · {formatMinor(b.due_now_minor)} on approval
              </p>
              <Decision bookingId={b.id} guestName={b.guest?.display_name?.split(' ')[0] || ''} />
            </li>
          );
        })}
      </Section>

      <Section title="Upcoming" empty="Nothing booked yet.">
        {upcoming.map((b) => (
          <Row key={b.id} b={b} note={b.status === 'approved' ? 'Approved, waiting for payment' : b.status === 'held' ? 'Reserved, paying now' : 'Paid'} />
        ))}
      </Section>

      {past.length > 0 ? (
        <Section title="Past and closed" empty="">
          {past.map((b) => (
            <Row key={b.id} b={b} note={b.status[0]!.toUpperCase() + b.status.slice(1)} />
          ))}
        </Section>
      ) : null}
    </main>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section className="mt-8">
      <h2 className="text-title-3">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-body text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">{children}</ul>
      )}
    </section>
  );
}

function Row({ b, note }: { b: Booking; note: string }) {
  return (
    <li className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-headline">{b.guest?.display_name || 'Guest'}</p>
        <span className="tabular shrink-0 text-subheadline">{formatMinor(b.due_now_minor)}</span>
      </div>
      <p className="mt-0.5 truncate text-footnote text-ink-muted">
        {b.space?.title} · {when(b)}
      </p>
      <p className="mt-1 text-footnote font-semibold text-ink-muted">{note}</p>
    </li>
  );
}
