'use client';

import { useState, useTransition } from 'react';

import { loadMore } from '@/app/(public)/(search)/search-actions';
import type { components } from '@/lib/api/schema';

import { ListingCard } from '../listing/listing-card';

type Result = components['schemas']['SearchResult'];

// "Show more" appends the next page to the list already on screen.
//
// It is a real link underneath. Without JavaScript it simply opens the next
// page; with JavaScript it is intercepted and the results are added in place,
// so scroll position and everything already loaded stay put.
export function LoadMore({ query, cursor, baseHref }: { query: string; cursor: string; baseHref: string }) {
  const [extra, setExtra] = useState<Result[]>([]);
  const [next, setNext] = useState<string | undefined>(cursor);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function more(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!next || pending) { event.preventDefault(); return; }
    event.preventDefault();
    setFailed(false);

    startTransition(async () => {
      try {
        const page = await loadMore(query, next);
        setExtra((prev) => [...prev, ...page.results]);
        setNext(page.next_cursor);
      } catch {
        // The link still works, so the user is never stuck: pressing it again
        // retries, and without JavaScript it would navigate instead.
        setFailed(true);
      }
    });
  }

  // Follows the current cursor, so the no-JavaScript link always points at the
  // page after the last one shown, not the page after the first.
  const href = next ? `${baseHref}${baseHref.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(next)}` : baseHref;

  return (
    <>
      {extra.map((r) => (
        <li key={r.slug}>
          <ListingCard result={r} />
        </li>
      ))}

      {next ? (
        <li className="col-span-full flex flex-col items-center gap-2 pt-4">
          <a
            href={href}
            onClick={more}
            aria-disabled={pending}
            className="flex h-12 min-w-44 items-center justify-center rounded-md border border-line-strong bg-surface px-6 text-headline aria-disabled:opacity-60"
          >
            {pending ? 'Loading' : 'Show more'}
          </a>
          {failed ? (
            <p role="alert" className="text-footnote text-danger">
              Could not load more. Try again.
            </p>
          ) : null}
        </li>
      ) : null}
    </>
  );
}
