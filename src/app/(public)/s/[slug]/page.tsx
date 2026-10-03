import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { ContactBar, ContactCard } from '@/components/listing/contact-actions';
import { Gallery } from '@/components/listing/gallery';
import { ListingCard } from '@/components/listing/listing-card';
import { RowScroller } from '@/components/listing/row-scroller';
import { SaveButton } from '@/components/listing/save-button';
import { SafetyNote } from '@/components/listing/safety-note';
import { ListingMap } from '@/components/map/listing-map';
import { PriceBar, PriceCard } from '@/components/listing/price-panel';
import { ShareButton } from '@/components/listing/share-button';
import { Icon } from '@/components/ui/icon';
import type { components } from '@/lib/api/schema';
import { perLabel } from '@/lib/format';
import { excerpt } from '@/lib/listing/dates';
import { facts, humanize } from '@/lib/listing/facts';
import { env } from '@/lib/env';
import { features } from '@/lib/features';
import { getListing, getListingExtras, similarTo } from '@/lib/listing/load';
import { formatMinor } from '@/lib/money';
import { groupOf } from '@/lib/search/groups';
import { CATEGORIES } from '@/lib/search/params';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).slug);
  if (!listing) return { title: 'Listing not found', robots: { index: false } };
  const { media } = await getListingExtras(listing);
  const cover = media[0];
  const price = `${formatMinor(listing.base_price_minor)}${perLabel(listing.price_period)}`;
  const description = excerpt(`${price} in ${listing.location.locality}. ${listing.description}`, 155);
  return { title: listing.title, description, alternates: { canonical: `/s/${listing.slug}` }, openGraph: { type: 'website', title: `${listing.title} · ${price}`, description, url: `/s/${listing.slug}`, images: cover ? [{ url: cover.card_url ?? cover.url, alt: listing.title }] : undefined } };
}
export default async function ListingPage({ params }: Props) {
  const listing = await getListing((await params).slug);
  if (!listing) notFound();
  const [{ media, walks, video, reviews, fields, quote }, similar, jar] = await Promise.all([getListingExtras(listing), similarTo(listing, 8), cookies()]);
  const signedIn = jar.has(ACCESS_COOKIE);
  const contact = { spaceId: listing.id, slug: listing.slug, title: listing.title, signedIn };
  const type = CATEGORIES.find((c) => c.value === listing.space_type)?.label ?? humanize(listing.space_type);
  const listed = facts(listing.attributes, fields);
  const price = `${formatMinor(listing.base_price_minor)}${perLabel(listing.price_period)}`;
  const savedSpace: components['schemas']['SearchResult'] = { slug: listing.slug, title: listing.title, space_type: listing.space_type, rental_mode: listing.rental_mode, price_minor: listing.base_price_minor, currency: listing.currency, price_period: listing.price_period, locality: listing.location.locality, latitude: listing.location.latitude, longitude: listing.location.longitude, photo_count: media.length, review_count: reviews?.summary.count ?? 0, ...(media[0] ? { cover_url: media[0].card_url ?? media[0].url } : {}), ...(reviews?.summary.count ? { rating: reviews.summary.average } : {}) };
  return <>
    <main id="main-content" className="page-shell pb-32 lg:pb-16">
      <div className="flex min-h-16 items-center justify-between gap-3"><Link href={`/?group=${groupOf(listing.space_type)}`} className="flex min-h-11 items-center gap-1 text-footnote font-semibold"><Icon name="chevron" className="size-4 rotate-180" />Explore {type.toLowerCase()} spaces</Link><div className="flex items-center gap-2"><SaveButton space={savedSpace} /><ShareButton title={listing.title} text={`${listing.title}, ${price}`} /></div></div>
      <header className="mb-5 hidden lg:block"><p className="eyebrow text-ink-subtle">{type} · {listing.rental_mode === 'nightly' ? 'Short stay' : 'Longer-term rental'}</p><h1 className="mt-2 text-[36px] leading-tight font-semibold tracking-[-0.04em]">{listing.title}</h1><p className="mt-2 text-subheadline text-ink-muted">{listing.location.locality}, {listing.location.region}</p></header>
      <Gallery media={media} title={listing.title} />
      <div className="mt-7 lg:mt-9 lg:grid lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-16">
        <div className="min-w-0">
          <header className="lg:hidden"><p className="eyebrow text-ink-subtle">{type} · {listing.rental_mode === 'nightly' ? 'Short stay' : 'Longer-term rental'}</p><h1 className="mt-2 text-[28px] leading-[1.2] font-semibold tracking-tight">{listing.title}</h1><p className="mt-2 text-subheadline text-ink-muted">{listing.location.locality}, {listing.location.region}</p></header>
          <div className="mt-5 flex flex-wrap gap-3 border-b border-line pb-6 lg:mt-0"><span className="flex items-center gap-2 rounded-full bg-sunk px-3 py-2 text-footnote"><Icon name="home" className="size-4" />{type}</span><span className="flex items-center gap-2 rounded-full bg-sunk px-3 py-2 text-footnote"><Icon name="user" className="size-4" />Up to {listing.max_occupancy} {listing.space_type === 'hostel_bed' ? 'occupants' : 'people'}</span>{reviews && reviews.summary.count > 0 && <span className="flex items-center gap-1 text-footnote">★ <strong>{reviews.summary.average.toFixed(1)}</strong> · {reviews.summary.count} reviews</span>}</div>
          {walks.length > 0 && <section className="border-b border-line py-6"><h2 className="text-headline">Close to places you know</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{walks.map((w) => <li key={w.name} className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk"><Icon name="pin" className="size-4" /></span><div><p className="text-subheadline font-semibold">{w.name}</p><p className="tabular text-footnote text-ink-muted">{w.minutes} min walk · {w.metres} m</p></div></li>)}</ul></section>}
          <section className="border-b border-line py-7"><h2 className="section-title">About this space</h2><p className="mt-4 text-[16px] leading-7 whitespace-pre-line text-ink-muted">{listing.description || 'The owner or manager has not added a description yet. Ask them for the details that matter to you.'}</p></section>
          {listed.length > 0 && <section className="border-b border-line py-7"><h2 className="section-title">The details that matter</h2><dl className="mt-4 grid gap-x-8 sm:grid-cols-2">{listed.map((f) => <div key={f.key} className="flex items-start justify-between gap-4 border-b border-line py-3"><dt className="text-subheadline text-ink-muted">{f.label}</dt><dd className="tabular text-right text-subheadline font-medium">{f.value}</dd></div>)}</dl></section>}
          {listing.amenities.length > 0 && <section className="border-b border-line py-7"><h2 className="section-title">What this space offers</h2><ul className="mt-5 grid grid-cols-2 gap-4">{listing.amenities.map((a) => <li key={a} className="flex items-center gap-3 text-subheadline"><Icon name="check" className="size-5 shrink-0" />{humanize(a)}</li>)}</ul></section>}
          <section className="border-b border-line py-7"><h2 className="section-title">Rental terms, upfront.</h2><dl className="mt-4 divide-y divide-line rounded-lg border border-line px-4"><Cost label={`Rental rate ${perLabel(listing.price_period)}`} value={formatMinor(listing.base_price_minor)} />{listing.rental_mode === 'term' && <Cost label="Rent advance requested" value={listing.advance_months > 0 ? `${listing.advance_months} months` : 'No advance specified'} />}<Cost label="Deposit" value={listing.deposit_minor > 0 ? formatMinor(listing.deposit_minor) : 'None specified'} />{listing.rental_mode === 'term' && listing.price_period === 'month' && listing.advance_months > 0 && <Cost label="Rent advance + deposit" value={formatMinor(listing.base_price_minor * listing.advance_months + listing.deposit_minor)} />}</dl><p className="mt-3 text-footnote leading-5 text-ink-muted">These are the listed terms. Confirm availability, utilities and any additional charges with the owner or manager before agreeing to rent.</p></section>
          {video?.video_url && <section className="border-b border-line py-7"><h2 className="section-title">Take a look around</h2><video aria-label={`Walkthrough of ${listing.title}`} controls playsInline preload="none" poster={video.poster_url} src={video.video_url} className="mt-4 aspect-video w-full rounded-[20px] bg-ink" /></section>}
          <section className="border-b border-line py-7"><h2 className="section-title">Get to know the area</h2><p className="mt-3 text-body">{listing.location.locality}, {listing.location.region}</p>{listing.location.landmark && <p className="mt-2 text-subheadline text-ink-muted">{listing.location.landmark}</p>}<p className="mt-3 text-footnote leading-5 text-ink-muted">{features.payments ? 'The exact address is shared once your booking is confirmed.' : 'The map shows an approximate area. Ask the owner or manager for the exact address when arranging a viewing.'}</p>{env.SPACE_MAP_TILES_URL && <div className="mt-4 overflow-hidden rounded-[20px]"><ListingMap slug={listing.slug} title={listing.title} latitude={listing.location.latitude} longitude={listing.location.longitude} tilesUrl={env.SPACE_MAP_TILES_URL} /></div>}</section>
          {reviews && reviews.reviews.length > 0 && <section className="border-b border-line py-7"><h2 className="section-title">What renters say</h2><ul className="mt-4 grid gap-4 sm:grid-cols-2">{reviews.reviews.map((r, i) => <li key={i} className="rounded-lg border border-line p-5"><p className="text-subheadline font-semibold">★ {r.rating}</p><p className="mt-3 text-subheadline leading-6 text-ink-muted">{r.body}</p></li>)}</ul></section>}
          <section className="py-7"><h2 className="text-headline">Talk first. View before you pay.</h2><p className="mt-3 text-subheadline leading-6 text-ink-muted">Findaspace helps you discover spaces and contact the people listing them. Rental agreements and payments are arranged directly.</p><Link href={`/message/${listing.slug}`} className="secondary-button mt-4 w-full sm:w-auto"><Icon name="message" />Ask a question</Link><div className="mt-5"><SafetyNote /></div></section>
        </div>
        {features.payments ? <PriceCard listing={listing} quote={quote} /> : <aside className="sticky top-28 hidden self-start rounded-[22px] border border-line-strong bg-surface p-6 shadow-lift lg:block" aria-label="Contact the listing provider"><p className="eyebrow text-ink-subtle">Your next space</p><p className="tabular mt-3 text-[27px] font-bold tracking-tight">{formatMinor(listing.base_price_minor)}<span className="text-subheadline font-normal text-ink-muted"> {perLabel(listing.price_period)}</span></p>{listing.rental_mode === 'term' && listing.advance_months > 0 && <p className="mt-2 text-footnote text-ink-muted">{listing.advance_months} months’ advance requested</p>}<div className="my-5 border-t border-line" /><ContactCard {...contact} /><p className="mt-4 text-center text-[12px] leading-5 text-ink-subtle">Arrange a viewing and agree the rental directly.</p></aside>}
      </div>
      {similar.length > 0 && <section aria-labelledby="similar-title" className="mt-10 border-t border-line pt-9"><h2 id="similar-title" className="section-title">Keep exploring.</h2><p className="mt-2 mb-5 text-footnote text-ink-muted">More spaces like this one.</p><RowScroller label="similar spaces">{similar.map((r) => <li key={r.slug} className="snap-start"><ListingCard result={r} /></li>)}</RowScroller></section>}
    </main>
    {features.payments ? <PriceBar listing={listing} quote={quote} /> : <ContactBar {...contact} price={<p className="tabular text-headline">{formatMinor(listing.base_price_minor)}<span className="block text-footnote font-normal text-ink-muted">{perLabel(listing.price_period)}</span></p>} />}
  </>;
}
function Cost({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 py-4"><dt className="text-subheadline text-ink-muted">{label}</dt><dd className="tabular text-right text-subheadline font-semibold">{value}</dd></div>; }
