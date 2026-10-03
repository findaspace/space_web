import Image from 'next/image';
import Link from 'next/link';

import type { components } from '@/lib/api/schema';
import { perLabel } from '@/lib/format';
import { humanize } from '@/lib/listing/facts';
import { formatMinor } from '@/lib/money';
import { CATEGORIES } from '@/lib/search/params';

import { Icon } from '../ui/icon';
import { SpaceIcon } from '../ui/space-icons';
import { SaveButton } from './save-button';

type Result = components['schemas']['SearchResult'];
export function ListingCard({ result, priority = false }: { result: Result; priority?: boolean }) {
  const type = CATEGORIES.find((c) => c.value === result.space_type)?.label ?? humanize(result.space_type);
  return <article className="group relative min-w-0">
    <div className="relative">
      <Link href={`/s/${result.slug}`} aria-label={`View ${result.title}`} className="relative block aspect-[1.12] overflow-hidden rounded-[18px] bg-sunk">
        {result.cover_url ? <Image src={result.cover_url} alt={result.title} fill priority={priority} loading={priority ? undefined : 'lazy'} sizes="(min-width: 1280px) 300px, (min-width: 768px) 40vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.035]" /> : <div className="flex size-full flex-col items-center justify-center gap-3 text-ink-subtle"><SpaceIcon kind={result.space_type} className="size-10" /><span className="text-footnote">Photos coming soon</span></div>}
        <span className="absolute top-3 left-3 max-w-[65%] truncate rounded-full bg-surface/95 px-3 py-1.5 text-[11px] font-semibold">{result.rental_mode === 'nightly' ? 'Short stay' : type}</span>
      </Link>
      <SaveButton space={result} compact />
    </div>
    <Link href={`/s/${result.slug}`} className="mt-3 block rounded-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-[15px] leading-6 font-semibold tracking-tight">{result.title}</h3>
        {result.review_count > 0 && typeof result.rating === 'number' ? <span className="flex shrink-0 items-center gap-1 text-footnote">★ {result.rating.toFixed(1)}<span className="sr-only"> from {result.review_count} reviews</span></span> : null}
      </div>
      <p className="mt-0.5 flex items-center gap-1 text-footnote text-ink-muted"><Icon name="pin" className="size-3.5 shrink-0" /><span className="truncate">{result.locality}</span></p>
      {result.landmark_name ? <p className="mt-1 line-clamp-1 text-footnote text-ink-subtle">{result.walk_minutes !== undefined ? `${result.walk_minutes} min walk to ` : 'Near '}{result.landmark_name}</p> : <p className="mt-1 text-footnote text-ink-subtle">{type} · {result.rental_mode === 'nightly' ? 'Stay for a few nights' : result.rental_mode === 'flexible' ? 'Flexible rental' : 'Longer-term rental'}</p>}
      <p className="tabular mt-2.5 text-[15px]"><span className="font-bold">{formatMinor(result.price_minor)}</span><span className="text-footnote text-ink-muted"> {perLabel(result.price_period)}</span></p>
    </Link>
  </article>;
}
export function ListingCardSkeleton() {
  return <div aria-hidden="true"><div className="aspect-[1.12] animate-pulse rounded-[18px] bg-sunk" /><div className="mt-3 space-y-2"><div className="h-4 w-4/5 animate-pulse rounded-sm bg-sunk" /><div className="h-4 w-1/2 animate-pulse rounded-sm bg-sunk" /><div className="h-4 w-1/3 animate-pulse rounded-sm bg-sunk" /></div></div>;
}
