/**
 * SettingsPage.tsx — Design System v3 · Consolidated Settings
 * Replaces: AccountPage, SettingsPage (hub), SystemSettingsPage, AccessibilityPage
 * URL routing: /settings?tab=profile | preferences | system | accessibility
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";

import { UserCircle }        from "@phosphor-icons/react/UserCircle";
import { SlidersHorizontal } from "@phosphor-icons/react/SlidersHorizontal";
import { GearSix }           from "@phosphor-icons/react/GearSix";
import { Wheelchair }        from "@phosphor-icons/react/Wheelchair";
import { SignOut }           from "@phosphor-icons/react/SignOut";
import { Bell }              from "@phosphor-icons/react/Bell";
import { Timer }             from "@phosphor-icons/react/Timer";
import { Waveform }          from "@phosphor-icons/react/Waveform";
import { MapPin }            from "@phosphor-icons/react/MapPin";
import { FileText }          from "@phosphor-icons/react/FileText";
import { Broadcast }         from "@phosphor-icons/react/Broadcast";
import { Globe }             from "@phosphor-icons/react/Globe";
import { GridFour }          from "@phosphor-icons/react/GridFour";
import { Compass }           from "@phosphor-icons/react/Compass";
import { Sun }               from "@phosphor-icons/react/Sun";
import { Lightning }         from "@phosphor-icons/react/Lightning";
import { MusicNotes }        from "@phosphor-icons/react/MusicNotes";
import { SpeakerHigh }       from "@phosphor-icons/react/SpeakerHigh";
import { CircleNotch }       from "@phosphor-icons/react/CircleNotch";
import { CircleDashed }      from "@phosphor-icons/react/CircleDashed";
import { Rows }              from "@phosphor-icons/react/Rows";
import { TextT }             from "@phosphor-icons/react/TextT";
import { HandPointing }      from "@phosphor-icons/react/HandPointing";
import { Microphone }        from "@phosphor-icons/react/Microphone";
import { Info }              from "@phosphor-icons/react/Info";
import { Pulse }             from "@phosphor-icons/react/Pulse";

import Skeleton                    from "../components/Skeleton";
import { useAuth }                 from "../contexts/AuthContext";
import { useTheme }                from "../contexts/ThemeContext";
import { useHapticAlert }          from "../components/HapticAlerts";
import { useSettings }             from "../hooks/useSettings";
import { NotificationToggle }      from "../components/BreakingNews";
import DailyDigest                 from "../components/features/DailyDigest";
import { openTourGuide, resetTourGuide } from "../components/TourGuideModal";
import { getOnboardingInterestsList, filterValidInterestIds } from "../constants/onboarding";
import { THEME_OPTIONS }           from "../constants/themes";
import { LANGUAGES }               from "../i18n";
import { applyAccessibilityFromCache, dispatchSettingsUpdated } from "../lib/accessibilityApply";
import { asArray, asRecord, isRecord, isString } from "../lib/validators";
import * as api                    from "../lib/api";
import logger                      from "../lib/logger";
import { mergeJson, readJson, removeKey } from "../lib/storage";

/* ── Types ── */
interface SettingsApiShape { interface_language?: string; theme?: string; interests?: string[]; }
interface MetricsData { network_load?: string | number; broadcast_hours?: number; stories_processed?: number; sources_online?: number; signal_strength?: string; listeners_today?: string | number; }
interface SystemAlert { id: string; title: string; desc: string; priority?: boolean; time?: string; }
interface CachedSettings extends Record<string, unknown> { high_contrast?: boolean; haptic_sync?: boolean; alert_volume?: number; data_limit?: number; bandwidth_priority?: string; aggregator_mediastack?: boolean; aggregator_newsdata?: boolean; sound_theme?: string; }
interface SystemSettingsState { highContrast: boolean; hapticSync: boolean; alertVolume: number; dataLimit: number; bandwidthPriority: string; aggregatorMediastack: boolean; aggregatorNewsdata: boolean; soundTheme: string; }
interface CachedAccessibility { display_density?: string; font_scale?: number; gestural_swipe?: boolean; gestural_pinch?: boolean; voice_commands?: boolean; }
interface SoundThemeItem { id: string; name: string; description?: string; intro?: { type?: string; tempo?: number; notes?: string[]; envelope?: Record<string, number>; }; }

/* ── Helpers ── */
const LS_KEY = "narvo_settings_cache";
const cacheToLocal = (payload: Record<string, unknown>) => mergeJson(LS_KEY, payload, {});
const readLocal = <T extends Record<string, unknown>>(): T | null => { try { return readJson<T | null>(LS_KEY, null); } catch { return null; } };

const DEFAULT_SYSTEM: SystemSettingsState = { highContrast: true, hapticSync: false, alertVolume: 65, dataLimit: 2400, bandwidthPriority: "STREAMING", aggregatorMediastack: true, aggregatorNewsdata: true, soundTheme: "narvo_classic" };
const DEFAULT_A11Y = { displayDensity: "standard", fontScale: 100, lateralSwipe: true, pinchZoom: false, voiceCommands: false };

const spring = { type: "spring" as const, stiffness: 260, damping: 20 };
type TabId = "profile" | "preferences" | "system" | "accessibility";
const TABS = [
  { id: "profile" as TabId,       label: "Profile",       Icon: UserCircle },
  { id: "preferences" as TabId,   label: "Preferences",   Icon: SlidersHorizontal },
  { id: "system" as TabId,        label: "System",        Icon: GearSix },
  { id: "accessibility" as TabId, label: "Accessibility", Icon: Wheelchair },
];

/* ── Sound themes sub-component ── */
function isSoundThemeItem(v: unknown): v is SoundThemeItem { if (!isRecord(v)) return false; const r = v as Record<string, unknown>; return isString(r.id) && isString(r.name); }
interface SoundThemesSectionProps { settings: SystemSettingsState; updateSetting: (k: keyof SystemSettingsState, v: boolean | number | string) => void; }
const SoundThemesSection = ({ settings, updateSetting }: SoundThemesSectionProps) => {
  const [themes, setThemes] = useState<SoundThemeItem[]>([]);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  useEffect(() => { let c = false; api.get("api/sound-themes").then(r => r.json()).then((d: SoundThemeItem[]) => { if (!c) setThemes(asArray<SoundThemeItem>(d, isSoundThemeItem)); }).catch(err => logger.debug("[Settings] sound themes", err)); return () => { c = true; }; }, []);
  const playPreview = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (previewPlaying === id) { setPreviewPlaying(null); return; }
    setPreviewPlaying(id);
    try {
      const toneMod = await import("tone") as { default?: unknown; start?: () => Promise<void>; now?: () => number };
      const Tone = (toneMod.default ?? toneMod) as { start: () => Promise<void>; now: () => number; Reverb: new (o: { decay: number; wet: number }) => { toDestination: () => unknown }; Gain: new (v: number) => { connect: (d: unknown) => unknown }; FMSynth: new (o: unknown) => { connect: (d: unknown) => unknown; triggerAttackRelease: (n: string, dur: number, t: number) => void; dispose: () => void } };
      await Tone.start();
      const res = await api.get(`api/sound-themes/${id}`);
      const td = (await res.json()) as SoundThemeItem;
      if (!td.intro?.notes?.length) { setPreviewPlaying(null); return; }
      const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
      const gain = new Tone.Gain(0.5).connect(reverb);
      const synth = new Tone.FMSynth({ envelope: td.intro.envelope || { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 }, volume: -10 }).connect(gain) as { triggerAttackRelease: (n: string, dur: number, t: number) => void; dispose: () => void };
      const now = Tone.now(); const noteDur = 60 / (td.intro.tempo || 120);
      (td.intro.notes as string[]).forEach((note, i) => synth.triggerAttackRelease(note, noteDur * 0.8, now + i * noteDur));
      setTimeout(() => { synth.dispose(); (gain as { dispose: () => void }).dispose(); (reverb as { dispose: () => void }).dispose(); setPreviewPlaying(null); }, td.intro.notes.length * noteDur * 1000 + 500);
    } catch { setPreviewPlaying(null); }
  };
  if (!themes.length) return null;
  return (
    <section data-testid="sound-themes-section">
      <h3 className="font-display font-bold text-[15px] mt-6 mb-3" style={{ color: "rgb(var(--color-text-primary))" }}>Sound themes</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {themes.map(theme => { const active = (settings.soundTheme || "narvo_classic") === theme.id; const prev = previewPlaying === theme.id; return (
          <div key={theme.id} role="button" tabIndex={0} onClick={() => updateSetting("soundTheme", theme.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); updateSetting("soundTheme", theme.id); } }} aria-label={`Select sound theme: ${theme.name}`} className="flex items-center justify-between p-3 rounded-[12px] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ border: `1px solid ${active ? "rgb(var(--color-primary))" : "rgb(var(--color-border-subtle))"}`, background: active ? "rgba(var(--color-primary-rgb,212,133,10),0.08)" : "rgb(var(--color-surface))" }} data-testid={`theme-${theme.id}`}>
            <div className="flex items-center gap-2 min-w-0"><MusicNotes weight="bold" className="w-4 h-4 shrink-0" style={{ color: active ? "rgb(var(--color-primary))" : "rgb(var(--color-text-secondary))" }} /><div className="min-w-0"><p className="font-display font-bold text-[13px] truncate" style={{ color: active ? "rgb(var(--color-primary))" : "rgb(var(--color-text-primary))" }}>{theme.name}</p>{theme.description && <p className="font-body text-[11px] truncate" style={{ color: "rgb(var(--color-text-secondary))" }}>{theme.description}</p>}</div></div>
            <button type="button" onClick={(e) => playPreview(e, theme.id)} className="flex items-center justify-center rounded-full transition-colors focus:outline-none shrink-0 ml-2" style={{ width: 32, height: 32, background: "rgb(var(--color-surface-raised))", color: "rgb(var(--color-text-secondary))" }} aria-label={prev ? "Stop preview" : `Preview ${theme.name}`} data-testid={`preview-theme-${theme.id}`}>{prev ? <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" /> : <SpeakerHigh weight="bold" className="w-3.5 h-3.5" />}</button>
          </div>
        ); })}
      </div>
    </section>
  );
};

/* ── Toggle row ── */
interface ToggleRowProps { icon: React.ReactNode; label: string; desc?: string; checked: boolean; onChange: () => void; testId?: string; }
const ToggleRow = ({ icon, label, desc, checked, onChange, testId }: ToggleRowProps) => (
  <div className="flex items-center justify-between gap-4 p-4 rounded-[12px] transition-colors" style={{ border: "1px solid rgb(var(--color-border-subtle))", background: "rgb(var(--color-surface))" }}>
    <div className="flex items-center gap-3 min-w-0">
      <div className="shrink-0 flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: "rgb(var(--color-surface-raised))" }}>{icon}</div>
      <div className="min-w-0"><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>{label}</p>{desc && <p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>{desc}</p>}</div>
    </div>
    <button type="button" role="switch" aria-checked={checked} onClick={onChange} className="relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full" style={{ width: 48, height: 28 }} data-testid={testId}>
      <span className="absolute inset-0 rounded-full transition-colors duration-200" style={{ background: checked ? "rgb(var(--color-primary))" : "rgb(var(--color-border-subtle))" }} />
      <span className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all duration-200" style={{ left: checked ? "calc(100% - 25px)" : "3px" }} />
    </button>
  </div>
);

/* ── Section heading ── */
const SH = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-display font-bold text-[15px] mt-6 mb-3 first:mt-0" style={{ color: "rgb(var(--color-text-primary))" }}>{children}</h3>
);

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showAlert } = useHapticAlert();

  const rawTab = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some(t => t.id === rawTab) ? rawTab! : "profile";
  const setTab = (id: TabId) => setSearchParams({ tab: id }, { replace: true });

  /* ── Preferences state ── */
  const { updateSetting } = useSettings<{ interface_language: string; theme: string }, SettingsApiShape>(
    { interface_language: "en", theme: "nature" },
    (d: Record<string, unknown>) => ({ interface_language: String(d.interface_language ?? "en"), theme: String(d.theme ?? "nature") }),
    (l) => ({ interface_language: l.interface_language, theme: l.theme }),
  );
  const [interests, setInterests] = useState<string[]>(() => filterValidInterestIds(readJson<{ interests?: string[] }>("narvo_settings_cache", {}).interests || []));
  const [interestsSaving, setInterestsSaving] = useState(false);

  useEffect(() => {
    let c = false;
    api.get(`api/settings/${user?.id || "guest"}`).then(r => r.ok ? r.json() : null).then((d: { interests?: string[] } | null) => { const s = asRecord<{ interests?: string[] }>(d ?? {}, {}); if (!c) setInterests(Array.isArray(s.interests) ? filterValidInterestIds(s.interests) : []); }).catch(err => logger.debug("[Settings] interests", err));
    return () => { c = true; };
  }, [user?.id]);

  const toggleInterest = useCallback((catId: string) => {
    const next = interests.includes(catId) ? interests.filter(i => i !== catId) : [...interests, catId];
    setInterests(next); setInterestsSaving(true);
    mergeJson("narvo_settings_cache", { interests: next }, {});
    api.post(`api/settings/${user?.id || "guest"}`, { interests: next }).then(() => showAlert({ type: "sync", title: "INTERESTS_UPDATED", message: `${next.length} categories selected`, code: "INT_OK", duration: 2000 })).catch(err => logger.debug("[Settings] interests save", err)).finally(() => setInterestsSaving(false));
  }, [interests, user?.id, showAlert]);

  const handleLanguageChange = useCallback((code: string) => { i18n.changeLanguage(code); updateSetting("interface_language", code); showAlert({ type: "sync", title: "LANGUAGE_CHANGED", message: `Interface set to ${code.toUpperCase()}`, code: "LANG_OK", duration: 3000 }); }, [i18n, updateSetting, showAlert]);
  const handleThemeSelect = useCallback((id: string) => { setTheme(id); updateSetting("theme", id); }, [setTheme, updateSetting]);
  const handleLogout = async () => { try { await signOut(); } catch {} try { removeKey("narvo_user"); removeKey("narvo_preferences"); } catch {} navigate("/", { replace: true }); };

  /* ── Profile state ── */
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  useEffect(() => {
    if (activeTab !== "profile") return;
    let c = false;
    Promise.all([api.get("api/metrics").then(r => r.json()).catch(() => null), api.get("api/system-alerts").then(r => r.json()).catch(() => [])]).then(([m, a]: [MetricsData | null, SystemAlert[]]) => { if (c) return; setMetrics(m ?? null); setAlerts(Array.isArray(a) ? a : []); setProfileLoading(false); });
    return () => { c = true; };
  }, [activeTab]);

  /* ── System state ── */
  const [sysSettings, setSysSettings] = useState<SystemSettingsState>(() => { const c = readLocal<CachedSettings>(); if (c) return { highContrast: c.high_contrast ?? DEFAULT_SYSTEM.highContrast, hapticSync: c.haptic_sync ?? DEFAULT_SYSTEM.hapticSync, alertVolume: c.alert_volume ?? DEFAULT_SYSTEM.alertVolume, dataLimit: Math.round((c.data_limit ?? 2.4) * 1000), bandwidthPriority: (c.bandwidth_priority || "streaming").toUpperCase(), aggregatorMediastack: c.aggregator_mediastack ?? DEFAULT_SYSTEM.aggregatorMediastack, aggregatorNewsdata: c.aggregator_newsdata ?? DEFAULT_SYSTEM.aggregatorNewsdata, soundTheme: c.sound_theme || "narvo_classic" }; return DEFAULT_SYSTEM; });
  const [sysLoading, setSysLoading] = useState(true);
  const sysTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeTab !== "system") return;
    let c = false;
    api.get(`api/settings/${user?.id || "guest"}`).then(r => r.ok ? r.json() : null).then((d: CachedSettings | null) => { if (!d || c) return; setSysSettings({ highContrast: d.high_contrast ?? DEFAULT_SYSTEM.highContrast, hapticSync: d.haptic_sync ?? DEFAULT_SYSTEM.hapticSync, alertVolume: d.alert_volume ?? DEFAULT_SYSTEM.alertVolume, dataLimit: Math.round((d.data_limit ?? 2.4) * 1000), bandwidthPriority: (d.bandwidth_priority || "streaming").toUpperCase(), aggregatorMediastack: d.aggregator_mediastack ?? DEFAULT_SYSTEM.aggregatorMediastack, aggregatorNewsdata: d.aggregator_newsdata ?? DEFAULT_SYSTEM.aggregatorNewsdata, soundTheme: d.sound_theme || "narvo_classic" }); }).catch(err => logger.debug("[Settings] system load", err)).finally(() => { if (!c) setSysLoading(false); });
    return () => { c = true; };
  }, [activeTab, user?.id]);
  const saveSys = useCallback(async (s: SystemSettingsState) => { const p = { high_contrast: s.highContrast, haptic_sync: s.hapticSync, alert_volume: s.alertVolume, data_limit: s.dataLimit / 1000, bandwidth_priority: s.bandwidthPriority.toLowerCase(), aggregator_mediastack: s.aggregatorMediastack, aggregator_newsdata: s.aggregatorNewsdata, sound_theme: s.soundTheme || "narvo_classic" }; cacheToLocal(p); await api.post(`api/settings/${user?.id || "guest"}`, p).catch(err => logger.debug("[Settings] system save", err)); }, [user?.id]);
  const updateSys = useCallback((k: keyof SystemSettingsState, v: boolean | number | string) => { const n = { ...sysSettings, [k]: v }; setSysSettings(n); if (sysTimerRef.current) clearTimeout(sysTimerRef.current); sysTimerRef.current = setTimeout(() => saveSys(n), 1000); }, [sysSettings, saveSys]);
  useEffect(() => () => { if (sysTimerRef.current) clearTimeout(sysTimerRef.current); }, []);

  /* ── Accessibility state ── */
  const a11yC = readLocal<CachedAccessibility>();
  const [density, setDensity] = useState(a11yC?.display_density || DEFAULT_A11Y.displayDensity);
  const [fontScale, setFontScale] = useState(a11yC?.font_scale ?? DEFAULT_A11Y.fontScale);
  const [gestures, setGestures] = useState({ lateralSwipe: a11yC?.gestural_swipe ?? DEFAULT_A11Y.lateralSwipe, pinchZoom: a11yC?.gestural_pinch ?? DEFAULT_A11Y.pinchZoom });
  const [voiceCmd, setVoiceCmd] = useState(a11yC?.voice_commands ?? DEFAULT_A11Y.voiceCommands);
  const [a11yLoading, setA11yLoading] = useState(true);
  const [a11ySaveStatus, setA11ySaveStatus] = useState<"saving" | "saved" | null>(null);
  const a11yTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const a11yTouched = useRef(false);
  useEffect(() => {
    if (activeTab !== "accessibility") return;
    let c = false;
    api.get(`api/settings/${user?.id || "guest"}`).then(r => r.ok ? r.json() : null).then((d: (CachedAccessibility & Record<string, unknown>) | null) => { if (!d || c) return; const s = asRecord<CachedAccessibility & Record<string, unknown>>(d, {}); const p: CachedAccessibility = { display_density: (s.display_density as string) || DEFAULT_A11Y.displayDensity, font_scale: (s.font_scale as number) ?? DEFAULT_A11Y.fontScale, gestural_swipe: (s.gestural_swipe as boolean) ?? DEFAULT_A11Y.lateralSwipe, gestural_pinch: (s.gestural_pinch as boolean) ?? DEFAULT_A11Y.pinchZoom, voice_commands: (s.voice_commands as boolean) ?? DEFAULT_A11Y.voiceCommands }; setDensity(p.display_density ?? DEFAULT_A11Y.displayDensity); setFontScale(p.font_scale ?? DEFAULT_A11Y.fontScale); setGestures({ lateralSwipe: p.gestural_swipe ?? DEFAULT_A11Y.lateralSwipe, pinchZoom: p.gestural_pinch ?? DEFAULT_A11Y.pinchZoom }); setVoiceCmd(p.voice_commands ?? DEFAULT_A11Y.voiceCommands); cacheToLocal(p); applyAccessibilityFromCache(); }).catch(err => logger.debug("[Settings] a11y load", err)).finally(() => { if (!c) setA11yLoading(false); });
    return () => { c = true; };
  }, [activeTab, user?.id]);
  const saveA11y = useCallback(async (den: string, scale: number, gest: typeof gestures, voice: boolean) => { const p: CachedAccessibility = { display_density: den, font_scale: scale, gestural_swipe: gest.lateralSwipe, gestural_pinch: gest.pinchZoom, voice_commands: voice }; cacheToLocal(p); applyAccessibilityFromCache(); dispatchSettingsUpdated(); if (a11yTouched.current) setA11ySaveStatus("saving"); try { await api.post(`api/settings/${user?.id || "guest"}`, p); if (a11yTouched.current) { setA11ySaveStatus("saved"); setTimeout(() => setA11ySaveStatus(null), 2000); } } catch { showAlert({ type: "error", title: "SAVE_FAILED", message: "Could not save accessibility settings.", code: "ERR_SAVE" }); if (a11yTouched.current) setA11ySaveStatus(null); } }, [user?.id, showAlert]);
  useEffect(() => { if (a11yLoading) return; if (a11yTimer.current) clearTimeout(a11yTimer.current); a11yTimer.current = setTimeout(() => saveA11y(density, fontScale, gestures, voiceCmd), 400); return () => { if (a11yTimer.current) clearTimeout(a11yTimer.current); }; }, [density, fontScale, gestures.lateralSwipe, gestures.pinchZoom, voiceCmd, a11yLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived ── */
  const interestList = getOnboardingInterestsList();
  const networkLoad = metrics ? parseInt(String(metrics.network_load), 10) || 0 : 0;
  const densityOptions = [
    { id: "compact",  label: t("accessibility.compact",  "Compact"),  desc: "More content, less spacing" },
    { id: "standard", label: t("accessibility.standard", "Standard"), desc: "Balanced — recommended" },
    { id: "expanded", label: t("accessibility.expanded", "Expanded"), desc: "More whitespace, easier reading" },
  ];

  /* ── Tab renderers ── */
  const renderProfile = () => (
    <div className="space-y-5">
      {user && (
        <div className="p-5 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
          <div className="flex items-center gap-4">
            <div className="shrink-0 flex items-center justify-center rounded-full font-display font-bold text-xl" style={{ width: 56, height: 56, background: "rgba(var(--color-primary-rgb,212,133,10),0.15)", color: "rgb(var(--color-primary))" }}>{user.email?.[0]?.toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-[16px] truncate" style={{ color: "rgb(var(--color-text-primary))" }}>{user.email}</p>
              <p className="font-body text-[12px] mt-0.5" style={{ color: "rgb(var(--color-text-secondary))" }}>ID: {user.id?.slice(0, 16)}…</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(var(--color-primary-rgb,212,133,10),0.12)", color: "rgb(var(--color-primary))" }}>Premium</span>
                <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(24,150,126,0.1)", color: "#18967E" }}>Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
        <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "rgb(var(--color-primary))" }} /><span className="font-body text-[12px] font-semibold" style={{ color: "rgb(var(--color-primary))" }}>Active</span></div>
        <p className="font-body text-[11px] mb-1" style={{ color: "rgb(var(--color-text-secondary))" }}>Current plan</p>
        <p className="font-display font-bold text-[22px] mb-4" style={{ color: "rgb(var(--color-text-primary))", letterSpacing: "-0.4px" }}>{t("account.premium_broadcast", "Premium Broadcast")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate("/subscription")} className="font-body text-[13px] font-semibold px-4 py-2 rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ border: "1px solid rgb(var(--color-border-subtle))", color: "rgb(var(--color-text-primary))", background: "transparent", minHeight: 40 }} data-testid="manage-plan-btn">{t("account.manage_plan", "Manage plan")}</button>
          <button type="button" className="font-body text-[13px] font-semibold px-4 py-2 rounded-[10px] transition-colors flex items-center gap-1.5 focus:outline-none" style={{ color: "rgb(var(--color-text-secondary))", background: "transparent", minHeight: 40 }}><FileText className="w-4 h-4" />{t("account.view_invoices", "Invoices")}</button>
        </div>
      </div>

      <SH>Your activity</SH>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { title: t("account.broadcast_hours", "Hours generated"), icon: <Timer className="w-4 h-4" />, value: metrics?.broadcast_hours ?? 0, sub: "hours" },
          { title: t("account.signals_processed", "Stories heard"), icon: <Waveform className="w-4 h-4" />, value: metrics?.stories_processed ?? 0, sub: `${metrics?.sources_online ?? 0} sources online` },
          { title: "Network load", icon: <MapPin className="w-4 h-4" />, value: metrics?.network_load ?? "0%", sub: `Signal: ${metrics?.signal_strength ?? "N/A"}` },
        ] as { title: string; icon: React.ReactNode; value: string | number; sub: string }[]).map(({ title, icon, value, sub }) => (
          <div key={title} className="p-4 rounded-[14px] flex flex-col gap-2" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
            <div className="flex items-center justify-between"><span className="font-body text-[11px] font-semibold" style={{ color: "rgb(var(--color-text-secondary))" }}>{title}</span><span style={{ color: "rgb(var(--color-text-secondary))" }}>{icon}</span></div>
            {profileLoading ? <Skeleton variant="text" className="w-20 h-8" /> : <span className="font-display font-bold text-[28px]" style={{ color: "rgb(var(--color-text-primary))", letterSpacing: "-0.5px" }}>{value}</span>}
            <span className="font-body text-[11px]" style={{ color: "rgb(var(--color-text-secondary))" }}>{sub}</span>
            <div className="w-full h-1 rounded-full" style={{ background: "rgb(var(--color-surface-raised))" }}><div className="h-full rounded-full" style={{ background: "rgb(var(--color-primary))", width: `${Math.min(100, (typeof value === "number" ? value : networkLoad) * 10)}%` }} /></div>
          </div>
        ))}
      </div>

      <SH>Alerts</SH>
      <div className="space-y-2">
        {profileLoading ? (Array.from({ length: 2 }).map((_, i) => (<div key={i} className="p-4 rounded-[12px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}><Skeleton variant="text" className="w-48 h-4 mb-2" /><Skeleton variant="text" className="w-64 h-3" /></div>))) :
          alerts.length === 0 ? (<div className="py-6 text-center"><p className="font-body text-[13px]" style={{ color: "rgb(var(--color-text-secondary))" }}>No active alerts</p></div>) :
          alerts.map(alert => (
            <div key={alert.id} className="p-4 rounded-[12px] relative overflow-hidden" style={{ background: alert.priority ? "rgba(var(--color-primary-rgb,212,133,10),0.06)" : "rgb(var(--color-surface))", border: `1px solid ${alert.priority ? "rgba(var(--color-primary-rgb,212,133,10),0.3)" : "rgb(var(--color-border-subtle))"}` }} data-testid={`alert-${alert.id}`}>
              {alert.priority && <div className="absolute top-0 left-0 w-1 h-full rounded-l-[12px]" style={{ background: "rgb(var(--color-primary))" }} />}
              <div className="pl-3"><p className="font-display font-bold text-[14px] mb-1" style={{ color: alert.priority ? "rgb(var(--color-primary))" : "rgb(var(--color-text-primary))" }}>{alert.title}</p><p className="font-body text-[12px] leading-relaxed" style={{ color: "rgb(var(--color-text-secondary))" }}>{alert.desc}</p>{alert.time && <p className="font-body text-[11px] mt-1.5 text-right" style={{ color: "rgb(var(--color-text-secondary))" }}>{alert.time.includes("T") ? new Date(alert.time).toLocaleString() : alert.time}</p>}</div>
            </div>
          ))}
      </div>

      {user && (
        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgb(var(--color-border-subtle))" }}>
          <div className="flex items-center gap-2"><Broadcast className="w-4 h-4" style={{ color: "rgb(var(--color-text-secondary))" }} /><span className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>{t("account.session_active", "Session active")}</span></div>
          <span className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>{metrics?.listeners_today ?? "0"} listeners today</span>
        </div>
      )}
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-2">
      <SH>Appearance</SH>
      <div className="p-4 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map(opt => { const active = theme === opt.id; return (
            <button key={opt.id} type="button" onClick={() => handleThemeSelect(opt.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ background: active ? "rgb(var(--color-primary))" : "rgb(var(--color-surface-raised))", color: active ? "white" : "rgb(var(--color-text-secondary))", border: `1px solid ${active ? "transparent" : "rgb(var(--color-border-subtle))"}`, minHeight: 44 }} data-testid={`settings-theme-${opt.id}`}>
              <opt.Icon weight="fill" className="w-4 h-4 shrink-0" /><span className="font-body text-[13px] font-semibold capitalize">{opt.label.toLowerCase()}</span>
            </button>
          ); })}
        </div>
      </div>

      <SH>Language</SH>
      <div className="p-4 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: "rgb(var(--color-surface-raised))" }}><Globe className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} /></div>
          <div><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>Interface language</p><p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>Controls menus and labels — not audio</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang: { code: string; label: string }) => (
            <button key={lang.code} type="button" onClick={() => handleLanguageChange(lang.code)} className="font-body text-[13px] font-semibold px-4 py-2 rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ background: i18n.language === lang.code ? "rgb(var(--color-primary))" : "rgb(var(--color-surface-raised))", color: i18n.language === lang.code ? "white" : "rgb(var(--color-text-secondary))", minHeight: 40 }} data-testid={`interface-lang-${lang.code}`}>{lang.label}</button>
          ))}
        </div>
      </div>

      <SH>Notifications</SH>
      <NotificationToggle />
      <DailyDigest />

      <SH><span className="flex items-center gap-2">What matters to you{interestsSaving && <CircleNotch className="w-3.5 h-3.5 animate-spin" style={{ color: "rgb(var(--color-primary))" }} />}</span></SH>
      <div className="p-4 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }} data-testid="interest-matrix-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: "rgb(var(--color-surface-raised))" }}><GridFour className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} /></div>
          <div><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>Topics</p><p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>Pick topics to personalise your feed</p></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {interestList.map(cat => { const active = interests.includes(cat.id); return (
            <button key={cat.id} type="button" onClick={() => toggleInterest(cat.id)} className="p-3 rounded-[10px] text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ background: active ? "rgb(var(--color-primary))" : "rgb(var(--color-surface-raised))", color: active ? "white" : "rgb(var(--color-text-secondary))", border: `1px solid ${active ? "transparent" : "rgb(var(--color-border-subtle))"}`, minHeight: 48 }} data-testid={`interest-${cat.id}`}>
              <span className="font-body text-[13px] font-semibold capitalize">{cat.name}</span>
            </button>
          ); })}
        </div>
        <p className="font-body text-[11px] mt-3" style={{ color: "rgb(var(--color-text-secondary))" }}>{interests.length > 0 ? `${interests.length} topic${interests.length > 1 ? "s" : ""} selected` : "No topics selected — all stories delivered"}</p>
      </div>

      <SH>App tour</SH>
      <div className="p-4 rounded-[16px] flex items-center justify-between gap-4" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
        <div className="flex items-center gap-3"><div className="shrink-0 flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: "rgb(var(--color-surface-raised))" }}><Compass weight="fill" className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} /></div><div><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>Replay app tour</p><p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>Walk through key features again</p></div></div>
        <button type="button" onClick={() => { resetTourGuide(); openTourGuide(); }} className="font-body text-[13px] font-semibold px-4 py-2 rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0" style={{ background: "rgb(var(--color-primary))", color: "white", minHeight: 40 }} data-testid="replay-tour-btn">Launch</button>
      </div>
    </div>
  );

  const renderSystem = () => {
    if (sysLoading) return <div className="flex items-center justify-center py-16 gap-3" style={{ color: "rgb(var(--color-text-secondary))" }}><CircleDashed className="w-5 h-5 animate-spin" style={{ color: "rgb(var(--color-primary))" }} /><span className="font-body text-sm">Loading…</span></div>;
    return (
      <div className="space-y-2">
        <SH>Display</SH>
        <ToggleRow icon={<Sun className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} />} label={t("system_settings.high_contrast", "High contrast")} desc={t("system_settings.high_contrast_desc", "Increase text and icon contrast")} checked={sysSettings.highContrast} onChange={() => updateSys("highContrast", !sysSettings.highContrast)} testId="toggle-high-contrast" />

        <SH>News sources</SH>
        <div className="space-y-2" data-testid="aggregator-preferences">
          {[{ key: "aggregatorMediastack" as const, label: "Mediastack", desc: "Global news API — African market focus" }, { key: "aggregatorNewsdata" as const, label: "NewsData.io", desc: "Nigerian news API — local source priority" }].map(agg => (
            <ToggleRow key={agg.key} icon={<Lightning weight={sysSettings[agg.key] ? "fill" : "regular"} className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} />} label={agg.label} desc={agg.desc} checked={sysSettings[agg.key]} onChange={() => updateSys(agg.key, !sysSettings[agg.key])} testId={`toggle-${agg.key}`} />
          ))}
        </div>

        <SH>Notifications</SH>
        <ToggleRow icon={<Pulse className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} />} label={t("system_settings.haptic_sync", "Haptic feedback")} desc={t("system_settings.haptic_sync_desc", "Vibrate on alerts and interactions")} checked={sysSettings.hapticSync} onChange={() => updateSys("hapticSync", !sysSettings.hapticSync)} testId="toggle-haptic" />

        <div className="p-4 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3"><div className="shrink-0 flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: "rgb(var(--color-surface-raised))" }}><Bell className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} /></div><div><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>{t("system_settings.alert_amplitude", "Alert volume")}</p><p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>{t("system_settings.alert_amplitude_desc", "In-app notification volume")}</p></div></div>
            <span className="font-display font-bold text-[16px]" style={{ color: "rgb(var(--color-primary))" }}>{sysSettings.alertVolume}%</span>
          </div>
          <input type="range" className="w-full h-1.5 appearance-none cursor-pointer rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" style={{ background: "rgb(var(--color-surface-raised))" }} min={0} max={100} value={sysSettings.alertVolume} onChange={(e) => updateSys("alertVolume", parseInt(e.target.value, 10))} data-testid="slider-alert-volume" />
        </div>

        <SoundThemesSection settings={sysSettings} updateSetting={updateSys} />
        <p className="font-body text-[12px] pt-2 text-center" style={{ color: "rgb(var(--color-text-secondary))" }}>Changes are saved automatically</p>
      </div>
    );
  };

  const renderAccessibility = () => {
    if (a11yLoading) return <div className="flex items-center justify-center py-16 gap-3" style={{ color: "rgb(var(--color-text-secondary))" }}><CircleNotch className="w-5 h-5 animate-spin" style={{ color: "rgb(var(--color-primary))" }} /><span className="font-body text-sm">Loading…</span></div>;
    return (
      <div className="space-y-2">
        {a11ySaveStatus && <div className="flex items-center gap-2 py-1.5 px-3 rounded-[8px]" style={{ background: "rgba(var(--color-primary-rgb,212,133,10),0.08)" }}>{a11ySaveStatus === "saving" ? <><CircleNotch className="w-3.5 h-3.5 animate-spin" style={{ color: "rgb(var(--color-primary))" }} /><span className="font-body text-[12px]" style={{ color: "rgb(var(--color-primary))" }}>Saving…</span></> : <span className="font-body text-[12px]" style={{ color: "rgb(var(--color-primary))" }}>✓ Saved</span>}</div>}

        <SH>Display density</SH>
        <div className="space-y-2">
          {densityOptions.map(option => (
            <label key={option.id} className="block cursor-pointer">
              <input type="radio" name="density" checked={density === option.id} onChange={() => { a11yTouched.current = true; setDensity(option.id); }} className="sr-only" />
              <div className="flex items-center justify-between p-4 rounded-[12px] transition-all" style={{ border: `1px solid ${density === option.id ? "rgb(var(--color-primary))" : "rgb(var(--color-border-subtle))"}`, background: density === option.id ? "rgba(var(--color-primary-rgb,212,133,10),0.06)" : "rgb(var(--color-surface))" }}>
                <div><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>{option.label}</p><p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>{option.desc}</p></div>
                <div className="w-4 h-4 rounded-full transition-all shrink-0" style={{ border: `2px solid ${density === option.id ? "rgb(var(--color-primary))" : "rgb(var(--color-border-subtle))"}`, background: density === option.id ? "rgb(var(--color-primary))" : "transparent" }} />
              </div>
            </label>
          ))}
        </div>

        <SH>Text size</SH>
        <div className="p-4 rounded-[16px]" style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border-subtle))" }}>
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className="shrink-0 flex items-center justify-center rounded-[10px]" style={{ width: 40, height: 40, background: "rgb(var(--color-surface-raised))" }}><TextT weight="bold" className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} /></div><p className="font-body text-[14px] font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>Font size</p></div><span className="font-display font-bold text-[18px]" style={{ color: "rgb(var(--color-primary))" }}>{fontScale}%</span></div>
          <input type="range" className="w-full h-1.5 appearance-none cursor-pointer rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" style={{ background: "rgb(var(--color-surface-raised))" }} min={75} max={150} value={fontScale} onChange={(e) => { a11yTouched.current = true; setFontScale(parseInt(e.target.value, 10)); }} data-testid="font-scale-slider" />
          <div className="flex justify-between mt-2 font-body text-[11px]" style={{ color: "rgb(var(--color-text-secondary))" }}><span>Smaller</span><span>Normal</span><span>Larger</span></div>
          <div className="mt-4 p-3 rounded-[10px]" style={{ background: "rgb(var(--color-surface-raised))" }}>
            <p className="font-body text-[11px] mb-1 font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--color-text-secondary))" }}>Preview</p>
            <p className="font-display font-bold leading-tight" style={{ fontSize: `${Math.round(18 * fontScale / 100)}px`, color: "rgb(var(--color-text-primary))" }}>Breaking: Senate passes economic reform bill</p>
            <p className="font-body leading-relaxed mt-1" style={{ fontSize: `${Math.round(12 * fontScale / 100)}px`, color: "rgb(var(--color-text-secondary))" }}>Legislators voted on a landmark reform package…</p>
          </div>
        </div>

        <SH>Gestures</SH>
        <ToggleRow icon={<HandPointing weight="bold" className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} />} label={t("accessibility.lateral_swipe", "Swipe to refresh")} desc="Pull down to reload the feed" checked={gestures.lateralSwipe} onChange={() => { a11yTouched.current = true; setGestures(p => ({ ...p, lateralSwipe: !p.lateralSwipe })); }} testId="gesture-swipe" />
        <ToggleRow icon={<HandPointing weight="bold" className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} />} label={t("accessibility.pinch_zoom", "Pinch to zoom")} desc="Two-finger zoom on content" checked={gestures.pinchZoom} onChange={() => { a11yTouched.current = true; setGestures(p => ({ ...p, pinchZoom: !p.pinchZoom })); }} testId="gesture-pinch" />

        <SH>Voice</SH>
        <ToggleRow icon={<Microphone weight="fill" className="w-5 h-5" style={{ color: "rgb(var(--color-primary))" }} />} label={t("accessibility.voice_commands", "Voice commands")} desc={"Say \"Narvo, open newsfeed\" or \"Narvo, play briefing\"" } checked={voiceCmd} onChange={() => { a11yTouched.current = true; setVoiceCmd(v => !v); }} testId="voice-commands-toggle" />

        <div className="flex gap-2 p-3 rounded-[10px] mt-2" style={{ background: "rgba(var(--color-primary-rgb,212,133,10),0.06)", border: "1px solid rgba(var(--color-primary-rgb,212,133,10),0.2)" }}>
          <Info weight="fill" className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "rgb(var(--color-primary))" }} />
          <p className="font-body text-[12px]" style={{ color: "rgb(var(--color-text-secondary))" }}>All accessibility settings are saved automatically and applied instantly.</p>
        </div>
      </div>
    );
  };

  /* ── Render ── */
  const tabContent: Record<TabId, () => React.ReactNode> = { profile: renderProfile, preferences: renderPreferences, system: renderSystem, accessibility: renderAccessibility };

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: "rgb(var(--color-bg))" }} data-testid="settings-page">
      <Helmet><title>Settings — Narvo</title></Helmet>

      <div className="shrink-0 px-4 md:px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgb(var(--color-border-subtle))" }}>
        <h1 className="font-display font-bold mb-4" style={{ fontSize: 22, letterSpacing: "-0.4px", color: "rgb(var(--color-text-primary))" }}>Settings</h1>
        <div className="flex items-center gap-1 p-1 rounded-[14px] w-fit overflow-x-auto" style={{ background: "rgb(var(--color-surface))" }} role="tablist">
          {TABS.map(({ id, label, Icon }) => { const active = activeTab === id; return (
            <button key={id} type="button" role="tab" aria-selected={active} onClick={() => setTab(id)} className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap" style={{ background: active ? "rgb(var(--color-bg))" : "transparent", color: active ? "rgb(var(--color-text-primary))" : "rgb(var(--color-text-secondary))", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", minHeight: 36 }} data-testid={`settings-tab-${id}`}>
              <Icon weight={active ? "fill" : "regular"} className="w-4 h-4 shrink-0 hidden sm:block" aria-hidden /><span className="font-body text-[13px] font-semibold">{label}</span>
            </button>
          ); })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-4 md:px-6 py-5 pb-safe">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={spring}>
              {tabContent[activeTab]()}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgb(var(--color-border-subtle))" }}>
            <p className="font-body text-[12px] text-center mb-4" style={{ color: "rgb(var(--color-text-secondary))" }}>{t("settings.version", "Narvo · v3")}</p>
            <motion.button type="button" onClick={handleLogout} className="w-full flex items-center justify-center gap-3 font-body text-[14px] font-semibold py-4 rounded-[12px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400" style={{ border: "1px solid rgb(var(--color-border-subtle))", color: "rgb(var(--color-text-secondary))", background: "transparent" }} whileHover={{ borderColor: "rgb(239,68,68)", color: "rgb(239,68,68)" }} whileTap={{ scale: 0.98 }} transition={spring} data-testid="logout-btn">
              <SignOut weight="bold" className="w-5 h-5" aria-hidden />{t("settings.logout", "Sign out")}
            </motion.button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
