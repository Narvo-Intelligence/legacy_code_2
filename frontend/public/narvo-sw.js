/* Narvo service worker — push-ready; VAPID + server payloads can be added later. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Narvo', body: 'You have an update.' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }
  const show = self.registration.showNotification(payload.title || 'Narvo', {
    body: payload.body || '',
    tag: payload.tag || 'narvo-push',
    data:
      payload.data && typeof payload.data === 'object'
        ? payload.data
        : { url: payload.url || '/briefing?autoplay=1' },
  });
  const notifyClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        try {
          client.postMessage({ type: 'narvo-prefetch-briefing' });
        } catch {
          /* ignore */
        }
      });
    });
  event.waitUntil(Promise.all([show, notifyClients]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  const full = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      return self.clients.openWindow(full);
    })
  );
});
