// One level above [slug] on purpose. The existence check throws notFound()
// from [slug]/layout.tsx, and a boundary beside a layout sits inside it, so it
// could never catch what that layout throws. From here it can, and it still
// renders inside the public layout, so the header stays.

import Link from 'next/link';

export default function ListingNotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-sm px-4 pt-20 text-center">
      <p className="text-title-3">This space is no longer listed</p>
      <p className="mt-2 text-body text-ink-muted">
        The owner may have taken it down or rented it out. There are others like it.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-12 items-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed"
      >
        Find a space
      </Link>
    </main>
  );
}
