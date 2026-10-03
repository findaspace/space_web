import type { Metadata } from 'next';
import Link from 'next/link';

import { Icon } from '@/components/ui/icon';
import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { features } from '@/lib/features';
import { perLabel } from '@/lib/format';
import { humanize } from '@/lib/listing/facts';
import { formatMinor } from '@/lib/money';
import { CATEGORIES } from '@/lib/search/params';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'My listings', robots: { index: false } };
const STATUS: Record<string, string> = { draft: 'Draft', in_review: 'In review', published: 'Live', suspended: 'Suspended', archived: 'Archived' };
export default async function HostingPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  await requireUser('/hosting');
  const raw = (await searchParams).offset;
  const offset = raw && /^\d{1,6}$/.test(raw) ? Number(raw) : 0;
  const client = await serverApi();
  const { spaces } = await unwrap(client.GET('/v1/spaces', { params: { query: { limit: 25, offset } } }));
  return <main id="main-content" className="page-shell min-h-[75dvh] py-8 md:py-12">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow text-ink-subtle">Your hosting space</p><h1 className="mt-2 text-large-title tracking-tight md:text-[42px] md:leading-tight">Open doors. Make connections.</h1><p className="mt-3 text-subheadline text-ink-muted">Manage your listings and keep your space details up to date.</p></div><Link href="/post" className="primary-button"><Icon name="plus" />List your space</Link></div>
    <div className="mt-8 grid grid-cols-3 gap-3 md:max-w-2xl">{[['Live', spaces.filter((s) => s.status === 'published').length], ['In review', spaces.filter((s) => s.status === 'in_review').length], ['Drafts', spaces.filter((s) => s.status === 'draft').length]].map(([label, count]) => <div key={label} className="rounded-lg border border-line bg-sunk/40 p-4 md:p-5"><p className="tabular text-title-1">{count}</p><p className="mt-1 text-footnote text-ink-muted">{label} on this page</p></div>)}</div>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/inbox" className="secondary-button"><Icon name="message" />Messages</Link>{features.payments && <><Link href="/hosting/bookings" className="secondary-button">Bookings</Link><Link href="/hosting/payouts" className="secondary-button">Payouts</Link></>}</div>
    {spaces.length === 0 ? <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center"><Icon name="home" className="size-10" /><h2 className="mt-5 text-title-2">Your first listing starts here.</h2><p className="mt-3 text-body text-ink-muted">Add photos, a location and rental details. We’ll review it before renters can discover it.</p><Link href="/post" className="primary-button mt-6">Post a space</Link></div> : <><h2 className="section-title mt-10">Your listings</h2><ul className="mt-5 grid gap-4 lg:grid-cols-2">{spaces.map((s) => <li key={s.id} className="rounded-[20px] border border-line p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="eyebrow text-ink-subtle">{CATEGORIES.find((c) => c.value === s.space_type)?.label ?? humanize(s.space_type)}</p><h3 className="mt-2 text-headline">{s.title}</h3><p className="mt-2 text-footnote text-ink-muted">{s.location.locality}</p></div><span className="shrink-0 rounded-full bg-sunk px-3 py-2 text-caption font-semibold">{STATUS[s.status] ?? humanize(s.status)}</span></div><p className="tabular mt-4 text-subheadline"><strong>{formatMinor(s.base_price_minor)}</strong><span className="text-ink-muted"> {perLabel(s.price_period)}</span></p><div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4"><Link href={`/hosting/${s.id}`} className="secondary-button min-h-11 px-4">Manage listing</Link>{s.status === 'published' && <Link href={`/s/${s.slug}`} className="inline-flex min-h-11 items-center gap-2 px-2 text-footnote font-semibold">View listing<Icon name="arrow" className="size-4" /></Link>}</div></li>)}</ul><nav aria-label="Listing pages" className="mt-7 flex justify-between">{offset > 0 ? <Link href={`/hosting?offset=${Math.max(0, offset - 25)}`} className="secondary-button">Previous</Link> : <span />}{spaces.length === 25 && <Link href={`/hosting?offset=${offset + 25}`} className="secondary-button">Next listings</Link>}</nav></>}
  </main>;
}
