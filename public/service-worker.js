// Service Worker for Liquid Left - Offline Gaming Support
const CACHE_VERSION = 'v3';
const CACHE_NAME = `liquid-left-${CACHE_VERSION}`;

// Offline fallback response
const offlineResponse = () => new Response(
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif"><div style="text-align:center"><h1>Offline</h1><p>Please connect to the internet and refresh.</p></div></body></html>',
  { status: 503, headers: { 'Content-Type': 'text/html' } }
);

// Install: Activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
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

  // For navigation requests (HTML): Network first, cache fallback
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
          const indexCached = await caches.match('/');
          if (indexCached) return indexCached;
          return offlineResponse();
        })
    );
    return;
  }

  // For same-origin assets: Cache first, network fallback
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
