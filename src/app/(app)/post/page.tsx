import type { Metadata } from 'next';

import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

import { PostFlow } from './post-flow';

export const metadata: Metadata = {
  title: 'Post a space',
  robots: { index: false },
};

export default async function PostPage() {
  await requireUser('/post');

  // The kinds of space, which modes each allows, and the fields worth asking
  // about all come from the API's schema, so the form cannot drift from what
  // the API accepts.
  const client = await serverApi();
  const { types } = await unwrap(client.GET('/v1/space-types'));

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-7xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:px-8 lg:pt-10">
      <PostFlow types={types} />
    </main>
  );
}
