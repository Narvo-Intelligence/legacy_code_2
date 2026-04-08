/* Narvo service worker — caching, web push, notification actions, client messages (badge / prefetch). */
/* Keep public/sw.js in sync (legacy registrations). Bump SW_VERSION when precache/runtime logic changes. */

const SW_VERSION = 'narvo-v2';
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

const PRECACHE_URLS = ['/manifest.json', '/narvo-icon-192.png', '/narvo-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((path) =>
            cache.add(new Request(path, { cache: 'reload' })).catch(() => {})
          )
        )
      )
  );
});

self.addEventListener('activate', (event) => {
  const allowed = new Set([STATIC_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('narvo-v') && !allowed.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function sameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!sameOrigin(req.url)) return;

  const path = new URL(req.url).pathname;

  if (path.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStatic(req));
    return;
  }

  if (
    path === '/manifest.json' ||
    path.startsWith('/narvo-icon-') ||
    path.startsWith('/screenshot') ||
    path === '/og-default.png'
  ) {
    event.respondWith(cacheFirstStatic(req));
    return;
  }

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirstNavigate(req));
    return;
  }

  event.respondWith(networkFirstRuntime(req));
});

async function cacheFirstStatic(request) {
  const c = await caches.open(STATIC_CACHE);
  const hit = await c.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) await c.put(request, res.clone());
    return res;
  } catch (err) {
    const again = await c.match(request);
    if (again) return again;
    throw err;
  }
}

async function networkFirstNavigate(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) await runtime.put(request, res.clone());
    return res;
  } catch {
    const hit = await runtime.match(request);
    if (hit) return hit;
    const shell = await runtime.match('/');
    if (shell) return shell;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirstRuntime(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) await runtime.put(request, res.clone());
    return res;
  } catch {
    const hit = await runtime.match(request);
    if (hit) return hit;
    const c = await caches.open(STATIC_CACHE);
    const hit2 = await c.match(request);
    return hit2 || fetch(request);
  }
}

function parsePushPayload(event) {
  let raw = {};
  if (event.data) {
    try {
      raw = event.data.json();
    } catch {
      raw = { body: event.data.text() };
    }
  }
  const inner = raw.data && typeof raw.data === 'object' ? raw.data : {};
  const defaultUrl = '/dashboard';
  const mergedData = {
    url: inner.url || raw.url || defaultUrl,
    narvo_action: inner.narvo_action || 'generic',
    action_urls:
      inner.action_urls && typeof inner.action_urls === 'object' ? inner.action_urls : {},
    briefing_id: inner.briefing_id,
    story_id: inner.story_id,
  };
  const actions = Array.isArray(raw.actions)
    ? raw.actions
        .slice(0, 2)
        .filter((a) => a && typeof a.action === 'string' && typeof a.title === 'string')
    : undefined;

  const opts = {
    body: typeof raw.body === 'string' ? raw.body : 'You have an update.',
    tag: typeof raw.tag === 'string' ? raw.tag : 'narvo-push',
    icon: typeof raw.icon === 'string' ? raw.icon : '/narvo-icon-192.png',
    badge: typeof raw.badge === 'string' ? raw.badge : '/narvo-icon-192.png',
    data: mergedData,
    renotify: Boolean(raw.renotify),
    silent: Boolean(raw.silent),
  };
  if (typeof raw.image === 'string' && raw.image.length) {
    opts.image = raw.image;
  }
  if (actions && actions.length) {
    opts.actions = actions;
  }
  if (raw.vibrate !== undefined) {
    opts.vibrate = raw.vibrate;
  }
  return {
    title: typeof raw.title === 'string' && raw.title.length ? raw.title : 'Narvo',
    opts,
  };
}

function resolveClickUrl(notification, action) {
  const data = notification.data || {};
  const urls = data.action_urls || {};
  const key = action || 'default';
  if (key === 'default' || !key) {
    return data.url || '/dashboard';
  }
  if (urls[key]) return urls[key];
  if (key === 'listen' && urls.listen) return urls.listen;
  if (key === 'open_story' && urls.open_story) return urls.open_story;
  if (key === 'open' && urls.open) return urls.open;
  return data.url || '/dashboard';
}

self.addEventListener('push', (event) => {
  const { title, opts } = parsePushPayload(event);
  const show = self.registration.showNotification(title, opts);

  const notifyClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        try {
          client.postMessage({ type: 'narvo-prefetch-briefing' });
        } catch {
          /* ignore */
        }
        try {
          client.postMessage({
            type: 'narvo-push-received',
            narvo_action: opts.data && opts.data.narvo_action,
          });
        } catch {
          /* ignore */
        }
      });
    });

  event.waitUntil(Promise.all([show, notifyClients]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const rawUrl = resolveClickUrl(event.notification, action);
  const full = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        let same = false;
        try {
          same = new URL(client.url).origin === self.location.origin;
        } catch {
          same = false;
        }
        if (same && 'focus' in client) {
          client.postMessage({
            type: 'narvo-notification-navigate',
            url: rawUrl,
            narvo_action: event.notification.data?.narvo_action,
          });
          return client.focus();
        }
      }
      return self.clients.openWindow(full);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data && event.data.type === 'narvo-show-local') {
    const { title, body, tag } = event.data;
    if (!title) return;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || '',
        tag: tag || 'narvo-local',
        icon: '/narvo-icon-192.png',
        badge: '/narvo-icon-192.png',
        data: { url: '/briefing?autoplay=1', narvo_action: 'local_briefing_nudge' },
      })
    );
  }
});
