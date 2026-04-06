'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Play,
  Check,
  Volume2,
  Mic2,
  ArrowRight,
  Headphones,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  loadPreferences,
  savePreferences,
  setOnboardingComplete,
} from '@/lib/narvo-session';
import { syncPreferencesIfAuthed } from '@/lib/me-api';
import { setNarvoNotificationsEnabled } from '@/lib/narvo-notifications';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  COPY,
  onboardProgressLabel,
  onboardTopicsCountLabel,
  pushBriefingBodyPreview,
} from '@/lib/narvo-app-copy';
import { NARVO_AUTH_CANVAS_CARD_CLASS } from '@/lib/narvo-ui-classes';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

/** Step 2 — topic chips (03_UX_Design_Patterns §6.2) */
const TOPICS = [
  { id: 'nigeria', name: 'Nigeria', icon: '🇳🇬' },
  { id: 'africa', name: 'Africa', icon: '🌍' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'tech', name: 'Tech', icon: '💻' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'health', name: 'Health', icon: '🏥' },
  { id: 'culture', name: 'Culture', icon: '🎭' },
  { id: 'politics', name: 'Politics', icon: '🏛️' },
  { id: 'environment', name: 'Environment', icon: '🌱' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'social', name: 'Social Media', icon: '📱' },
];

type LangRow = {
  id: string;
  name: string;
  native: string;
  flag: string;
};

const LANGUAGE_ROWS: LangRow[] = [
  { id: 'en', name: 'English', native: 'English', flag: '🇳🇬' },
  { id: 'pidgin', name: 'Nigerian Pidgin', native: 'Pidgin', flag: '🇳🇬' },
  { id: 'yoruba', name: 'Yorùbá', native: 'Yoruba', flag: '🇳🇬' },
  { id: 'hausa', name: 'Hausa', native: 'Hausa', flag: '🇳🇬' },
  { id: 'igbo', name: 'Igbo', native: 'Igbo', flag: '🇳🇬' },
];

function langTaglineForId(id: string): string {
  switch (id) {
    case 'en':
      return COPY.onboard_lang_tag_en;
    case 'pidgin':
      return COPY.onboard_lang_tag_pidgin;
    case 'yoruba':
      return COPY.onboard_lang_tag_yoruba;
    case 'hausa':
      return COPY.onboard_lang_tag_hausa;
    case 'igbo':
      return COPY.onboard_lang_tag_igbo;
    default:
      return '';
  }
}

const VOICES = [
  { id: 'male-1', name: 'Emeka', gender: 'Male', tone: 'Calm & Authoritative', sample: 'Hello, I am Emeka. I will be your news guide.' },
  { id: 'female-1', name: 'Amina', gender: 'Female', tone: 'Warm & Friendly', sample: 'Hi, I am Amina. Let me bring you the latest stories.' },
  { id: 'male-2', name: 'Tunde', gender: 'Male', tone: 'Energetic & Fast', sample: 'Yo, Tunde here. Ready for the morning gist?' },
  { id: 'female-2', name: 'Chioma', gender: 'Female', tone: 'Professional & Clear', sample: 'Good morning. I am Chioma, your Narvo news anchor.' },
];

const cardShell =
  'rounded-[24px] sm:rounded-[28px] border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]';

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedVoice, setSelectedVoice] = useState('female-1');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const railMarketing = useMemo(
    () => [
      {
        kicker: COPY.brand_subtitle,
        title: COPY.onboard_welcome_title,
        body: COPY.onboard_welcome_desc,
      },
      {
        kicker: COPY.brand_subtitle,
        title: COPY.onboard_topics_title,
        body: COPY.onboard_topics_desc,
      },
      {
        kicker: COPY.voice_pick_prompt,
        title: COPY.onboard_lang_voice_title,
        body: COPY.onboard_lang_voice_desc,
      },
      {
        kicker: COPY.briefing_title,
        title: COPY.onboard_notify_title,
        body: COPY.onboard_notify_desc,
      },
    ],
    []
  );

  useEffect(() => {
    const p = loadPreferences();
    if (p) {
      setSelectedLanguage(p.language);
      setSelectedVoice(p.voice);
      setSelectedTopics(p.interests.filter((id) => TOPICS.some((t) => t.id === id)));
    }
    setHydrated(true);
  }, []);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const finishToDashboard = (language: string, voice: string, interests: string[]) => {
    const prefs = { language, voice, interests };
    savePreferences(prefs);
    void syncPreferencesIfAuthed(prefs);
    setOnboardingComplete();
    router.push('/dashboard');
  };

  const handleSkip = () => {
    finishToDashboard('en', 'female-1', []);
  };

  const requestNotificationsAndFinish = async () => {
    let granted = false;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const p = await Notification.requestPermission();
        granted = p === 'granted';
      } catch {
        granted = false;
      }
    }
    setNarvoNotificationsEnabled(granted);
    finishToDashboard(selectedLanguage, selectedVoice, selectedTopics);
  };

  const handleNotifyLater = () => {
    setNarvoNotificationsEnabled(false);
    finishToDashboard(selectedLanguage, selectedVoice, selectedTopics);
  };

  const playLangSample = (langId: string) => {
    setPlayingLang(langId);
    setTimeout(() => setPlayingLang(null), 3000);
  };

  const playVoiceSample = (voiceId: string) => {
    setPlayingVoice(voiceId);
    setTimeout(() => setPlayingVoice(null), 3000);
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const canContinue = () => {
    if (step === 2) return selectedTopics.length >= 3;
    return true;
  };

  const primaryFooterAction = () => {
    if (step === 1) goNext();
    else if (step === 2 && canContinue()) goNext();
    else if (step === 3) goNext();
  };

  if (!hydrated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-primary)] text-narvo-ink/50 dark:text-white/50 text-sm transition-colors px-6">
        <p className="text-center max-w-xs leading-relaxed">{COPY.status_loading}</p>
      </div>
    );
  }

  return (
    <AuthShell
      backHref="/"
      backLabel={COPY.auth_back_home}
      marketing={railMarketing[step - 1]}
      canvasClassName="w-full max-w-2xl xl:max-w-3xl pb-6 sm:pb-8"
    >
      <div className="flex w-full flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint/90 text-center sm:text-left">
            {onboardProgressLabel(step)}
          </p>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <div
              className="flex flex-1 max-w-[220px] sm:flex-initial sm:max-w-none items-center justify-center gap-1.5 sm:gap-2 sm:mr-3"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-label={onboardProgressLabel(step)}
            >
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    s === step
                      ? 'w-7 sm:w-8 bg-narvo-vermilion'
                      : s < step
                        ? 'w-3 sm:w-4 bg-narvo-teal'
                        : 'w-3 sm:w-4 bg-narvo-ink/10 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="shrink-0 min-h-[44px] min-w-[44px] sm:min-w-0 px-2 text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline underline-offset-2 touch-manipulation"
            >
              {COPY.onboard_skip}
            </button>
          </div>
        </div>

        <div className={`${NARVO_AUTH_CANVAS_CARD_CLASS} p-5 sm:p-8 lg:p-10`}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={SPRING}
                className="relative overflow-hidden rounded-[22px] border border-narvo-butter/25 bg-gradient-to-br from-amber-50/90 via-narvo-mist/80 to-white dark:from-narvo-ink dark:via-narvo-ink dark:to-narvo-teal/20 dark:border-white/10 px-5 py-10 sm:px-10 sm:py-14"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 60% at 80% 20%, rgba(240,75,36,0.15), transparent), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(15,95,115,0.12), transparent)',
                  }}
                  aria-hidden
                />
                <div className="relative flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING}
                    className="mb-6 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-narvo-teal text-white shadow-xl shadow-narvo-teal/25 ring-4 ring-white/80 dark:ring-white/10"
                  >
                    <span className="font-serif text-4xl sm:text-5xl font-bold leading-none">N</span>
                  </motion.div>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-narvo-ink dark:text-white leading-tight max-w-md">
                    {COPY.onboard_welcome_title}
                  </h1>
                  <p className="mt-4 max-w-lg text-[15px] sm:text-base text-narvo-ink/70 dark:text-white/65 leading-relaxed">
                    {COPY.onboard_welcome_desc}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={SPRING}
                className="space-y-6 sm:space-y-8"
              >
                <div className="text-center lg:text-left">
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-narvo-ink dark:text-white leading-tight">
                    {COPY.onboard_topics_title}
                  </h1>
                  <p className="mt-2 sm:mt-3 text-[15px] sm:text-base text-narvo-ink/55 dark:text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {COPY.onboard_topics_desc}
                  </p>
                  <p
                    className={`mt-3 text-sm font-medium ${
                      selectedTopics.length >= 3
                        ? 'text-narvo-teal dark:text-narvo-mint'
                        : 'text-narvo-ink/45 dark:text-white/45'
                    }`}
                    aria-live="polite"
                  >
                    {onboardTopicsCountLabel(selectedTopics.length)}
                  </p>
                </div>
                <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain pr-1 -mr-1 sm:max-h-none sm:overflow-visible">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    {TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className={`group ${cardShell} relative flex flex-col items-center justify-center gap-2 p-4 sm:p-5 min-h-[100px] sm:min-h-[112px] touch-manipulation ${
                          selectedTopics.includes(topic.id)
                            ? 'border-narvo-vermilion/50 bg-narvo-butter/15 dark:bg-narvo-vermilion/15 dark:border-narvo-butter/40'
                            : 'border-narvo-ink/8 dark:border-white/10 bg-narvo-mist/30 dark:bg-white/[0.04] hover:border-narvo-ink/15 dark:hover:border-white/15'
                        }`}
                      >
                        <span
                          className="text-2xl sm:text-3xl leading-none transition-transform group-hover:scale-110"
                          aria-hidden
                        >
                          {topic.icon}
                        </span>
                        <p
                          className={`font-bold text-[11px] sm:text-xs text-center leading-tight px-0.5 ${
                            selectedTopics.includes(topic.id)
                              ? 'text-narvo-vermilion dark:text-narvo-butter'
                              : 'text-narvo-ink/65 dark:text-white/60'
                          }`}
                        >
                          {topic.name}
                        </p>
                        {selectedTopics.includes(topic.id) && (
                          <div
                            className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-narvo-vermilion text-white dark:bg-narvo-butter dark:text-narvo-ink"
                            aria-hidden
                          >
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={SPRING}
                className="space-y-8 sm:space-y-10"
              >
                <div className="text-center lg:text-left">
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-narvo-ink dark:text-white leading-tight">
                    {COPY.onboard_lang_voice_title}
                  </h1>
                  <p className="mt-2 sm:mt-3 text-[15px] sm:text-base text-narvo-ink/55 dark:text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {COPY.onboard_lang_voice_desc}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-narvo-ink/40 dark:text-white/38">
                    {COPY.onboard_lang_section_note}
                  </p>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  {LANGUAGE_ROWS.map((lang) => (
                    <div
                      key={lang.id}
                      className={`${cardShell} flex flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between ${
                        selectedLanguage === lang.id
                          ? 'border-narvo-teal bg-white dark:bg-narvo-ink shadow-lg shadow-narvo-teal/10'
                          : 'border-narvo-ink/8 dark:border-white/10 bg-narvo-mist/30 dark:bg-white/[0.04]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedLanguage(lang.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 text-left"
                      >
                        <span className="text-2xl shrink-0" aria-hidden>
                          {lang.flag}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-[15px] sm:text-lg text-narvo-ink dark:text-white">
                            {lang.name}
                          </p>
                          <p className="text-[13px] sm:text-sm text-narvo-ink/55 dark:text-white/50">
                            {langTaglineForId(lang.id)}
                          </p>
                        </div>
                        {selectedLanguage === lang.id && (
                          <div
                            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-narvo-teal text-white sm:ml-2"
                            aria-hidden
                          >
                            <Check size={15} />
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playLangSample(lang.id);
                        }}
                        className={`flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-all sm:w-auto sm:min-w-[140px] ${
                          playingLang === lang.id
                            ? 'bg-narvo-vermilion text-white'
                            : 'bg-narvo-ink/[0.06] dark:bg-white/10 text-narvo-ink/75 dark:text-white/75 hover:bg-narvo-ink/10 dark:hover:bg-white/15'
                        }`}
                        aria-label={`${COPY.voice_preview} — ${lang.name}`}
                      >
                        {playingLang === lang.id ? (
                          <Volume2 size={16} className="animate-pulse shrink-0" aria-hidden />
                        ) : (
                          <Headphones size={16} className="shrink-0" aria-hidden />
                        )}
                        {playingLang === lang.id ? COPY.status_playing_sample : COPY.voice_preview}
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-medium text-narvo-ink dark:text-white">
                    {COPY.onboard_voice_section_title}
                  </h2>
                  <p className="mt-1 text-sm text-narvo-ink/55 dark:text-white/50">
                    {COPY.onboard_voice_section_desc}
                  </p>
                  <div className="mt-4 grid grid-cols-1 min-[520px]:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
                    {VOICES.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedVoice(voice.id);
                          }
                        }}
                        className={`${cardShell} relative cursor-pointer p-4 sm:p-5 ${
                          selectedVoice === voice.id
                            ? 'border-narvo-teal bg-white dark:bg-narvo-ink shadow-lg shadow-narvo-teal/10'
                            : 'border-narvo-ink/8 dark:border-white/10 bg-narvo-mist/30 dark:bg-white/[0.04] hover:border-narvo-ink/15 dark:hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4 mb-3 min-w-0">
                          <div
                            className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl ${
                              selectedVoice === voice.id
                                ? 'bg-narvo-teal text-white'
                                : 'bg-narvo-mist dark:bg-white/10 text-narvo-ink/45 dark:text-white/45'
                            }`}
                          >
                            <Mic2 className="h-[22px] w-[22px] sm:h-6 sm:w-6" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="font-bold text-[15px] sm:text-lg text-narvo-ink dark:text-white">
                              {voice.name}
                            </p>
                            <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-narvo-ink/45 dark:text-white/45 leading-snug">
                              {voice.gender} · {voice.tone}
                            </p>
                          </div>
                          {selectedVoice === voice.id && (
                            <div
                              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-narvo-teal text-white sm:right-4 sm:top-4"
                              aria-hidden
                            >
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playVoiceSample(voice.id);
                          }}
                          className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all ${
                            playingVoice === voice.id
                              ? 'bg-narvo-vermilion text-white'
                              : 'bg-narvo-ink/[0.06] dark:bg-white/10 text-narvo-ink/70 dark:text-white/70 hover:bg-narvo-ink/10 dark:hover:bg-white/15'
                          }`}
                          aria-label={
                            playingVoice === voice.id
                              ? COPY.onboard_voice_preview_playing_a11y.replace('{name}', voice.name)
                              : `${COPY.voice_preview} — ${voice.name}`
                          }
                        >
                          {playingVoice === voice.id ? (
                            <Volume2 size={16} className="animate-pulse shrink-0" aria-hidden />
                          ) : (
                            <Play size={16} fill="currentColor" className="shrink-0" aria-hidden />
                          )}
                          {playingVoice === voice.id ? COPY.status_playing_sample : COPY.voice_preview}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={SPRING}
                className="space-y-6 sm:space-y-8"
              >
                <div className="text-center lg:text-left">
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-narvo-ink dark:text-white leading-tight">
                    {COPY.onboard_notify_title}
                  </h1>
                  <p className="mt-2 sm:mt-3 text-[15px] sm:text-base text-narvo-ink/55 dark:text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {COPY.onboard_notify_desc}
                  </p>
                  <p className="mt-3 text-[13px] text-narvo-ink/45 dark:text-white/42 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {COPY.onboard_notify_demo}
                  </p>
                </div>

                <div
                  className="mx-auto max-w-sm rounded-2xl border border-narvo-ink/10 bg-narvo-mist/40 p-4 shadow-lg dark:border-white/10 dark:bg-black/25"
                  aria-hidden={false}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-teal text-white">
                      <Bell size={18} aria-hidden />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[13px] font-semibold text-narvo-ink dark:text-white leading-snug">
                        {COPY.push_briefing_title}
                      </p>
                      <p className="mt-1 text-[12px] text-narvo-ink/65 dark:text-white/55 leading-snug">
                        {pushBriefingBodyPreview(5, 5)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-narvo-ink/35 dark:text-white/35">
                    {COPY.brand_name} · {COPY.onboard_push_preview_now}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center justify-center sm:justify-start gap-2 min-h-[48px] rounded-full px-5 font-bold transition-all text-narvo-ink/50 dark:text-white/45 hover:text-narvo-ink dark:hover:text-white hover:bg-narvo-ink/5 dark:hover:bg-white/5 touch-manipulation"
            >
              <ChevronLeft size={20} aria-hidden />
              {COPY.onboard_back}
            </button>
          ) : (
            <div className="hidden min-h-0 sm:block sm:min-h-[48px] sm:w-24" aria-hidden />
          )}

          {step === 4 ? (
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
              <button
                type="button"
                onClick={handleNotifyLater}
                className="min-h-[48px] w-full sm:w-auto rounded-full px-6 text-center text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline underline-offset-2 touch-manipulation"
              >
                {COPY.onboard_notify_later}
              </button>
              <button
                type="button"
                onClick={requestNotificationsAndFinish}
                className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-narvo-vermilion px-8 py-3.5 font-bold text-white shadow-lg shadow-narvo-vermilion/25 transition-transform hover:bg-[#e0441f] active:scale-[0.99] touch-manipulation"
              >
                <Bell size={18} aria-hidden />
                {COPY.onboard_notify_cta}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={primaryFooterAction}
              disabled={!canContinue()}
              className="flex w-full sm:w-auto items-center justify-center gap-2 min-h-[48px] px-8 sm:px-10 py-3.5 bg-narvo-vermilion text-white rounded-full font-bold hover:bg-[#e0441f] active:scale-[0.99] transition-all shadow-lg shadow-narvo-vermilion/25 disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 touch-manipulation"
            >
              {step === 1 ? COPY.onboard_welcome_cta : COPY.cta_continue}
              <ArrowRight size={20} aria-hidden />
            </button>
          )}
        </footer>
      </div>
    </AuthShell>
  );
}
