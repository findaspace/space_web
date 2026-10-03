'use client';

import { useEffect } from 'react';

// Registers the service worker in production only. In development it would
// cache static files that change on every edit and make changes appear not to
// work, the most confusing bug a service worker can cause.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    // After the page has loaded, so registration never competes with it.
    const register = () => void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
