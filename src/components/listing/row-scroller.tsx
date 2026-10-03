'use client';

import { useRef, type ReactNode } from 'react';

// A horizontal row of cards. On a phone it is swiped, with the next card
// peeking in so it is obvious there is more; on a desktop, arrows page through
// it a screen at a time.
export function RowScroller({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);

  function page(direction: 1 | -1) {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <div className="absolute -top-14 right-0 hidden gap-2 md:flex">
        <button type="button" onClick={() => page(-1)} aria-label={`Previous ${label}`} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink active:bg-sunk">
          <Chevron flip />
        </button>
        <button type="button" onClick={() => page(1)} aria-label={`More ${label}`} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink active:bg-sunk">
          <Chevron />
        </button>
      </div>
      <ul
        ref={track}
        className="-mx-4 grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] sm:auto-cols-[42%] md:auto-cols-[30%] lg:mx-0 lg:auto-cols-[calc((100%-3*1.25rem)/4)] lg:gap-5 lg:px-0 xl:auto-cols-[calc((100%-3*1.25rem)/4)]"
      >
        {children}
      </ul>
    </div>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-4 ${flip ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
