/* Narvo Service Worker — v5 with runtime API caching, offline support, and cache eviction */
const CACHE_NAME = 'narvo-v1774521565921';
const MAX_CACHE_ENTRIES = 150; // (#24) prevent unbounded cache growth
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
const SW_RETRY_DELAYS_MS = [1000, 3000, 6000];

function log(...args) {
  // Service worker logs only in dev tools; keep minimal.
  console.debug('[sw]', ...args);
}

async function fetchWithRetry(input, init, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.ok) return res;
      if (attempt === retries) {
        throw new Error(`fetchWithRetry: got ${res.status} on final attempt`);
      }
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) {
      const delay = SW_RETRY_DELAYS_MS[Math.min(attempt, SW_RETRY_DELAYS_MS.length - 1)];
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  if (lastErr) throw lastErr;
  throw new Error('fetchWithRetry: exhausted retries');
}

function isApiCacheable(url) {
  return Object.keys(API_CACHE_TTL).some((p) => url.pathname.endsWith(p));
}

function isNewsApi(url) {
  return url.pathname.includes('/api/news') || url.pathname.includes('/api/search');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests — SW cannot intercept POST/PUT/etc.
  if (event.request.method !== 'GET') return;
  // Skip all cross-origin requests — the SW cannot modify CORS headers on external responses.
  // API calls go to the same origin (via Vite proxy in dev, or same-origin API in prod).
  // Letting cross-origin requests through causes CORS failures to surface as SW errors.
  if (url.origin !== self.location.origin) return;

  // Never cache Vite dev/dep chunks — avoids stale chunk 404s and duplicate React/router instances
  if (url.pathname.includes('/.vite/') || url.pathname.includes('/node_modules/.vite/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // In dev (localhost), always fetch document so we get fresh chunk list after Vite cache clear
  if (url.hostname === 'localhost' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

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
            // (#24) Evict oldest entries if cache exceeds limit
            trimCache(cache, MAX_CACHE_ENTRIES);
          }
          return response;
        }).catch(() => null);
        if (cached) {
          // (#12) Keep SW alive so background revalidation completes
          event.waitUntil(fetchPromise);
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

/* ── Cache size limiter (#24) ── */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Evict oldest entries (FIFO — first cached, first evicted)
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}

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
  const path = event.notification.data?.url || '/briefing?autoplay=1';
  const fullUrl = path.startsWith('http') ? path : self.location.origin + (path.startsWith('/') ? path : '/' + path);
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      const briefingOrigin = self.location.origin + '/briefing';
      const existing = windowClients.find((c) => c.url.startsWith(briefingOrigin) || c.url === fullUrl);
      if (existing && 'focus' in existing) return existing.focus();
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
      return Promise.resolve();
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
    const response = await fetchWithRetry(digestUrl, { method: 'GET' }, 2);
    if (!response.ok) {
      log('Daily digest fetch failed', response.status);
      return;
    }
    const digestCache = await caches.open('narvo-digest');
    await digestCache.put(new Request(digestUrl), response.clone());
  } catch (e) {
    log('Daily digest sync failed', e);
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
        const res = await fetchWithRetry(request.url, {
          method: request.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }, 2);
        if (res.ok) {
          await cache.delete(request);
        } else {
          log('Queue flush failed', res.status, request.url);
        }
      } catch (e) {
        // Keep in queue for next sync
        log('Queue flush error', e);
      }
    }
  } catch (e) {
    // Queue empty or error
    log('Queue flush failed to open cache', e);
  }
}
