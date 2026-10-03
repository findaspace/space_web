// The Findaspace service worker. It does two things and deliberately nothing
// else: shows an offline page when a page cannot load, and serves the app's
// fingerprinted static files from cache.
//
// It never caches a page. Bookings, messages and payouts are personal, and
// phones here are often shared: a cached /bookings could be shown to the next
// person on the device after the first has signed out. So pages always come
// from the network, and the only page ever cached is the offline one.
//
// It never touches another origin. Photo uploads go straight to storage with
// presigned URLs, and map tiles are range requests to the bucket; intercepting
// either would risk breaking them, for no gain.

const VERSION = 'findaspace-v2';
const OFFLINE = `offline-${VERSION}`;
const STATIC = `static-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE).then((cache) => cache.add('/offline.html')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Old versions' caches are removed, so a fix to this file actually takes
  // effect instead of competing with what the previous version stored.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('offline-findaspace-') || k.startsWith('static-findaspace-')) && k !== OFFLINE && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A page: always the network. Only if the network fails entirely does the
  // offline page appear instead of the browser's own error.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  // The app's own code and styles. Their names contain a hash of their
  // contents, so a file at a given URL never changes, and cache-first is
  // always correct: a repeat visit on a slow connection skips re-downloading.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
  // Everything else, including the data a page loads and every Server
  // Action, passes through untouched.
});
