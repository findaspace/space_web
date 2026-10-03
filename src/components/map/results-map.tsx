'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { components } from '@/lib/api/schema';
import { perLabel, whereLabel } from '@/lib/format';
import { groupByCell, type Cell } from '@/lib/map/cells';
import { formatMinor } from '@/lib/money';

import type { Engine } from './map-engine';

type Result = components['schemas']['SearchResult'];

function labelFor(c: Cell): string {
  if (c.results.length > 1) return `${c.results.length} places`;
  const r = c.results[0]!;
  return `${formatMinor(r.price_minor)}${perLabel(r.price_period)}`;
}

// The shell that ships with the page. It is small on purpose: the map engine
// is imported only once this container has a size on screen, so a phone
// showing the list, or a desktop layout the map is hidden in, never loads it.
export function ResultsMap({
  results,
  tilesUrl,
  cooperative,
  showCards = true,
  label = labelFor,
}: {
  results: Result[];
  tilesUrl?: string;
  cooperative: boolean;
  // On a listing's own page, a card pointing back at the same listing is noise.
  showCards?: boolean;
  label?: (c: Cell) => string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'ready' | 'failed'>('waiting');
  const [selected, setSelected] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cells = useMemo(() => groupByCell(results), [results]);

  useEffect(() => {
    const el = container.current;
    if (!el || !tilesUrl) return;
    let cancelled = false;

    const observer = new ResizeObserver(async (entries) => {
      // Both dimensions: a container with width but no height yet would
      // initialise a map that draws nothing.
      const rect = entries[0]?.contentRect;
      if (cancelled || engine.current || !rect || rect.width <= 0 || rect.height <= 0) return;
      observer.disconnect();
      setStatus('loading');
      try {
        const { mountMap } = await import('./map-engine');
        if (cancelled) return;
        engine.current = mountMap({ container: el, tilesUrl, cooperative, resetArchive: attempt > 0, onSelect: showCards ? setSelected : () => undefined, onStatus: (next) => { if (!cancelled) setStatus(next); } });
        engine.current.setCells(cells, label);
      } catch (error) {
        console.error('map failed to start', error);
        if (!cancelled) setStatus('failed');
      }
    });
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      engine.current?.destroy();
      engine.current = null;
    };
  // Cells and labels update through the effect below without rebuilding the map.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilesUrl, cooperative, showCards, attempt]);

  useEffect(() => {
    if (status === 'ready') engine.current?.setCells(cells, label);
  }, [cells, status, label]);

  useEffect(() => {
    engine.current?.setSelected(selected);
  }, [selected]);

  const open = cells.find((c) => c.key === selected);

  return (
    <div className="relative size-full bg-sunk" data-map-status={status} role="region" aria-label="Space locations map">
      {/* Positioned inline on purpose. MapLibre adds the class maplibregl-map
          to this element, and its stylesheet sets position: relative on it.
          That stylesheet loads after ours, so on equal specificity it would
          beat an absolute class, the element would collapse to zero height,
          and the map would draw nothing. An inline style outranks both. */}
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />

      {!tilesUrl || status === 'failed' ? (
        <p className="absolute inset-x-4 top-4 rounded-md bg-surface px-3 py-2 text-footnote text-ink-muted">
          The map is not available right now. Every listing is in the list.
          {tilesUrl ? <button type="button" onClick={() => setAttempt((n) => n + 1)} className="ml-2 min-h-11 font-semibold underline">Retry map</button> : null}
        </p>
      ) : status === 'loading' ? (
        <p className="absolute inset-x-0 top-4 text-center text-footnote text-ink-muted" aria-live="polite">
          Loading the map
        </p>
      ) : null}

      {open ? (
        <div className="absolute inset-x-3 bottom-3 max-h-[45%] overflow-y-auto rounded-lg border border-line bg-surface p-3 shadow-lift">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-footnote text-ink-muted">
              {open.results.length === 1 ? 'In this area' : `${open.results.length} places in this area`}
            </p>
            <button type="button" onClick={() => setSelected(null)} className="min-h-11 px-2 text-subheadline font-semibold text-state-ink">
              Close
            </button>
          </div>
          <ul className="space-y-2">
            {open.results.map((r) => (
              <li key={r.slug}>
                <Link href={`/s/${r.slug}`} className="block rounded-md px-1 py-1 active:bg-sunk">
                  <p className="truncate text-headline">{r.title}</p>
                  <p className="tabular text-footnote text-ink-muted">
                    {formatMinor(r.price_minor)}
                    {perLabel(r.price_period)} · {whereLabel(r)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-subtle">Shown as an area. Ask the owner or manager for directions when you arrange a viewing.</p>
        </div>
      ) : null}
    </div>
  );
}
