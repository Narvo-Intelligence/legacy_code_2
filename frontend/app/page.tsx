'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import { Play, Globe2, ShieldCheck, Coffee, X, Volume2, Download, Newspaper, Search, ChevronUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { COPY } from '@/lib/narvo-app-copy';
import { narvoTrack } from '@/lib/narvo-analytics';
import {
  fetchNewsList,
  fetchBreakingNews,
  fetchTtsVoices,
  postTtsLandingPreview,
  NarvoApiError,
  type ApiNewsListItem,
  type ApiVoiceProfile,
} from '@/lib/narvo-api';

import { MeshBackground } from '@/components/MeshBackground';
import { StoryCardLargeLanding } from '@/components/StoryCardLarge';
import { useIsNarvoAuthenticated } from '@/hooks/use-is-narvo-authenticated';
import { NarvoLogoMark } from '@/components/NarvoLogo';

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
    icon: <Coffee className="h-[1.2rem] w-[1.2rem] shrink-0 text-white sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={2.5} />,
    tag: '🗞️',
  },
  {
    id: 'audio',
    image:
      'https://images.unsplash.com/photo-1589441321898-77270ae16d55?auto=format&fit=crop&q=80&w=1200',
    color: '#0f5f73',
    icon: <Play className="h-[1.2rem] w-[1.2rem] shrink-0 text-white sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={2.5} />,
    tag: '🔉',
  },
  {
    id: 'language',
    image:
      'https://images.unsplash.com/photo-1518601794912-1af91724e528?auto=format&fit=crop&q=80&w=1200',
    color: '#acb6ff',
    icon: <Globe2 className="h-[1.2rem] w-[1.2rem] shrink-0 text-white sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={2.5} />,
    tag: '🤟🏽',
  },
  {
    id: 'trust',
    image:
      'https://images.unsplash.com/photo-1685517905478-829e2951b856?auto=format&fit=crop&q=80&w=1200',
    color: '#7fddca',
    icon: <ShieldCheck className="h-[1.2rem] w-[1.2rem] shrink-0 text-white sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={2.5} />,
    tag: '✅',
  },
  {
    id: 'offline',
    image:
      'https://images.unsplash.com/photo-1592199664258-d96d8c5ff6a5?auto=format&fit=crop&q=80&w=1200',
    color: '#17324a',
    icon: <Download className="h-[1.2rem] w-[1.2rem] shrink-0 text-white sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={2.5} />,
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

const FALLBACK_VOICE_PROFILES: ApiVoiceProfile[] = [
  { id: 'emma', name: 'Emma', accent: 'English', language: 'en' },
  { id: 'wura', name: 'Wura', accent: 'Pidgin', language: 'pcm' },
  { id: 'idera', name: 'Idera', accent: 'Yoruba', language: 'yo' },
  { id: 'zainab', name: 'Zainab', accent: 'Hausa', language: 'ha' },
  { id: 'osagie', name: 'Osagie', accent: 'Igbo', language: 'ig' },
];

const VOICE_ORDER = ['emma', 'wura', 'idera', 'zainab', 'osagie'] as const;

function sortVoiceProfiles(list: ApiVoiceProfile[]): ApiVoiceProfile[] {
  const rank = new Map<string, number>(VOICE_ORDER.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ra = rank.get(a.id) ?? 99;
    const rb = rank.get(b.id) ?? 99;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}

function pickDefaultVoiceId(profiles: ApiVoiceProfile[]): string {
  const ids = new Set(profiles.map((p) => p.id));
  for (const id of VOICE_ORDER) {
    if (ids.has(id)) return id;
  }
  return profiles[0]?.id ?? 'emma';
}

/** English preview uses selected voice when it is an English narrator; otherwise Emma. */
function voiceIdForEnglishRow(selectedId: string, profiles: ApiVoiceProfile[]): string {
  const p = profiles.find((x) => x.id === selectedId);
  if (p?.language === 'en') return selectedId;
  return 'emma';
}

const LANDING_PREVIEW_ROWS: { voiceId: string; title: keyof typeof COPY; sub: keyof typeof COPY }[] = [
  { voiceId: 'emma', title: 'landing_voice_preview_row_en_title', sub: 'landing_voice_preview_row_en_sub' },
  { voiceId: 'wura', title: 'landing_voice_preview_row_pcm_title', sub: 'landing_voice_preview_row_pcm_sub' },
  { voiceId: 'idera', title: 'landing_voice_preview_row_yo_title', sub: 'landing_voice_preview_row_yo_sub' },
  { voiceId: 'zainab', title: 'landing_voice_preview_row_ha_title', sub: 'landing_voice_preview_row_ha_sub' },
  { voiceId: 'osagie', title: 'landing_voice_preview_row_ig_title', sub: 'landing_voice_preview_row_ig_sub' },
];

const LanguageModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const reduceMotion = usePrefersReducedMotion();
  const [voiceProfiles, setVoiceProfiles] = useState<ApiVoiceProfile[]>(FALLBACK_VOICE_PROFILES);
  const [selectedVoiceId, setSelectedVoiceId] = useState('emma');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.src = '';
      el.load();
    }
    audioRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      setPlayingVoiceId(null);
      setLoadingVoiceId(null);
      return;
    }
    let cancelled = false;
    void fetchTtsVoices().then((list) => {
      if (cancelled) return;
      const sorted = sortVoiceProfiles(list.length > 0 ? list : FALLBACK_VOICE_PROFILES);
      setVoiceProfiles(sorted);
      setSelectedVoiceId((prev) => {
        if (sorted.some((v) => v.id === prev)) return prev;
        return pickDefaultVoiceId(sorted);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => stopPlayback();
  }, []);

  const playRow = async (rowVoiceId: string) => {
    const targetId = rowVoiceId === 'emma' ? voiceIdForEnglishRow(selectedVoiceId, voiceProfiles) : rowVoiceId;

    if (playingVoiceId === targetId && !loadingVoiceId) {
      stopPlayback();
      setPlayingVoiceId(null);
      return;
    }

    stopPlayback();
    setLoadingVoiceId(targetId);
    setPlayingVoiceId(null);
    setError(null);

    try {
      const { audio_url } = await postTtsLandingPreview(targetId);
      if (!audio_url?.trim()) throw new Error('empty audio');

      const el = new Audio(audio_url);
      audioRef.current = el;
      el.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      el.onerror = () => {
        setError(COPY.landing_tts_error_line);
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      await el.play();
      setPlayingVoiceId(targetId);
      if (rowVoiceId === 'emma') setSelectedVoiceId(targetId);
    } catch (err) {
      console.error('[landing voice preview]', err);
      const msg =
        err instanceof NarvoApiError ? err.message : COPY.landing_tts_error_line;
      setError(msg);
      setPlayingVoiceId(null);
      setTimeout(() => setError(null), 6000);
    } finally {
      setLoadingVoiceId(null);
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
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
                    {voiceProfiles.map((v, i) => (
                      <motion.button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVoiceId(v.id)}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { delay: i * STAGGER_MS, duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
                        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selectedVoiceId === v.id
                            ? 'bg-narvo-teal text-white shadow-sm'
                            : 'bg-narvo-mist text-narvo-ink dark:bg-white/10 dark:text-white'
                        }`}
                      >
                        {v.name?.trim() || v.id}
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
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {LANDING_PREVIEW_ROWS.map((row, i) => {
                      const title = COPY[row.title];
                      const sub = COPY[row.sub];
                      const targetId =
                        row.voiceId === 'emma'
                          ? voiceIdForEnglishRow(selectedVoiceId, voiceProfiles)
                          : row.voiceId;
                      const busyHere = loadingVoiceId === targetId;
                      const playingHere = playingVoiceId === targetId && !busyHere;
                      return (
                        <motion.div
                          key={row.voiceId}
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { delay: 0.08 + i * STAGGER_MS, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }
                          }
                          className="group flex items-center justify-between gap-2 rounded-xl border border-narvo-ink/6 p-2.5 transition-colors hover:bg-narvo-mist/70 dark:border-white/8 dark:hover:bg-white/[0.04]"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-narvo-teal/12 text-narvo-teal">
                              <Globe2 size={16} aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold leading-tight text-narvo-ink dark:text-white">{title}</div>
                              <div className="truncate text-[10px] text-narvo-ink/45 dark:text-white/40">{sub}</div>
                            </div>
                          </div>
                          <motion.button
                            type="button"
                            onClick={() => void playRow(row.voiceId)}
                            disabled={loadingVoiceId !== null && loadingVoiceId !== targetId}
                            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                            aria-label={COPY.landing_voice_listen_sample_a11y.replace('{language}', title)}
                            title={COPY.landing_voice_listen_sample_title}
                            className={`shrink-0 rounded-full p-2 transition-colors ${
                              playingHere || busyHere
                                ? 'bg-narvo-vermilion text-white'
                                : 'bg-white text-narvo-ink shadow-sm ring-1 ring-narvo-ink/6 dark:bg-narvo-ink dark:text-white dark:ring-white/10'
                            }`}
                          >
                            {playingHere || busyHere ? (
                              <Volume2
                                size={16}
                                className={!reduceMotion && busyHere ? 'animate-spin' : ''}
                                aria-hidden
                              />
                            ) : (
                              <Play size={16} fill="currentColor" aria-hidden />
                            )}
                          </motion.button>
                        </motion.div>
                      );
                    })}
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
  const isAuthenticated = useIsNarvoAuthenticated();

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
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 md:px-8 max-w-7xl mx-auto w-full min-h-[52px]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex shrink-0 items-center justify-center rounded-lg bg-narvo-teal shadow-lg shadow-narvo-teal/20 sm:rounded-xl w-9 h-9 sm:w-10 sm:h-10">
            <NarvoLogoMark size="lg" inset="tight" />
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
            onClick={() =>
              narvoTrack('landing_cta_nav_play', {
                authenticated: isAuthenticated,
                href: isAuthenticated ? '/dashboard' : '/auth',
              })
            }
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
  const isAuthenticated = useIsNarvoAuthenticated();
  const enter = reduceMotion ? { duration: 0 } : { duration: 0.36, ease: [0.25, 0.1, 0.25, 1] as const };
  return (
    <section
      data-landing-hero-frame
      className="landing-hero-frame w-full px-3 pt-[calc(7rem+env(safe-area-inset-top,0px))] pb-12 sm:px-6 sm:pt-36 sm:pb-16 md:px-8 md:pt-40 md:pb-20 relative z-10"
    >
      <div className="flex flex-col lg:flex-row justify-between items-center text-center lg:items-start lg:text-left gap-6 sm:gap-8 md:gap-10 lg:gap-12">
        <div className="max-w-3xl w-full flex flex-col items-center lg:items-stretch">
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={enter}
            className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.12em] sm:tracking-[0.2em] text-narvo-teal/60 uppercase mb-3 sm:mb-5 md:mb-6 block"
          >
            {COPY.brand_subtitle}
          </motion.span>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enter, delay: reduceMotion ? 0 : 0.06 }}
            className="font-serif font-medium text-narvo-ink dark:text-white tracking-[-0.035em] sm:tracking-tight leading-[0.98] sm:leading-[0.98] text-[clamp(2.125rem,6.5vw,2.75rem)] min-[400px]:text-[clamp(2.25rem,7vw,3rem)] sm:text-5xl md:text-6xl lg:text-[clamp(2.75rem,6vw,5rem)]"
          >
            {COPY.landing_hero_headline_line1} <br />
            <span className="italic text-narvo-vermilion">{COPY.landing_hero_headline_emphasis}</span>
          </motion.h1>
        </div>
        <div className="w-full max-w-[22.5rem] sm:max-w-md lg:max-w-[360px] lg:mt-12 xl:mt-16 flex flex-col items-center lg:items-stretch">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enter, delay: reduceMotion ? 0 : 0.12 }}
            className="text-base sm:text-[17px] md:text-lg text-narvo-ink/60 dark:text-white/60 leading-[1.65] mb-6 sm:mb-8 md:mb-10 font-sans text-center lg:text-left max-w-xl lg:max-w-none"
          >
            {COPY.landing_subtitle}
          </motion.p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enter, delay: reduceMotion ? 0 : 0.18 }}
            className="flex flex-col gap-3 sm:gap-4 w-full max-w-md lg:max-w-none justify-center lg:justify-start items-stretch sm:flex-row sm:items-center"
          >
            <Link
              href={isAuthenticated ? "/dashboard" : "/auth"}
              onClick={() =>
                narvoTrack('landing_cta_hero_start_listening', {
                  authenticated: isAuthenticated,
                  href: isAuthenticated ? '/dashboard' : '/auth',
                })
              }
              className="group flex items-center justify-center gap-2 sm:gap-3 bg-narvo-ink dark:bg-narvo-teal text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-black dark:hover:bg-narvo-teal/80 transition-all shadow-xl shadow-narvo-ink/10 text-center min-h-[48px]"
            >
              <span className="text-sm font-bold uppercase tracking-wider sm:text-[15px]">
                {COPY.landing_cta_start_listening}
              </span>
              <Play size={18} fill="currentColor" className="shrink-0" />
            </Link>
            <button
              type="button"
              onClick={() => {
                narvoTrack('landing_cta_hero_try_first', { section: 'hero' });
                onTryClick();
              }}
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
    <section ref={containerRef} className="w-full px-3 sm:px-6 md:px-8 pb-16 sm:pb-24 md:pb-32 max-w-7xl mx-auto">
      <div
        className="mx-auto flex min-h-0 max-w-xl flex-col gap-3 sm:gap-4 max-lg:max-w-xl lg:mx-0 lg:h-[min(650px,85vh)] lg:max-w-none lg:flex-row lg:gap-6"
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
              className={`relative cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-narvo-ink max-lg:rounded-3xl max-lg:shadow-[0_16px_48px_rgba(23,50,74,0.10)] lg:min-h-0 lg:rounded-[56px] lg:shadow-xl ${
                isActive
                  ? 'max-lg:flex-none max-lg:min-h-[min(11rem,30svh)] max-lg:max-h-[min(20rem,50svh)] flex-[6] lg:max-h-none lg:min-h-0 lg:flex-[4]'
                  : 'max-lg:h-[4rem] max-lg:min-h-[4rem] max-lg:flex-none max-lg:shrink-0 min-[400px]:max-lg:h-[4.25rem] flex-[1] lg:min-h-0 lg:flex-[0.95] lg:min-w-[6.75rem]'
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
                className={`absolute inset-0 z-10 flex min-h-0 flex-col p-3 sm:p-6 md:p-8 lg:p-12 xl:p-14 ${
                  isActive
                    ? 'max-lg:min-h-0 max-lg:justify-between max-lg:overflow-y-auto max-lg:overscroll-y-contain justify-between'
                    : 'justify-center max-lg:px-3 max-lg:py-1.5 lg:justify-between'
                }`}
              >
                <div
                  className={`min-w-0 w-full min-h-0 shrink-0 ${
                    isActive ? 'max-w-md max-lg:pb-2 sm:max-lg:pb-3 lg:max-w-lg' : 'max-lg:max-h-full max-lg:overflow-hidden'
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
                        <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-white/85 sm:max-lg:mb-3 sm:max-lg:tracking-[0.18em] lg:mb-4 lg:font-bold lg:tracking-[0.22em]">
                          {feature.tag}
                        </span>
                        <h2 className="mb-2 min-[400px]:max-lg:mb-3 min-[400px]:max-lg:text-[1.625rem] break-words font-serif text-2xl font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:max-lg:mb-4 sm:max-lg:text-3xl sm:max-lg:leading-[1.04] md:max-lg:text-4xl lg:mb-6 lg:text-[52px] lg:font-medium lg:leading-[1.02] lg:tracking-tight">
                          {feature.title}
                        </h2>
                        <p className="break-words font-sans text-base leading-[1.65] text-white/90 sm:max-lg:text-lg lg:text-[18px] lg:leading-relaxed">
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
                        <span className="mb-1 max-lg:mb-0 max-lg:line-clamp-1 max-lg:shrink max-lg:text-left max-lg:tracking-[0.1em] text-center font-mono text-[9px] font-bold uppercase leading-tight text-white/75 min-[400px]:max-lg:line-clamp-2 lg:mb-2 lg:text-[10px] lg:tracking-[0.18em]">
                          {feature.tag}
                        </span>
                        <h2 className="hyphens-auto max-lg:line-clamp-2 max-lg:min-w-0 max-lg:px-0 max-lg:text-left break-words text-center font-serif text-[13px] font-medium leading-snug text-white min-[400px]:max-lg:text-sm sm:text-base lg:px-2 lg:text-[17px]">
                          {feature.title}
                        </h2>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isActive && (
                  <motion.div
                    className="mt-4 flex shrink-0 items-end justify-between max-lg:mt-auto max-lg:pt-2 sm:mt-6 sm:max-lg:mt-auto sm:max-lg:pt-3"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0.01 } : { delay: 0.08, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <div className="flex w-full min-w-0 max-w-full flex-col rounded-2xl border border-white/20 bg-white/10 p-2.5 shadow-[0_16px_48px_rgba(23,50,74,0.10)] backdrop-blur-xl max-lg:gap-2 sm:max-lg:gap-3 sm:max-lg:rounded-3xl sm:max-lg:p-4 lg:gap-6 lg:rounded-[36px] lg:p-8 lg:shadow-2xl">
                      <div className="flex min-w-0 gap-2 sm:max-lg:gap-3 lg:gap-4">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-[14px] shadow-lg sm:max-lg:size-12 lg:size-16 lg:rounded-[20px]"
                          style={{ backgroundColor: feature.color }}
                        >
                          {feature.icon}
                        </div>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/10 font-mono text-sm font-bold text-white sm:max-lg:size-12 sm:max-lg:text-base lg:size-16 lg:rounded-[20px] lg:text-xl">
                          0{idx + 1}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:max-lg:gap-3">
                        <div className="h-1.5 min-w-[3.5rem] flex-1 overflow-hidden rounded-full bg-white/10 sm:max-lg:flex-none sm:max-lg:w-20 lg:w-32">
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
    <section className="px-3 sm:px-6 md:px-8 py-16 sm:py-24 md:py-32 bg-narvo-ink text-white">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          className="text-center mb-10 sm:mb-16 md:mb-20"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="mb-4 px-1 font-serif text-[clamp(1.75rem,5.5vw,2.25rem)] font-medium leading-[1.06] tracking-[-0.03em] sm:mb-6 sm:px-2 sm:text-4xl sm:leading-tight md:text-5xl lg:text-7xl">
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
              className="rounded-3xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10 sm:rounded-[32px] sm:p-8 md:rounded-[40px] md:p-10 group"
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

const LIVE_NEWS_POLL_MS = 90_000;

const LiveNewsSection = () => {
  const reduceMotion = usePrefersReducedMotion();
  const [news, setNews] = useState<ApiNewsListItem[]>([]);
  const [breakingLead, setBreakingLead] = useState<ApiNewsListItem | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = (isInitial: boolean) => {
      if (isInitial) setLiveLoading(true);
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
            if (isInitial) {
              setNews([]);
              setBreakingLead(null);
            }
            setLiveError(e instanceof Error ? e.message : COPY.landing_live_load_failed);
          }
        })
        .finally(() => {
          if (!cancelled && isInitial) setLiveLoading(false);
        });
    };

    load(true);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') load(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, LIVE_NEWS_POLL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, []);

  const liveBlurb =
    news.length > 0
      ? news.length === 1
        ? COPY.landing_live_blurb_one
        : COPY.landing_live_blurb_many.replace('{n}', String(news.length))
      : COPY.landing_live_blurb_fallback;

  const liveIntroLine = liveLoading
    ? COPY.landing_live_loading
    : liveError && news.length === 0
      ? liveError
      : liveBlurb;

  return (
    <section className="w-full overflow-x-hidden py-16 sm:py-24 md:py-32">
      <div className="mx-auto mb-8 flex w-full max-w-7xl flex-col gap-5 px-3 sm:mb-10 sm:gap-6 sm:px-6 md:mb-12 md:flex-row md:items-end md:justify-between md:px-8">
        <motion.div
          className="max-w-xl w-full"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="mb-3 font-serif text-[clamp(1.75rem,5.5vw,2.25rem)] font-medium leading-[1.06] tracking-[-0.03em] text-narvo-ink dark:text-white sm:mb-4 sm:text-4xl sm:leading-tight md:text-5xl lg:text-6xl">
            {COPY.landing_live_headline_lead} <br />
            <span className="italic text-narvo-vermilion">{COPY.landing_live_headline_emphasis}</span>
          </h2>
          <p className="text-[14px] leading-relaxed text-narvo-ink/50 dark:text-white/50 sm:text-base">
            {liveIntroLine}
            {!liveLoading && liveError && news.length > 0 ? (
              <span className="mt-2 block text-[13px] font-medium leading-snug text-narvo-vermilion/90 dark:text-narvo-vermilion/85">
                {COPY.landing_live_stale_refresh_note}
              </span>
            ) : null}
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

      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 md:px-8">
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
                  className={`h-[280px] rounded-[24px] sm:rounded-[32px] bg-narvo-mist/40 dark:bg-white/[0.06] ${reduceMotion ? '' : 'animate-pulse'}`}
                />
              ))
            : null}
          {!liveLoading && news.length === 0 && !liveError ? (
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
  const isAuthenticated = useIsNarvoAuthenticated();
  return (
    <section className="mx-auto w-full max-w-7xl px-3 py-14 sm:px-6 sm:py-20 md:px-8 md:py-24 lg:py-32">
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
              onClick={() =>
                narvoTrack('landing_cta_prefooter_start_listening', {
                  authenticated: isAuthenticated,
                  href: isAuthenticated ? '/dashboard' : '/auth',
                })
              }
              className={`px-6 sm:px-10 md:px-12 py-3.5 sm:py-5 md:py-6 bg-narvo-vermilion text-white text-sm sm:text-lg md:text-xl font-bold rounded-full shadow-2xl shadow-narvo-vermilion/40 inline-flex items-center justify-center text-center min-h-[48px] ${reduceMotion ? '' : 'hover:scale-[1.02] active:scale-[0.98]'} transition-transform`}
            >
              {COPY.landing_cta_start_listening}
            </Link>
            <button
              type="button"
              onClick={() => {
                narvoTrack('landing_cta_prefooter_voice_sample', { section: 'prefooter' });
                onTryClick();
              }}
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
        className="mx-auto w-full max-w-7xl border-t border-narvo-ink/5 px-3 py-8 dark:border-white/5 sm:px-6 sm:py-10 md:px-8 md:py-12"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 lg:gap-12">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-narvo-teal">
              <NarvoLogoMark size="md" inset="tight" />
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
