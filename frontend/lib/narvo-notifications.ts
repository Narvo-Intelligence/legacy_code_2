/**
 * Browser notifications + service worker registration for future web push.
 * Server-side VAPID subscription is not wired in this preview build.
 */

export const LS_NOTIFICATIONS_ENABLED = 'narvo_notifications_enabled';

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
  try {
    return await navigator.serviceWorker.register('/narvo-sw.js', { scope: '/' });
  } catch (e) {
    console.warn('Narvo SW registration skipped:', e);
    return null;
  }
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
