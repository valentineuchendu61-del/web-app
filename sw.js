const CACHE_NAME = 'pwa-demo-v1';
const RUNTIME = 'runtime-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// On install: pre-cache key assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== RUNTIME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: intelligent strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For same-origin navigation requests -> serve cached index.html (app shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    );
    return;
  }

  // For API-like requests (example: /api/) -> network-first fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(resp => {
        // optionally put a copy into runtime cache
        return caches.open(RUNTIME).then(cache => {
          cache.put(event.request, resp.clone());
          return resp;
        });
      }).catch(() =>
        caches.match(event.request)
      )
    );
    return;
  }

  // For static assets -> cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        // Put into runtime cache for future
        return caches.open(RUNTIME).then(cache => {
          // only cache successful GET responses
          if (event.request.method === 'GET' && resp && resp.status === 200) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        });
      }).catch(() => {
        // fallback for images when offline
        if (event.request.destination === 'image') {
          return new Response(
            `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect fill='#ddd' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#888'>Offline</text></svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        return caches.match('/index.html');
      });
    })
  );
});

// Listen for messages (client <> SW communication)
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    self.registration.showNotification(title, options || {});
  }
});
