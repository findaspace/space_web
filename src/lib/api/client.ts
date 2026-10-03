import 'server-only';

import createClient from 'openapi-fetch';

import { env } from '@/lib/env';
import { forwardHeaders, type Forwarded } from '@/lib/forwarded';

import { ApiError, toProblem, unavailable } from './problem';
import type { components, paths } from './schema';

export type User = components['schemas']['User'];
export type TokenResponse = components['schemas']['TokenResponse'];

export type ApiInit = {
  token?: string;
  forwarded?: Forwarded;
};

// A new client per call, never one shared at module level.
//
// This server renders pages for many people at once. A module-level client
// holding a token would attach one user's credentials to another user's
// request, which is the kind of bug that is invisible in development, where
// there is only ever one user.
export function api(init: ApiInit = {}) {
  return createClient<paths>({
    baseUrl: env.SPACE_API_URL,
    headers: {
      ...forwardHeaders(env.SPACE_BFF_SECRET, init.forwarded),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },

    // fetch has no timeout of its own. Without one, a hung API holds a render
    // open until the platform kills the function, and the user stares at a
    // blank screen for the full limit instead of an error after ten seconds.
    fetch: (request: Request) =>
      fetch(request, { signal: AbortSignal.timeout(env.SPACE_API_TIMEOUT_MS), cache: 'no-store' }),
  });
}

type Result<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

// unwrap turns openapi-fetch's { data, error } pair into a value or a thrown
// ApiError. Pages then read top to bottom without an error branch after every
// call, and Next.js error boundaries catch what they are for.
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await call;
  } catch (cause) {
    // A network failure or a timeout, not an answer from the API. Reported as
    // status 0 so it can never be mistaken for anything the API said.
    const reason = cause instanceof Error ? cause.message : 'request failed';
    throw unavailable(reason);
  }

  if (!result.response.ok) {
    throw new ApiError(toProblem(result.response.status, result.error));
  }
  return result.data as T;
}
