'use client';

import React, { useEffect, useState } from 'react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY, pushBriefingBodyPreview } from '@/lib/narvo-app-copy';
import {
  getNarvoNotificationsEnabled,
  setNarvoNotificationsEnabled,
  registerNarvoServiceWorker,
  requestNotificationPermission,
  notificationPermission,
  showLocalNotification,
} from '@/lib/narvo-notifications';

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setEnabled(getNarvoNotificationsEnabled());
    setPerm(notificationPermission());
  }, []);

  const syncPermission = () => setPerm(notificationPermission());

  const handleToggle = async (next: boolean) => {
    if (next) {
      const p = await requestNotificationPermission();
      syncPermission();
      if (p === 'granted') {
        setNarvoNotificationsEnabled(true);
        setEnabled(true);
        await registerNarvoServiceWorker();
      } else {
        setNarvoNotificationsEnabled(false);
        setEnabled(false);
      }
    } else {
      setNarvoNotificationsEnabled(false);
      setEnabled(false);
    }
  };

  const testBriefing = () => {
    showLocalNotification(COPY.push_briefing_title, pushBriefingBodyPreview(8, 12), 'narvo-test-briefing');
  };

  const testBreaking = () => {
    showLocalNotification(COPY.push_breaking_title, COPY.push_breaking_body, 'narvo-test-breaking');
  };

  const canTest = perm === 'granted';

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.settings_title,
        kicker: COPY.settings_account,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-2xl mx-auto w-full space-y-10">
        <p className="text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.settings_coming}</p>

        <section className="rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-white/80 dark:bg-narvo-ink/40 p-6 sm:p-8">
          <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-2">
            {COPY.settings_notifications_title}
          </h2>
          <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed mb-6">
            {COPY.settings_notifications_desc}
          </p>

          <p className="text-xs font-mono text-narvo-teal dark:text-narvo-mint mb-4">
            {perm === 'unsupported'
              ? 'Notifications are not supported in this browser.'
              : perm === 'denied'
                ? COPY.settings_notifications_disabled
                : COPY.settings_notifications_granted}
          </p>

          <label className="flex items-center justify-between gap-4 cursor-pointer py-2">
            <span className="text-sm font-bold text-narvo-ink dark:text-white">
              {COPY.settings_notifications_enable}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => void handleToggle(!enabled)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                enabled ? 'bg-narvo-teal' : 'bg-narvo-ink/15 dark:bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </label>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={!canTest}
              onClick={testBriefing}
              className="min-h-[48px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 font-bold text-narvo-ink dark:text-white disabled:opacity-40"
            >
              {COPY.settings_notifications_test}
            </button>
            <button
              type="button"
              disabled={!canTest}
              onClick={testBreaking}
              className="min-h-[48px] rounded-full border-2 border-narvo-vermilion/35 px-6 font-bold text-narvo-vermilion disabled:opacity-40"
            >
              {COPY.settings_notifications_test_breaking}
            </button>
          </div>
        </section>
      </div>
    </AuthenticatedAppShell>
  );
}
