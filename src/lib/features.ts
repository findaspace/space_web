import 'server-only';

import { env } from './env';

// One place that says which product is running. Every booking, payment and
// payout surface asks this, so turning payments back on is one setting.
export const features = {
  payments: env.SPACE_PAYMENTS_ENABLED,
} as const;
