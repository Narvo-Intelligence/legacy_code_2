/**
 * Browser notifications + service worker registration for web push.
 */

export const LS_NOTIFICATIONS_ENABLED = 'narvo_notifications_enabled';
let narvoSwRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
const NARVO_SW_SCRIPTS = ['/narvo-sw.js', '/sw.js'];
const NARVO_SW_CACHE_PREFIX = 'narvo-v';

function narvoServiceWorkerDisabledForDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function matchesNarvoServiceWorker(worker: ServiceWorker | null | undefined): boolean {
  const url = worker?.scriptURL;
  return Boolean(url && NARVO_SW_SCRIPTS.some((path) => url.includes(path)));
}

async function unregisterNarvoServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) =>
          matchesNarvoServiceWorker(registration.active) ||
          matchesNarvoServiceWorker(registration.waiting) ||
          matchesNarvoServiceWorker(registration.installing)
        )
        .map((registration) => registration.unregister())
    );
  } catch {
    /* ignore */
  }

  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(NARVO_SW_CACHE_PREFIX))
          .map((key) => caches.delete(key))
      );
    } catch {
      /* ignore */
    }
  }

  narvoSwRegistrationPromise = null;
}

export async function syncNarvoServiceWorkerForEnvironment(): Promise<void> {
  if (!narvoServiceWorkerDisabledForDev()) return;
  await unregisterNarvoServiceWorkers();
}

export function getNarvoNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LS_NOTIFICATIONS_ENABLED) === '1';
}

export function setNarvoNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(LS_NOTIFICATIONS_ENABLED, '1');
  else window.localStorage.removeItem(LS_NOTIFICATIONS_ENABLED);
}

export async function registerNarvoServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (narvoServiceWorkerDisabledForDev()) {
    await unregisterNarvoServiceWorkers();
    return null;
  }
  if (!narvoSwRegistrationPromise) {
    narvoSwRegistrationPromise = navigator.serviceWorker
      .register('/narvo-sw.js', { scope: '/' })
      .catch((e) => {
        console.warn('Narvo SW registration skipped:', e);
        narvoSwRegistrationPromise = null;
        return null;
      });
  }
  return await narvoSwRegistrationPromise;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showLocalNotification(title: string, body: string, tag?: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, tag: tag ?? 'narvo-local' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer SW-owned notifications (parity with web push). Falls back to Notification().
 */
export async function showLocalNotificationViaSw(
  title: string,
  body: string,
  tag?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) {
      return showLocalNotification(title, body, tag);
    }
    reg.active.postMessage({
      type: 'narvo-show-local',
      title,
      body,
      tag: tag ?? 'narvo-local',
    });
    return true;
  } catch {
    return showLocalNotification(title, body, tag);
  }
}

/** App icon badge (installable PWA). No-op when unsupported. */
export function trySetNarvoAppBadge(count: number | null): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count === null || count === 0) {
      void nav.clearAppBadge?.();
      return;
    }
    void nav.setAppBadge?.(count);
  } catch {
    /* unsupported */
  }
}
