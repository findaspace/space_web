import Link from 'next/link';

import { Wordmark } from '@/components/site-header';

export default function NotFound() {
  return <main id="main-content" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center"><Link href="/" aria-label="Findaspace home"><Wordmark /></Link><p className="eyebrow mt-10 text-ink-subtle">404 · A little out of place</p><h1 className="mt-3 text-large-title">Let’s find your space.</h1><p className="mt-4 text-body leading-7 text-ink-muted">This page isn’t available. There are more spaces waiting to be explored.</p><Link href="/" className="primary-button mt-7">Explore spaces</Link></main>;
}
