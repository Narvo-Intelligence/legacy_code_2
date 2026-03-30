/**
 * Push Notification Service for Breaking News.
 */

import * as api from './api';
import logger from './logger';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    logger.info('[notificationService] Notifications not supported');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getNotificationStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }
  const permission = await requestNotificationPermission();
  if (!permission) {
    throw new Error('Notification permission denied');
  }
  const registration = await navigator.serviceWorker.ready;
  // Use env var only (#8) — hardcoded fallback removed
  const vapidPublicKey: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) {
    logger.warn('[notificationService] VITE_VAPID_PUBLIC_KEY not set; push subscription skipped.');
    throw new Error('VAPID public key missing');
  }
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
    const payload = (subscription as PushSubscription & { toJSON?: () => Record<string, unknown> }).toJSON?.() ?? { endpoint: subscription.endpoint };
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const endpoint = session?.access_token
      ? 'api/user/subscribe-push'
      : 'api/notifications/subscribe';
    await api.post(endpoint, payload as Record<string, unknown>).catch(() => {
      logger.info('[notificationService] Subscription saved locally');
    });
    return subscription;
  } catch (e) {
    logger.error('[notificationService] Push subscription failed:', e);
    throw e;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await api.post('api/notifications/unsubscribe', { endpoint: subscription.endpoint }).catch((err) => {
      logger.debug('[notificationService] Failed to unsubscribe push endpoint', err);
    });
  }
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  [key: string]: unknown;
}

export function showLocalNotification(title: string, options: NotificationOptions = {}): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }
  return new Notification(title, {
    icon: '/narvo-icon-192.png',
    badge: '/narvo-icon-192.png',
    tag: 'narvo-local',
    ...options,
  });
}

export async function queueOfflineAction(actionType: string, payload: unknown): Promise<boolean> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'QUEUE_OFFLINE_ACTION',
      action: { actionType, payload },
    });
    return true;
  }
  return false;
}
