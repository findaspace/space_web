import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getListing } from '@/lib/listing/load';

// Checks the listing exists before anything is sent.
//
// A layout sits outside its own loading boundary, so this resolves before the
// skeleton streams. A missing listing therefore becomes a real 404. Checked
// only in the page, the skeleton would already have gone out with a 200, and
// a removed listing would answer "OK": search engines would keep it, and an
// old WhatsApp link would open onto a skeleton that never fills in.
//
// getListing is cached per request, so the page reading it again costs
// nothing.
export default async function ListingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getListing(slug))) {
    notFound();
  }
  return children;
}
