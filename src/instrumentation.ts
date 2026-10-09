import type { Instrumentation } from 'next';
import { routeCategory, safeDigest } from './lib/error-reporting';

export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  const digest = safeDigest(error && typeof error === 'object' && 'digest' in error ? error.digest : undefined);
  console.error(JSON.stringify({ event: 'web_server_error', category: routeCategory(context.routePath), ...(digest ? { digest } : {}) }));
};
