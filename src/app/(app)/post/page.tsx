import type { Metadata } from 'next';
import Link from 'next/link';

import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

import { PostFlow } from './post-flow';

export const metadata: Metadata = {
  title: 'Post a space',
  robots: { index: false },
};

export default async function PostPage() {
  const user = await requireUser('/post');

  // The kinds of space, which modes each allows, and the fields worth asking
  // about all come from the API's schema, so the form cannot drift from what
  // the API accepts.
  const client = await serverApi();
  const { types } = await unwrap(client.GET('/v1/space-types'));

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-7xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:px-8 lg:pt-10">
      {!user.phone_verified && <aside aria-label="Verify your contact phone" className="mb-6 rounded-lg border border-line bg-surface p-5"><p className="text-subheadline">You can prepare your listing now. Before submitting it for publication, add a verified contact number.</p><Link prefetch={false} href="/account" className="mt-2 inline-block min-h-11 py-3 font-semibold underline">Verify your phone in your account →</Link></aside>}
      <PostFlow types={types} />
    </main>
  );
}
