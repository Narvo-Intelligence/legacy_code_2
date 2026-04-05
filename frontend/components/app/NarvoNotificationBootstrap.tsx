'use client';

import { useEffect } from 'react';
import {
  getNarvoNotificationsEnabled,
  registerNarvoServiceWorker,
  showLocalNotification,
  notificationPermission,
} from '@/lib/narvo-notifications';
import { COPY, pushBriefingBodyPreview } from '@/lib/narvo-app-copy';

const LS_LAST_BRIEFING_DAY = 'narvo_last_briefing_notif_day';

/**
 * Registers the service worker when the user opted in and permission is granted.
 * Sends at most one local “briefing ready” notification per calendar day between 7:00–11:59 (client local time).
 */
export function NarvoNotificationBootstrap() {
  useEffect(() => {
    if (!getNarvoNotificationsEnabled()) return;
    if (notificationPermission() !== 'granted') return;
    void registerNarvoServiceWorker();
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
      const ok = showLocalNotification(
        COPY.push_briefing_title,
        pushBriefingBodyPreview(8, 12),
        'narvo-briefing-daily'
      );
      if (ok) localStorage.setItem(LS_LAST_BRIEFING_DAY, day);
    };

    tick();
    const id = window.setInterval(tick, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
