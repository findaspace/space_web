'use client';

import { useEffect } from 'react';
import { reportPageError } from '@/lib/error-reporting';

// Reached when the search itself cannot load, usually because the API is down
// or the phone lost its connection. The header above still works, and so does
// retrying, which is the one thing someone in that position wants to do.
export default function SearchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportPageError(error.digest), [error.digest]);
  return (
    <main id="main-content" className="mx-auto max-w-sm px-4 pt-20 text-center">
      <p className="text-title-3">Spaces could not load</p>
      <p className="mt-2 text-body text-ink-muted">
        Check your connection. If it is fine, Findaspace may be having a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-12 rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed"
      >
        Try again
      </button>
    </main>
  );
}
