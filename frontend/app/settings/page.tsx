'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY, pushBriefingBodyPreview } from '@/lib/narvo-app-copy';
import {
  BRIEFING_PLACEHOLDER_MINUTES_MID,
  BRIEFING_PLACEHOLDER_STORY_MID,
} from '@/lib/briefing-defaults';
import {
  NARVO_TOOLBAR_RAIL_CLASS,
  NARVO_PANEL_MIST_CLASS,
  NARVO_PANEL_ELEVATED_CLASS,
} from '@/lib/narvo-ui-classes';
import {
  getNarvoNotificationsEnabled,
  setNarvoNotificationsEnabled,
  registerNarvoServiceWorker,
  requestNotificationPermission,
  notificationPermission,
  showLocalNotification,
} from '@/lib/narvo-notifications';
import { getAuthSession, loadPreferences } from '@/lib/narvo-session';
import {
  hasMeAuth,
  getMyPreferences,
  getMySubscription,
  postBillingPortal,
  postSubscriptionCheckout,
} from '@/lib/me-api';
import { NarvoApiError, fetchTtsVoices } from '@/lib/narvo-api';
import { narvoSignOut } from '@/lib/narvo-auth-actions';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';

type SettingsTab = 'account' | 'voice' | 'billing' | 'notifications' | 'display';

function parseSettingsTab(v: string | null): SettingsTab {
  if (v === 'voice' || v === 'billing' || v === 'notifications' || v === 'account' || v === 'display') return v;
  return 'account';
}

const TAB_CLASS =
  'rounded-full px-4 py-2 text-sm font-bold transition-colors min-h-[44px] whitespace-nowrap';
const TAB_ACTIVE = 'bg-narvo-teal text-white';
const TAB_IDLE =
  'bg-narvo-ink/6 dark:bg-white/8 text-narvo-ink dark:text-white hover:bg-narvo-ink/10 dark:hover:bg-white/12';

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<SettingsTab>('account');
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [prefsRemote, setPrefsRemote] = useState<Record<string, unknown> | null>(null);
  const [prefsErr, setPrefsErr] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [billingSub, setBillingSub] = useState<{
    tier: string;
    status: string;
    subscription: Record<string, unknown> | null;
  } | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingErr, setBillingErr] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [voicesList, setVoicesList] = useState<Record<string, unknown>[]>([]);
  const [voicesErr, setVoicesErr] = useState<string | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(false);

  useEffect(() => {
    setEnabled(getNarvoNotificationsEnabled());
    setPerm(notificationPermission());
  }, []);

  useEffect(() => {
    setTab(parseSettingsTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (tab !== 'billing' || !hasMeAuth()) {
      setBillingSub(null);
      setBillingErr(null);
      return;
    }
    let cancelled = false;
    setBillingLoading(true);
    setBillingErr(null);
    void getMySubscription()
      .then((s) => {
        if (!cancelled) setBillingSub(s);
      })
      .catch((e) => {
        if (!cancelled) {
          setBillingErr(e instanceof NarvoApiError ? e.message : COPY.settings_billing_error);
        }
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'voice') return;
    let cancelled = false;
    setVoicesLoading(true);
    setVoicesErr(null);
    void fetchTtsVoices()
      .then((v) => {
        if (!cancelled) setVoicesList(v);
      })
      .catch(() => {
        if (!cancelled) setVoicesErr(COPY.settings_voice_api_error);
      })
      .finally(() => {
        if (!cancelled) setVoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const selectTab = (t: SettingsTab) => {
    setTab(t);
    router.replace(`/settings?tab=${t}`, { scroll: false });
  };

  const refreshPrefsRemote = useCallback(() => {
    if (!hasMeAuth()) {
      setPrefsRemote(null);
      setPrefsErr(null);
      return;
    }
    void getMyPreferences()
      .then((p) => {
        setPrefsRemote(p);
        setPrefsErr(null);
      })
      .catch(() => setPrefsErr(COPY.error_generic));
  }, []);

  useEffect(() => {
    refreshPrefsRemote();
    const id = window.setTimeout(refreshPrefsRemote, 500);
    return () => window.clearTimeout(id);
  }, [refreshPrefsRemote]);

  useUserTableRealtime('user_preferences', refreshPrefsRemote, hasMeAuth());

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
    showLocalNotification(
      COPY.push_briefing_title,
      pushBriefingBodyPreview(BRIEFING_PLACEHOLDER_STORY_MID, BRIEFING_PLACEHOLDER_MINUTES_MID),
      'narvo-test-briefing'
    );
  };

  const testBreaking = () => {
    showLocalNotification(COPY.push_breaking_title, COPY.push_breaking_body, 'narvo-test-breaking');
  };

  const canTest = perm === 'granted';
  const session = getAuthSession();
  const localPrefs = loadPreferences();

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await narvoSignOut();
      router.push('/auth');
    } finally {
      setSigningOut(false);
    }
  };

  const voiceFromApi = (prefsRemote?.voice_id as string | undefined)?.trim();
  const regionFromApi = (prefsRemote?.region as string | undefined)?.trim();
  const interestsFromApi = prefsRemote?.interests;

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.settings_title,
        kicker: COPY.settings_account,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-2xl mx-auto w-full space-y-8">
        <p className="text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.settings_coming}</p>

        <div
          className={`flex flex-wrap gap-2 ${NARVO_TOOLBAR_RAIL_CLASS}`}
          role="tablist"
          aria-label={COPY.settings_tablist_a11y}
        >
          {(
            [
              ['account', COPY.settings_tab_account],
              ['voice', COPY.settings_tab_voice],
              ['billing', COPY.settings_tab_billing],
              ['notifications', COPY.settings_tab_notifications],
              ['display', 'Display'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => selectTab(id)}
              className={`${TAB_CLASS} ${tab === id ? TAB_ACTIVE : TAB_IDLE}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'account' && (
          <section role="tabpanel" className={`${NARVO_PANEL_MIST_CLASS} space-y-4`}>
            <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">
              {COPY.settings_tab_account}
            </h2>
            {session?.email ? (
              <p className="text-sm text-narvo-ink/70 dark:text-white/65">
                {COPY.settings_signed_in_as_prefix}{' '}
                <span className="font-medium text-narvo-ink dark:text-white">{session.email}</span>
              </p>
            ) : (
              <p className="text-sm text-narvo-ink/55 dark:text-white/50">{COPY.error_generic}</p>
            )}
            <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">
              {COPY.settings_cloud_session_note}
            </p>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void onSignOut()}
              className="min-h-[48px] rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20 disabled:opacity-50"
            >
              {signingOut ? COPY.status_loading : COPY.settings_sign_out}
            </button>
          </section>
        )}

        {tab === 'voice' && (
          <section role="tabpanel" className={`${NARVO_PANEL_ELEVATED_CLASS} space-y-4`}>
            <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">
              {COPY.settings_tab_voice}
            </h2>
            <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                {COPY.settings_voice_api_list_kicker}
              </p>
              {voicesLoading ? (
                <p className="text-sm text-narvo-ink/50 dark:text-white/45">{COPY.status_loading}</p>
              ) : voicesErr ? (
                <p className="text-sm text-narvo-vermilion dark:text-narvo-butter">{voicesErr}</p>
              ) : voicesList.length === 0 ? (
                <p className="text-sm text-narvo-ink/50 dark:text-white/45">{COPY.error_generic}</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs text-narvo-ink/75 dark:text-white/70">
                  {voicesList.map((v, i) => {
                    const id = String(v.id ?? v.voice_id ?? i);
                    const label = String(v.name ?? v.label ?? v.id ?? i);
                    return (
                      <li key={id} className="truncate">
                        {label}
                        {v.locale != null ? ` · ${String(v.locale)}` : ''}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {prefsErr && (
              <p className="text-sm text-narvo-vermilion dark:text-narvo-butter">{prefsErr}</p>
            )}
            {hasMeAuth() && prefsRemote && (
              <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 space-y-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.settings_voice_from_cloud}
                </p>
                <p className="text-sm text-narvo-ink dark:text-white">
                  {COPY.settings_voice_cloud_line
                    .replace('{voice}', voiceFromApi || '—')
                    .replace('{region}', regionFromApi || '—')}
                </p>
                {Array.isArray(interestsFromApi) && interestsFromApi.length > 0 && (
                  <p className="text-xs text-narvo-ink/60 dark:text-white/50 font-mono">
                    {interestsFromApi.join(', ')}
                  </p>
                )}
              </div>
            )}
            {localPrefs && (
              <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 space-y-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.settings_voice_local}
                </p>
                <p className="text-sm text-narvo-ink dark:text-white">
                  {COPY.settings_voice_local_line
                    .replace('{voice}', localPrefs.voice)
                    .replace('{language}', localPrefs.language)}
                </p>
                <p className="text-xs text-narvo-ink/60 dark:text-white/50 font-mono">
                  {(localPrefs.interests ?? []).join(', ')}
                </p>
              </div>
            )}
            <Link
              href="/onboarding"
              className="inline-flex min-h-[48px] items-center rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 font-bold text-narvo-teal dark:text-narvo-mint"
            >
              {COPY.settings_edit_onboarding}
            </Link>
          </section>
        )}

        {tab === 'billing' && (
          <section role="tabpanel" className={`${NARVO_PANEL_MIST_CLASS} space-y-4`}>
            <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-2">
              {COPY.settings_tab_billing}
            </h2>
            {searchParams.get('billing') === 'success' ? (
              <p className="text-sm font-medium text-narvo-teal dark:text-narvo-mint">{COPY.settings_billing_success}</p>
            ) : null}
            <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">
              {COPY.settings_billing_placeholder}
            </p>
            {!hasMeAuth() ? (
              <p className="text-sm text-narvo-ink/60 dark:text-white/50">
                <Link href="/auth" className="font-bold text-narvo-teal dark:text-narvo-mint underline-offset-2 hover:underline">
                  {COPY.subscription_sign_in_hint}
                </Link>
              </p>
            ) : billingLoading ? (
              <p className="text-sm text-narvo-ink/50">{COPY.settings_billing_loading}</p>
            ) : billingErr ? (
              <p className="text-sm text-narvo-vermilion dark:text-narvo-butter">{billingErr}</p>
            ) : billingSub ? (
              <>
                <p className="text-sm font-medium text-narvo-ink dark:text-white">
                  {(billingSub.tier || '').toLowerCase() === 'pro'
                    ? COPY.settings_billing_tier_pro
                    : COPY.settings_billing_tier_free}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {(billingSub.tier || '').toLowerCase() !== 'pro' ? (
                    <button
                      type="button"
                      disabled={billingBusy}
                      onClick={() => {
                        setBillingBusy(true);
                        setBillingErr(null);
                        void postSubscriptionCheckout()
                          .then((r) => {
                            if (r.url) window.location.href = r.url;
                          })
                          .catch((e) => {
                            const msg =
                              e instanceof NarvoApiError && e.status === 503
                                ? COPY.settings_billing_not_configured
                                : e instanceof Error
                                  ? e.message
                                  : COPY.settings_billing_error;
                            setBillingErr(msg);
                          })
                          .finally(() => setBillingBusy(false));
                      }}
                      className="min-h-[48px] rounded-full bg-narvo-teal px-6 font-bold text-white disabled:opacity-50 dark:bg-narvo-mint dark:text-narvo-ink"
                    >
                      {billingBusy ? COPY.status_loading : COPY.settings_billing_upgrade}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={billingBusy}
                    onClick={() => {
                      setBillingBusy(true);
                      setBillingErr(null);
                      void postBillingPortal()
                        .then((r) => {
                          if (r.url) window.location.href = r.url;
                        })
                        .catch((e) => {
                          const msg =
                            e instanceof NarvoApiError && e.status === 503
                              ? COPY.settings_billing_not_configured
                              : e instanceof Error
                                ? e.message
                                : COPY.settings_billing_error;
                          setBillingErr(msg);
                        })
                        .finally(() => setBillingBusy(false));
                    }}
                    className="min-h-[48px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 font-bold text-narvo-ink dark:text-white disabled:opacity-50"
                  >
                    {COPY.settings_billing_manage}
                  </button>
                </div>
                <p className="text-xs text-narvo-ink/45 dark:text-white/40 pt-2">
                  <Link href="/subscription" className="font-bold text-narvo-teal dark:text-narvo-mint hover:underline">
                    {COPY.subscription_page_title}
                  </Link>
                </p>
              </>
            ) : null}
          </section>
        )}

        {tab === 'notifications' && (
          <section role="tabpanel" className={NARVO_PANEL_ELEVATED_CLASS}>
            <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-2">
              {COPY.settings_notifications_title}
            </h2>
            <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed mb-6">
              {COPY.settings_notifications_desc}
            </p>

            <p className="text-xs font-mono text-narvo-teal dark:text-narvo-mint mb-4">
              {perm === 'unsupported'
                ? COPY.settings_notifications_unsupported
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
        )}

        {tab === 'display' && (
          <section role="tabpanel" className={`${NARVO_PANEL_ELEVATED_CLASS} space-y-6`}>
            <div>
              <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-1">
                Display
              </h2>
              <p className="text-sm text-narvo-ink/50 dark:text-white/45">
                Theme, sound cues, and accessibility preferences.
              </p>
            </div>

            {/* Theme selector */}
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-3">
                {COPY.settings_theme_title}
              </p>
              <p className="text-sm text-narvo-ink/55 dark:text-white/45 mb-4">{COPY.settings_theme_desc}</p>
              <div className="flex gap-2">
                {([
                  ['light', COPY.settings_theme_light],
                  ['dark', COPY.settings_theme_dark],
                  ['system', COPY.settings_theme_system],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    className="flex-1 min-h-[44px] rounded-full border-2 border-narvo-ink/10 dark:border-white/10 text-sm font-bold text-narvo-ink dark:text-white hover:border-narvo-teal/30 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-narvo-ink/8 dark:border-white/8 pt-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-4">
                {COPY.settings_sound_title}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-narvo-ink dark:text-white">{COPY.settings_sound_title}</p>
                  <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-0.5">{COPY.settings_sound_desc}</p>
                </div>
                <div className="shrink-0 w-[46px] h-[26px] rounded-full bg-narvo-ink/15 dark:bg-white/15 relative">
                  <span className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>

            <div className="border-t border-narvo-ink/8 dark:border-white/8 pt-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-4">
                {COPY.settings_accessibility_title}
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-narvo-ink dark:text-white">{COPY.settings_accessibility_high_contrast_title}</p>
                    <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-0.5">{COPY.settings_accessibility_high_contrast_desc}</p>
                  </div>
                  <div className="shrink-0 w-[46px] h-[26px] rounded-full bg-narvo-ink/15 dark:bg-white/15 relative">
                    <span className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-narvo-ink dark:text-white">{COPY.settings_accessibility_reduced_motion_title}</p>
                    <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-0.5">{COPY.settings_accessibility_reduced_motion_desc}</p>
                  </div>
                  <div className="shrink-0 w-[46px] h-[26px] rounded-full bg-narvo-ink/15 dark:bg-white/15 relative">
                    <span className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className={NARVO_PANEL_MIST_CLASS}>
          <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-2">
            {COPY.settings_cloud_sync_title}
          </h2>
          <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">
            {COPY.settings_cloud_sync_body_before}{' '}
            <Link
              href="/auth"
              className="font-bold text-narvo-teal dark:text-narvo-mint underline-offset-2 hover:underline"
            >
              {COPY.settings_cloud_sync_auth_link}
            </Link>
            {COPY.settings_cloud_sync_body_after}
          </p>
        </section>
      </div>
    </AuthenticatedAppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
          <p className="text-sm text-narvo-ink/50 dark:text-white/45 text-center max-w-xs">{COPY.queue_processing}</p>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
