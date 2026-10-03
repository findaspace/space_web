import type { Metadata } from 'next';

import { SavedList } from '@/components/listing/saved-list';

export const metadata: Metadata = { title: 'Saved spaces', robots: { index: false } };
export default function SavedPage() {
  return <main id="main-content" className="page-shell min-h-[65dvh] py-8 md:py-12">
    <p className="eyebrow text-ink-subtle">Your shortlist</p>
    <h1 className="mt-2 text-large-title tracking-tight md:text-[44px] md:leading-tight">Spaces worth coming back to.</h1>
    <p className="mt-3 text-subheadline text-ink-muted">Saved on this browser and device. No account needed.</p>
    <SavedList />
  </main>;
}
