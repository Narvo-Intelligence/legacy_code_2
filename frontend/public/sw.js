/* Narvo Service Worker — v3 with runtime API caching & offline support */
const CACHE_NAME = 'narvo-v1772672575742';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/narvo_logo.svg',
  '/narvo-icon-192.png',
  '/narvo-icon-512.png',
];

/* ── Install: pre-cache static shell ── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch strategies ── */
const API_CACHE_TTL = {
  '/api/voices':       600000,   // 10min
  '/api/categories':   3600000,  // 1hr
  '/api/regions':      3600000,
  '/api/sound-themes': 600000,
  '/api/sources':      600000,
};

function isApiCacheable(url) {
  return Object.keys(API_CACHE_TTL).some((p) => url.pathname.endsWith(p));
}

function isNewsApi(url) {
  return url.pathname.includes('/api/news') || url.pathname.includes('/api/search');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) return;

  // Strategy 1: Static API data — Cache First with TTL
  if (isApiCacheable(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          const dateHeader = cached.headers.get('sw-cached-at');
          const matchedPath = Object.keys(API_CACHE_TTL).find((p) => url.pathname.endsWith(p));
          if (dateHeader && (Date.now() - parseInt(dateHeader)) < API_CACHE_TTL[matchedPath]) {
            return cached;
          }
        }
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const clone = response.clone();
            const body = await clone.blob();
            const headers = new Headers(clone.headers);
            headers.set('sw-cached-at', String(Date.now()));
            cache.put(event.request, new Response(body, { status: clone.status, statusText: clone.statusText, headers }));
          }
          return response;
        } catch {
          return cached || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })
    );
    return;
  }

  // Strategy 2: News API — Stale-While-Revalidate (instant from cache, then refresh)
  if (isNewsApi(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            cache.put(event.request, clone);
          }
          return response;
        }).catch(() => null);
        if (cached) {
          fetchPromise; // revalidate in background
          return cached;
        }
        const response = await fetchPromise;
        return response || new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Strategy 3: App shell & static assets — Stale While Revalidate
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null);
        return cached || (await fetchPromise) || new Response('', { status: 503 });
      })
    );
    return;
  }
});

/* ── Push notification handler ── */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NARVO DAILY DIGEST';
  const options = {
    body: data.body || 'Your daily news briefing is ready.',
    icon: '/narvo-icon-192.png',
    badge: '/narvo-icon-192.png',
    tag: 'narvo-digest',
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'READ NOW' }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

/* ── Background Sync: flush offline queue; Daily Digest for offline ── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'narvo-sync-queue') {
    event.waitUntil(flushOfflineQueue());
  }
  if (event.tag === 'daily-digest') {
    event.waitUntil(fetchAndCacheDailyDigest());
  }
});

async function fetchAndCacheDailyDigest() {
  try {
    const configCache = await caches.open('narvo-config');
    const req = new Request(self.location.origin + '/.narvo-backend');
    const res = await configCache.match(req);
    const base = res ? await res.text() : '';
    if (!base) return;
    const digestUrl = base.replace(/\/$/, '') + '/api/news?limit=5';
    const response = await fetch(digestUrl);
    if (!response.ok) return;
    const digestCache = await caches.open('narvo-digest');
    await digestCache.put(new Request(digestUrl), response.clone());
  } catch (e) {
    // Offline or error — next sync will retry
  }
}

async function flushOfflineQueue() {
  try {
    const cache = await caches.open('narvo-offline-queue');
    const requests = await cache.keys();
    for (const request of requests) {
      try {
        const cached = await cache.match(request);
        const body = await cached.text();
        await fetch(request.url, {
          method: request.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        await cache.delete(request);
      } catch (e) {
        // Keep in queue for next sync
      }
    }
  } catch (e) {
    // Queue empty or error
  }
}
