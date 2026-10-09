import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Announcing the framework and version to every client helps nobody but an
  // attacker matching it against this week's advisories.
  poweredByHeader: false,

  async headers() {
    return [
      { source: '/auth/:path*', headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
      ] },
      {
        source: '/:path*',
        headers: [
          // The browser trusts the declared type of every response instead of
          // guessing, which closes a class of attacks through uploaded files.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Other sites learn only that a visitor came from Findaspace, never
          // which listing or booking page they were on.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // No other site may frame these pages, which stops clickjacking a
          // guest into pressing Pay without seeing it.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Location is used to place a new listing; nothing else is.
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), browsing-topics=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Never cached by the browser or a proxy, or a fix to the worker could
        // be stuck behind an old copy for days.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  images: {
    // space_api's worker already produced the right size at upload time: a
    // card rendition for results and a full image for the listing page.
    // Sending those through the platform's image optimiser again would bill
    // per image for work that is already done.
    unoptimized: true,
  },
};

export default config;
