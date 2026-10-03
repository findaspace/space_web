import Link from 'next/link';

import type { components } from '@/lib/api/schema';
import { perLabel } from '@/lib/format';
import { formatMinor } from '@/lib/money';

import { Protection } from './protection';

type Listing = components['schemas']['PublicListing'];
type Quote = components['schemas']['Quote'];

// A lease is a request the host approves before anything is paid; a nightly
// stay is reserved and paid at once. The button says which, before the tap.
function BookButton({ listing, className = '' }: { listing: Listing; className?: string }) {
  return (
    <Link
      href={`/book/${listing.slug}`}
      className={`flex h-12 items-center justify-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed ${className}`}
    >
      {listing.rental_mode === 'nightly' ? 'Reserve' : 'Request to rent'}
    </Link>
  );
}

function Price({ listing }: { listing: Listing }) {
  return (
    <p className="tabular text-title-3">
      {formatMinor(listing.base_price_minor)}
      <span className="text-subheadline font-normal text-ink-muted"> {perLabel(listing.price_period)}</span>
    </p>
  );
}

// The line items that make up what leaves the renter's account on day one.
// The plain monthly rent line is informational, not part of that total, so it
// is left out here.
function DueNow({ quote }: { quote: Quote }) {
  const lines = quote.lines.filter((l) => l.code !== 'rent');
  return (
    <div className="mt-4 border-t border-line pt-4">
      <dl className="space-y-2 text-subheadline">
        {lines.map((l) => (
          <div key={l.code} className="flex justify-between gap-4">
            <dt className="text-ink-muted">{l.label}</dt>
            <dd className="tabular">{formatMinor(l.amount_minor)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex justify-between gap-4 border-t border-line pt-3 text-headline">
        <span>To move in</span>
        <span className="tabular">{formatMinor(quote.due_now_minor)}</span>
      </div>
    </div>
  );
}

// Desktop: a card that stays in view beside the details, as the major platforms
// do, so the price and the action are never more than a glance away.
export function PriceCard({ listing, quote }: { listing: Listing; quote: Quote | null }) {
  return (
    <aside className="sticky top-24 hidden rounded-lg border border-line bg-surface p-5 lg:block">
      <Price listing={listing} />
      {quote ? <DueNow quote={quote} /> : null}
      <BookButton listing={listing} className="mt-5 w-full" />
      <Link
        href={`/message/${listing.slug}`}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-line-strong text-headline active:bg-sunk"
      >
        Message the host
      </Link>
      <div className="mt-5 border-t border-line pt-4">
        <Protection compact />
      </div>
    </aside>
  );
}

// Phone: a bar pinned to the bottom of the screen with the price and the
// action. It is the one element in the system allowed a shadow, because it is
// the one that genuinely floats over scrolling content.
export function PriceBar({ listing, quote }: { listing: Listing; quote: Quote | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <Price listing={listing} />
          {quote ? (
            <p className="tabular truncate text-footnote text-ink-muted">
              {formatMinor(quote.due_now_minor)} to move in
            </p>
          ) : null}
        </div>
        <BookButton listing={listing} className="shrink-0" />
      </div>
    </div>
  );
}
