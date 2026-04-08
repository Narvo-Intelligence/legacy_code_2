'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getNarvoNotificationsEnabled,
  registerNarvoServiceWorker,
  showLocalNotificationViaSw,
  notificationPermission,
  trySetNarvoAppBadge,
} from '@/lib/narvo-notifications';
import { COPY, pushBriefingBodyPreview } from '@/lib/narvo-app-copy';
import {
  BRIEFING_PLACEHOLDER_MINUTES_MID,
  BRIEFING_PLACEHOLDER_STORY_MID,
} from '@/lib/briefing-defaults';
import { fetchBriefingLatest } from '@/lib/narvo-api';

const LS_LAST_BRIEFING_DAY = 'narvo_last_briefing_notif_day';

/**
 * Registers the service worker when the user opted in and permission is granted.
 * Sends at most one local “briefing ready” notification per calendar day between 7:00–11:59 (client local time),
 * via the service worker when available.
 */
export function NarvoNotificationBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!getNarvoNotificationsEnabled()) return;
    if (notificationPermission() !== 'granted') return;
    void registerNarvoServiceWorker();
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'narvo-prefetch-briefing') {
        void fetchBriefingLatest().catch(() => {
          /* warm CDN / API cache only */
        });
        return;
      }
      if (ev.data?.type === 'narvo-push-received') {
        trySetNarvoAppBadge(1);
        return;
      }
      if (ev.data?.type === 'narvo-notification-navigate' && typeof ev.data?.url === 'string') {
        router.push(ev.data.url as string);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') trySetNarvoAppBadge(null);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getNarvoNotificationsEnabled()) return;
    if (notificationPermission() !== 'granted') return;

    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      if (h < 7 || h > 11) return;
      const day = now.toDateString();
      if (localStorage.getItem(LS_LAST_BRIEFING_DAY) === day) return;
      void (async () => {
        const ok = await showLocalNotificationViaSw(
          COPY.push_briefing_title,
          pushBriefingBodyPreview(BRIEFING_PLACEHOLDER_STORY_MID, BRIEFING_PLACEHOLDER_MINUTES_MID),
          'narvo-briefing-daily'
        );
        if (ok) localStorage.setItem(LS_LAST_BRIEFING_DAY, day);
      })();
    };

    tick();
    const id = window.setInterval(tick, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
