'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import { hasCompletedOnboarding } from '@/lib/narvo-session';
import {
  getNarvoNotificationsEnabled,
  setNarvoNotificationsEnabled,
  LS_NOTIFICATIONS_ENABLED,
  notificationPermission,
  requestNotificationPermission,
} from '@/lib/narvo-notifications';
import { subscribeNarvoWebPush } from '@/lib/me-api';

export function NotificationPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Shown on every visit until the user has both browser permission and in-app opt-in. */
  const refreshVisibility = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!hasCompletedOnboarding()) {
      setVisible(false);
      return;
    }
    if (!('Notification' in window)) {
      setVisible(false);
      return;
    }
    const perm = notificationPermission();
    const optedIn = getNarvoNotificationsEnabled();
    if (perm === 'granted' && optedIn) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    refreshVisibility();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'narvo-onboarding-complete' ||
        e.key === LS_NOTIFICATIONS_ENABLED
      ) {
        refreshVisibility();
      }
    };
    window.addEventListener('storage', onStorage);
    const onFocus = () => refreshVisibility();
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshVisibility();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refreshVisibility]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        setNarvoNotificationsEnabled(true);
        await subscribeNarvoWebPush();
        setVisible(false);
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-[20px] border border-narvo-teal/25 bg-narvo-teal/10 dark:bg-narvo-teal/15 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-teal text-white">
        <Bell size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-narvo-ink dark:text-white text-sm sm:text-base leading-snug">
          {COPY.dashboard_notify_banner_title}
        </p>
        <p className="mt-1 text-xs sm:text-sm text-narvo-ink/65 dark:text-white/55 leading-relaxed">
          {COPY.dashboard_notify_banner_body}
        </p>
      </div>
      <div className="flex sm:justify-end sm:shrink-0 w-full sm:w-auto">
        <button
          type="button"
          disabled={busy}
          onClick={() => void enable()}
          className="min-h-[44px] w-full sm:w-auto px-5 rounded-full bg-narvo-vermilion text-white text-sm font-bold shadow-md shadow-narvo-vermilion/20 disabled:opacity-50"
        >
          {busy ? COPY.status_loading : COPY.dashboard_notify_banner_cta}
        </button>
      </div>
    </div>
  );
}
