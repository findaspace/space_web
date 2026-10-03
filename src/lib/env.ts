import 'server-only';

import { z } from 'zod';

// Server-only on purpose. Anything prefixed NEXT_PUBLIC_ is compiled into the
// JavaScript every visitor downloads, so the API's address and the shared
// secret never get that prefix.
const schema = z.object({
  SPACE_API_URL: z.url(),
  SPACE_DEMO_MODE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  SPACE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  // Proves to space_api that a request came from this web app, which is what
  // lets the API trust the client IP this app forwards. 32 characters minimum:
  // it guards every rate limit on the platform.
  SPACE_BFF_SECRET: z.string().min(32, 'SPACE_BFF_SECRET must be at least 32 characters'),

  // The public origin, used to make canonical and share URLs absolute. A
  // WhatsApp preview needs an absolute URL; a relative one shows nothing.
  SPACE_SITE_URL: z.url().default('http://localhost:3000'),

  // The Ghana basemap, one .pmtiles file in the bucket. Optional: without it
  // the map is simply not offered, and the list works exactly as before.
  SPACE_MAP_TILES_URL: z.url().optional(),

  // Payments are built and tested but switched off: for now, renters contact
  // owners directly, as on Jiji and meQasa. Off hides every booking, payment
  // and payout surface; the code stays, ready to switch back on.
  SPACE_PAYMENTS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);

// Fail at boot with every problem listed, not at the first request with one.
if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
