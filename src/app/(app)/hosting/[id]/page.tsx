import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

import { ListingManager } from './listing-manager';

export const metadata: Metadata = { title: 'Manage listing', robots: { index: false } };
export default async function ManageListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireUser(`/hosting/${id}`);
  const client = await serverApi();
  const listing = await unwrap(client.GET('/v1/spaces/{id}', {params:{path:{id}}})).catch((error:unknown)=>{ if(error && typeof error==='object' && 'status' in error && error.status===404) notFound(); throw error; });
  const [{ types }, { media }] = await Promise.all([unwrap(client.GET('/v1/space-types')), unwrap(client.GET('/v1/spaces/{id}/media', { params: { path: { id } } }))]);
  return <main id="main-content" className="page-shell max-w-4xl py-8 md:py-12"><Link href="/hosting" className="inline-flex min-h-11 items-center text-subheadline font-semibold">← My listings</Link><p className="eyebrow mt-5 text-ink-subtle">Manage your space</p><h1 className="mt-2 text-large-title">{listing.title}</h1><ListingManager listing={listing} fields={types.find((t) => t.type === listing.space_type)?.fields ?? []} modes={types.find((t)=>t.type===listing.space_type)?.modes ?? []} media={media} /></main>;
}
