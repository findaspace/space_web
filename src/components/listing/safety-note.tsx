import Link from 'next/link';

import { ShieldIcon } from '../ui/icons';

// With no payment held by the platform, the protection it can offer is
// knowledge: the three ways renting here goes wrong, stated where someone is
// about to make contact. Each claim is one the platform can stand behind.
export function SafetyNote() {
  return (
    <section aria-label="Before you pay anything" className="rounded-lg border border-line bg-surface p-4">
      <h2 className="flex items-center gap-2 text-headline">
        <ShieldIcon className="size-5 shrink-0 text-state" />
        Before you pay anything
      </h2>
      <ul className="mt-2 space-y-1.5 text-subheadline text-ink-muted">
        <li>See the space in person, and meet the owner or authorised manager there.</li>
        <li>Never pay to “hold” a place you have not seen.</li>
        <li>Check advance-rent rules and ask for a written agreement and receipts.</li>
      </ul>
      <Link href="/safety" className="mt-3 inline-block text-subheadline font-semibold text-state-ink underline-offset-4 hover:underline">
        Renting safely
      </Link>
    </section>
  );
}
