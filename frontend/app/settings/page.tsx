'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, CloudOff, Plus, X as XIcon } from 'lucide-react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { useNarvoFeedback } from '@/components/app/NarvoFeedbackProvider';
import { CloudFeatureGateBanner } from '@/components/CloudFeatureGateBanner';
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
import { getAuthSession, loadPreferences, savePreferences, NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';
import { getSupabaseUserId } from '@/lib/supabase-browser';
import { ONBOARDING_LANG_ROWS } from '@/lib/onboarding-narrators';
import {
  hasMeAuth,
  getMyPreferences,
  getMySettings,
  putMyPreferences,
  putMySettings,
  getMySubscription,
  postBillingPortal,
  postSubscriptionCheckout,
} from '@/lib/me-api';
import { NarvoApiError, fetchTtsVoices } from '@/lib/narvo-api';
import { narvoSignOut } from '@/lib/narvo-auth-actions';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';
import { useTheme } from '@/components/ThemeProvider';
import {
  readDisplayToggles,
  writeDisplayToggles,
  hydrateReadingFromServer,
  readReadingAppearance,
  writeReadingAppearance,
  type NarvoLocalDisplayToggles,
  type NarvoReadingAppearance,
  type NarvoThemeChoice,
} from '@/lib/narvo-ui-persistence';

type SettingsTab = 'account' | 'voice' | 'billing' | 'preferences' | 'accessibility';

function parseSettingsTab(v: string | null): SettingsTab {
  if (v === 'account' || v === 'voice' || v === 'billing' || v === 'preferences' || v === 'accessibility') {
    return v;
  }
  if (v === 'notifications' || v === 'display') return 'preferences';
  return 'account';
}

const TAB_CLASS =
  'rounded-full px-4 py-2 text-sm font-bold transition-colors min-h-[44px] whitespace-nowrap';
const TAB_ACTIVE = 'bg-narvo-teal text-white';
const TAB_IDLE =
  'bg-narvo-ink/6 dark:bg-white/8 text-narvo-ink dark:text-white hover:bg-narvo-ink/10 dark:hover:bg-white/12';

const DESKTOP_TAB_CLASS =
  'flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm font-bold transition-all min-h-[48px]';

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'local';

function SaveStateFeedback({
  syncStatus,
  lastSavedAt,
}: {
  syncStatus: SyncStatus;
  lastSavedAt: number | null;
}) {
  const showIdleHistory = syncStatus === 'idle' && lastSavedAt != null;
  if (syncStatus === 'idle' && !showIdleHistory) return null;

  const timeStr =
    lastSavedAt != null
      ? new Date(lastSavedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : '';

  let icon: React.ReactNode;
  let text: string;
  let boxClass: string;

  if (syncStatus === 'saving') {
    icon = <Loader2 className="shrink-0 animate-spin text-narvo-teal dark:text-narvo-mint" size={16} aria-hidden />;
    text = COPY.settings_autosave_saving;
    boxClass =
      'border-narvo-teal/30 bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint/35 dark:bg-narvo-mint/10 dark:text-narvo-mint';
  } else if (syncStatus === 'saved') {
    icon = <CheckCircle2 className="shrink-0" size={16} aria-hidden />;
    text = COPY.settings_autosave_saved;
    boxClass =
      'border-narvo-teal/35 bg-narvo-teal/12 text-narvo-teal dark:border-narvo-mint/40 dark:bg-narvo-mint/12 dark:text-narvo-mint';
  } else if (syncStatus === 'error') {
    icon = <AlertCircle className="shrink-0" size={16} aria-hidden />;
    text = COPY.settings_autosave_error;
    boxClass =
      'border-narvo-vermilion/40 bg-narvo-vermilion/10 text-narvo-vermilion dark:text-narvo-butter/90';
  } else if (syncStatus === 'local') {
    icon = <CloudOff className="shrink-0" size={16} aria-hidden />;
    text = COPY.settings_autosave_local_only;
    boxClass =
      'border-narvo-ink/12 bg-narvo-mist/60 text-narvo-ink/80 dark:border-white/12 dark:bg-white/[0.06] dark:text-white/70';
  } else {
    icon = <CheckCircle2 className="shrink-0 opacity-60" size={16} aria-hidden />;
    text = COPY.settings_autosave_last_at.replace('{time}', timeStr);
    boxClass =
      'border-narvo-ink/10 bg-narvo-cloud/90 text-narvo-ink/60 dark:border-white/10 dark:bg-narvo-ink/40 dark:text-white/50';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={COPY.settings_save_status_label}
      className={`inline-flex max-w-full items-center gap-2 rounded-[14px] border px-3 py-2 sm:px-3.5 ${boxClass}`}
    >
      {icon}
      <span className="min-w-0 font-mono text-[10px] font-bold uppercase tracking-wider leading-snug">{text}</span>
    </div>
  );
}

function ToggleRow(props: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { label, description, checked, onChange, disabled } = props;
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-narvo-ink dark:text-white">{label}</p>
        {description ? (
          <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-0.5">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-45 ${
          checked ? 'bg-narvo-teal' : 'bg-narvo-ink/15 dark:bg-white/15'
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </label>
  );
}

/** Must render under AuthenticatedAppShell → NarvoFeedbackProvider (hook context). */
function SettingsAccessibilityFeedbackPanel() {
  const { openFeedback } = useNarvoFeedback();
  return (
    <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 sm:p-5 space-y-3">
      <h3 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">
        {COPY.settings_feedback_title}
      </h3>
      <p className="text-sm leading-relaxed text-narvo-ink/55 dark:text-white/50">
        {COPY.settings_feedback_body}
      </p>
      <button
        type="button"
        onClick={() => openFeedback({ kind: 'app' })}
        className="mt-1 min-h-[44px] rounded-full bg-narvo-teal px-5 text-sm font-bold text-white shadow-md shadow-narvo-teal/20 hover:bg-narvo-teal/90 dark:bg-narvo-mint dark:text-narvo-ink"
      >
        {COPY.settings_feedback_open}
      </button>
    </div>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setThemeChoice } = useTheme();
  const authBridge = useNarvoAuthBridge();

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

  const [settingsRemote, setSettingsRemote] = useState<Record<string, unknown> | null>(null);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [reading, setReading] = useState<NarvoReadingAppearance>(() => readReadingAppearance());
  const [regionDraft, setRegionDraft] = useState('');
  const [interestDraft, setInterestDraft] = useState('');

  const [displayToggles, setDisplayToggles] = useState<NarvoLocalDisplayToggles>(() => readDisplayToggles());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSettingsRef = useRef<Record<string, unknown>>({});
  const prefsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPrefsRef = useRef<Record<string, unknown>>({});

  const flushSettingsStatus = useCallback(() => {
    window.setTimeout(() => setSyncStatus('idle'), 2200);
  }, []);

  const queueCloudSettingsSave = useCallback(
    (patch: Record<string, unknown>) => {
      pendingSettingsRef.current = { ...pendingSettingsRef.current, ...patch };
      if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
      settingsTimerRef.current = setTimeout(async () => {
        const body = { ...pendingSettingsRef.current };
        pendingSettingsRef.current = {};
        if (!hasMeAuth()) {
          setLastSavedAt(Date.now());
          setSyncStatus('local');
          flushSettingsStatus();
          return;
        }
        setSyncStatus('saving');
        try {
          await putMySettings(body);
          setLastSavedAt(Date.now());
          setSyncStatus('saved');
          flushSettingsStatus();
        } catch {
          setSyncStatus('error');
          flushSettingsStatus();
        }
      }, 520);
    },
    [flushSettingsStatus]
  );

  const queueCloudPreferencesSave = useCallback(
    (patch: Record<string, unknown>) => {
      pendingPrefsRef.current = { ...pendingPrefsRef.current, ...patch };
      if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current);
      prefsTimerRef.current = setTimeout(async () => {
        const body = { ...pendingPrefsRef.current };
        pendingPrefsRef.current = {};
        if (!hasMeAuth()) {
          setLastSavedAt(Date.now());
          setSyncStatus('local');
          flushSettingsStatus();
          return;
        }
        setSyncStatus('saving');
        try {
          await putMyPreferences(body);
          setLastSavedAt(Date.now());
          setSyncStatus('saved');
          flushSettingsStatus();
        } catch {
          setSyncStatus('error');
          flushSettingsStatus();
        }
      }, 520);
    },
    [flushSettingsStatus]
  );

  useEffect(() => {
    setEnabled(getNarvoNotificationsEnabled());
    setPerm(notificationPermission());
  }, []);

  useEffect(() => {
    setTab(parseSettingsTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (tab !== 'billing') {
      setBillingSub(null);
      setBillingErr(null);
      return;
    }
    if (!authBridge.hydrated) return;
    if (!hasMeAuth()) {
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
  }, [tab, authBridge.hydrated, authBridge.hasApiToken]);

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
      setSettingsRemote(null);
      return;
    }
    void getMyPreferences()
      .then((p) => {
        setPrefsRemote(p);
        setPrefsErr(null);
        setRegionDraft(String(p.region ?? ''));
      })
      .catch(() => setPrefsErr(COPY.error_generic));
    void getMySettings()
      .then((s) => {
        const rec = s as Record<string, unknown>;
        setSettingsRemote(rec);
        hydrateReadingFromServer(rec);
        setReading(readReadingAppearance());
      })
      .catch(() => setSettingsRemote(null));
  }, []);

  useEffect(() => {
    refreshPrefsRemote();
    const id = window.setTimeout(refreshPrefsRemote, 500);
    return () => window.clearTimeout(id);
  }, [refreshPrefsRemote]);

  useEffect(() => {
    const onTok = () => void refreshPrefsRemote();
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
    return () => window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
  }, [refreshPrefsRemote]);

  useUserTableRealtime('user_preferences', refreshPrefsRemote, hasMeAuth());

  useEffect(() => {
    void getSupabaseUserId().then(setAccountUserId);
  }, [tab, prefsRemote]);

  /** Hydrate theme + display toggles from cloud when signed in. */
  useEffect(() => {
    if (!hasMeAuth()) return;
    let cancelled = false;
    void getMySettings()
      .then((s) => {
        if (cancelled) return;
        const th = typeof s.theme === 'string' ? s.theme : '';
        if (th === 'light' || th === 'dark' || th === 'system') {
          setThemeChoice(th as NarvoThemeChoice);
        }
        const next: NarvoLocalDisplayToggles = {
          haptic_sync: Boolean(s.haptic_sync ?? readDisplayToggles().haptic_sync),
          high_contrast: Boolean(s.high_contrast ?? readDisplayToggles().high_contrast),
          reduced_motion: Boolean(s.reduced_motion ?? readDisplayToggles().reduced_motion),
        };
        setDisplayToggles(next);
        writeDisplayToggles(next);
        setSettingsRemote(s as Record<string, unknown>);
        hydrateReadingFromServer(s as Record<string, unknown>);
        setReading(readReadingAppearance());
      })
      .catch(() => {
        /* keep local */
      });
    return () => {
      cancelled = true;
    };
  }, [setThemeChoice]);

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
    queueCloudPreferencesSave({ notifications_enabled: next });
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
  const playbackSpeed = Number(prefsRemote?.playback_speed ?? 1) || 1;

  const onPickVoice = (voiceId: string) => {
    setPrefsRemote((p) => ({ ...(p || {}), voice_id: voiceId }));
    queueCloudPreferencesSave({ voice_id: voiceId });
    queueCloudSettingsSave({ voice_model: voiceId });
    const lp = loadPreferences();
    if (lp) {
      savePreferences({ ...lp, voice: voiceId, voice_id: voiceId });
    }
  };

  const onReadingPatch = (patch: Partial<NarvoReadingAppearance>) => {
    const next = writeReadingAppearance(patch);
    setReading(next);
    queueCloudSettingsSave({
      font_scale: next.font_scale,
      display_density: next.display_density,
      article_font_preset: next.article_font_preset,
      reading_scope: next.reading_scope,
    });
  };

  const onPlaybackSpeed = (spd: number) => {
    setPrefsRemote((p) => ({ ...(p || {}), playback_speed: spd }));
    queueCloudPreferencesSave({ playback_speed: spd });
  };

  const onThemePick = (t: NarvoThemeChoice) => {
    setThemeChoice(t);
    queueCloudSettingsSave({ theme: t });
  };

  const onDisplayToggle = (key: keyof NarvoLocalDisplayToggles, value: boolean) => {
    const next = { ...displayToggles, [key]: value };
    setDisplayToggles(next);
    writeDisplayToggles({ [key]: value });
    queueCloudSettingsSave({ [key]: value });
  };

  const interestsList = Array.isArray(prefsRemote?.interests)
    ? (prefsRemote.interests as string[]).filter((x) => typeof x === 'string' && x.trim())
    : [];

  const addInterest = () => {
    const t = interestDraft.trim();
    if (!t) return;
    const next = [...new Set([...interestsList, t])];
    setPrefsRemote((p) => ({ ...(p || {}), interests: next }));
    setInterestDraft('');
    queueCloudPreferencesSave({ interests: next, categories: next });
  };

  const removeInterest = (tag: string) => {
    const next = interestsList.filter((x) => x !== tag);
    setPrefsRemote((p) => ({ ...(p || {}), interests: next }));
    queueCloudPreferencesSave({ interests: next, categories: next });
  };

  const saveRegion = () => {
    const r = regionDraft.trim() || 'lagos';
    setPrefsRemote((p) => ({ ...(p || {}), region: r }));
    queueCloudPreferencesSave({ region: r });
  };

  const broadcastLang =
    typeof settingsRemote?.broadcast_language === 'string' ? settingsRemote.broadcast_language : 'en';

  const onBroadcastLang = (code: string) => {
    setSettingsRemote((s) => ({ ...(s || {}), broadcast_language: code }));
    queueCloudSettingsSave({ broadcast_language: code });
  };

  const headerKicker =
    tab === 'account'
      ? COPY.settings_tab_account
      : tab === 'voice'
        ? COPY.settings_tab_voice
        : tab === 'billing'
          ? COPY.settings_tab_billing
          : tab === 'preferences'
            ? COPY.settings_tab_preferences
            : COPY.settings_tab_accessibility;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'account', label: COPY.settings_tab_account },
    { id: 'voice', label: COPY.settings_tab_voice },
    { id: 'billing', label: COPY.settings_tab_billing },
    { id: 'preferences', label: COPY.settings_tab_preferences },
    { id: 'accessibility', label: COPY.settings_tab_accessibility },
  ];

  const asidePanelClass =
    'rounded-[22px] border border-narvo-ink/10 bg-[var(--bg-card)]/95 p-3 shadow-[0_8px_30px_-18px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-narvo-ink/45 dark:shadow-black/20';

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.settings_title,
        kicker: headerKicker,
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-none lg:px-8 lg:py-10 xl:px-10">
        <div className="lg:mx-auto lg:max-w-[1600px] lg:grid lg:grid-cols-[minmax(0,1fr)_min(280px,26vw)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_min(300px,24vw)] xl:gap-12">
          <div className="min-w-0 lg:order-1 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed max-w-xl">
                {COPY.settings_intro}
              </p>
              <SaveStateFeedback syncStatus={syncStatus} lastSavedAt={lastSavedAt} />
            </div>

            <div className="lg:hidden -mx-4 border-y border-narvo-ink/[0.07] bg-gradient-to-b from-narvo-mist/70 to-narvo-cloud/90 px-4 py-4 dark:border-white/[0.08] dark:from-narvo-ink/40 dark:to-narvo-ink/25">
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/35">
                {COPY.settings_mobile_rail_hint}
              </p>
              <div
                className={`flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${NARVO_TOOLBAR_RAIL_CLASS}`}
                role="tablist"
                aria-label={COPY.settings_tablist_a11y}
              >
                {tabs.map(({ id, label }) => (
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
            </div>

            <div
              className={`hidden lg:flex flex-wrap gap-2 ${NARVO_TOOLBAR_RAIL_CLASS}`}
              role="tablist"
              aria-label={COPY.settings_tablist_a11y}
            >
              {tabs.map(({ id, label }) => (
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
              <section role="tabpanel" className={`${NARVO_PANEL_MIST_CLASS} space-y-6`}>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">
                    {COPY.settings_tab_account}
                  </h2>
                  <p className="mt-1 text-sm text-narvo-ink/50 dark:text-white/45">{COPY.settings_account_intro}</p>
                </div>

                {session?.email ? (
                  <div className="space-y-4 rounded-2xl border border-narvo-ink/8 bg-[var(--bg-card)]/60 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                          {COPY.settings_account_email_label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-narvo-ink dark:text-white">{session.email}</p>
                      </div>
                      {session.name ? (
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                            {COPY.settings_account_name_label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-narvo-ink dark:text-white">{session.name}</p>
                        </div>
                      ) : null}
                      <div className="sm:col-span-2">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                          {COPY.settings_account_user_id_label}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-narvo-ink/75 dark:text-white/70">
                          {accountUserId || '—'}
                        </p>
                      </div>
                      {session.createdAt ? (
                        <div className="sm:col-span-2">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/35">
                            {COPY.settings_account_member_since}
                          </p>
                          <p className="mt-1 text-sm text-narvo-ink/70 dark:text-white/65">
                            {new Date(session.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    {prefsRemote?.updated_at ? (
                      <p className="text-xs text-narvo-ink/45 dark:text-white/40 font-mono">
                        {COPY.settings_autosave_last_at.replace(
                          '{time}',
                          new Date(String(prefsRemote.updated_at)).toLocaleString()
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-narvo-ink/60 dark:text-white/55 leading-relaxed">
                    {COPY.settings_account_not_signed_in}{' '}
                    <Link href="/auth" className="font-bold text-narvo-teal dark:text-narvo-mint underline-offset-2 hover:underline">
                      {COPY.auth_sign_in}
                    </Link>
                  </p>
                )}

                {session?.email ? (
                  <div className="rounded-2xl border border-narvo-ink/8 p-4 dark:border-white/10">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-3">
                      {COPY.settings_account_security_title}
                    </p>
                    <Link
                      href="/auth/update-password"
                      className="inline-flex min-h-[48px] items-center rounded-full border-2 border-narvo-teal/35 px-6 text-sm font-bold text-narvo-teal dark:border-narvo-mint/45 dark:text-narvo-mint"
                    >
                      {COPY.settings_account_update_password}
                    </Link>
                  </div>
                ) : null}

                <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.settings_cloud_session_note}</p>

                {session?.email ? (
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={() => void onSignOut()}
                    className="min-h-[48px] rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20 disabled:opacity-50"
                  >
                    {signingOut ? COPY.status_loading : COPY.settings_sign_out}
                  </button>
                ) : null}
              </section>
            )}

            {tab === 'voice' && (
              <section role="tabpanel" className={`${NARVO_PANEL_ELEVATED_CLASS} space-y-5`}>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">
                    {COPY.settings_tab_voice}
                  </h2>
                  <p className="text-sm text-narvo-ink/50 dark:text-white/45 mt-1">{COPY.settings_voice_pick_hint}</p>
                </div>

                <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 space-y-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.settings_playback_speed_label}
                  </p>
                  <p className="text-xs text-narvo-ink/50 dark:text-white/45">{COPY.settings_playback_speed_hint}</p>
                  <div className="flex flex-wrap gap-2">
                    {[0.75, 1, 1.25, 1.5].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => onPlaybackSpeed(spd)}
                        className={`min-h-[44px] rounded-full px-4 text-sm font-bold border-2 transition-colors ${
                          playbackSpeed === spd
                            ? 'border-narvo-teal bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint dark:text-narvo-mint'
                            : 'border-narvo-ink/10 dark:border-white/10 text-narvo-ink/75 dark:text-white/70'
                        }`}
                      >
                        {spd}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 space-y-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                      {COPY.settings_briefing_synth_title}
                    </p>
                    <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-1">{COPY.settings_briefing_synth_hint}</p>
                  </div>
                  {(() => {
                    const rawRate = settingsRemote?.tts_speaking_rate;
                    const rate =
                      typeof rawRate === 'number' && !Number.isNaN(rawRate)
                        ? Math.min(2, Math.max(0.5, rawRate))
                        : 1;
                    const rawPitch = settingsRemote?.tts_pitch_semitones;
                    const pitch =
                      typeof rawPitch === 'number' && !Number.isNaN(rawPitch)
                        ? Math.min(12, Math.max(-12, rawPitch))
                        : 0;
                    return (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between gap-2 text-xs font-medium text-narvo-ink/70 dark:text-white/65">
                            <span>{COPY.settings_briefing_synth_speed}</span>
                            <span className="font-mono">{rate.toFixed(2)}×</span>
                          </div>
                          <input
                            type="range"
                            min={0.5}
                            max={2}
                            step={0.05}
                            value={rate}
                            onChange={(e) => {
                              const v = Math.min(2, Math.max(0.5, Number(e.target.value)));
                              setSettingsRemote((s) => ({ ...(s || {}), tts_speaking_rate: v }));
                              queueCloudSettingsSave({ tts_speaking_rate: v });
                            }}
                            className="w-full accent-narvo-teal dark:accent-narvo-mint"
                            aria-label={COPY.settings_briefing_synth_speed}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between gap-2 text-xs font-medium text-narvo-ink/70 dark:text-white/65">
                            <span>{COPY.settings_briefing_synth_pitch}</span>
                            <span className="font-mono">
                              {pitch >= 0 ? '+' : ''}
                              {pitch.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-12}
                            max={12}
                            step={0.5}
                            value={pitch}
                            onChange={(e) => {
                              const v = Math.min(12, Math.max(-12, Number(e.target.value)));
                              setSettingsRemote((s) => ({ ...(s || {}), tts_pitch_semitones: v }));
                              queueCloudSettingsSave({ tts_pitch_semitones: v });
                            }}
                            className="w-full accent-narvo-teal dark:accent-narvo-mint"
                            aria-label={COPY.settings_briefing_synth_pitch}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>

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
                    <ul className="max-h-64 overflow-y-auto space-y-2">
                      {voicesList.map((v, i) => {
                        const id = String(v.id ?? v.voice_id ?? i);
                        const label = String(v.name ?? v.label ?? v.id ?? i);
                        const selected = voiceFromApi === id;
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => onPickVoice(id)}
                              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                                selected
                                  ? 'border-narvo-teal bg-narvo-teal/10 dark:border-narvo-mint dark:bg-narvo-mint/10'
                                  : 'border-narvo-ink/8 dark:border-white/10 hover:border-narvo-teal/30'
                              }`}
                            >
                              <span className="text-sm font-bold text-narvo-ink dark:text-white">{label}</span>
                              {v.locale != null ? (
                                <span className="block font-mono text-[11px] text-narvo-ink/45 dark:text-white/40 mt-0.5">
                                  {String(v.locale)}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {prefsErr && (
                  <p className="text-sm text-narvo-vermilion dark:text-narvo-butter">{prefsErr}</p>
                )}
                {localPrefs ? (
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
                ) : null}

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
                <div>
                  <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">
                    {COPY.settings_tab_billing}
                  </h2>
                  <p className="mt-1 text-sm text-narvo-ink/50 dark:text-white/45">{COPY.settings_billing_external_hint}</p>
                </div>
                {searchParams.get('billing') === 'success' ? (
                  <p className="text-sm font-medium text-narvo-teal dark:text-narvo-mint">{COPY.settings_billing_success}</p>
                ) : null}
                <CloudFeatureGateBanner />
                {authBridge.hydrated && hasMeAuth() ? (
                  billingLoading ? (
                  <p className="text-sm text-narvo-ink/50">{COPY.settings_billing_loading}</p>
                ) : billingErr ? (
                  <p className="text-sm text-narvo-vermilion dark:text-narvo-butter">{billingErr}</p>
                ) : billingSub ? (
                  <>
                    <div className="rounded-2xl border border-narvo-ink/8 bg-[var(--bg-card)]/60 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                            {COPY.settings_billing_tier_label}
                          </p>
                          <p className="mt-1 text-sm font-bold text-narvo-ink dark:text-white capitalize">
                            {(billingSub.tier || 'free').toString()}
                          </p>
                          <p className="mt-1 text-xs text-narvo-ink/55 dark:text-white/50">
                            {(billingSub.tier || '').toLowerCase() === 'pro'
                              ? COPY.settings_billing_tier_pro
                              : COPY.settings_billing_tier_free}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                            {COPY.settings_billing_status_label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-narvo-ink dark:text-white capitalize">
                            {billingSub.status || '—'}
                          </p>
                        </div>
                        {billingSub.subscription && typeof billingSub.subscription === 'object' ? (
                          <>
                            {(billingSub.subscription as { started_at?: string }).started_at ? (
                              <div>
                                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                                  {COPY.settings_billing_started_label}
                                </p>
                                <p className="mt-1 text-sm text-narvo-ink/75 dark:text-white/70">
                                  {new Date(
                                    String((billingSub.subscription as { started_at?: string }).started_at)
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            ) : null}
                            {(billingSub.subscription as { ends_at?: string }).ends_at ? (
                              <div>
                                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                                  {COPY.settings_billing_renews_label}
                                </p>
                                <p className="mt-1 text-sm text-narvo-ink/75 dark:text-white/70">
                                  {new Date(
                                    String((billingSub.subscription as { ends_at?: string }).ends_at)
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
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
                          className="min-h-[48px] rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/25 disabled:opacity-50"
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
                    <p className="text-xs text-narvo-ink/45 dark:text-white/40">
                      <Link href="/subscription" className="font-bold text-narvo-teal dark:text-narvo-mint hover:underline">
                        {COPY.subscription_page_title}
                      </Link>
                    </p>
                  </>
                ) : null
                ) : null}
              </section>
            )}

            {tab === 'preferences' && (
              <section role="tabpanel" className={`${NARVO_PANEL_ELEVATED_CLASS} space-y-8`}>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-1">
                    {COPY.settings_tab_preferences}
                  </h2>
                  <p className="text-sm text-narvo-ink/50 dark:text-white/45">{COPY.settings_preferences_intro}</p>
                </div>

                {!authBridge.hydrated ? null : authBridge.hasApiToken ? (
                  <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 space-y-5">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                        {COPY.settings_prefs_region_title}
                      </p>
                      <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-1">{COPY.settings_prefs_region_hint}</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={regionDraft}
                          onChange={(e) => setRegionDraft(e.target.value)}
                          className="min-h-[48px] flex-1 rounded-xl border border-narvo-ink/12 bg-[var(--bg-card)] px-4 text-sm font-medium text-narvo-ink dark:border-white/12 dark:text-white"
                          autoComplete="address-level2"
                        />
                        <button
                          type="button"
                          onClick={() => saveRegion()}
                          className="min-h-[48px] rounded-full bg-narvo-teal px-5 text-sm font-bold text-white dark:bg-narvo-mint dark:text-narvo-ink"
                        >
                          {COPY.settings_prefs_region_save}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                        {COPY.settings_prefs_interests_title}
                      </p>
                      <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-1">{COPY.settings_prefs_interests_hint}</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={interestDraft}
                          onChange={(e) => setInterestDraft(e.target.value)}
                          placeholder={COPY.settings_prefs_interest_placeholder}
                          className="min-h-[48px] flex-1 rounded-xl border border-narvo-ink/12 bg-[var(--bg-card)] px-4 text-sm dark:border-white/12 dark:text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addInterest();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => addInterest()}
                          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-narvo-teal/35 px-5 text-sm font-bold text-narvo-teal dark:border-narvo-mint/45 dark:text-narvo-mint"
                        >
                          <Plus size={18} aria-hidden />
                          {COPY.settings_prefs_interest_add}
                        </button>
                      </div>
                      {interestsList.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {interestsList.map((tag) => (
                            <li key={tag}>
                              <button
                                type="button"
                                onClick={() => removeInterest(tag)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-narvo-ink/8 px-3 py-1.5 text-xs font-bold text-narvo-ink dark:bg-white/10 dark:text-white"
                              >
                                {tag}
                                <XIcon size={14} aria-hidden />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-narvo-ink/45 dark:text-white/40">{COPY.settings_prefs_interests_empty}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                        {COPY.settings_prefs_broadcast_title}
                      </p>
                      <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-1">{COPY.settings_prefs_broadcast_hint}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ONBOARDING_LANG_ROWS.map((row) => (
                          <button
                            key={row.broadcastCode}
                            type="button"
                            onClick={() => onBroadcastLang(row.broadcastCode)}
                            className={`min-h-[44px] rounded-full border-2 px-4 text-xs font-bold ${
                              broadcastLang === row.broadcastCode
                                ? 'border-narvo-teal bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint dark:text-narvo-mint'
                                : 'border-narvo-ink/10 text-narvo-ink/80 dark:border-white/12 dark:text-white/75'
                            }`}
                          >
                            {row.flag} {row.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : authBridge.hasSession ? (
                  <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">
                    <Link href="/auth" className="font-bold text-narvo-teal dark:text-narvo-mint underline-offset-2 hover:underline">
                      {COPY.auth_renew_session_cta}
                    </Link>{' '}
                    — {COPY.cloud_sync_paused_inline}
                  </p>
                ) : (
                  <p className="text-sm text-narvo-ink/55 dark:text-white/50">
                    <Link href="/auth" className="font-bold text-narvo-teal dark:text-narvo-mint underline-offset-2 hover:underline">
                      {COPY.subscription_sign_in_hint}
                    </Link>{' '}
                    — region, interests, and briefing language sync to your account.
                  </p>
                )}

                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-3">
                    {COPY.settings_theme_title}
                  </p>
                  <p className="text-xs text-narvo-ink/50 dark:text-white/45 mb-3">{COPY.settings_theme_desc}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {(
                      [
                        ['light', COPY.settings_theme_light],
                        ['dark', COPY.settings_theme_dark],
                        ['system', COPY.settings_theme_system],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onThemePick(v)}
                        className={`flex-1 min-h-[48px] rounded-full border-2 text-sm font-bold transition-colors ${
                          theme === v
                            ? 'border-narvo-teal bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint dark:text-narvo-mint'
                            : 'border-narvo-ink/10 dark:border-white/10 text-narvo-ink dark:text-white hover:border-narvo-teal/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-narvo-ink/8 dark:border-white/8 pt-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-4">
                    {COPY.settings_sound_title}
                  </p>
                  <ToggleRow
                    label={COPY.settings_sound_title}
                    description={COPY.settings_sound_desc}
                    checked={displayToggles.haptic_sync}
                    onChange={(v) => onDisplayToggle('haptic_sync', v)}
                  />
                </div>

                <div className="border-t border-narvo-ink/8 dark:border-white/8 pt-6">
                  <h3 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white mb-2">
                    {COPY.settings_notifications_title}
                  </h3>
                  <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed mb-4">
                    {COPY.settings_notifications_desc}
                  </p>
                  <p className="text-xs font-mono text-narvo-teal dark:text-narvo-mint mb-4">
                    {perm === 'unsupported'
                      ? COPY.settings_notifications_unsupported
                      : perm === 'denied'
                        ? COPY.settings_notifications_disabled
                        : COPY.settings_notifications_granted}
                  </p>
                  <ToggleRow
                    label={COPY.settings_notifications_enable}
                    checked={enabled}
                    onChange={(v) => void handleToggle(v)}
                  />
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
                </div>
              </section>
            )}

            {tab === 'accessibility' && (
              <section role="tabpanel" className={`${NARVO_PANEL_ELEVATED_CLASS} space-y-8`}>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white mb-1">
                    {COPY.settings_tab_accessibility}
                  </h2>
                  <p className="text-sm text-narvo-ink/50 dark:text-white/45">{COPY.settings_accessibility_intro}</p>
                </div>

                <SettingsAccessibilityFeedbackPanel />

                <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 p-4 sm:p-5 space-y-6">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                      {COPY.settings_a11y_reading_title}
                    </p>
                    <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-1">{COPY.settings_a11y_font_scale_hint}</p>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-narvo-ink dark:text-white">{COPY.settings_a11y_font_scale_label}</span>
                      <span className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          min={85}
                          max={130}
                          step={5}
                          value={reading.font_scale}
                          onChange={(e) => onReadingPatch({ font_scale: Number(e.target.value) })}
                          className="h-2 w-full max-w-md cursor-pointer accent-narvo-teal"
                        />
                        <span className="font-mono text-sm font-bold text-narvo-teal dark:text-narvo-mint w-12">{reading.font_scale}%</span>
                      </span>
                    </label>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-narvo-ink dark:text-white mb-2">{COPY.settings_a11y_density_label}</p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['compact', COPY.settings_a11y_density_compact],
                          ['standard', COPY.settings_a11y_density_standard],
                          ['spacious', COPY.settings_a11y_density_spacious],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onReadingPatch({ display_density: id })}
                          className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold ${
                            reading.display_density === id
                              ? 'border-narvo-teal bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint dark:text-narvo-mint'
                              : 'border-narvo-ink/10 dark:border-white/10 text-narvo-ink dark:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-narvo-ink dark:text-white mb-2">{COPY.settings_a11y_typeface_label}</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {(
                        [
                          ['narvo_editorial', COPY.settings_a11y_typeface_editorial],
                          ['readable_sans', COPY.settings_a11y_typeface_sans],
                          ['newspaper_serif', COPY.settings_a11y_typeface_newspaper],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onReadingPatch({ article_font_preset: id })}
                          className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold sm:flex-1 ${
                            reading.article_font_preset === id
                              ? 'border-narvo-teal bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint dark:text-narvo-mint'
                              : 'border-narvo-ink/10 dark:border-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-narvo-ink dark:text-white mb-2">{COPY.settings_a11y_scope_label}</p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['article', COPY.settings_a11y_scope_article],
                          ['app', COPY.settings_a11y_scope_app],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onReadingPatch({ reading_scope: id })}
                          className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold ${
                            reading.reading_scope === id
                              ? 'border-narvo-teal bg-narvo-teal/10 text-narvo-teal dark:border-narvo-mint dark:text-narvo-mint'
                              : 'border-narvo-ink/10 dark:border-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="narvo-reading-surface rounded-2xl border border-narvo-teal/20 bg-narvo-mist/40 p-4 dark:bg-white/[0.04]"
                    style={
                      {
                        '--narvo-reading-font-scale': reading.font_scale / 100,
                      } as React.CSSProperties
                    }
                    data-narvo-density={reading.display_density}
                    data-narvo-article-font={reading.article_font_preset}
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                      {COPY.settings_a11y_preview_kicker}
                    </p>
                    <p className="mt-2 font-serif text-lg font-semibold text-narvo-ink dark:text-white">{COPY.settings_a11y_preview_title}</p>
                    <p className="narvo-reading-body mt-3 text-narvo-ink/80 dark:text-white/75">{COPY.settings_a11y_preview_body}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onReadingPatch({
                        font_scale: 100,
                        display_density: 'standard',
                        article_font_preset: 'narvo_editorial',
                        reading_scope: 'article',
                      })
                    }
                    className="text-sm font-bold text-narvo-teal underline-offset-2 hover:underline dark:text-narvo-mint"
                  >
                    {COPY.settings_a11y_reset_reading}
                  </button>
                </div>

                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 mb-4">
                    {COPY.settings_accessibility_title}
                  </p>
                  <div className="space-y-2">
                    <ToggleRow
                      label={COPY.settings_accessibility_high_contrast_title}
                      description={COPY.settings_accessibility_high_contrast_desc}
                      checked={displayToggles.high_contrast}
                      onChange={(v) => onDisplayToggle('high_contrast', v)}
                    />
                    <ToggleRow
                      label={COPY.settings_accessibility_reduced_motion_title}
                      description={COPY.settings_accessibility_reduced_motion_desc}
                      checked={displayToggles.reduced_motion}
                      onChange={(v) => onDisplayToggle('reduced_motion', v)}
                    />
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

          <aside className="relative hidden lg:order-2 lg:block">
            <div
              className="sticky flex max-h-[min(100dvh-5.5rem,920px)] flex-col gap-3 overflow-y-auto overscroll-y-contain pb-4"
              style={{ top: 'max(5.5rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className={asidePanelClass}>
                <p className="mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint">
                  {COPY.settings_title}
                </p>
                <nav className="flex flex-col gap-1" aria-label={COPY.settings_tablist_a11y}>
                  {tabs.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectTab(id)}
                      className={`${DESKTOP_TAB_CLASS} ${
                        tab === id
                          ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/15'
                          : 'text-narvo-ink/70 hover:bg-narvo-ink/[0.06] dark:text-white/60 dark:hover:bg-white/[0.07]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="px-1">
                <SaveStateFeedback syncStatus={syncStatus} lastSavedAt={lastSavedAt} />
              </div>
            </div>
          </aside>
        </div>
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
