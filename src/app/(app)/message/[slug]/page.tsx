import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { features } from '@/lib/features';
import { getListing } from '@/lib/listing/load';
import { requireUser } from '@/lib/session';

import { Compose } from './compose';

export const metadata: Metadata = { title: 'Message the host', robots: { index: false } };

// Outside the listing's route for the same reason as the booking form: under
// /s/[slug] its skeleton would stream out before the sign-in check.
export default async function MessagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/message/${slug}`);
  const listing = await getListing(slug);
  if (!listing) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <Link href={`/s/${slug}`} className="text-subheadline font-semibold text-state-ink">
        Back to the listing
      </Link>
      <h1 className="mt-3 text-large-title">Message the host</h1>
      <p className="mt-2 text-body text-ink-muted">About {listing.title}.</p>
      <div className="mt-6">
        <Compose spaceId={listing.id} paymentsEnabled={features.payments} />
      </div>
    </main>
  );
}
