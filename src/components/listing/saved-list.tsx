'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { decodeSaved, savedSnapshot, subscribeSaved } from '@/lib/saved/store';

import { Icon } from '../ui/icon';
import { ListingCard } from './listing-card';

export function SavedList() {
  const raw = useSyncExternalStore(subscribeSaved, savedSnapshot, () => '[]');
  const items = decodeSaved(raw);
  return items.length ? <>
    <p className="mt-6 text-subheadline text-ink-muted">{items.length} saved {items.length === 1 ? 'space' : 'spaces'}. Open a listing to check the current price and availability.</p>
    <ul className="mt-6 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((space) => <li key={space.slug}><ListingCard result={space} /></li>)}</ul>
  </> : <div className="mx-auto flex max-w-sm flex-col items-center py-20 text-center">
    <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-sunk"><Icon name="heart" className="size-8" /></div>
    <h2 className="text-title-2">Your next space starts here</h2>
    <p className="mt-3 text-body text-ink-muted">Tap the heart on any listing to keep your favourites together.</p>
    <Link href="/" className="primary-button mt-6">Explore spaces<Icon name="arrow" /></Link>
  </div>;
}
