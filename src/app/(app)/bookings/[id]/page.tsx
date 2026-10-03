import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { Protection } from '@/components/listing/protection';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import { serverApi } from '@/lib/api/server';
import { formatDate, formatDeadline } from '@/lib/booking/dates';
import { describe, describeForHost } from '@/lib/booking/status';
import { formatMinor } from '@/lib/money';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

import { ConfirmWatcher, PayButton } from './booking-actions';

export const metadata: Metadata = { title: 'Booking', robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reference?: string }>;
};

const TONE = {
  state: 'bg-state-wash text-state-ink',
  muted: 'bg-sunk text-ink-muted',
  danger: 'bg-danger-wash text-danger',
} as const;

export default async function BookingPage({ params, searchParams }: Props) {
  const { id } = await params;

  // Read the request first. Checked before anything dynamic, the switch made
  // Next.js prerender this page at build time, baking in whatever the setting
  // was then and caching it for a year: flipping it later would do nothing.
  await connection();
  if (!features.payments) notFound();
  const { reference } = await searchParams;
  await requireUser(`/bookings/${id}`);

  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const client = await serverApi();
  let booking;
  try {
    booking = await unwrap(client.GET('/v1/bookings/{id}', { params: { path: { id } } }));
  } catch (err) {
    // Someone else's booking is a 404 from the API, never a 403, so its
    // existence is not revealed either.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const deadline = booking.hold_expires_at ? formatDeadline(booking.hold_expires_at) : undefined;

  // The API includes the guest's profile only for the host, so its presence is
  // how this page knows who is looking. A host is never offered payment.
  const host = booking.guest ? describeForHost(booking, booking.guest.display_name || 'The guest') : null;
  const d = host ? { ...host, next: 'none' as const } : describe(booking, deadline);

  // Back from Paystack, and the API has not seen the payment yet.
  const returning = !host && Boolean(reference) && d.next === 'pay';

  const when =
    booking.rental_mode === 'nightly'
      ? `${formatDate(booking.starts_on)} to ${formatDate(booking.ends_on)} · ${booking.nights} night${booking.nights === 1 ? '' : 's'}`
      : `From ${formatDate(booking.starts_on)} · ${booking.months} month${booking.months === 1 ? '' : 's'}`;

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <Link href={host ? '/hosting/bookings' : '/bookings'} className="text-subheadline font-semibold text-state-ink">
        {host ? 'Bookings' : 'My bookings'}
      </Link>

      <span className={`mt-4 inline-block rounded-full px-2.5 py-1 text-caption font-semibold ${TONE[d.tone]}`}>
        {d.label}
      </span>
      <h1 className="mt-2 text-large-title">{returning ? 'Almost there' : d.title}</h1>

      <div className="mt-3">{returning ? <ConfirmWatcher bookingId={booking.id} from={booking.status} /> : <p className="text-body text-ink-muted">{d.detail}</p>}</div>

      <section className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {booking.space ? (
          <Link href={`/s/${booking.space.slug}`} className="block px-4 py-3 active:bg-sunk">
            <span className="text-headline">{booking.space.title}</span>
          </Link>
        ) : null}
        {booking.guest ? <Row label="Guest" value={booking.guest.display_name || 'Guest'} /> : null}
        <Row label="When" value={when} />
        <Row label="Guests" value={String(booking.guests)} />
        <Row
          label={host ? 'Booking total' : d.next === 'pay' || booking.status === 'held' ? 'Due now' : 'Paid'}
          value={formatMinor(booking.due_now_minor)}
        />
        <Row label="Reference" value={booking.reference} />
      </section>

      {booking.location ? (
        <section className="mt-6 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-headline">Address</h2>
          <p className="mt-1 text-body">{booking.location.locality}</p>
          {booking.location.landmark ? <p className="text-body text-ink-muted">{booking.location.landmark}</p> : null}
          {booking.location.digital_address ? (
            <p className="tabular mt-1 text-body">GhanaPost {booking.location.digital_address}</p>
          ) : null}
          {/* A universal link: it opens the maps app on a phone, the website
              elsewhere, and needs no API key. */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${booking.location.latitude},${booking.location.longitude}`}
            className="mt-3 flex h-11 items-center justify-center rounded-md border border-line-strong text-headline active:bg-sunk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Maps
          </a>
        </section>
      ) : null}

      {d.next === 'pay' ? (
        <div className="mt-6">
          <PayButton bookingId={booking.id} label={`Pay ${formatMinor(booking.due_now_minor)}`} />
        </div>
      ) : null}

      {host ? null : (
        <div className="mt-8">
          <Protection />
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
      <span className="text-body">{label}</span>
      <span className="tabular text-right text-body text-ink-muted">{value}</span>
    </div>
  );
}
