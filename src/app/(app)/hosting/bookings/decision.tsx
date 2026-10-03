'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { approveBooking, declineBooking } from '../actions';

// Common reasons, so declining takes a tap. The guest sees the reason, and a
// reason is kinder than silence; "Other" sends none.
const REASONS = ['Those dates are no longer free', 'The place is not right for this many people', 'I need a longer lease', 'Other'];

export function Decision({ bookingId, guestName }: { bookingId: string; guestName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'declining'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(undefined);
    const res = await work();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (mode === 'declining') {
    return (
      <div className="mt-3">
        <p className="text-subheadline font-semibold">Why decline?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => run(() => declineBooking(bookingId, r === 'Other' ? '' : r))}
              className="flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-subheadline active:bg-sunk disabled:opacity-50"
            >
              {r}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMode('idle')} className="mt-3 min-h-11 text-subheadline text-ink-muted">
          Keep the request
        </button>
        {error ? <p role="alert" className="mt-2 text-footnote text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => approveBooking(bookingId))}
          className="flex h-11 flex-1 items-center justify-center rounded-md bg-action px-4 text-headline text-on-action active:bg-action-pressed disabled:opacity-50"
        >
          {busy ? 'Approving' : `Approve ${guestName}`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode('declining')}
          className="flex h-11 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-headline active:bg-sunk disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      <p className="mt-2 text-footnote text-ink-subtle">Approving gives them 24 hours to pay. The dates are theirs only once they do.</p>
      {error ? <p role="alert" className="mt-2 text-footnote text-danger">{error}</p> : null}
    </div>
  );
}
