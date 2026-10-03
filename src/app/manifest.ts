import type { MetadataRoute } from 'next';

import { site } from '@/lib/site';

// What a phone needs to install Findaspace as an app: a name, icons including
// a 512 pixel and a maskable one, a start page, and standalone display, so it
// opens without the browser's address bar. Android also needs the service
// worker registered in the root layout.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable id means changing start_url later is not treated as a
    // different app, which would leave installed copies orphaned.
    id: '/',
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: site.themeColor,
    theme_color: site.themeColor,
    lang: site.locale,
    categories: ['lifestyle', 'shopping', 'travel'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
