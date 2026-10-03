import 'server-only';

import { cache } from 'react';

import { unwrap } from '@/lib/api/client';
import { features } from '@/lib/features';
import { ApiError } from '@/lib/api/problem';
import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';

import { nextMonthStart } from './dates';

export type PublicListing = components['schemas']['PublicListing'];

// cache() makes this one fetch per request, shared by generateMetadata and the
// page. Without it, rendering a listing would ask the API for it twice.
export const getListing = cache(async (slug: string): Promise<PublicListing | null> => {
  const client = await serverApi();
  try {
    return await unwrap(client.GET('/v1/listings/{slug}', { params: { path: { slug } } }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
});

// optional runs an enrichment that must never take the page down. A listing
// whose walk times or reviews could not load is still a listing someone can
// read and book; an error page instead would lose them for nothing.
//
// Failures are logged rather than swallowed silently, so a real bug shows up
// in the server logs even though the visitor never sees it. A 404 is expected
// (a listing with no walkthrough, say) and not logged.
async function optional<T>(label: string, work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      console.error(`listing enrichment "${label}" failed`, err);
    }
    return fallback;
  }
}

export async function getListingExtras(listing: PublicListing) {
  const client = await serverApi();
  const slug = listing.slug;
  const path = { params: { path: { slug } } };

  const [media, walks, video, reviews, types, quote] = await Promise.all([
    optional('media', unwrap(client.GET('/v1/listings/{slug}/media', path)).then((r) => r.media), []),
    optional('walks', unwrap(client.GET('/v1/listings/{slug}/walks', path)).then((r) => r.walks), []),
    optional(
      'video',
      unwrap(client.GET('/v1/listings/{slug}/video', path)).then((v) => (v.status === 'ready' ? v : null)),
      null,
    ),
    optional(
      'reviews',
      unwrap(client.GET('/v1/listings/{slug}/reviews', { params: { path: { slug }, query: { limit: 3 } } })),
      null,
    ),
    optional('space types', unwrap(client.GET('/v1/space-types')).then((r) => r.types), []),

    // The move-in total for a lease: rent in advance, deposit and fee, starting
    // next month. This is the number that decides whether someone can take the
    // place, so it is shown up front rather than discovered at checkout.
    features.payments && listing.rental_mode === 'term'
      ? optional(
          'quote',
          unwrap(
            client.GET('/v1/listings/{slug}/quote', {
              params: {
                path: { slug },
                query: { starts_on: nextMonthStart(), months: Math.max(listing.advance_months, 1) },
              },
            }),
          ),
          null,
        )
      : Promise.resolve(null),
  ]);

  const fields = types.find((t) => t.type === listing.space_type)?.fields;
  return { media, walks, video, reviews, fields, quote };
}

type SearchResult = components['schemas']['SearchResult'];

// similarTo finds spaces like this one: the same kind in the same area first,
// then the same kind anywhere, so a quiet neighbourhood still shows something.
// Never the listing itself.
export async function similarTo(listing: PublicListing, max = 12): Promise<SearchResult[]> {
  const client = await serverApi();
  const search = (q?: string) =>
    optional(
      'similar',
      unwrap(client.GET('/v1/search', { params: { query: { type: listing.space_type, q, limit: max + 1 } } })).then((p) => p.results),
      [] as SearchResult[],
    );

  const nearby = await search(listing.location.locality);
  const seen = new Set([listing.slug]);
  const out: SearchResult[] = [];
  for (const r of nearby) if (!seen.has(r.slug)) { seen.add(r.slug); out.push(r); }
  if (out.length < 4) {
    for (const r of await search()) if (!seen.has(r.slug)) { seen.add(r.slug); out.push(r); }
  }
  return out.slice(0, max);
}
