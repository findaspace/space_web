import { ListingCardSkeleton } from '@/components/listing/listing-card';

// Shown the instant a category or search is tapped, in the same shape as the
// page it stands in for, so nothing jumps when the real one arrives.
export default function Loading() {
  return (
    <main id="main-content" aria-busy="true" aria-label="Loading spaces">
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1760px] px-4 pt-5 pb-6 md:px-10 md:pt-8">
          <div className="mx-auto h-14 max-w-3xl animate-pulse rounded-full bg-sunk md:h-16" />
          <div className="mt-8 flex gap-7 overflow-hidden">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="size-6 animate-pulse rounded-sm bg-sunk" />
                <div className="h-3 w-12 animate-pulse rounded-sm bg-sunk" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1760px] px-4 py-10 md:px-10">
        <div className="h-7 w-48 animate-pulse rounded-sm bg-sunk" />
        <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <ListingCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
