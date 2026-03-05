/**
 * Background Sync utilities for Narvo PWA.
 * Queues requests (listening history, bookmarks) when offline
 * and replays them when connectivity returns via Service Worker Background Sync.
 */

const QUEUE_CACHE = 'narvo-offline-queue';

/**
 * Queue a POST request for background sync.
 * Falls back to immediate fetch if online.
 */
export async function queueOrFetch(url: string, data: unknown): Promise<Response | null> {
  if (navigator.onLine) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res;
    } catch {
      // Network failed despite onLine — queue it
    }
  }

  try {
    const cache = await caches.open(QUEUE_CACHE);
    const request = new Request(url, { method: 'POST' });
    const response = new Response(JSON.stringify(data));
    await cache.put(request, response);

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        'narvo-sync-queue'
      );
    }
  } catch {
    // Caches API not available
  }

  return null;
}
