import { site } from '@/lib/site';

import { ShieldIcon } from '../ui/icons';

// The named protection, in the pattern Airbnb uses for AirCover and Vrbo for
// VrboCare: a name, then what it does for the guest, stated as outcomes.
//
// It claims only what the platform actually does today. A full refund when the
// host cancels is built. Paying the host only after move-in is built, and in a
// market where the common fear is paying a stranger who then disappears, it is
// the promise that matters most. "Money back if the place is not as listed"
// is deliberately absent: that needs a way to report a problem, which does not
// exist yet, and a promise the product cannot keep is worse than none.
//
// The last line is the one Vrbo uses to keep payments on the platform: leaving
// the platform means leaving the protection.
export function Protection({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-labelledby="protection-title"
      className={compact ? '' : 'rounded-lg border border-line bg-surface p-4'}
    >
      <h2 id="protection-title" className="flex items-center gap-2 text-headline">
        <ShieldIcon className="size-5 shrink-0 text-state" />
        {site.protection}
      </h2>
      <ul className="mt-2 space-y-1.5 text-subheadline text-ink-muted">
        <li>Full refund if the host cancels.</li>
        <li>The host is only paid after you move in.</li>
        <li>Covers bookings paid through {site.name}. Payments made outside it are not protected.</li>
      </ul>
    </section>
  );
}
