import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Rows } from '@phosphor-icons/react/Rows';
import { TextT } from '@phosphor-icons/react/TextT';
import { HandPointing } from '@phosphor-icons/react/HandPointing';
import { Cursor } from '@phosphor-icons/react/Cursor';
import { Microphone } from '@phosphor-icons/react/Microphone';
import { Info } from '@phosphor-icons/react/Info';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { useAuth } from '../contexts/AuthContext';
import { useHapticAlert } from '../components/HapticAlerts';
import { ResponsiveTabView } from '../components/ResponsiveTabView';
import type { TabItem } from '../components/ResponsiveTabView';
import BackToSettings from '../components/BackToSettings';
import { applyAccessibilityFromCache, dispatchSettingsUpdated } from '../lib/accessibilityApply';
import * as api from '../lib/api';
import logger from '../lib/logger';
import { mergeJson, readJson } from '../lib/storage';
import { asRecord } from '../lib/validators';

const LS_KEY = 'narvo_settings_cache';

interface CachedAccessibility {
  display_density?: string;
  font_scale?: number;
  gestural_swipe?: boolean;
  gestural_pinch?: boolean;
  voice_commands?: boolean;
}

const cacheToLocal = (payload: CachedAccessibility) => {
  mergeJson<CachedAccessibility>(LS_KEY, payload, {});
};

const readLocal = (): CachedAccessibility | null => {
  try {
    return readJson<CachedAccessibility | null>(LS_KEY, null);
  } catch (err) {
    logger.debug('[AccessibilityPage] Failed to read local cache', err);
    return null;
  }
};

const DEFAULT_SETTINGS = {
  displayDensity: 'standard',
  fontScale: 100,
  lateralSwipe: true,
  pinchZoom: false,
  voiceCommands: false,
};

const AccessibilityPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showAlert } = useHapticAlert();
  const cached = readLocal();
  const [displayDensity, setDisplayDensity] = useState(cached?.display_density || 'standard');
  const [fontScale, setFontScale] = useState(cached?.font_scale ?? 100);
  const [gestures, setGestures] = useState({
    lateralSwipe: cached?.gestural_swipe ?? true,
    pinchZoom: cached?.gestural_pinch ?? false,
  });
  const [voiceCommands, setVoiceCommands] = useState(cached?.voice_commands ?? false);
  const [voiceCommandsList] = useState<{ id: number; command: string; active: boolean }[]>([
    { id: 1, command: '"NARVO, OPEN NEWSFEED"', active: true },
    { id: 2, command: '"NARVO, BRIGHTNESS UP"', active: true },
  ]);
  const [, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | null>(null);
  const [loading, setLoading] = useState(true);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserTouchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      const userId = user?.id || 'guest';
      try {
        const res = await api.get(`api/settings/${userId}`);
        if (res.ok) {
          const data = asRecord<CachedAccessibility & Record<string, unknown>>(await res.json(), {});
          const payload: CachedAccessibility = {
            display_density: (data.display_density as string) || DEFAULT_SETTINGS.displayDensity,
            font_scale: (data.font_scale as number) ?? DEFAULT_SETTINGS.fontScale,
            gestural_swipe: (data.gestural_swipe as boolean) ?? DEFAULT_SETTINGS.lateralSwipe,
            gestural_pinch: (data.gestural_pinch as boolean) ?? DEFAULT_SETTINGS.pinchZoom,
            voice_commands: (data.voice_commands as boolean) ?? DEFAULT_SETTINGS.voiceCommands,
          };
          if (!cancelled) {
            setDisplayDensity(payload.display_density ?? 'standard');
            setFontScale(payload.font_scale ?? 100);
            setGestures({ lateralSwipe: payload.gestural_swipe ?? true, pinchZoom: payload.gestural_pinch ?? false });
            setVoiceCommands(payload.voice_commands ?? false);
            cacheToLocal(payload);
            applyAccessibilityFromCache();
          }
        }
      } catch (err) {
        console.error('Failed to load accessibility settings:', err);
      }
      if (!cancelled) setLoading(false);
    };
    fetchSettings();
    return () => { cancelled = true; };
  }, [user?.id]);

  const saveToBackendAndApply = async () => {
    const userId = user?.id || 'guest';
    const payload: CachedAccessibility = {
      display_density: displayDensity,
      font_scale: fontScale,
      gestural_swipe: gestures.lateralSwipe,
      gestural_pinch: gestures.pinchZoom,
      voice_commands: voiceCommands,
    };
    cacheToLocal(payload);
    applyAccessibilityFromCache();
    dispatchSettingsUpdated();
    setSaving(true);
    if (hasUserTouchedRef.current) {
      setSaveStatus('saving');
    }
    try {
      const res = await api.post(`api/settings/${userId}`, payload);
      if (res.ok) {
        if (hasUserTouchedRef.current) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
        }
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'SAVE_FAILED', message: 'Could not save accessibility settings.', code: 'ERR_SAVE' });
      if (hasUserTouchedRef.current) setSaveStatus(null);
    }
    setSaving(false);
  };

  useEffect(() => {
    if (loading) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(saveToBackendAndApply, 400);
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
    // saveToBackendAndApply omitted on purpose: adding it would re-run every render and reset debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayDensity, fontScale, gestures.lateralSwipe, gestures.pinchZoom, voiceCommands, loading]);

  const handleDensityChange = (id: string) => { hasUserTouchedRef.current = true; setDisplayDensity(id); };
  const handleFontScaleChange = (val: number) => { hasUserTouchedRef.current = true; setFontScale(val); };
  const toggleGesture = (key: 'lateralSwipe' | 'pinchZoom') => { hasUserTouchedRef.current = true; setGestures(prev => ({ ...prev, [key]: !prev[key] })); };
  const toggleVoiceCommands = () => { hasUserTouchedRef.current = true; setVoiceCommands(v => !v); };

  const densityOptions: { id: string; label: string; desc: string; bars: number }[] = [
    { id: 'compact', label: t('accessibility.compact'), desc: 'MAX_DENSITY_MODE // MIN_PADDING', bars: 4 },
    { id: 'standard', label: t('accessibility.standard'), desc: 'BALANCED_FLOW // OPTIMAL_READ', bars: 2 },
    { id: 'expanded', label: t('accessibility.expanded'), desc: 'MAX_WHITESPACE // FOCUS_DOCK', bars: 1 },
  ];

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[rgb(var(--color-bg))]" data-testid="accessibility-page">
        <div className="flex items-center gap-3 font-mono text-xs text-[rgb(var(--color-text-secondary))]">
          <CircleNotch weight="bold" className="w-5 h-5 animate-spin text-[rgb(var(--color-primary))]" />
          {t('common.loading')}
        </div>
      </main>
    );
  }

  const tabs: TabItem[] = [
    {
      id: 'density',
      label: t('accessibility.display_density'),
      icon: <Rows weight="bold" className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <p className="font-mono text-[12px] text-[rgb(var(--color-text-secondary))] leading-relaxed font-bold">
            ADJUST THE INFORMATION DENSITY OF THE BROADCAST GRID.
          </p>
          <div className="space-y-3">
            {densityOptions.map(option => (
              <label key={option.id} className="block cursor-pointer group" aria-label={option.label}>
                <input
                  type="radio"
                  name="density"
                  checked={displayDensity === option.id}
                  onChange={() => handleDensityChange(option.id)}
                  className="peer sr-only"
                />
                <div className={`p-4 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10 transition-all relative ${
                  displayDensity === option.id ? 'bg-[rgb(var(--color-primary))]/5 border-[rgb(var(--color-primary))]' : 'hover:border-[rgb(var(--color-text-secondary))]'
                }`}>
                  <div className={`absolute right-4 top-4 w-4 h-4 border border-[rgb(var(--color-border))] transition-all ${
                    displayDensity === option.id ? 'bg-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]' : ''
                  }`} />
                  <h4 className="font-display text-lg font-bold text-[rgb(var(--color-text-primary))] uppercase mb-2">{option.label}</h4>
                  <p className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))] font-bold">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'font',
      label: t('accessibility.font_scaling'),
      icon: <TextT weight="bold" className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="font-mono text-[12px] text-[rgb(var(--color-text-secondary))] font-bold">SCALE_FACTOR</span>
              <span className="font-display text-2xl font-bold text-[rgb(var(--color-primary))] leading-none">{fontScale}%</span>
            </div>
            <div className="relative py-3">
              <input
                type="range"
                className="w-full h-1 bg-[rgb(var(--color-surface))] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[rgb(var(--color-primary))]"
                min={75}
                max={150}
                value={fontScale}
                onChange={(e) => handleFontScaleChange(parseInt(e.target.value, 10))}
                data-testid="font-scale-slider"
              />
              <div className="flex justify-between mt-3 font-mono text-[11px] text-[rgb(var(--color-text-secondary))] font-bold">
                <span>75%</span>
                <span>100%</span>
                <span>150%</span>
              </div>
            </div>
          </div>

          <div className="border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/5 p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-[rgb(var(--color-border))] px-2 py-1 font-mono text-[10px] text-[rgb(var(--color-text-primary))] font-bold">
              OUTPUT_PREVIEW
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <span className="font-mono text-[11px] text-[rgb(var(--color-primary))] font-bold border-l-2 border-[rgb(var(--color-primary))] pl-2 uppercase">
                  HEADLINE // SPACE GROTESK
                </span>
                <h4
                  className="font-display font-bold text-[rgb(var(--color-text-primary))] uppercase leading-tight"
                  style={{ fontSize: `${Math.round(24 * fontScale / 100)}px` }}
                >
                  BREAKING: GLOBAL_MARKET_NODE_4 SHIFT REPORTED.
                </h4>
              </div>
              <div className="space-y-2">
                <span className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))] font-bold border-l-2 border-[rgb(var(--color-text-secondary))] pl-2 uppercase">
                  BODY // JETBRAINS MONO
                </span>
                <p
                  className="font-mono text-[rgb(var(--color-text-secondary))] leading-relaxed"
                  style={{ fontSize: `${Math.round(11 * fontScale / 100)}px` }}
                >
                  SYSTEM ANALYSIS DETECTS 14% FLUCTUATION.
                </p>
              </div>
            </div>
          </div>

          <div className="border border-[rgb(var(--color-border))] p-3 bg-[rgb(var(--color-primary))]/5 flex gap-3">
            <Info weight="fill" className="w-4 h-4 text-[rgb(var(--color-primary))] shrink-0" />
            <p className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))] leading-relaxed font-bold">
              FONT SCALING AFFECTS ALL TERMINAL READOUTS.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'interaction',
      label: t('accessibility.ui_interaction'),
      icon: <Cursor weight="bold" className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-mono text-[12px] text-[rgb(var(--color-text-secondary))] font-bold border-b border-[rgb(var(--color-border))] pb-2">
              {t('accessibility.gestural_control')}
            </h4>

            <div className="space-y-2">
              <div className="p-3 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/5 flex items-center justify-between group hover:border-[rgb(var(--color-primary))] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[rgb(var(--color-border))] flex items-center justify-center text-[rgb(var(--color-text-primary))] group-hover:text-[rgb(var(--color-primary))] transition-colors">
                    <HandPointing weight="bold" className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-mono text-[12px] text-[rgb(var(--color-text-primary))] font-bold">{t('accessibility.lateral_swipe')}</h5>
                    <p className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))]">NAV_DATA_STREAMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={gestures.lateralSwipe}
                  onChange={() => toggleGesture('lateralSwipe')}
                  className="w-4 h-4 bg-transparent border border-[rgb(var(--color-border))] checked:bg-[rgb(var(--color-primary))] cursor-pointer"
                  data-testid="gesture-swipe"
                />
              </div>

              <div className="p-3 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/5 flex items-center justify-between group hover:border-[rgb(var(--color-primary))] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[rgb(var(--color-border))] flex items-center justify-center text-[rgb(var(--color-text-primary))] group-hover:text-[rgb(var(--color-primary))] transition-colors">
                    <HandPointing weight="bold" className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-mono text-[12px] text-[rgb(var(--color-text-primary))] font-bold">{t('accessibility.pinch_zoom')}</h5>
                    <p className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))]">EXPAND_MAP_DOCK</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={gestures.pinchZoom}
                  onChange={() => toggleGesture('pinchZoom')}
                  className="w-4 h-4 bg-transparent border border-[rgb(var(--color-border))] checked:bg-[rgb(var(--color-primary))] cursor-pointer"
                  data-testid="gesture-pinch"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/5 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Microphone weight="fill" className="w-5 h-5 text-[rgb(var(--color-text-primary))]" />
                <div>
                  <h4 className="font-mono text-[12px] text-[rgb(var(--color-text-primary))] font-bold">{t('accessibility.voice_commands')}</h4>
                  <p className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))]">GATE_FOR_FUTURE_IMPLEMENTATION</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={voiceCommands}
                onChange={toggleVoiceCommands}
                className="w-4 h-4 bg-transparent border border-[rgb(var(--color-border))] checked:bg-[rgb(var(--color-primary))] cursor-pointer"
                data-testid="voice-commands-toggle"
              />
            </div>

            <div className="space-y-2">
              {voiceCommandsList.map(cmd => (
                <div
                  key={cmd.id}
                  className="w-full p-3 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/5 flex items-center gap-3 group"
                >
                  <Microphone weight="fill" className="w-4 h-4 text-[rgb(var(--color-text-secondary))]" />
                  <span className="font-mono text-[12px] text-[rgb(var(--color-text-primary))] font-bold flex-1 text-left">{cmd.command}</span>
                  <span className="font-mono text-[10px] text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary))] px-1.5">ACTIVE</span>
                </div>
              ))}
            </div>

            <button className="w-full py-3 border border-dashed border-[rgb(var(--color-border))] font-mono text-[12px] text-[rgb(var(--color-text-secondary))] font-bold hover:text-[rgb(var(--color-primary))] hover:border-[rgb(var(--color-primary))] transition-all">
              + {t('accessibility.calibrate')}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-[rgb(var(--color-bg))] overflow-hidden" data-testid="accessibility-page">
      <div className="shrink-0 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10">
        <BackToSettings />
        <div className="h-10 flex items-center justify-between px-4">
          <span className="font-mono text-[12px] text-[rgb(var(--color-text-secondary))] font-bold uppercase">
            MODULE: <span className="text-[rgb(var(--color-primary))]">ACCESSIBILITY</span>
          </span>
          {saveStatus === 'saving' && (
            <span className="font-mono text-[11px] text-[rgb(var(--color-text-secondary))] flex items-center gap-2">
              <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" /> SAVING...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="font-mono text-[11px] text-[rgb(var(--color-primary))]">CHANGES_AUTO_SAVED</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll pb-32 md:pb-0">
        <ResponsiveTabView tabs={tabs} className="h-full" />
      </div>
    </main>
  );
};

export default AccessibilityPage;
