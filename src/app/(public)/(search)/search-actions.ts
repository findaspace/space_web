'use server';

import { unwrap } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';
import { parseSearch, toApiQuery } from '@/lib/search/params';

type Page = components['schemas']['SearchPage'];

// loadMore fetches the page after a cursor for "Show more".
//
// It takes the query string, not a parsed object, and runs it through the same
// parser as the page. A Server Action is a public endpoint that anyone can call
// with anything, so it gets exactly the same validation as a URL would.
export async function loadMore(query: string, cursor: string): Promise<Page> {
  const params = new URLSearchParams(query);
  params.set('cursor', cursor);

  const client = await serverApi();
  return unwrap(client.GET('/v1/search', { params: { query: toApiQuery(parseSearch(params)) } }));
}
