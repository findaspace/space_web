import Link from 'next/link';

import { MODES, hrefFor, type SearchState } from '@/lib/search/params';

// The iOS segmented control, built from links. It decides whether prices on
// the page are per night or per month, which is the one choice that makes a
// budget and a comparison between listings meaningful.
export function ModeSwitch({ state }: { state: SearchState }) {
  const options = [{ value: undefined, label: 'Any' }, ...MODES];

  return (
    <nav aria-label="How long" className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-md bg-sunk p-0.5">
      {options.map((o) => {
        const selected = state.mode === o.value;
        return (
          <Link
            key={o.label}
            href={hrefFor(state, { mode: o.value })}
            aria-current={selected ? 'page' : undefined}
            scroll={false}
            // 8px inside a 10px container with 2px padding: nested corners stay
            // concentric, which is what makes a segmented control look native.
            className={`flex h-10 min-w-20 shrink-0 whitespace-nowrap items-center justify-center rounded-[8px] px-3 text-subheadline ${
              selected ? 'bg-surface font-semibold text-ink ring-1 ring-line' : 'text-ink-muted'
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
