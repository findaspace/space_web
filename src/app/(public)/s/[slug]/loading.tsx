// Shown the moment someone taps a listing card, so a tap on a slow connection
// visibly does something while the photos, walk times and quote load.
export default function ListingLoading() {
  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 lg:px-8 lg:pt-6" aria-busy="true" aria-label="Loading listing">
      <div className="-mx-4 aspect-[4/3] animate-pulse bg-sunk lg:mx-0 lg:aspect-auto lg:h-[440px] lg:rounded-lg" />
      <div className="mt-5 max-w-2xl space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-sm bg-sunk" />
        <div className="h-8 w-4/5 animate-pulse rounded-sm bg-sunk" />
        <div className="h-4 w-1/2 animate-pulse rounded-sm bg-sunk" />
      </div>
    </main>
  );
}
