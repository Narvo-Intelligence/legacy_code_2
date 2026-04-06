'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import { Play, Globe2, ShieldCheck, Coffee, X, Volume2, Download, Newspaper, Search, ChevronUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { GoogleGenAI, Modality } from "@google/genai";
import { COPY } from '@/lib/narvo-app-copy';
import {
  fetchNewsList,
  fetchBreakingNews,
  type ApiNewsListItem,
} from '@/lib/narvo-api';

import { MeshBackground } from '@/components/MeshBackground';
import { StoryCardLargeLanding } from '@/components/StoryCardLarge';

// Motion tokens — Narvo_Emotional_Interaction_Guidelines_v1 §8.3 / landing v3 spring
const SHEET_SPRING = { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.9 };
const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 260, damping: 28 };
const STAGGER_MS = 0.055;

type LandingFeatureId = 'briefing' | 'audio' | 'language' | 'trust' | 'offline';

function landingFeatureTitle(id: LandingFeatureId): string {
  switch (id) {
    case 'briefing':
      return COPY.landing_feature_briefing_title;
    case 'audio':
      return COPY.landing_feature_audio_title;
    case 'language':
      return COPY.landing_feature_language_title;
    case 'trust':
      return COPY.landing_feature_trust_title;
    case 'offline':
      return COPY.landing_feature_offline_title;
    default:
      return '';
  }
}

function landingFeatureDescription(id: LandingFeatureId): string {
  switch (id) {
    case 'briefing':
      return COPY.landing_feature_briefing_desc;
    case 'audio':
      return COPY.landing_feature_audio_desc;
    case 'language':
      return COPY.landing_feature_language_desc;
    case 'trust':
      return COPY.landing_feature_trust_desc;
    case 'offline':
      return COPY.landing_feature_offline_desc;
    default:
      return '';
  }
}

const LANDING_FEATURE_BASE: {
  id: LandingFeatureId;
  image: string;
  color: string;
  icon: React.ReactNode;
  tag: string;
}[] = [
  {
    id: 'briefing',
    image:
      'https://images.unsplash.com/photo-1747071785559-4ee7dfa90c8d?auto=format&fit=crop&q=80&w=1200',
    color: '#f04b24',
    icon: <Coffee className="text-white" size={28} strokeWidth={2.5} />,
    tag: '🗞️',
  },
  {
    id: 'audio',
    image:
      'https://images.unsplash.com/photo-1589441321898-77270ae16d55?auto=format&fit=crop&q=80&w=1200',
    color: '#0f5f73',
    icon: <Play className="text-white" size={28} strokeWidth={2.5} />,
    tag: '🔉',
  },
  {
    id: 'language',
    image:
      'https://images.unsplash.com/photo-1518601794912-1af91724e528?auto=format&fit=crop&q=80&w=1200',
    color: '#acb6ff',
    icon: <Globe2 className="text-white" size={28} strokeWidth={2.5} />,
    tag: '🤟🏽',
  },
  {
    id: 'trust',
    image:
      'https://images.unsplash.com/photo-1685517905478-829e2951b856?auto=format&fit=crop&q=80&w=1200',
    color: '#7fddca',
    icon: <ShieldCheck className="text-white" size={28} strokeWidth={2.5} />,
    tag: '✅',
  },
  {
    id: 'offline',
    image:
      'https://images.unsplash.com/photo-1592199664258-d96d8c5ff6a5?auto=format&fit=crop&q=80&w=1200',
    color: '#17324a',
    icon: <Download className="text-white" size={28} strokeWidth={2.5} />,
    tag: '📵',
  },
];

const LANDING_FEATURES = LANDING_FEATURE_BASE.map((f) => ({
  ...f,
  title: landingFeatureTitle(f.id),
  description: landingFeatureDescription(f.id),
}));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/** Narvo_Emotional_Interaction_Guidelines_v1 §8.5 — exit matches initial: no offset/scale when reduced */
function instantExit() {
  return { opacity: 0 } as const;
}

function sheetExit(reduceMotion: boolean) {
  return reduceMotion ? instantExit() : { opacity: 0, scale: 0.96, y: 10 };
}

function ScrollToTop() {
  const reduceMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-top"
          type="button"
          aria-label={COPY.landing_scroll_top_a11y}
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? instantExit() : { opacity: 0, y: 10, scale: 0.92 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28 }}
          onClick={scrollUp}
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[85] flex h-12 w-12 items-center justify-center rounded-full bg-narvo-ink text-white shadow-lg shadow-narvo-ink/25 ring-1 ring-white/10 dark:bg-narvo-teal dark:shadow-narvo-teal/20 touch-manipulation"
        >
          <ChevronUp size={22} strokeWidth={2.5} aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// --- Components ---

const LanguageModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const reduceMotion = usePrefersReducedMotion();
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const languages = [
    { name: 'English', sub: 'Standard English', text: 'Welcome to Narvo. Africa’s news, spoken clearly.' },
    { name: 'Pidgin', sub: 'West African Pidgin', text: 'Welcome to Narvo. Africa news, we go talk am clear.' },
    { name: 'Yorùbá', sub: 'Southwestern Nigeria', text: 'Ẹ káàbọ̀ sí Narvo. Ìròyìn Áfíríkà, tí a sọ ní kedere.' },
    { name: 'Hausa', sub: 'Northern Nigeria', text: 'Barka da zuwa Narvo. Labaran Afirka, an faɗi su a sarari.' },
    { name: 'Igbo', sub: 'Southeastern Nigeria', text: 'Nnọọ na Narvo. Akụkọ Afrịka, ekwuru ya nke ọma.' },
  ];

  const availableVoices = ['Zephyr', 'Fenrir', 'Kore', 'Charon', 'Puck'];

  const [playing, setPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const togglePlay = async (lang: { name: string; text: string }) => {
    if (playing === lang.name) {
      setPlaying(null);
      return;
    }

    setIsLoading(true);
    setPlaying(lang.name);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: lang.text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice as any },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        source.onended = () => setPlaying(null);
      } else {
        throw new Error("No audio data received");
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setError(COPY.landing_tts_error_line);
      setPlaying(null);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const backdropDuration = reduceMotion ? 0 : 0.28;
  const panelTransition = reduceMotion ? { duration: 0 } : SHEET_SPRING;
  const exitPanel = sheetExit(reduceMotion);

  return (
    <AnimatePresence mode="sync">
      {isOpen && (
        <motion.div
          key="voice-modal-root"
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-3 sm:p-4 pb-[max(12px,env(safe-area-inset-bottom,0px))] sm:pb-4"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={instantExit()}
          transition={{ duration: backdropDuration }}
        >
          <motion.button
            type="button"
            aria-label={COPY.landing_voice_sheet_close_a11y}
            className="absolute inset-0 bg-narvo-ink/55 backdrop-blur-sm sm:backdrop-blur-md"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={instantExit()}
            transition={{ duration: backdropDuration }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-modal-title"
            aria-describedby="voice-modal-desc"
            className="relative w-full max-w-[min(100%,20rem)] sm:max-w-[22rem] max-h-[min(85dvh,32rem)] overflow-hidden rounded-[20px] sm:rounded-[24px] bg-white/95 dark:bg-narvo-ink/95 shadow-2xl border border-narvo-ink/8 dark:border-white/10"
            style={{
              boxShadow: '0 0 0 1px rgba(15,95,115,0.08), 0 16px 48px rgba(23, 50, 74, 0.10)',
            }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={exitPanel}
            transition={panelTransition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[min(85dvh,32rem)] overflow-y-auto overflow-x-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-narvo-ink/8 dark:border-white/10 flex justify-between items-start gap-2">
                <div className="min-w-0 pr-2">
                  <p className="mb-1 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-narvo-teal/85 dark:text-narvo-mint/80">
                    {COPY.landing_voice_kicker}
                  </p>
                  <h3
                    id="voice-modal-title"
                    className="font-serif text-lg font-bold leading-tight tracking-tight text-narvo-ink dark:text-white"
                  >
                    {COPY.landing_voice_modal_title}
                  </h3>
                  <p id="voice-modal-desc" className="mt-1 text-xs leading-snug text-narvo-ink/50 dark:text-white/45">
                    {COPY.landing_voice_modal_desc}
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="p-2 shrink-0 rounded-full hover:bg-narvo-mist dark:hover:bg-white/10 text-narvo-ink dark:text-white transition-colors"
                  aria-label={COPY.landing_voice_modal_close_a11y}
                >
                  <X size={18} aria-hidden />
                </motion.button>
              </div>

              <div className="px-4 py-3 space-y-4">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="voice-error"
                      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? instantExit() : { opacity: 0, y: -3 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22 }}
                      className="p-3 bg-narvo-vermilion/10 text-narvo-vermilion text-xs font-medium rounded-xl text-center leading-snug border border-narvo-vermilion/15"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-narvo-ink/50 dark:text-white/45">
                    {COPY.landing_voice_pick_engine_label}
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    {availableVoices.map((voice, i) => (
                      <motion.button
                        key={voice}
                        type="button"
                        onClick={() => setSelectedVoice(voice)}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { delay: i * STAGGER_MS, duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
                        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          selectedVoice === voice
                            ? 'bg-narvo-teal text-white shadow-sm'
                            : 'bg-narvo-mist dark:bg-white/10 text-narvo-ink dark:text-white'
                        }`}
                      >
                        {voice}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold leading-tight text-narvo-ink dark:text-white">
                    {COPY.onboard_lang_voice_title}
                  </h4>
                  <p className="mb-2 mt-0.5 text-[11px] leading-snug text-narvo-ink/45 dark:text-white/40">
                    {COPY.landing_voice_tap_listen_hint}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {languages.map((lang, i) => (
                      <motion.div
                        key={lang.name}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { delay: 0.08 + i * STAGGER_MS, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-narvo-ink/6 dark:border-white/8 hover:bg-narvo-mist/70 dark:hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-narvo-teal/12 flex items-center justify-center text-narvo-teal">
                            <Globe2 size={16} aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-narvo-ink dark:text-white truncate leading-tight">{lang.name}</div>
                            <div className="text-[10px] text-narvo-ink/45 dark:text-white/40 truncate">{lang.sub}</div>
                          </div>
                        </div>
                        <motion.button
                          type="button"
                          onClick={() => togglePlay(lang)}
                          disabled={isLoading && playing !== lang.name}
                          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                          aria-label={COPY.landing_voice_listen_sample_a11y.replace('{language}', lang.name)}
                          title={COPY.landing_voice_listen_sample_title}
                          className={`shrink-0 p-2 rounded-full transition-colors ${
                            playing === lang.name
                              ? 'bg-narvo-vermilion text-white'
                              : 'bg-white dark:bg-narvo-ink text-narvo-ink dark:text-white shadow-sm ring-1 ring-narvo-ink/6 dark:ring-white/10'
                          }`}
                        >
                          {playing === lang.name ? (
                            <Volume2 size={16} className={!reduceMotion && isLoading ? 'animate-spin' : ''} aria-hidden />
                          ) : (
                            <Play size={16} fill="currentColor" aria-hidden />
                          )}
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 pt-1 bg-narvo-mist/35 dark:bg-black/20 border-t border-narvo-ink/6 dark:border-white/8">
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  className="w-full py-3 bg-narvo-ink dark:bg-narvo-teal text-white rounded-full font-bold text-sm hover:bg-black dark:hover:bg-narvo-teal/85 transition-colors"
                >
                  {COPY.cta_continue}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const isAuthenticated = false; // Mock auth state

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed top-0 left-0 right-0 z-[90] transition-colors duration-300 ${isScrolled ? 'py-2.5 sm:py-4 bg-white/85 dark:bg-narvo-ink/85 backdrop-blur-md shadow-sm' : 'py-4 sm:py-6 md:py-8 bg-transparent'}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-8 max-w-7xl mx-auto w-full min-h-[52px]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-narvo-teal rounded-lg sm:rounded-xl shadow-lg shadow-narvo-teal/20 shrink-0">
            <span className="font-serif text-xl sm:text-2xl font-bold text-white leading-none">N</span>
          </div>
          <span className="text-lg sm:text-2xl font-serif font-bold tracking-tight text-narvo-ink dark:text-white truncate">Narvo</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2.5 sm:p-3 rounded-full bg-narvo-mist dark:bg-white/10 text-narvo-ink dark:text-white touch-manipulation ${reduceMotion ? '' : 'hover:scale-105 active:scale-95'} transition-transform`}
            aria-label={COPY.landing_theme_toggle_a11y}
          >
            {theme === 'light' ? <Moon size={18} className="sm:w-5 sm:h-5" /> : <Sun size={18} className="sm:w-5 sm:h-5" />}
          </button>
          <Link
            href={isAuthenticated ? "/dashboard" : "/auth"}
            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-full bg-narvo-vermilion text-white text-xs sm:text-[14px] font-bold shadow-lg shadow-narvo-vermilion/20 whitespace-nowrap touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${reduceMotion ? '' : 'hover:scale-105 active:scale-95'} transition-transform`}
          >
            {COPY.cta_play}
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

const Hero = ({ onTryClick }: { onTryClick: () => void }) => {
  const reduceMotion = usePrefersReducedMotion();
  const isAuthenticated = false; // Mock auth state
  const enter = reduceMotion ? { duration: 0 } : { duration: 0.36, ease: [0.25, 0.1, 0.25, 1] as const };
  return (
    <section
      data-landing-hero-frame
      className="landing-hero-frame px-4 sm:px-8 pt-28 sm:pt-36 md:pt-40 pb-14 sm:pb-16 md:pb-20 max-w-7xl mx-auto w-full relative z-10"
    >
      <div className="flex flex-col lg:flex-row justify-between items-center text-center lg:items-start lg:text-left gap-8 sm:gap-10 lg:gap-12">
        <div className="max-w-3xl w-full flex flex-col items-center lg:items-stretch">
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={enter}
            className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] sm:tracking-[0.25em] text-narvo-teal/60 uppercase mb-4 sm:mb-6 block"
          >
            {COPY.brand_subtitle}
          </motion.span>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enter, delay: reduceMotion ? 0 : 0.06 }}
            className="text-[2rem] min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-[clamp(2.75rem,6vw,5rem)] font-serif font-medium tracking-tight leading-[1.05] sm:leading-[0.98] text-narvo-ink dark:text-white"
          >
            {COPY.landing_hero_headline_line1} <br />
            <span className="italic text-narvo-vermilion">{COPY.landing_hero_headline_emphasis}</span>
          </motion.h1>
        </div>
        <div className="w-full max-w-[360px] lg:mt-12 xl:mt-16 flex flex-col items-center lg:items-stretch">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enter, delay: reduceMotion ? 0 : 0.12 }}
            className="text-[15px] sm:text-[17px] md:text-[18px] text-narvo-ink/60 dark:text-white/60 leading-relaxed mb-8 sm:mb-10 font-sans text-center lg:text-left max-w-xl lg:max-w-none"
          >
            {COPY.landing_subtitle}
          </motion.p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enter, delay: reduceMotion ? 0 : 0.18 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md lg:max-w-none justify-center lg:justify-start items-stretch sm:items-center"
          >
            <Link
              href={isAuthenticated ? "/dashboard" : "/auth"}
              className="group flex items-center justify-center gap-2 sm:gap-3 bg-narvo-ink dark:bg-narvo-teal text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-black dark:hover:bg-narvo-teal/80 transition-all shadow-xl shadow-narvo-ink/10 text-center min-h-[48px]"
            >
              <span className="text-sm font-bold uppercase tracking-wider sm:text-[15px]">
                {COPY.landing_cta_start_listening}
              </span>
              <Play size={18} fill="currentColor" className="shrink-0" />
            </Link>
            <button
              type="button"
              onClick={onTryClick}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-full border border-narvo-ink/10 dark:border-white/10 text-narvo-ink dark:text-white font-bold hover:bg-narvo-mist dark:hover:bg-white/5 transition-colors backdrop-blur-sm min-h-[48px] text-center"
            >
              {COPY.landing_cta_try_first}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureSlider = () => {
  const reduceMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const springScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const parallaxY = useTransform(springScroll, [0, 1], reduceMotion ? [0, 0] : [0, -200]);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LANDING_FEATURES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveIndex(index);
    }
  };

  return (
    <section ref={containerRef} className="px-4 sm:px-8 pb-20 sm:pb-32 max-w-7xl mx-auto w-full">
      <div
        className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 min-h-0 lg:h-[min(650px,85vh)] max-lg:max-w-xl max-lg:mx-auto"
        role="region"
        aria-label={COPY.landing_feature_slider_aria}
      >
        {LANDING_FEATURES.map((feature, idx) => {
          const isActive = idx === activeIndex;
          return (
            <motion.div
              key={feature.id}
              layout
              onClick={() => setActiveIndex(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              whileHover={reduceMotion || isActive ? undefined : { scale: 1.015 }}
              whileTap={reduceMotion ? undefined : { scale: isActive ? 0.99 : 0.985 }}
              tabIndex={0}
              role="button"
              aria-expanded={isActive}
              aria-label={COPY.landing_feature_view_a11y.replace('{title}', feature.title)}
              className={`relative rounded-[28px] sm:rounded-[40px] lg:rounded-[56px] overflow-hidden cursor-pointer shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-narvo-ink lg:min-h-0 ${
                isActive
                  ? 'max-lg:min-h-[min(28rem,78svh)] max-lg:flex-none flex-[6] lg:flex-[4]'
                  : 'max-lg:h-[4.75rem] max-lg:min-h-0 max-lg:flex-none max-lg:shrink-0 flex-[1] lg:min-h-0 lg:flex-[0.95] lg:min-w-[6.75rem]'
              }`}
              style={{ backgroundColor: feature.color }}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-48px' }}
              transition={
                reduceMotion
                  ? { duration: 0.01 }
                  : {
                      layout: LAYOUT_SPRING,
                      delay: idx * STAGGER_MS,
                      duration: 0.32,
                      ease: [0.25, 0.1, 0.25, 1],
                    }
              }
            >
              <div className="absolute inset-0 w-full h-full">
                <motion.div
                  style={{ y: isActive && !reduceMotion ? parallaxY : 0 }}
                  className="absolute inset-0 size-full min-h-full overflow-hidden"
                >
                  <Image
                    src={feature.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={idx === 0}
                    className={`!h-full !w-full min-h-full min-w-full scale-105 object-cover object-center grayscale transition-opacity duration-700 ${isActive ? 'opacity-40' : 'opacity-25 lg:opacity-35'}`}
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                <div
                  className={`absolute inset-0 bg-gradient-to-b pointer-events-none transition-opacity duration-700 ${
                    isActive
                      ? 'from-transparent via-black/20 to-black/60 opacity-100'
                      : 'from-black/45 via-black/35 to-black/55 opacity-0 lg:opacity-100'
                  }`}
                />
              </div>

              <div
                className={`absolute inset-0 z-10 flex min-h-0 flex-col p-4 sm:p-8 lg:p-12 xl:p-14 ${
                  isActive
                    ? 'justify-between max-lg:overflow-y-auto max-lg:overscroll-y-contain lg:justify-between'
                    : 'justify-center max-lg:px-4 max-lg:py-2 lg:justify-between'
                }`}
              >
                <div
                  className={`min-w-0 w-full min-h-0 shrink-0 ${
                    isActive ? 'max-w-md lg:max-w-lg max-lg:pb-3' : 'max-lg:max-h-full max-lg:overflow-hidden'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isActive ? (
                      <motion.div
                        key={`content-${feature.id}`}
                        initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduceMotion ? instantExit() : { opacity: 0, x: 12 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-white/85 uppercase mb-2 sm:mb-4 block">
                          {feature.tag}
                        </span>
                        <h2 className="text-2xl min-[400px]:text-3xl sm:text-4xl lg:text-[52px] font-serif font-medium mb-3 sm:mb-6 text-white leading-[1.08] sm:leading-[1.02] tracking-tight break-words">
                          {feature.title}
                        </h2>
                        <p className="text-sm min-[400px]:text-base sm:text-lg lg:text-[18px] text-white/90 leading-relaxed font-sans break-words">
                          {feature.description}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`collapsed-${feature.id}`}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={instantExit()}
                        transition={{ duration: reduceMotion ? 0 : 0.25 }}
                        className="flex min-h-0 w-full flex-col items-stretch justify-center max-lg:flex-row max-lg:items-center max-lg:gap-3 max-lg:text-left lg:py-2"
                      >
                        <span className="font-mono text-[9px] lg:text-[10px] font-bold tracking-[0.18em] text-white/75 uppercase mb-1 max-lg:mb-0 text-center max-lg:text-left leading-tight break-words max-lg:line-clamp-2 max-lg:shrink lg:mb-2">
                          {feature.tag}
                        </span>
                        <h2 className="text-[14px] sm:text-base lg:text-[17px] font-serif font-medium text-white text-center max-lg:text-left leading-snug break-words hyphens-auto max-lg:line-clamp-2 max-lg:min-w-0 lg:px-2 max-lg:px-0">
                          {feature.title}
                        </h2>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isActive && (
                  <motion.div
                    className="mt-4 flex shrink-0 justify-between items-end max-lg:mt-auto max-lg:pt-3 sm:mt-6"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0.01 } : { delay: 0.08, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <div className="bg-white/10 backdrop-blur-xl p-3 sm:p-4 lg:p-8 rounded-[20px] sm:rounded-[24px] lg:rounded-[36px] border border-white/20 flex flex-col gap-3 sm:gap-4 lg:gap-6 shadow-2xl w-full max-w-full min-w-0">
                      <div className="flex gap-2.5 sm:gap-3 lg:gap-4 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-16 lg:h-16 shrink-0 rounded-[14px] sm:rounded-[15px] lg:rounded-[20px] flex items-center justify-center shadow-lg" style={{ backgroundColor: feature.color }}>
                          {feature.icon}
                        </div>
                        <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-16 lg:h-16 shrink-0 rounded-[14px] sm:rounded-[15px] lg:rounded-[20px] bg-white/10 flex items-center justify-center text-white font-mono font-bold text-base sm:text-lg lg:text-xl border border-white/10">
                          0{idx + 1}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                        <div className="h-1.5 min-w-[4rem] flex-1 sm:flex-none sm:w-20 lg:w-32 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            key={`progress-${idx}`}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: reduceMotion ? 0.01 : 6, ease: 'linear' }}
                            className="h-full bg-white"
                          />
                        </div>
                        <span className="font-mono text-[8px] sm:text-[9px] lg:text-[10px] text-white/65 leading-snug break-words max-w-full">
                          {COPY.landing_feature_progress_caption}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

const StatsSection = () => {
  const reduceMotion = usePrefersReducedMotion();
  const stats = useMemo(
    () => [
      { value: COPY.landing_stats_sources_value, label: COPY.landing_stats_sources_label, color: 'text-narvo-vermilion' },
      { value: COPY.landing_stats_briefing_value, label: COPY.landing_stats_briefing_label, color: 'text-narvo-butter' },
      { value: COPY.landing_stats_clarity_value, label: COPY.landing_stats_clarity_label, color: 'text-narvo-mint' },
      { value: COPY.landing_stats_stories_value, label: COPY.landing_stats_stories_label, color: 'text-narvo-teal' },
    ],
    []
  );

  return (
    <section className="px-4 sm:px-8 py-16 sm:py-24 md:py-32 bg-narvo-ink text-white">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
          className="text-center mb-10 sm:mb-16 md:mb-20"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="mb-4 px-2 font-serif text-3xl font-medium sm:mb-6 sm:text-4xl md:text-5xl lg:text-7xl">
            {COPY.landing_stats_headline_lead} <br className="sm:hidden" />
            <span className="italic text-narvo-mint">{COPY.landing_stats_headline_emphasis}</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-32px' }}
              transition={reduceMotion ? { duration: 0 } : { delay: i * 0.07, duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              className="p-6 sm:p-8 md:p-10 rounded-[24px] sm:rounded-[32px] md:rounded-[40px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <div
                className={`text-5xl sm:text-6xl font-serif font-bold mb-4 sm:mb-6 ${stat.color} origin-left ${reduceMotion ? '' : 'group-hover:scale-105'} transition-transform`}
              >
                {stat.value}
              </div>
              <p className="text-white/60 text-base sm:text-lg leading-relaxed">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const LIVE_ICONS = [Newspaper, Search, Globe2, Play, Volume2, Coffee, ShieldCheck] as const;

const LiveNewsSection = () => {
  const reduceMotion = usePrefersReducedMotion();
  const [news, setNews] = useState<ApiNewsListItem[]>([]);
  const [breakingLead, setBreakingLead] = useState<ApiNewsListItem | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLiveLoading(true);
    void Promise.all([fetchNewsList({ limit: 9 }), fetchBreakingNews()])
      .then(([n, b]) => {
        if (!cancelled) {
          setNews(Array.isArray(n) ? n.slice(0, 9) : []);
          setBreakingLead(Array.isArray(b) && b[0]?.id ? b[0] : null);
          setLiveError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setNews([]);
          setBreakingLead(null);
          setLiveError(e instanceof Error ? e.message : COPY.landing_live_load_failed);
        }
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveBlurb =
    news.length > 0
      ? news.length === 1
        ? COPY.landing_live_blurb_one
        : COPY.landing_live_blurb_many.replace('{n}', String(news.length))
      : COPY.landing_live_blurb_fallback;

  return (
    <section className="py-16 sm:py-24 md:py-32 overflow-x-hidden w-full">
      <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full mb-8 sm:mb-10 md:mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-5 sm:gap-6">
        <motion.div
          className="max-w-xl w-full"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="mb-3 text-3xl font-serif font-medium text-narvo-ink dark:text-white sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
            {COPY.landing_live_headline_lead} <br />
            <span className="italic text-narvo-vermilion">{COPY.landing_live_headline_emphasis}</span>
          </h2>
          <p className="text-[14px] leading-relaxed text-narvo-ink/50 dark:text-white/50 sm:text-base">
            {liveLoading ? COPY.landing_live_loading : liveError ? liveError : liveBlurb}
          </p>
        </motion.div>
        <motion.div
          className="flex flex-wrap gap-3 sm:gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={reduceMotion ? { duration: 0 } : { delay: 0.08, duration: 0.3 }}
        >
          <div className="flex items-center gap-2 rounded-full bg-narvo-mint/10 px-4 py-2 text-xs font-bold text-narvo-mint">
            <ShieldCheck size={14} aria-hidden /> {COPY.news_cross_checked}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-narvo-teal/10 px-4 py-2 text-xs font-bold text-narvo-teal">
            <Globe2 size={14} aria-hidden /> {COPY.landing_regions_badge}
          </div>
        </motion.div>
      </div>

      <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full">
        {breakingLead?.id ? (
          <div className="mb-6 sm:mb-8">
            <Link
              href={`/news/${breakingLead.id}`}
              className="flex items-center gap-3 sm:gap-4 rounded-[20px] border border-narvo-vermilion/30 bg-gradient-to-r from-narvo-vermilion/10 to-transparent dark:from-narvo-vermilion/20 px-4 py-3.5 sm:px-5 sm:py-4 text-left transition-all hover:border-narvo-vermilion/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-vermilion/35"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25">
                <ShieldCheck size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-vermilion sm:text-[10px]">
                  {COPY.landing_breaking_strip_kicker}
                </p>
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-narvo-ink dark:text-white sm:text-base">
                  {breakingLead.title || COPY.landing_breaking_title_fallback}
                </p>
              </div>
              <ChevronRight className="shrink-0 text-narvo-ink/35 dark:text-white/35" size={20} aria-hidden />
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-6 sm:pb-8">
          {liveLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="h-[280px] rounded-[24px] sm:rounded-[32px] bg-narvo-mist/40 dark:bg-white/[0.06] animate-pulse"
                />
              ))
            : null}
          {!liveLoading && !liveError && news.length === 0 ? (
            <p className="col-span-full py-12 text-center font-medium text-narvo-ink/45 dark:text-white/45">
              {COPY.landing_live_empty}
            </p>
          ) : null}
          {!liveLoading &&
            news.map((item, i) => {
              const Icon = LIVE_ICONS[i % LIVE_ICONS.length];
              return (
                <motion.div
                  key={item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { delay: (i % 6) * 0.04, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
                  }
                  className="h-full min-h-0"
                >
                  <StoryCardLargeLanding item={item} icon={Icon} reduceMotion={reduceMotion} />
                </motion.div>
              );
            })}
        </div>
      </div>
    </section>
  );
};

const PreFooter = ({ onTryClick }: { onTryClick: () => void }) => {
  const reduceMotion = usePrefersReducedMotion();
  const isAuthenticated = false; // Mock auth state
  return (
    <section className="px-4 sm:px-8 py-14 sm:py-20 md:py-24 lg:py-32 max-w-7xl mx-auto w-full">
      <motion.div
        className="relative rounded-[24px] sm:rounded-[40px] lg:rounded-[56px] xl:rounded-[64px] bg-narvo-teal p-6 sm:p-10 md:p-14 lg:p-20 xl:p-24 overflow-hidden text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-1">
          <h2 className="mb-6 font-serif text-2xl font-medium leading-[1.08] text-white sm:mb-8 sm:text-4xl sm:leading-tight md:mb-12 md:text-5xl lg:text-7xl xl:text-8xl">
            {COPY.landing_prefooter_line1} <br />
            <span className="italic text-narvo-butter">{COPY.landing_prefooter_emphasis}</span>
          </h2>
          <motion.div
            className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 md:gap-6"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.1, duration: 0.34 }}
          >
            <Link
              href={isAuthenticated ? "/dashboard" : "/auth"}
              className={`px-6 sm:px-10 md:px-12 py-3.5 sm:py-5 md:py-6 bg-narvo-vermilion text-white text-sm sm:text-lg md:text-xl font-bold rounded-full shadow-2xl shadow-narvo-vermilion/40 inline-flex items-center justify-center text-center min-h-[48px] ${reduceMotion ? '' : 'hover:scale-[1.02] active:scale-[0.98]'} transition-transform`}
            >
              {COPY.landing_cta_start_listening}
            </Link>
            <button
              type="button"
              onClick={onTryClick}
              className="min-h-[48px] rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/20 sm:px-10 sm:py-5 sm:text-lg md:px-12 md:py-6 md:text-xl"
            >
              {COPY.landing_cta_listen_sample}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// --- Main Page ---

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  return (
    <main className="min-h-screen flex flex-col relative overflow-x-hidden">
      <LanguageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Background Texture & Waves */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-20 dark:opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/paper.png')] dark:invert" />
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.path
            initial={{ d: 'M0,50 Q25,45 50,50 T100,50' }}
            animate={
              reduceMotion
                ? { d: 'M0,50 Q25,50 50,50 T100,50' }
                : { d: 'M0,50 Q25,55 50,50 T100,50' }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 10, repeat: Infinity, repeatType: 'reverse' }
            }
            stroke="rgba(15, 95, 115, 0.1)"
            fill="none"
            strokeWidth="0.2"
          />
        </svg>
      </div>

      <Navbar />
      <ScrollToTop />

      <div className="relative">
        <MeshBackground />
        <div className="relative z-10">
          <Hero onTryClick={() => setIsModalOpen(true)} />
          <FeatureSlider />
        </div>
      </div>

      <StatsSection />

      <LiveNewsSection />

      <PreFooter onTryClick={() => setIsModalOpen(true)} />

      <motion.footer
        className="px-4 sm:px-8 py-8 sm:py-10 md:py-12 max-w-7xl mx-auto w-full border-t border-narvo-ink/5 dark:border-white/5"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 lg:gap-12">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-narvo-teal rounded-lg">
              <span className="font-serif text-lg font-bold text-white leading-none">N</span>
            </div>
            <span className="text-lg sm:text-xl font-serif font-bold text-narvo-ink dark:text-white">Narvo</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-8 text-narvo-ink/60 dark:text-white/60 text-xs sm:text-sm font-medium max-w-md md:max-w-none">
            <button type="button" className="min-h-[44px] px-1 transition-colors hover:text-narvo-teal">
              {COPY.landing_footer_privacy}
            </button>
            <button type="button" className="min-h-[44px] px-1 transition-colors hover:text-narvo-teal">
              {COPY.landing_footer_terms}
            </button>
            <button type="button" className="min-h-[44px] px-1 transition-colors hover:text-narvo-teal">
              {COPY.landing_footer_cookies}
            </button>
            <button type="button" className="min-h-[44px] px-1 transition-colors hover:text-narvo-teal">
              {COPY.landing_footer_contact}
            </button>
          </div>
        </div>
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-narvo-ink/5 dark:border-white/5 text-center text-narvo-ink/30 dark:text-white/30 font-mono text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase px-2">
          {COPY.landing_footer_copyright}
        </div>
      </motion.footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}
