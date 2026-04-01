import type React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from '@phosphor-icons/react/Globe';
import { Handshake } from '@phosphor-icons/react/Handshake';
import { GraduationCap } from '@phosphor-icons/react/GraduationCap';
import { SoccerBall } from '@phosphor-icons/react/SoccerBall';
import { Briefcase } from '@phosphor-icons/react/Briefcase';
import { Laptop } from '@phosphor-icons/react/Laptop';
import { Flask } from '@phosphor-icons/react/Flask';
import { TreeEvergreen } from '@phosphor-icons/react/TreeEvergreen';
import { Palette } from '@phosphor-icons/react/Palette';
import { Heartbeat } from '@phosphor-icons/react/Heartbeat';
import { Radio } from '@phosphor-icons/react/Radio';
import { ApplePodcastsLogo } from '@phosphor-icons/react/ApplePodcastsLogo';
import { Television } from '@phosphor-icons/react/Television';
import { Microphone } from '@phosphor-icons/react/Microphone';
import { Buildings } from '@phosphor-icons/react/Buildings';
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck';
import logger from '../lib/logger';
import { writeJson } from '../lib/storage';
import { Users } from '@phosphor-icons/react/Users';
import { Megaphone } from '@phosphor-icons/react/Megaphone';
import { TrendUp } from '@phosphor-icons/react/TrendUp';
import { Play } from '@phosphor-icons/react/Play';
import { Stop } from '@phosphor-icons/react/Stop';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { useAuth } from '../contexts/AuthContext';
import NarvoLogo from '../components/NarvoLogo';
import * as api from '../lib/api';
import {
  REGIONS,
  DEFAULT_REGION,
  DEFAULT_ONBOARDING_INTERESTS,
  getOnboardingInterestsList,
  normalizeRegionId,
  filterValidInterestIds,
} from '../constants/onboarding';
import { getTtsPreviewSample } from '../constants/tts';

interface VoiceItem {
  id: string;
  name?: string;
  language?: string;
  [key: string]: unknown;
}

const INTEREST_ICONS = {
  world_news: Globe,
  politics: Handshake,
  education: GraduationCap,
  sports: SoccerBall,
  business: Briefcase,
  tech: Laptop,
  science: Flask,
  environment: TreeEvergreen,
  culture: Palette,
  health: Heartbeat,
  radio_clips: Radio,
  podcasts: ApplePodcastsLogo,
  tv_news: Television,
  interviews: Microphone,
  government: Buildings,
  security: ShieldCheck,
  society: Users,
  activism: Megaphone,
  trending_voices: TrendUp,
} as Record<string, React.ComponentType<{ className?: string; weight?: string }>>;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(DEFAULT_ONBOARDING_INTERESTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch TTS voices (same as /voices page) and optionally preferences
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [voicesRes, prefsRes] = await Promise.all([
          api.get('api/voices'),
          user?.id ? api.get('api/me/preferences') : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const voicesData = await voicesRes.json().catch(() => []);
        const list = Array.isArray(voicesData) ? voicesData : [];
        setVoices(list as VoiceItem[]);

        let region = DEFAULT_REGION;
        let voiceId = list[0]?.id ?? null;
        let interests = DEFAULT_ONBOARDING_INTERESTS;

        if (prefsRes?.ok) {
          const prefs = await prefsRes.json() as { region?: string; voice?: string; interests?: string[] };
          if (prefs && typeof prefs === 'object') {
            region = normalizeRegionId(prefs.region);
            if (prefs.voice && list.some((v: VoiceItem) => v.id === prefs.voice)) voiceId = prefs.voice;
            const valid = filterValidInterestIds(prefs.interests);
            if (valid.length) interests = valid;
          }
        }

        setSelectedRegion(region);
        setSelectedVoice(list.find((v: VoiceItem) => v.id === voiceId) || list[0] || null);
        setSelectedInterests(interests.length ? interests : DEFAULT_ONBOARDING_INTERESTS);
      } catch (err) {
        logger.debug('[OnboardingPage] Failed to load onboarding data', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [user?.id]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setSaveError('');
  };

  const playVoicePreview = async (e: React.MouseEvent, voice: VoiceItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!voice) return;
    if (previewPlaying === voice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewPlaying(null);
      return;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewLoading(voice.id);
    setPreviewPlaying(null);
    try {
      const sample = getTtsPreviewSample(voice.language);
      const res = await api.post('api/tts/generate', {
        text: sample,
        voice_id: voice.id,
        language: voice.language || 'en',
        skip_translation: true,
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = (await res.json()) as { audio_url: string };
      const audio = new Audio(data.audio_url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setPreviewPlaying(null);
        previewAudioRef.current = null;
      };
      audio.onerror = () => {
        setPreviewPlaying(null);
        previewAudioRef.current = null;
      };
      await audio.play();
      setPreviewPlaying(voice.id);
    } catch (_) {
      setPreviewLoading(null);
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleComplete = async () => {
    setSaveError('');
    const voiceId = selectedVoice?.id ?? (voices[0]?.id ?? '');
    const preferences = {
      region: selectedRegion,
      voice_id: voiceId,
      interests: selectedInterests,
    };
    writeJson('narvo_preferences', preferences);

    if (!user?.id) {
      setSaveError('Please sign in to complete onboarding.');
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('api/me/preferences', preferences);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data?.detail || 'Save failed');
      }
      const refetch = await api.get('api/me/preferences');
      if (refetch.ok) {
        const prefs = await refetch.json() as Record<string, unknown>;
        if (prefs && typeof prefs === 'object') {
          writeJson('narvo_preferences', prefs);
        }
      }
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save. Check connection and try again.');
      setSaving(false);
      return;
    }
    setSaving(false);

    navigate('/dashboard');
  };

  const interestsList = useMemo(
    () =>
      getOnboardingInterestsList().map(({ id, name }) => ({
        id,
        name,
        Icon: INTEREST_ICONS[id],
      })),
    []
  );
  const calibrationPct =
    interestsList.length > 0
      ? Math.round((selectedInterests.length / interestsList.length) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark border border-forest" data-testid="onboarding-page">
        <p className="font-mono text-content-secondary text-sm">LOADING_PREFERENCES...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-background-dark font-body" data-testid="onboarding-page">
      <header className="h-16 sm:h-20 flex items-center justify-between px-6 lg:px-12 glass-surface z-20 shrink-0 gap-4 border-b border-white/5">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <NarvoLogo alt="Narvo" className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div className="flex flex-col">
            <h1 className="font-display text-base sm:text-lg lg:text-xl tracking-[0.2em] font-black text-content uppercase truncate leading-none">
              NARVO <span className="text-primary/40 font-light mx-1 sm:mx-2 border-r border-white/10 h-4 inline-block"></span>
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary/60 mt-1">{t('onboarding.setup_console')}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <div className="font-mono text-[10px] text-content-secondary tracking-tighter">
            ACCESS_ID: <span className="text-primary font-bold">009-AF-X</span>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto w-full flex justify-center bg-[radial-gradient(circle_at_top_right,rgba(4,191,191,0.05),transparent_50%)]">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-12 py-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 glass-panel overflow-hidden border border-white/10 shadow-2xl">
            {/* 1. Regional Node */}
            <section className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-white/[0.02]">
              <div className="p-6 lg:p-10 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 font-mono text-primary text-xs font-bold shadow-[0_0_15px_rgba(4,191,191,0.2)]">01</div>
                  <span className="font-mono text-[10px] text-primary/60 font-bold tracking-[0.2em] uppercase">{t('onboarding.locale_matrix')}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-4">{t('onboarding.regional_node')}</h2>
                <p className="font-body text-sm text-content-secondary/80 leading-relaxed">{t('onboarding.regional_desc')}</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-20 sm:min-h-0">
                <ul className="flex flex-col divide-y divide-white/5">
                  {REGIONS.map((region) => (
                    <li key={region.id}>
                      <label
                        className={`cursor-pointer flex items-center justify-between gap-4 p-5 sm:p-6 lg:p-8 transition-all duration-300 relative group overflow-hidden ${selectedRegion === region.id ? 'bg-primary/10' : 'hover:bg-white/[0.03]'}`}
                        data-testid={`region-${region.id}`}
                      >
                        {selectedRegion === region.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(4,191,191,0.5)]" />
                        )}
                        <div className="flex flex-col min-w-0 z-10">
                          <span className={`font-display text-lg font-bold uppercase transition-colors ${selectedRegion === region.id ? 'text-primary' : 'text-white/80 group-hover:text-white'}`}>{region.name}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${selectedRegion === region.id ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/40'}`}>
                              {region.tz}
                            </span>
                            <span className="font-mono text-[11px] text-white/30 truncate">
                              {region.country}
                            </span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="region"
                          checked={selectedRegion === region.id}
                          onChange={() => setSelectedRegion(region.id)}
                          className="sr-only"
                          aria-label={region.name}
                        />
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selectedRegion === region.id ? 'border-primary bg-primary scale-110' : 'border-white/10 bg-transparent group-hover:border-white/30'}`}>
                          {selectedRegion === region.id && (
                            <svg className="w-4 h-4 text-background-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 lg:p-10 border-t lg:border-t-0 border-white/10 shrink-0 bg-white/[0.01]">
                <div className="flex justify-between items-center text-primary/60 text-[10px] font-mono tracking-widest uppercase mb-3">
                  <span>{t('onboarding.signal_quality')}</span>
                  <span className="text-primary font-bold">98.4%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full w-[98%] bg-primary shadow-[0_0_10px_rgba(4,191,191,0.5)] transition-all duration-1000" />
                </div>
              </div>
            </section>

            {/* 2. Vocal Matrix */}
            <section className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-white/[0.01]">
              <div className="p-6 lg:p-10 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 font-mono text-primary text-xs font-bold shadow-[0_0_15px_rgba(4,191,191,0.2)]">02</div>
                  <span className="font-mono text-[10px] text-primary/60 font-bold tracking-[0.2em] uppercase">{t('onboarding.voice_engine')}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-4">{t('onboarding.vocal_matrix')}</h2>
                <p className="font-body text-sm text-content-secondary/80 leading-relaxed">{t('onboarding.voice_desc')}</p>
              </div>
              <div className="flex-1 p-6 lg:p-8 flex flex-col gap-3 overflow-y-auto custom-scrollbar min-h-20 sm:min-h-0">
                {voices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 border border-dashed border-white/10 rounded-xl">
                    <CircleNotch className="w-8 h-8 animate-spin text-primary/40 mb-3" />
                    <p className="font-mono text-white/30 text-[10px] uppercase tracking-widest">Calibrating Vocal Cores…</p>
                  </div>
                ) : (
                  voices.map((voice) => {
                    const isSelected = selectedVoice?.id === voice.id;
                    const isPlaying = previewPlaying === voice.id;
                    const isLoading = previewLoading === voice.id;
                    return (
                      <div key={voice.id} className="relative group">
                        <input
                          type="radio"
                          id={`voice-${voice.id}`}
                          name="voice"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedVoice(voice);
                            playVoicePreview({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, voice);
                          }}
                          className="sr-only"
                          aria-label={voice.name}
                        />
                        <label
                          htmlFor={`voice-${voice.id}`}
                          aria-label={voice.name}
                          className={`block border rounded-xl p-5 lg:p-6 cursor-pointer transition-all duration-300 relative overflow-hidden ${isSelected ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(4,191,191,0.15)]' : 'border-white/5 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.05]'}`}
                        >
                          <div className="flex justify-between items-center gap-4">
                            <div className="min-w-0">
                              <span className={`font-display text-lg font-bold uppercase block transition-colors ${isSelected ? 'text-primary' : 'text-white/80 group-hover:text-white'}`}>{voice.name}</span>
                              <div className="flex items-center gap-2 mt-1.5">
                                {voice.language && (
                                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isSelected ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                    {voice.language}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-white/30 uppercase tracking-tighter">{t('onboarding.audition_mode')}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 border ${isSelected ? 'bg-primary text-background-dark border-transparent shadow-[0_0_15px_rgba(4,191,191,0.4)]' : 'bg-white/5 border-white/10 text-primary hover:border-primary hover:bg-primary/10'}`}
                              onClick={(e) => playVoicePreview(e, voice)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <CircleNotch className="w-6 h-6 animate-spin" weight="bold" />
                              ) : isPlaying ? (
                                <Stop className="w-6 h-6" weight="fill" />
                              ) : (
                                <Play className="w-6 h-6 ml-1" weight="fill" />
                              )}
                            </button>
                          </div>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-6 lg:p-10 border-t lg:border-t-0 border-white/10 shrink-0 bg-white/[0.01]">
                <p className="font-mono text-[10px] text-white/20 uppercase tracking-[0.3em] overflow-hidden whitespace-nowrap">
                  V_MATRIX_CALIBRATION_READY {Array(10).fill('||').join(' ')}
                </p>
              </div>
            </section>

            {/* 3. Interest Matrix */}
            <section className="lg:col-span-4 flex flex-col bg-white/[0.02]">
              <div className="p-6 lg:p-10 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 font-mono text-primary text-xs font-bold shadow-[0_0_15px_rgba(4,191,191,0.2)]">03</div>
                  <span className="font-mono text-[10px] text-primary/60 font-bold tracking-[0.2em] uppercase">{t('onboarding.interest_matrix_label')}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-4">{t('onboarding.interest_matrix')}</h2>
                <p className="font-body text-sm text-content-secondary/80 leading-relaxed">{t('onboarding.interest_desc')}</p>
              </div>
              <div className="flex-1 p-6 lg:p-10 flex flex-col min-h-0 overflow-y-auto">
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4">
                  {interestsList.map((interest, idx) => {
                    const isSelected = selectedInterests.includes(interest.id);
                    const Icon = interest.Icon;
                    return (
                      <label
                        key={interest.id}
                        className={`group cursor-pointer flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${isSelected ? 'bg-primary border-transparent shadow-[0_0_25px_rgba(4,191,191,0.3)]' : 'bg-white/[0.03] border-white/5 hover:border-primary/40 hover:bg-white/[0.05]'}`}
                        data-testid={`interest-${interest.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInterest(interest.id)}
                          className="sr-only"
                          aria-label={interest.name}
                        />
                        <div className="flex justify-between items-start mb-4">
                          <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-background-dark/60' : 'text-white/20 group-hover:text-primary/60'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {Icon && <Icon className={`w-6 h-6 transition-all duration-300 ${isSelected ? 'text-background-dark' : 'text-primary/40 group-hover:text-primary group-hover:scale-110'}`} weight="fill" />}
                        </div>
                        <span className={`font-display text-xs sm:text-sm font-black uppercase tracking-[0.05em] leading-tight ${isSelected ? 'text-background-dark' : 'text-white/60 group-hover:text-white'}`}>
                          {interest.name}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-10 pt-10 border-t border-white/5 shrink-0">
                  <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">Calibration Status</span>
                        <span className="font-mono text-sm text-primary font-bold">INITIAL_LINK_READY</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">{t('onboarding.calibration_progress')}</span>
                        <span className="font-mono text-sm text-white font-bold">{calibrationPct}%</span>
                      </div>
                    </div>
                  </div>
                  {saveError && (
                    <div className="font-mono text-[12px] text-red-100 mb-6 border border-red-500/30 bg-red-500/10 p-4 rounded-xl flex gap-3 items-start" role="alert">
                      <span className="text-red-500 font-bold shrink-0">[ERR]</span>
                      <span>{saveError}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={saving || !!(user && !selectedVoice)}
                    className="w-full relative group h-16 sm:h-20 rounded-2xl overflow-hidden transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="complete-onboarding-btn"
                  >
                    <div className="absolute inset-0 bg-primary group-hover:bg-white transition-colors duration-500" />
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.2),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="relative flex items-center justify-center gap-4">
                      <span className="font-display text-lg sm:text-xl font-black uppercase tracking-[0.1em] text-background-dark group-hover:text-primary transition-colors duration-500">
                        {saving ? 'Synchronizing…' : t('onboarding.initialize_feed')}
                      </span>
                      {!saving && (
                        <svg className="w-6 h-6 sm:w-8 h-8 text-background-dark group-hover:text-primary transition-colors duration-500" viewBox="0 0 256 256" fill="currentColor">
                          <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <p className="font-mono text-[10px] text-center text-white/20 mt-6 uppercase tracking-widest">End_to_End_Neural_Encryption_Active</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
