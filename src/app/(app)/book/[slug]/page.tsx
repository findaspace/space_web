import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { Protection } from '@/components/listing/protection';
import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { addDays, today } from '@/lib/booking/dates';
import { perLabel } from '@/lib/format';
import { nextMonthStart } from '@/lib/listing/dates';
import { getListing, getListingExtras } from '@/lib/listing/load';
import { formatMinor } from '@/lib/money';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

import { BookForm } from './book-form';

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: 'Book', robots: { index: false } };

// How far ahead taken nights are loaded, so the date picker can refuse a taken
// night instantly. The API is still the authority when the booking is made.
const CALENDAR_DAYS = 180;

export default async function BookPage({ params }: Props) {
  const { slug } = await params;

  // Read the request first. Checked before anything dynamic, the switch made
  // Next.js prerender this page at build time, baking in whatever the setting
  // was then and caching it for a year: flipping it later would do nothing.
  await connection();
  if (!features.payments) notFound();

  // Outside the listing's route on purpose. Under /s/[slug], the listing's
  // loading skeleton would stream out with a 200 before these checks ran, so
  // a signed-out visitor would get a skeleton instead of a redirect, and a
  // removed listing would never be a 404. Here nothing is sent until both
  // checks have passed.
  const user = await requireUser(`/book/${slug}`);
  const listing = await getListing(slug);
  if (!listing) {
    notFound();
  }
  if (listing.rental_mode==='flexible' || !['night','month','year'].includes(listing.price_period)) notFound();
  const { media } = await getListingExtras(listing);
  const nightly = listing.rental_mode === 'nightly';

  let taken: string[] = [];
  if (nightly) {
    const client = await serverApi();
    const start = today();
    const cal = await unwrap(
      client.GET('/v1/listings/{slug}/calendar', {
        params: { path: { slug }, query: { from: start, to: addDays(start, CALENDAR_DAYS) } },
      }),
    ).catch(() => null);
    taken = cal ? cal.nights.filter((n) => !n.available).map((n) => n.date.slice(0, 10)) : [];
  }

  const cover = media[0];

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <Link href={`/s/${slug}`} className="text-subheadline font-semibold text-state-ink">
        Back to the listing
      </Link>
      <h1 className="mt-3 text-large-title">{nightly ? 'Reserve' : 'Request to rent'}</h1>

      <div className="mt-5 flex gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-sunk">
          {cover ? <Image src={cover.card_url ?? cover.url} alt="" fill sizes="64px" className="object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-headline">{listing.title}</p>
          <p className="tabular text-footnote text-ink-muted">
            {listing.location.locality} · {formatMinor(listing.base_price_minor)}
            {perLabel(listing.price_period)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <BookForm
          listing={{
            id: listing.id,
            slug: listing.slug,
            mode: listing.rental_mode,
            advanceMonths: listing.advance_months,
            maxOccupancy: listing.max_occupancy,
          }}
          taken={taken}
          today={today()}
          defaultStart={nextMonthStart()}
          needsName={!user.display_name}
        />
      </div>

      <div className="mt-8">
        <Protection />
      </div>
    </main>
  );
}
