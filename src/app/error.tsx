'use client';

import { useEffect } from 'react';
import { reportPageError } from '@/lib/error-reporting';

import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 useEffect(() => reportPageError(error.digest), [error.digest]);
 return <main id="main-content" className="page-shell flex min-h-[60dvh] flex-col items-center justify-center gap-5 py-12 text-center" aria-labelledby="error-title">
  <h1 id="error-title" className="text-title-1">We couldn’t load this page.</h1>
  <p className="max-w-md text-ink-muted">Try again in a moment. If you were completing a form, check whether it saved before submitting it again.</p>
  <button type="button" onClick={reset} className="primary-button">Try again</button>
  <Link prefetch={false} href="/" className="min-h-11 py-3 underline">Back to spaces</Link>
  {error.digest && <p className="text-footnote text-ink-muted">Support reference: {error.digest}</p>}
 </main>;
}
