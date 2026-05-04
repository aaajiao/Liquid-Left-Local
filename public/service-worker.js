// Service Worker for Liquid Left - Offline Gaming Support
//
// Caching strategy summary:
//   - Navigation requests (HTML / mode === 'navigate'):
//       network-first, fall back to cached request, then to '/' / '/index.html',
//       finally to the inline offline page. The HTML shell is cheap to refetch
//       and we want the latest one when online.
//   - Same-origin static assets (hashed JS/CSS chunks emitted by Vite, the SW
//     itself, the webmanifest, audio under /sound/, the favicon set):
//       cache-first. Vite hashes filenames so any change ships under a new
//       URL — treating these as immutable is correct, and `activate` clears
//       all stale caches whose name does not match CACHE_NAME below.
//   - Google Fonts: cache-first (small, immutable per URL).
//   - Anything else: network only.
//
// Bumping CACHE_VERSION wipes every prior cache during `activate` (see below).
// Bump it whenever the precache list, fetch handler, or any non-hashed cached
// asset changes. Hashed Vite chunks do NOT require a bump.
const CACHE_VERSION = 'v4';
const CACHE_NAME = `liquid-left-${CACHE_VERSION}`;

// Precache list: navigation fallbacks + assets we ship by stable URL (no hash
// in the filename). Hashed Vite chunks are populated lazily by the same-origin
// cache-first branch in the fetch handler.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon/site.webmanifest',
  '/sound/sun.mp3',
];

// Offline fallback response
const offlineResponse = () => new Response(
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif"><div style="text-align:center"><h1>Offline</h1><p>Please connect to the internet and refresh.</p></div></body></html>',
  { status: 503, headers: { 'Content-Type': 'text/html' } }
);

// Install: precache navigation shell + stable-URL assets, then activate
// immediately. addAll is atomic — if any URL fails the install fails, which is
// what we want: a partial precache is worse than no precache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('liquid-left-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Vercel Analytics and Speed Insights - don't call respondWith
  if (url.hostname.includes('vercel') ||
      url.hostname.includes('vitals') ||
      url.pathname.includes('analytics')) {
    return;
  }

  // Navigation requests (HTML shell): network-first, then cached request URL,
  // then the precached '/' or '/index.html', then the inline offline page.
  // We always want the freshest HTML when online, but we MUST be able to boot
  // the SPA from cache when offline — that's why '/' and '/index.html' are
  // precached during `install`.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;
          return offlineResponse();
        })
    );
    return;
  }

  // Same-origin assets: cache-first, populate on miss. Vite emits hashed
  // filenames for JS/CSS chunks (e.g. /assets/index-AbCd1234.js) so each
  // build's URLs are unique — treating cached responses as immutable is safe.
  // Stale caches from older CACHE_VERSION values are deleted in `activate`.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return 503 for missing assets when offline
            return new Response('Resource unavailable offline', { status: 503 });
          });
      })
    );
    return;
  }

  // For Google Fonts: Cache first, network fallback
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return new Response('', { status: 503 });
          });
      })
    );
    return;
  }

  // Default: Network with offline fallback
  event.respondWith(
    fetch(request).catch(() => {
      return new Response('Resource unavailable offline', { status: 503 });
    })
  );
});
