'use client';

import Link from 'next/link';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="mx-auto max-w-md px-5 py-20 text-center"><h1 className="text-title-2">We couldn’t load this page.</h1><p className="mt-3 text-body leading-7 text-ink-muted">Check your connection and try again. Your saved listing details are kept by the service.</p><button type="button" onClick={reset} className="primary-button mt-6">Try again</button><Link href="/" className="mt-4 block min-h-11 py-3 text-subheadline underline">Back to exploring</Link></main>;
}
