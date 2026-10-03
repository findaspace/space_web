'use client';

import { useState, useSyncExternalStore } from 'react';

import { decodeSaved, savedSnapshot, subscribeSaved, toggleSaved, type SavedSpace } from '@/lib/saved/store';

import { Icon } from '../ui/icon';

export function SaveButton({ space, compact = false }: { space: SavedSpace; compact?: boolean }) {
  const raw = useSyncExternalStore(subscribeSaved, savedSnapshot, () => '[]');
  const saved = decodeSaved(raw).some((r) => r.slug === space.slug);
  const [message, setMessage] = useState('');
  return <div className={compact ? 'absolute top-3 right-3 z-10' : 'relative'}>
    <button type="button" aria-pressed={saved} aria-label={`${saved ? 'Unsave' : 'Save'} ${space.title}`} title={saved ? 'Remove from saved' : 'Save this space'}
      className={compact ? 'flex size-11 items-center justify-center rounded-full border border-line bg-surface/95 shadow-lift transition-transform hover:scale-105' : 'secondary-button min-h-11 gap-2 px-3'}
      onClick={() => { const result = toggleSaved(space); setMessage(result.ok ? (result.saved ? 'Saved on this device' : 'Removed from saved') : 'Could not save. Device storage may be full, disabled, or at the 100-space limit.'); }}>
      <Icon name="heart" className="size-5" fill={saved ? 'currentColor' : 'none'} />
      {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
    <span role="status" className="sr-only">{message}</span>
    {message.startsWith('Could not') && <p role="alert" className="absolute top-full right-0 mt-2 w-56 rounded-md border border-line bg-surface p-3 text-footnote">{message}</p>}
  </div>;
}
