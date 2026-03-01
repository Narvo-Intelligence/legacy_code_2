import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Handshake,
  GraduationCap,
  SoccerBall,
  Briefcase,
  Laptop,
  Flask,
  TreeEvergreen,
  Palette,
  Heartbeat,
  Radio,
  ApplePodcastsLogo,
  Television,
  Microphone,
  Buildings,
  ShieldCheck,
  Users,
  Megaphone,
  TrendUp,
  Play,
  Stop,
  CircleNotch,
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
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
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [voices, setVoices] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [selectedInterests, setSelectedInterests] = useState(DEFAULT_ONBOARDING_INTERESTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(null);
  const previewAudioRef = useRef(null);

  // Fetch TTS voices (same as /voices page) and optionally preferences
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [voicesRes, prefsRes] = await Promise.all([
          api.get('api/voices'),
          user?.id ? api.get(`api/preferences?user_id=${user.id}`) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const voicesData = await voicesRes.json().catch(() => []);
        const list = Array.isArray(voicesData) ? voicesData : [];
        setVoices(list);

        let region = DEFAULT_REGION;
        let voiceId = list[0]?.id ?? null;
        let interests = DEFAULT_ONBOARDING_INTERESTS;

        if (prefsRes?.ok) {
          const prefs = await prefsRes.json();
          if (prefs && typeof prefs === 'object') {
            region = normalizeRegionId(prefs.region);
            if (prefs.voice && list.some((v) => v.id === prefs.voice)) voiceId = prefs.voice;
            const valid = filterValidInterestIds(prefs.interests);
            if (valid.length) interests = valid;
          }
        }

        setSelectedRegion(region);
        setSelectedVoice(list.find((v) => v.id === voiceId) || list[0] || null);
        setSelectedInterests(interests.length ? interests : DEFAULT_ONBOARDING_INTERESTS);
      } catch (_) {}
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

  const toggleInterest = (id) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setSaveError('');
  };

  const playVoicePreview = async (e, voice) => {
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
      const data = await res.json();
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
      voice: voiceId,
      interests: selectedInterests,
    };
    localStorage.setItem('narvo_preferences', JSON.stringify(preferences));

    if (user?.id) {
      setSaving(true);
      try {
        const res = await api.post('api/preferences', { user_id: user.id, ...preferences });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || 'Save failed');
        }
        const refetch = await api.get(`api/preferences?user_id=${user.id}`);
        if (refetch.ok) {
          const prefs = await refetch.json();
          if (prefs && typeof prefs === 'object') {
            localStorage.setItem('narvo_preferences', JSON.stringify(prefs));
          }
        }
      } catch (e) {
        setSaveError(e.message || 'Failed to save. Check connection and try again.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

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
        <p className="mono-ui text-forest text-sm">LOADING_PREFERENCES...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-background-dark" data-testid="onboarding-page">
      <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-forest bg-background-dark z-10 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <img src="/narvo_logo.svg" alt="Narvo" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <h1 className="font-display text-sm sm:text-lg lg:text-xl tracking-tight font-bold text-content uppercase truncate">
            NARVO <span className="text-forest font-light mx-1 sm:mx-2">{'//'}</span> {t('onboarding.setup_console')}
          </h1>
        </div>
        <div className="mono-ui text-[10px] sm:text-[12px] text-forest shrink-0">
          SYSTEM_ACCESS_ID: <span className="text-primary">009-AF-X</span>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto w-full flex justify-center">
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 lg:border border-forest bg-background-dark">
            {/* 1. Regional Node — mobile: card; desktop: first column */}
            <section className="lg:col-span-4 border border-forest lg:border-b-0 lg:border-r flex flex-col bg-background-dark lg:bg-surface/5">
              <div className="p-4 sm:p-6 lg:px-8 lg:pt-8 lg:pb-6 border-b border-forest">
                <div className="flex items-center gap-2 mb-2">
                  <span className="lg:hidden flex items-center justify-center w-7 h-7 border border-forest mono-ui text-[11px] font-bold text-forest shrink-0">1</span>
                  <span className="hidden lg:inline mono-ui text-[10px] text-forest font-bold tracking-widest uppercase">01 — {t('onboarding.locale_matrix')}</span>
                  <span className="lg:hidden mono-ui text-[11px] sm:text-[12px] text-forest">{t('onboarding.locale_matrix')}</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight text-content">{t('onboarding.regional_node')}</h2>
                <p className="text-forest text-[11px] sm:text-xs mt-2 lg:mt-3 leading-relaxed mono-ui max-w-md">{t('onboarding.regional_desc')}</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                <ul className="flex flex-col">
                  {REGIONS.map((region) => (
                    <li key={region.id} className="border-b border-forest last:border-b-0">
                      <label
                        className={`cursor-pointer flex items-center justify-between gap-3 p-4 sm:p-5 lg:p-6 transition-colors min-h-[52px] sm:min-h-[var(--touch-target-min,48px)] active:bg-forest/10 ${selectedRegion === region.id ? 'bg-primary text-background-dark' : 'hover:bg-forest/10'}`}
                        data-testid={`region-${region.id}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-display text-base sm:text-lg font-bold uppercase">{region.name}</span>
                          <span className={`mono-ui text-[11px] sm:text-[12px] mt-0.5 ${selectedRegion === region.id ? 'opacity-80' : 'text-forest'}`}>
                            {region.tz} — {region.country}
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="region"
                          checked={selectedRegion === region.id}
                          onChange={() => setSelectedRegion(region.id)}
                          className="sr-only"
                          aria-label={region.name}
                        />
                        {selectedRegion === region.id && (
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                            <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
                          </svg>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden sm:block p-4 lg:px-8 lg:py-5 border-t border-forest bg-surface shrink-0">
                <div className="flex justify-between items-center text-forest text-[11px] sm:text-[12px] mono-ui">
                  <span>{t('onboarding.signal_quality')}</span>
                  <span className="text-primary">98.4%</span>
                </div>
                <div className="w-full bg-background-dark h-1 mt-2 border border-forest">
                  <div className="h-full w-[98%] bg-primary" />
                </div>
              </div>
            </section>

            {/* 2. Vocal Matrix — TTS voices; desktop: refined panel */}
            <section className="lg:col-span-4 border border-forest lg:border-b-0 lg:border-r flex flex-col bg-background-dark lg:bg-surface/5">
              <div className="p-4 sm:p-6 lg:px-8 lg:pt-8 lg:pb-6 border-b border-forest">
                <div className="flex items-center gap-2 mb-2">
                  <span className="lg:hidden flex items-center justify-center w-7 h-7 border border-forest mono-ui text-[11px] font-bold text-forest shrink-0">2</span>
                  <span className="hidden lg:inline mono-ui text-[10px] text-forest font-bold tracking-widest uppercase">02 — {t('onboarding.voice_engine')}</span>
                  <span className="lg:hidden mono-ui text-[11px] sm:text-[12px] text-forest">{t('onboarding.voice_engine')}</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight text-content">{t('onboarding.vocal_matrix')}</h2>
                <p className="text-forest text-[11px] sm:text-xs mt-2 lg:mt-3 leading-relaxed mono-ui max-w-md">{t('onboarding.voice_desc')}</p>
                <p className="hidden lg:block text-forest/70 text-[10px] mono-ui mt-2">Select a card to hear a preview in that language.</p>
              </div>
              <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-3 lg:gap-2 overflow-y-auto custom-scrollbar min-h-0">
                {voices.length === 0 ? (
                  <p className="mono-ui text-forest text-[12px]">Loading voices…</p>
                ) : (
                  voices.map((voice) => {
                    const isSelected = selectedVoice?.id === voice.id;
                    const isPlaying = previewPlaying === voice.id;
                    const isLoading = previewLoading === voice.id;
                    return (
                      <div key={voice.id} className="relative">
                        <input
                          type="radio"
                          id={`voice-${voice.id}`}
                          name="voice"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedVoice(voice);
                            playVoicePreview({ preventDefault: () => {}, stopPropagation: () => {} }, voice);
                          }}
                          className="sr-only"
                          aria-label={voice.name}
                        />
                        <label
                          htmlFor={`voice-${voice.id}`}
                          className={`block border p-4 sm:p-5 lg:p-4 cursor-pointer transition-all min-h-[52px] sm:min-h-[var(--touch-target-min,48px)] active:bg-forest/5 ${isSelected ? 'bg-primary text-background-dark border-primary' : 'border-forest hover:border-primary'}`}
                          data-testid={`voice-${voice.id}`}
                        >
                          <div className="flex justify-between items-center gap-3 sm:gap-2">
                            <div className="min-w-0">
                              <span className="font-display text-base sm:text-lg font-bold uppercase block">{voice.name}</span>
                              <p className="mono-ui text-[11px] sm:text-[12px] opacity-70 leading-relaxed mt-0.5">
                                {voice.language ? (
                                  <span className="lg:inline-block lg:border lg:border-current lg:px-1.5 lg:py-0.5 lg:mt-1 lg:mr-1.5">{voice.language}</span>
                                ) : null}
                                {t('onboarding.audition_mode')}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={`shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[var(--touch-target-icon,48px)] sm:min-w-[var(--touch-target-icon,48px)] border p-2 ${isSelected ? 'border-background-dark/30 text-background-dark hover:bg-background-dark/20' : 'border-forest text-forest hover:border-primary hover:text-primary'}`}
                              onClick={(e) => playVoicePreview(e, voice)}
                              disabled={isLoading}
                              aria-label={isPlaying ? 'Stop preview' : `Play ${voice.name} preview`}
                            >
                              {isLoading ? (
                                <CircleNotch className="w-5 h-5 animate-spin" weight="bold" />
                              ) : isPlaying ? (
                                <Stop className="w-5 h-5" weight="fill" />
                              ) : (
                                <Play className="w-5 h-5 sm:w-5 sm:h-5" weight="fill" />
                              )}
                            </button>
                          </div>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="hidden lg:flex h-12 border-t border-forest items-center justify-center bg-surface/50 shrink-0">
                <span className="mono-ui text-[10px] text-forest">PREVIEW ON SELECT</span>
              </div>
            </section>

            {/* 3. Interest Matrix + CTA — desktop: refined panel */}
            <section className="lg:col-span-4 border border-forest lg:border-0 flex flex-col bg-background-dark lg:bg-surface/5">
              <div className="p-4 sm:p-6 lg:px-8 lg:pt-8 lg:pb-6 border-b border-forest">
                <div className="flex items-center gap-2 mb-2">
                  <span className="lg:hidden flex items-center justify-center w-7 h-7 border border-forest mono-ui text-[11px] font-bold text-forest shrink-0">3</span>
                  <span className="hidden lg:inline mono-ui text-[10px] text-forest font-bold tracking-widest uppercase">03 — {t('onboarding.interest_matrix_label')}</span>
                  <span className="lg:hidden mono-ui text-[11px] sm:text-[12px] text-forest">{t('onboarding.interest_matrix_label')}</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight text-content">{t('onboarding.interest_matrix')}</h2>
                <p className="text-forest text-[11px] sm:text-xs mt-2 lg:mt-3 leading-relaxed mono-ui max-w-md">{t('onboarding.interest_desc')}</p>
              </div>
              <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-px lg:gap-px border border-forest bg-forest">
                  {interestsList.map((interest, idx) => {
                    const isSelected = selectedInterests.includes(interest.id);
                    const Icon = interest.Icon;
                    return (
                      <label
                        key={interest.id}
                        className={`cursor-pointer flex flex-col justify-between p-3 sm:p-4 lg:p-4 min-h-[52px] sm:min-h-[var(--touch-target-min,48px)] lg:min-h-[56px] transition-colors active:bg-forest/10 ${isSelected ? 'bg-primary text-background-dark' : 'bg-background-dark hover:bg-forest/10 text-content'}`}
                        data-testid={`interest-${interest.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInterest(interest.id)}
                          className="sr-only"
                          aria-label={interest.name}
                        />
                        <div className="flex justify-between items-start gap-1">
                          <span className={`mono-ui text-[10px] sm:text-[11px] ${isSelected ? '' : 'text-forest'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isSelected ? '' : 'text-forest'}`} weight="regular" aria-hidden />
                        </div>
                        <span className={`font-display text-xs sm:text-sm font-bold uppercase leading-tight mt-1 ${!isSelected ? 'group-hover:text-primary' : ''}`}>
                          {interest.name}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-6 sm:mt-8 lg:mt-8 pt-4 sm:pt-6 lg:pt-8 lg:pb-8 border-t border-forest shrink-0 pb-4 sticky bottom-0 z-10 bg-background-dark lg:bg-transparent">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-4 lg:mb-4">
                    <span className="mono-ui text-[10px] sm:text-[12px] text-forest">
                      SYSTEM_STATUS: <span className="text-primary">INITIAL_LINK_READY</span>
                    </span>
                    <span className="mono-ui text-[10px] sm:text-[12px] text-forest">
                      {t('onboarding.calibration_progress')}: {calibrationPct}%
                    </span>
                  </div>
                  {saveError && (
                    <p className="mono-ui text-[11px] sm:text-[12px] text-red-400 mb-3 border border-red-500/50 bg-red-500/10 p-2" role="alert">
                      [ERROR] {saveError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={saving || (user && !selectedVoice)}
                    className="w-full bg-primary text-background-dark font-display font-bold text-base sm:text-lg py-4 sm:py-5 min-h-[52px] sm:min-h-[var(--touch-target-min,48px)] hover:bg-white active:bg-primary/80 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    data-testid="complete-onboarding-btn"
                  >
                    <span className="uppercase tracking-tighter">{saving ? 'Saving…' : t('onboarding.initialize_feed')}</span>
                    {!saving && (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                        <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
                      </svg>
                    )}
                  </button>
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
