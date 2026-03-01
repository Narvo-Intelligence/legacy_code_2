import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';

const REGIONS = [
  { id: 'lagos', name: 'Lagos / West Africa', tz: 'UTC+1', country: 'NIGERIA' },
  { id: 'nairobi', name: 'Nairobi / East Africa', tz: 'UTC+3', country: 'KENYA' },
  { id: 'johannesburg', name: 'Johannesburg / South', tz: 'UTC+2', country: 'SOUTH AFRICA' },
  { id: 'accra', name: 'Accra / West Africa', tz: 'UTC+0', country: 'GHANA' },
];

const VOICES = [
  { id: 'pidgin', name: 'Pidgin // Sabi-Work Node', desc: 'Metropolitan rhythm, dialectal precision, zero-loss fidelity.' },
  { id: 'yoruba', name: 'Yoruba // Tonal-Pulse', desc: 'Strict tonal accuracy, broadcast-grade regional nuance.' },
  { id: 'igbo', name: 'Igbo // Core-Flow', desc: 'Rhythmic regional accent, synthesized with natural cadence.' },
];

const INTERESTS = [
  { id: 'politics', name: 'Politics' },
  { id: 'tech', name: 'Tech' },
  { id: 'sports', name: 'Sports' },
  { id: 'finance', name: 'Finance' },
  { id: 'afrobeats', name: 'Afrobeats' },
  { id: 'culture', name: 'Culture' },
];

const DEFAULT_REGION = 'lagos';
const DEFAULT_VOICE = 'pidgin';
const DEFAULT_INTERESTS = ['politics', 'sports', 'afrobeats'];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE);
  const [selectedInterests, setSelectedInterests] = useState(DEFAULT_INTERESTS);
  const [loading, setLoading] = useState(!!user?.id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load existing preferences from backend so form prefills and updates stay consistent
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`api/preferences?user_id=${user.id}`);
        if (cancelled) return;
        if (res.ok) {
          const prefs = await res.json();
          if (prefs && typeof prefs === 'object') {
            if (prefs.region && REGIONS.some((r) => r.id === prefs.region)) setSelectedRegion(prefs.region);
            if (prefs.voice && VOICES.some((v) => v.id === prefs.voice)) setSelectedVoice(prefs.voice);
            if (Array.isArray(prefs.interests) && prefs.interests.length) {
              setSelectedInterests(prefs.interests.filter((id) => INTERESTS.some((i) => i.id === id)));
            }
          }
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleInterest = (id) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setSaveError('');
  };

  const handleComplete = async () => {
    setSaveError('');
    const preferences = {
      region: selectedRegion,
      voice: selectedVoice,
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
        // Refetch so localStorage has server shape (e.g. updated_at) for consistency across app
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

  const calibrationPct = Math.round((selectedInterests.length / INTERESTS.length) * 100);

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

      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
          {/* Regional Node — 1/3 on lg */}
          <section className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-forest flex flex-col bg-background-dark shrink-0">
            <div className="p-4 sm:p-6 border-b border-forest">
              <span className="mono-ui text-[11px] sm:text-[12px] text-forest block mb-2">{t('onboarding.locale_matrix')}</span>
              <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight text-content">{t('onboarding.regional_node')}</h2>
              <p className="text-forest text-[11px] sm:text-xs mt-2 leading-relaxed mono-ui">{t('onboarding.regional_desc')}</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              <ul className="flex flex-col">
                {REGIONS.map((region) => (
                  <li key={region.id} className="border-b border-forest">
                    <label
                      className={`cursor-pointer flex items-center justify-between gap-3 p-4 sm:p-5 transition-colors min-h-[var(--touch-target-min,48px)] ${selectedRegion === region.id ? 'bg-primary text-background-dark' : 'hover:bg-forest/10'}`}
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
            <div className="p-4 border-t border-forest bg-surface shrink-0">
              <div className="flex justify-between items-center text-forest text-[11px] sm:text-[12px] mono-ui">
                <span>{t('onboarding.signal_quality')}</span>
                <span className="text-primary">98.4%</span>
              </div>
              <div className="w-full bg-background-dark h-1 mt-2 border border-forest">
                <div className="h-full w-[98%] bg-primary" />
              </div>
            </div>
          </section>

          {/* Vocal Matrix — 1/3 on lg */}
          <section className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-forest flex flex-col bg-background-dark shrink-0">
            <div className="p-4 sm:p-6 border-b border-forest">
              <span className="mono-ui text-[11px] sm:text-[12px] text-forest block mb-2">{t('onboarding.voice_engine')}</span>
              <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight text-content">{t('onboarding.vocal_matrix')}</h2>
              <p className="text-forest text-[11px] sm:text-xs mt-2 leading-relaxed mono-ui">{t('onboarding.voice_desc')}</p>
            </div>
            <div className="flex-1 p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-y-auto custom-scrollbar min-h-0">
              {VOICES.map((voice) => (
                <div key={voice.id} className="relative">
                  <input
                    type="radio"
                    id={`voice-${voice.id}`}
                    name="voice"
                    checked={selectedVoice === voice.id}
                    onChange={() => setSelectedVoice(voice.id)}
                    className="sr-only"
                    aria-label={voice.name}
                  />
                  <label
                    htmlFor={`voice-${voice.id}`}
                    className={`block border p-4 sm:p-5 cursor-pointer transition-all min-h-[var(--touch-target-min,48px)] ${selectedVoice === voice.id ? 'bg-primary text-background-dark border-primary' : 'border-forest hover:border-primary'}`}
                    data-testid={`voice-${voice.id}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2 sm:mb-3">
                      <span className="font-display text-base sm:text-lg font-bold uppercase">{voice.name}</span>
                      <svg className={`w-5 h-5 shrink-0 ${selectedVoice !== voice.id ? 'opacity-40' : ''}`} viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                        <path d="M56,96v64a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0ZM88,24a8,8,0,0,0-8,8V224a8,8,0,0,0,16,0V32A8,8,0,0,0,88,24Zm40,32a8,8,0,0,0-8,8V192a8,8,0,0,0,16,0V64A8,8,0,0,0,128,56Z" />
                      </svg>
                    </div>
                    <p className="mono-ui text-[11px] sm:text-[12px] opacity-70 mb-3 sm:mb-4 leading-relaxed">{voice.desc}</p>
                    <div className="flex items-center gap-2 text-[11px] sm:text-[12px] mono-ui font-bold">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                        <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
                      </svg>
                      <span>{t('onboarding.audition_mode')}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div className="h-16 sm:h-20 border-t border-forest flex items-center justify-center relative overflow-hidden bg-surface shrink-0">
              <div className="absolute inset-0 flex items-center justify-center gap-[3px] opacity-30">
                {[4, 8, 12, 6, 16, 8, 12, 4].map((h, i) => (
                  <div key={i} className={`w-1 bg-forest ${i === 4 ? 'bg-primary animate-pulse' : ''}`} style={{ height: `${h}px` }} />
                ))}
              </div>
              <span className="relative z-10 mono-ui text-[10px] sm:text-[11px] text-forest bg-surface px-2">SIGNAL_ANALYZER // STANDBY</span>
            </div>
          </section>

          {/* Interest Matrix + CTA */}
          <section className="lg:col-span-4 flex flex-col bg-background-dark shrink-0">
            <div className="p-4 sm:p-6 border-b border-forest">
              <span className="mono-ui text-[11px] sm:text-[12px] text-forest block mb-2">{t('onboarding.interest_matrix_label')}</span>
              <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight text-content">{t('onboarding.interest_matrix')}</h2>
              <p className="text-forest text-[11px] sm:text-xs mt-2 leading-relaxed mono-ui">{t('onboarding.interest_desc')}</p>
            </div>
            <div className="flex-1 p-4 sm:p-6 flex flex-col min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px border border-forest bg-forest">
                {INTERESTS.map((interest, idx) => {
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <label
                      key={interest.id}
                      className={`cursor-pointer flex flex-col justify-between p-3 sm:p-4 min-h-[var(--touch-target-min,48px)] transition-colors ${isSelected ? 'bg-primary text-background-dark' : 'bg-background-dark hover:bg-forest/10 text-content'}`}
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
                        {isSelected && (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                            <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM181.66,109.66l-72,72a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.32L104,164.69l66.34-66.35a8,8,0,0,1,11.32,11.32Z" />
                          </svg>
                        )}
                      </div>
                      <span className={`font-display text-sm sm:text-lg font-bold uppercase leading-tight ${!isSelected ? 'group-hover:text-primary' : ''}`}>
                        {interest.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-forest shrink-0">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-4">
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
                  disabled={saving}
                  className="w-full bg-primary text-background-dark font-display font-bold text-base sm:text-lg py-4 sm:py-5 min-h-[var(--touch-target-min,48px)] hover:bg-white active:bg-primary/80 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
      </main>
    </div>
  );
};

export default OnboardingPage;
