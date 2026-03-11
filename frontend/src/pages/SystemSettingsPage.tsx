import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun } from '@phosphor-icons/react/Sun';
import { Bell } from '@phosphor-icons/react/Bell';
import { Pulse } from '@phosphor-icons/react/Pulse';
import { Lightning } from '@phosphor-icons/react/Lightning';
import { MusicNotes } from '@phosphor-icons/react/MusicNotes';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { CircleDashed } from '@phosphor-icons/react/CircleDashed';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { useAuth } from '../contexts/AuthContext';
import { useHapticAlert } from '../components/HapticAlerts';
import BackToSettings from '../components/BackToSettings';
import * as api from '../lib/api';

const LS_KEY = 'narvo_settings_cache';

interface CachedSettings {
  high_contrast?: boolean;
  haptic_sync?: boolean;
  alert_volume?: number;
  data_limit?: number;
  bandwidth_priority?: string;
  aggregator_mediastack?: boolean;
  aggregator_newsdata?: boolean;
  sound_theme?: string;
}

interface SystemSettingsState {
  highContrast: boolean;
  hapticSync: boolean;
  alertVolume: number;
  dataLimit: number;
  bandwidthPriority: string;
  aggregatorMediastack: boolean;
  aggregatorNewsdata: boolean;
  soundTheme: string;
}

const cacheToLocal = (payload: CachedSettings) => {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || '{}') as CachedSettings;
    localStorage.setItem(LS_KEY, JSON.stringify({ ...existing, ...payload }));
  } catch { /* ignore */ }
};

const readLocal = (): CachedSettings | null => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') as CachedSettings; } catch { return null; }
};

const DEFAULT_SETTINGS: SystemSettingsState = {
  highContrast: true,
  hapticSync: false,
  alertVolume: 65,
  dataLimit: 2400,
  bandwidthPriority: 'STREAMING',
  aggregatorMediastack: true,
  aggregatorNewsdata: true,
  soundTheme: 'narvo_classic',
};

interface SoundThemeItem {
  id: string;
  name: string;
  description?: string;
  intro?: {
    type?: string;
    tempo?: number;
    notes?: string[];
    envelope?: Record<string, number>;
  };
}

interface SoundThemesSectionProps {
  settings: SystemSettingsState;
  updateSetting: (key: keyof SystemSettingsState, value: boolean | number | string) => void;
}

const SoundThemesSection = ({ settings, updateSetting }: SoundThemesSectionProps) => {
  const [themes, setThemes] = useState<SoundThemeItem[]>([]);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  useEffect(() => {
    api.get('api/sound-themes')
      .then(r => r.json())
      .then((data: SoundThemeItem[]) => setThemes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const playThemePreview = async (e: React.MouseEvent, themeId: string) => {
    e.stopPropagation();
    if (previewPlaying === themeId) {
      setPreviewPlaying(null);
      return;
    }
    setPreviewPlaying(themeId);
    try {
      const toneMod = await import('tone') as { default?: unknown; start?: () => Promise<void>; now?: () => number; Reverb?: unknown; Gain?: unknown; MembraneSynth?: unknown; AMSynth?: unknown; Synth?: unknown; FMSynth?: unknown };
      const Tone = (toneMod.default ?? toneMod) as {
        start: () => Promise<void>;
        now: () => number;
        Reverb: new (opts: { decay: number; wet: number }) => { toDestination: () => unknown };
        Gain: new (val: number) => { connect: (dest: unknown) => unknown };
        MembraneSynth: new (opts: unknown) => { connect: (dest: unknown) => unknown; triggerAttackRelease: (note: string, dur: number, time: number) => void; dispose: () => void };
        AMSynth: new (opts: unknown) => { connect: (dest: unknown) => unknown; triggerAttackRelease: (note: string, dur: number, time: number) => void; dispose: () => void };
        Synth: new (opts: unknown) => { connect: (dest: unknown) => unknown; triggerAttackRelease: (note: string, dur: number, time: number) => void; dispose: () => void };
        FMSynth: new (opts: unknown) => { connect: (dest: unknown) => unknown; triggerAttackRelease: (note: string, dur: number, time: number) => void; dispose: () => void };
      };
      await Tone.start();
      const res = await api.get(`api/sound-themes/${themeId}`);
      const themeData = (await res.json()) as SoundThemeItem;
      const intro = themeData.intro;
      if (!intro?.notes?.length) { setPreviewPlaying(null); return; }

      const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
      const gain = new Tone.Gain(0.5).connect(reverb);
      const synthType = intro.type === 'membrane' ? Tone.MembraneSynth
        : intro.type === 'am' ? Tone.AMSynth
        : intro.type === 'square' || intro.type === 'triangle'
          ? Tone.Synth : Tone.FMSynth;
      const synth = new synthType({
        envelope: intro.envelope || { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
        volume: -10,
      }).connect(gain) as { triggerAttackRelease: (note: string, dur: number, time: number) => void; dispose: () => void };

      const now = Tone.now();
      const noteDur = 60 / (intro.tempo || 120);
      (intro.notes as string[]).forEach((note: string, i: number) => {
        synth.triggerAttackRelease(note, noteDur * 0.8, now + i * noteDur);
      });
      const totalDur = intro.notes.length * noteDur;
      setTimeout(() => {
        synth.dispose();
        (gain as { dispose: () => void }).dispose();
        (reverb as { dispose: () => void }).dispose();
        setPreviewPlaying(null);
      }, totalDur * 1000 + 500);
    } catch (err) {
      console.error('[SoundTheme Preview]', err);
      setPreviewPlaying(null);
    }
  };

  if (!themes.length) return null;

  return (
    <section className="space-y-6 md:space-y-8" data-testid="sound-themes-section">
      <div className="flex items-end justify-between narvo-border-b border-forest/30 pb-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-content uppercase tracking-tight">
          BROADCAST_THEMES
        </h2>
        <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold tracking-[0.2em] hidden sm:block">
          AUDIO_BRANDING_ENGINE
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {themes.map(theme => {
          const isActive = (settings.soundTheme || 'narvo_classic') === theme.id;
          const isPreviewing = previewPlaying === theme.id;
          return (
            <div
              key={theme.id}
              role="button"
              tabIndex={0}
              onClick={() => updateSetting('soundTheme', theme.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateSetting('soundTheme', theme.id); } }}
              aria-label={`Select sound theme ${theme.name}`}
              className={`narvo-border p-4 md:p-5 text-left transition-all relative cursor-pointer ${
                isActive ? 'bg-primary text-background-dark border-primary' : 'hover:bg-surface/10 hover:border-forest'
              }`}
              data-testid={`theme-${theme.id}`}
            >
              {isActive && (
                <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 bg-background-dark text-primary mono-ui">
                  ACTIVE
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MusicNotes className="w-4 h-4" weight="bold" />
                  <span className="mono-ui text-[13px] md:text-[12px] font-bold">{theme.name.toUpperCase()}</span>
                </div>
                <button
                  onClick={(e) => playThemePreview(e, theme.id)}
                  className={`w-7 h-7 flex items-center justify-center narvo-border transition-all shrink-0 ${
                    isPreviewing
                      ? (isActive ? 'bg-background-dark text-primary' : 'bg-primary text-background-dark border-primary')
                      : (isActive ? 'bg-background-dark/20 text-background-dark hover:bg-background-dark/40' : 'bg-surface/20 text-forest hover:bg-primary hover:text-background-dark hover:border-primary')
                  }`}
                  data-testid={`preview-theme-${theme.id}`}
                >
                  {isPreviewing ? (
                    <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <SpeakerHigh weight="bold" className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className={`mono-ui text-[10px] md:text-[11px] leading-relaxed ${isActive ? 'text-background-dark/70' : 'text-forest'}`}>
                {theme.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const SystemGearSixPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  useHapticAlert();
  const [settings, setGearSix] = useState<SystemSettingsState>(() => {
    const cached = readLocal();
    if (cached) {
      return {
        highContrast: cached.high_contrast ?? DEFAULT_SETTINGS.highContrast,
        hapticSync: cached.haptic_sync ?? DEFAULT_SETTINGS.hapticSync,
        alertVolume: cached.alert_volume ?? DEFAULT_SETTINGS.alertVolume,
        dataLimit: Math.round((cached.data_limit ?? 2.4) * 1000),
        bandwidthPriority: (cached.bandwidth_priority || 'streaming').toUpperCase(),
        aggregatorMediastack: cached.aggregator_mediastack ?? DEFAULT_SETTINGS.aggregatorMediastack,
        aggregatorNewsdata: cached.aggregator_newsdata ?? DEFAULT_SETTINGS.aggregatorNewsdata,
        soundTheme: cached.sound_theme || 'narvo_classic',
      };
    }
    return DEFAULT_SETTINGS;
  });
  const [, setHasChanges] = useState(false);
  const [, setSaving] = useState(false);
  const [loadingGearSix, setLoadingGearSix] = useState(true);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchGearSix = async () => {
      const userId = user?.id || 'guest';
      try {
        const res = await api.get(`api/settings/${userId}`);
        if (res.ok) {
          const data = await res.json() as CachedSettings;
          setGearSix({
            highContrast: data.high_contrast ?? DEFAULT_SETTINGS.highContrast,
            hapticSync: data.haptic_sync ?? DEFAULT_SETTINGS.hapticSync,
            alertVolume: data.alert_volume ?? DEFAULT_SETTINGS.alertVolume,
            dataLimit: Math.round((data.data_limit ?? 2.4) * 1000),
            bandwidthPriority: (data.bandwidth_priority || 'streaming').toUpperCase(),
            aggregatorMediastack: data.aggregator_mediastack ?? DEFAULT_SETTINGS.aggregatorMediastack,
            aggregatorNewsdata: data.aggregator_newsdata ?? DEFAULT_SETTINGS.aggregatorNewsdata,
            soundTheme: data.sound_theme || 'narvo_classic',
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
      setLoadingGearSix(false);
    };
    fetchGearSix();
  }, [user?.id]);

  const saveSettings = useCallback(async (settingsToSave: SystemSettingsState) => {
    const userId = user?.id || 'guest';
    const payload = {
      high_contrast: settingsToSave.highContrast,
      haptic_sync: settingsToSave.hapticSync,
      alert_volume: settingsToSave.alertVolume,
      data_limit: settingsToSave.dataLimit / 1000,
      bandwidth_priority: settingsToSave.bandwidthPriority.toLowerCase(),
      aggregator_mediastack: settingsToSave.aggregatorMediastack,
      aggregator_newsdata: settingsToSave.aggregatorNewsdata,
      sound_theme: settingsToSave.soundTheme || 'narvo_classic',
    };
    cacheToLocal(payload);
    try {
      const res = await api.post(`api/settings/${userId}`, payload);
      if (res.ok) return true;
    } catch (err) {
      console.error('[Settings] Auto-save failed:', err);
    }
    return false;
  }, [user?.id]);

  const updateSetting = (key: keyof SystemSettingsState, value: boolean | number | string) => {
    const newSettings = { ...settings, [key]: value };
    setGearSix(newSettings);
    setHasChanges(true);

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      const success = await saveSettings(newSettings);
      if (success) {
        setHasChanges(false);
      }
      setSaving(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (loadingGearSix) {
    return (
      <main className="flex-1 overflow-y-auto custom-scroll flex items-center justify-center bg-background-dark" data-testid="system-settings-page">
        <div className="flex items-center gap-3 mono-ui text-xs text-forest">
          <CircleDashed className="w-5 h-5 animate-spin text-primary" />
          {t('system_settings.loading')}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll flex flex-col bg-background-dark min-h-0" data-testid="system-settings-page">
      <div className="w-full max-w-4xl mx-auto p-4 md:p-10 space-y-10 md:space-y-12 pb-32 md:pb-10">
        <div className="flex items-center justify-between narvo-border-b border-forest/30 pb-4">
          <BackToSettings />
        </div>
        <section className="space-y-6 md:space-y-8">
          <div className="flex items-end justify-between narvo-border-b border-forest/30 pb-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-content uppercase tracking-tight">
              {t('system_settings.display_entity')}
            </h2>
            <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold tracking-[0.2em] hidden sm:block">
              VISUAL_OUTPUT_LAYER
            </span>
          </div>

          <div className="narvo-border divide-y divide-forest/30">
            <div className="p-4 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-surface/5 transition-colors group">
              <div className="flex items-center gap-3 md:gap-6">
                <div className="w-8 h-8 md:w-12 md:h-12 narvo-border flex items-center justify-center text-primary shrink-0">
                  <Sun className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="mono-ui text-[12px] md:text-[12px] text-content font-bold">{t('system_settings.high_contrast')}</h3>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest font-bold break-words">{t('system_settings.high_contrast_desc')}</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('highContrast', !settings.highContrast)}
                className={`w-12 h-6 md:w-14 md:h-7 narvo-border transition-all relative shrink-0 self-end sm:self-auto ${
                  settings.highContrast ? 'bg-primary' : 'bg-surface/30'
                }`}
                data-testid="toggle-high-contrast"
              >
                <div className={`absolute top-0.5 w-5 h-5 md:w-6 md:h-6 bg-white transition-all ${
                  settings.highContrast ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-6 md:space-y-8" data-testid="aggregator-preferences">
          <div className="flex items-end justify-between narvo-border-b border-forest/30 pb-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-content uppercase tracking-tight">
              NEWS_AGGREGATORS
            </h2>
            <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold tracking-[0.2em] hidden sm:block">
              PROGRAMMATIC_FEED_SOURCES
            </span>
          </div>

          <div className="narvo-border divide-y divide-forest/30">
            {([
              { key: 'aggregatorMediastack' as const, label: 'MEDIASTACK', desc: 'GLOBAL_NEWS_API — AFRICAN_MARKET_FOCUS', badge: 'LIVE' },
              { key: 'aggregatorNewsdata' as const, label: 'NEWSDATA.IO', desc: 'NIGERIAN_NEWS_API — LOCAL_SOURCE_PRIORITY', badge: 'LIVE' },
            ]).map(agg => (
              <div key={agg.key} className="p-4 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-surface/5 transition-colors">
                <div className="flex items-center gap-3 md:gap-6">
                  <div className="w-8 h-8 md:w-12 md:h-12 narvo-border flex items-center justify-center text-primary shrink-0">
                    <Lightning weight={settings[agg.key] ? 'fill' : 'regular'} className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="mono-ui text-[12px] md:text-[12px] text-content font-bold">{agg.label}</h3>
                      <span className={`mono-ui text-[9px] font-bold px-1.5 py-0.5 ${
                        settings[agg.key] ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface/20 text-forest/50 border border-forest/20'
                      }`}>{settings[agg.key] ? agg.badge : 'OFF'}</span>
                    </div>
                    <p className="mono-ui text-[10px] md:text-[11px] text-forest font-bold break-words">{agg.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting(agg.key, !settings[agg.key])}
                  className={`w-12 h-6 narvo-border relative transition-all shrink-0 self-end sm:self-auto ${
                    settings[agg.key] ? 'bg-primary' : 'bg-surface/20'
                  }`}
                  data-testid={`toggle-${agg.key}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-background-dark transition-all ${
                    settings[agg.key] ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <SoundThemesSection settings={settings} updateSetting={updateSetting} />

        <section className="space-y-6 md:space-y-8">
          <div className="flex items-end justify-between narvo-border-b border-forest/30 pb-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-content uppercase tracking-tight">
              {t('system_settings.notification_syntax')}
            </h2>
            <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold tracking-[0.2em] hidden sm:block">
              ALERT_SYSTEM_MANAGEMENT
            </span>
          </div>

          <div className="narvo-border divide-y divide-forest/30">
            <div className="p-4 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-surface/5 transition-colors group">
              <div className="flex items-center gap-3 md:gap-6">
                <div className="w-8 h-8 md:w-12 md:h-12 narvo-border flex items-center justify-center text-primary shrink-0">
                  <Pulse className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="mono-ui text-[12px] md:text-[12px] text-content font-bold">{t('system_settings.haptic_sync')}</h3>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest font-bold break-words">{t('system_settings.haptic_sync_desc')}</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('hapticSync', !settings.hapticSync)}
                className={`w-12 h-6 md:w-14 md:h-7 narvo-border transition-all relative shrink-0 self-end sm:self-auto ${
                  settings.hapticSync ? 'bg-primary' : 'bg-surface/30'
                }`}
                data-testid="toggle-haptic"
              >
                <div className={`absolute top-0.5 w-5 h-5 md:w-6 md:h-6 bg-white transition-all ${
                  settings.hapticSync ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            <div className="p-4 md:p-8 flex flex-col gap-4 md:gap-6 hover:bg-surface/5 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 narvo-border flex items-center justify-center text-primary">
                    <Bell className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="mono-ui text-[13px] md:text-[12px] text-content font-bold">{t('system_settings.alert_amplitude')}</h3>
                    <p className="mono-ui text-[10px] md:text-[11px] text-forest font-bold">{t('system_settings.alert_amplitude_desc')}</p>
                  </div>
                </div>
                <span className="mono-ui text-[12px] md:text-[13px] text-primary font-bold border border-primary px-2 py-1">
                  {settings.alertVolume}%
                </span>
              </div>
              <div className="pl-0 md:pl-[72px]">
                <input
                  type="range"
                  className="w-full h-1 bg-forest/30 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary"
                  min={0}
                  max={100}
                  value={settings.alertVolume}
                  onChange={(e) => updateSetting('alertVolume', parseInt(e.target.value, 10))}
                  data-testid="slider-alert-volume"
                />
              </div>
            </div>
          </div>
        </section>

        <p className="mono-ui text-[10px] text-forest/60 pt-4">CHANGES_AUTO_SAVED</p>
      </div>
    </main>
  );
};

export default SystemGearSixPage;
