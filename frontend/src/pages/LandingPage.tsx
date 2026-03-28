/**
 * LandingPage.tsx — Design System v4
 * ─────────────────────────────────────────────────────────────
 * Narvo B2C consumer landing page — complete v4 rebuild.
 *
 * Design: Forest Green · Cream · Sunshine Yellow · Crisp Carrot
 * Type:   Fraunces (headlines) · Plus Jakarta Sans (body) · Geist Mono (labels)
 * Rhythm: Reed Words editorial — bold serif, generous whitespace, single accent
 * Mark:   Continent fragment — three hexagonal polygon fragments
 *
 * Sections:
 *   Nav → Breaking Banner → Hero → Stats Strip → Bento Features
 *   → Live Feed → WhatsApp → Social Proof → Voice Section
 *   → Final CTA → Footer → Voice Preview Modal
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';

import { Lightning }      from '@phosphor-icons/react/Lightning';
import { ArrowRight }     from '@phosphor-icons/react/ArrowRight';
import { X }              from '@phosphor-icons/react/X';
import { Play }           from '@phosphor-icons/react/Play';
import { SpeakerHigh }    from '@phosphor-icons/react/SpeakerHigh';
import { Bell }           from '@phosphor-icons/react/Bell';
import { BellRinging }    from '@phosphor-icons/react/BellRinging';
import { ShieldCheck }    from '@phosphor-icons/react/ShieldCheck';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';
import { Globe }          from '@phosphor-icons/react/Globe';
import { Sparkle }        from '@phosphor-icons/react/Sparkle';
import { CheckCircle }    from '@phosphor-icons/react/CheckCircle';
import { ShareNetwork }   from '@phosphor-icons/react/ShareNetwork';

import { useAudio }         from '../contexts/AudioContext';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import { getTtsPreviewSample }        from '../constants/tts';
import * as api             from '../lib/api';
import { subscribeToPush }  from '../lib/notificationService';
import logger               from '../lib/logger';

/* ──────────────────────────── Types ─────────────────────────── */

interface Voice {
  id: string;
  name: string;
  accent: string;
  gender: string;
  language?: string;
  description?: string;
}

interface LandingStory {
  id: string;
  title: string;
  summary?: string;
  short_summary?: string;
  narrative?: string;
  truth_score?: number;
  category?: string;
  source?: string;
  region?: string;
  published?: string;
  read_time?: string;
  [key: string]: unknown;
}

interface LandingMetrics {
  total_sources?: number;
  total_stories?: number;
  stories_processed?: number;
  broadcast_hours?: number;
  total_listeners?: string | number;
  active_listeners?: number;
  [key: string]: unknown;
}

/* ──────────────────────────── Helpers ───────────────────────── */

const landingFetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

const getPublicUrl = () =>
  import.meta.env.VITE_PUBLIC_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/* ─────────────────────── Animation Variants ─────────────────── */

const fadeInUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0  },
};

const spring = {
  type:      'spring' as const,
  stiffness: 260,
  damping:   20,
};

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/* ─────────────────── Continent Fragment Mark ────────────────── */
/* Decorative — aria-hidden. Used in nav and hero. */

interface MarkProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

const NarvoMark = ({ size = 40, className = '', animated = false }: MarkProps) => (
  <svg
    width={size}
    height={size * 1.25}
    viewBox="0 0 40 50"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <g className={animated ? 'fragment-1' : ''}>
      <polygon points="6,0 34,0 40,6 40,16 34,20 6,20 0,14 0,6" fill="#18542A" />
    </g>
    <g className={animated ? 'fragment-2' : ''}>
      <polygon points="2,24 38,24 40,28 40,36 36,40 4,40 0,36 0,28" fill="#FFC926" />
    </g>
    <g className={animated ? 'fragment-3' : ''}>
      <polygon points="4,44 36,44 40,50 30,50 10,50 0,50" fill="#18542A" opacity="0.45" />
    </g>
  </svg>
);

/* ─────────────────────── Phone Mockup ───────────────────────── */

const PhoneMockup = () => (
  <div
    aria-hidden="true"
    className="relative mx-auto lg:mx-0 select-none"
    style={{ width: 224, flexShrink: 0 }}
  >
    <div
      className="relative overflow-hidden"
      style={{ width: 224, height: 448, borderRadius: 38, border: '5px solid #0e3319', background: '#0e3319' }}
    >
      {/* Notch */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
        style={{ width: 60, height: 20, borderRadius: '0 0 12px 12px', background: '#0e3319' }}
      />
      <div className="absolute inset-0 flex flex-col" style={{ background: '#0e3319' }}>

        {/* Status bar */}
        <div className="flex justify-between px-4 pt-7 pb-1 shrink-0">
          <span style={{ fontSize: 9, fontWeight: 700, color: '#F3E8CC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>9:41</span>
          <span style={{ fontSize: 8, color: '#A09890', fontFamily: "'Geist Mono', monospace" }}>NR ●●●</span>
        </div>

        {/* App header */}
        <div className="px-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,201,38,0.15)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F3E8CC', fontFamily: "'Fraunces', serif" }}>Good morning, Oga</div>
          <div style={{ fontSize: 8, color: '#A09890', marginTop: 1, fontFamily: "'Geist Mono', monospace", letterSpacing: '0.04em' }}>THURSDAY, 26 MARCH 2026</div>
        </div>

        {/* Morning Briefing card */}
        <div
          className="mx-3 my-2 shrink-0 flex items-center justify-between"
          style={{ background: '#F96015', borderRadius: 11, padding: '9px 11px' }}
        >
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', fontFamily: "'Geist Mono', monospace" }}>MORNING BRIEFING</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginTop: 2, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>5 stories · 8 min</div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden><polygon points="1,0 9,5 1,10" fill="white" /></svg>
          </div>
        </div>

        {/* Topic chips */}
        <div className="flex gap-1 px-3 mb-2 shrink-0">
          {[['For You', true], ['Nigeria', false], ['Business', false], ['Tech', false]].map(([chip, active]) => (
            <div
              key={chip as string}
              style={{
                padding: '3px 8px', borderRadius: 999, fontSize: 7, fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: active ? '#FFC926' : 'rgba(255,201,38,0.12)',
                color: active ? '#18542A' : '#A09890',
                whiteSpace: 'nowrap',
              }}
            >
              {chip as string}
            </div>
          ))}
        </div>

        {/* Story card */}
        <div className="mx-3 mb-2 shrink-0 overflow-hidden" style={{ borderRadius: 11, border: '1px solid rgba(255,201,38,0.18)' }}>
          <div style={{ height: 60, background: 'rgba(24,84,42,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0 8px 8px', position: 'relative' }}>
            <span style={{ fontSize: 6, fontWeight: 700, color: '#FFC926', background: 'rgba(24,84,42,0.7)', padding: '1px 5px', borderRadius: 4, fontFamily: "'Geist Mono', monospace", position: 'absolute', top: 7, left: 9, letterSpacing: '0.06em' }}>POLITICS</span>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F96015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden><polygon points="1,0 8,4.5 1,9" fill="white" /></svg>
            </div>
          </div>
          <div style={{ padding: '7px 9px', background: '#18542A' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#F3E8CC', lineHeight: 1.3, marginBottom: 4, fontFamily: "'Fraunces', serif" }}>Senate passes landmark economic reform bill</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 7, color: '#A09890', fontFamily: "'Geist Mono', monospace" }}>4 min listen</span>
              <span style={{ fontSize: 7, fontWeight: 700, color: '#9ABC05', fontFamily: "'Geist Mono', monospace" }}>✓ 5 sources</span>
            </div>
          </div>
        </div>

        {/* Mini audio player */}
        <div className="mt-auto shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,201,38,0.15)', padding: '7px 10px', background: '#18542A' }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,201,38,0.15)', flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#FFC926', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Why the NNPC deal matters...</div>
            <div style={{ marginTop: 4, height: 6, background: 'rgba(255,201,38,0.2)', borderRadius: 3 }}>
              <div style={{ width: '35%', height: '100%', background: '#FFC926', borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F96015', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="7" height="9" viewBox="0 0 7 9" fill="white" aria-hidden><rect x="0" y="0" width="2.5" height="9"/><rect x="4.5" y="0" width="2.5" height="9"/></svg>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 8px 8px', borderTop: '1px solid rgba(255,201,38,0.12)', background: '#18542A' }}>
          {[['Home', true], ['Discover', false], ['Listen', false], ['Library', false], ['Profile', false]].map(([label, active]) => (
            <div key={label as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 14, height: 2, borderRadius: 1, background: active ? '#FFC926' : 'rgba(160,152,144,0.35)' }} />
              {active ? <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFC926' }} /> : null}
              <span style={{ fontSize: 6, fontWeight: 600, color: active ? '#FFC926' : '#807870', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label as string}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  </div>
);

/* ─────────────────────── Main Component ─────────────────────── */

const LandingPage = () => {
  const navigate       = useNavigate();
  const prefersReduced = useReducedMotion();
  const { playTrack, stopTrack } = useAudio();

  /* ── Live data (SWR) ── */
  const { data: news = [], isLoading: newsLoading } =
    useSWR<LandingStory[]>('api/news?limit=6', landingFetcher);
  const { data: breaking = [] } =
    useSWR<LandingStory[]>('api/news/breaking', landingFetcher);
  const { data: metrics = null } =
    useSWR<LandingMetrics | null>('api/metrics', landingFetcher);

  /* ── State ── */
  const [breakingDismissed, setBreakingDismissed] = useState(false);
  const [pushEnabled, setPushEnabled]   = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError]   = useState<string | null>(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voices, setVoices]             = useState<Voice[]>([]);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [scrolled, setScrolled]         = useState(false);
  const previewCacheRef = useRef<Record<string, string>>({});
  const VOICE_CACHE_PREFIX = 'voice_preview:';

  /* ── Nav scroll ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Load voices on modal open ── */
  useEffect(() => {
    if (voiceModalOpen && voices.length === 0) {
      let cancelled = false;
      api.get('api/voices')
        .then((r) => r.ok ? r.json() : [])
        .then((list: Voice[]) => { if (!cancelled) setVoices(Array.isArray(list) ? list : []); })
        .catch(() => { if (!cancelled) setVoices([]); });
      return () => { cancelled = true; };
    }
    return undefined;
  }, [voiceModalOpen, voices.length]);

  /* ── Push notification handler ── */
  const handleEnableAlerts = useCallback(async () => {
    if (alertsLoading || pushEnabled) return;
    setAlertsError(null);
    setAlertsLoading(true);
    try {
      const sub = await subscribeToPush();
      if (sub) setPushEnabled(true);
      else setAlertsError('Allow notifications in your browser to enable morning alerts.');
    } catch {
      setAlertsError('Could not enable alerts. Try again.');
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsLoading, pushEnabled]);

  /* ── Voice preview handler ── */
  const handleVoicePreview = useCallback(async (voice: Voice) => {
    const lang       = voice.language?.toLowerCase().split('-')[0] ?? 'en';
    const sampleText = getTtsPreviewSample(lang);
    const cacheKey   = `${voice.id}:${lang}`;
    const idbKey     = `${VOICE_CACHE_PREFIX}${cacheKey}`;
    setPreviewLoading(voice.id);
    setPreviewError(null);
    stopTrack();
    try {
      const mem = previewCacheRef.current[cacheKey];
      if (mem) { await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: mem, source: 'VOICE_PREVIEW' }, true); setPreviewLoading(null); return; }
      const local = await getCachedAudio(idbKey);
      if (local?.audio_url) {
        previewCacheRef.current[cacheKey] = local.audio_url;
        await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: local.audio_url, source: 'VOICE_PREVIEW' }, true);
        setPreviewLoading(null); return;
      }
      const res  = await api.post('api/tts/generate', { text: sampleText, voice_id: voice.id, language: lang, skip_translation: true });
      if (!res.ok) throw new Error('TTS failed');
      const data = (await res.json()) as { audio_url?: string };
      if (!data.audio_url) { setPreviewLoading(null); setPreviewError(voice.id); return; }
      previewCacheRef.current[cacheKey] = data.audio_url;
      await cacheAudio(idbKey, data.audio_url, { title: `Narvo Voice: ${voice.name}`, source: 'VOICE_PREVIEW' });
      await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: data.audio_url, source: 'VOICE_PREVIEW' }, true);
      setPreviewLoading(null);
    } catch (err) {
      logger.debug('[LandingPage] Voice preview error', err);
      setPreviewLoading(null);
      setPreviewError(voice.id);
    }
  }, [playTrack, stopTrack]);

  /* ── Derived values ── */
  const totalSources   = metrics?.total_sources ?? 39;
  const totalStories   = metrics?.stories_processed ?? metrics?.total_stories;
  const totalListeners = metrics?.total_listeners ?? metrics?.active_listeners;
  const showBreaking   = !breakingDismissed && breaking.length > 0;

  /* ── Shared inView animation props ── */
  const inView = (delay = 0) => prefersReduced ? {} : {
    initial:     'hidden',
    whileInView: 'visible',
    viewport:    { once: true, margin: '-40px' },
    variants:    fadeInUp,
    transition:  { ...spring, delay },
  };

  /* ────────────────────────────── JSX ──────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: 'var(--color-bg)' }}
      data-testid="landing-page"
    >
      {/* ── HEAD ─────────────────────────────────────────────────── */}
      <Helmet>
        <title>Narvo — Africa's voice, in your ears</title>
        <meta name="description" content="AI-powered audio news for Africa. Narvo synthesises 39+ sources into one clear story, spoken in your language — Nigerian English, Yorùbá, Hausa, Igbo, Pidgin." />
        <link rel="canonical" href={`${getPublicUrl()}/`} />
        <meta property="og:url"         content={`${getPublicUrl()}/`} />
        <meta property="og:title"       content="Narvo — Africa's voice, in your ears" />
        <meta property="og:description" content="AI reads 39+ sources so you don't have to. Clear, spoken, verified." />
        <meta property="og:image"       content={`${getPublicUrl()}/screenshot-wide.png`} />
        <meta name="twitter:card"       content="summary_large_image" />
        <meta name="twitter:title"      content="Narvo — Africa's voice, in your ears" />
        <meta name="twitter:description" content="Africa's AI-powered audio news companion." />
        <meta name="twitter:image"      content={`${getPublicUrl()}/screenshot-wide.png`} />
      </Helmet>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          height: 72,
          background:          scrolled ? 'rgba(243,232,204,0.94)' : 'rgba(243,232,204,0.85)',
          backdropFilter:      'blur(12px)',
          WebkitBackdropFilter:'blur(12px)',
          borderBottom:        `1px solid ${scrolled ? 'rgba(24,84,42,0.18)' : 'transparent'}`,
          boxShadow:           scrolled ? 'var(--shadow-2)' : 'none',
        }}
      >
        <nav
          className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-10 h-full"
          aria-label="Main navigation"
        >
          {/* Wordmark */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] focus-visible:ring-offset-2 rounded-[8px]"
            aria-label="Narvo — back to top"
          >
            <NarvoMark size={32} animated />
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: 22,
                color: '#18542A',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              Narvo
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-7">
            {[['#features', 'Features'], ['#languages', 'Languages'], ['#live', 'Live Feed']].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] rounded-[4px] px-1 transition-colors duration-150"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#625B52' }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* CTA pair */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] rounded-[9999px] transition-colors"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, fontWeight: 600,
                color: '#18542A',
                background: 'transparent',
                border: '1.5px solid rgba(24,84,42,0.3)',
                padding: '0 20px',
                height: 44,
              }}
            >
              Sign in
            </button>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3E8CC]"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14, fontWeight: 700,
                color: '#ffffff',
                background: '#F96015',
                border: 'none',
                padding: '0 24px',
                height: 48,
                borderRadius: 9999,
                cursor: 'pointer',
              }}
              whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
              whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
              transition={spring}
              data-testid="nav-get-started"
            >
              Get started
            </motion.button>
          </div>
        </nav>
      </header>

      {/* ── BREAKING BANNER ──────────────────────────────────────── */}
      <AnimatePresence>
        {showBreaking && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full border-b"
            style={{ background: 'rgba(213,37,24,0.06)', borderColor: 'rgba(213,37,24,0.2)' }}
            data-testid="landing-breaking-banner"
          >
            <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-6 lg:px-10 py-2.5">
              <Lightning weight="fill" className="w-3.5 h-3.5 shrink-0" style={{ color: '#D52518' }} aria-hidden />
              <span
                className="shrink-0"
                style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, color: '#D52518', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              >
                Breaking
              </span>
              <button
                type="button"
                onClick={() => navigate(`/news/${breaking[0].id}`)}
                className="flex-1 min-w-0 text-left transition-colors truncate"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#18542A' }}
              >
                {breaking[0].title}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/news/${breaking[0].id}`)}
                className="hidden sm:flex items-center gap-1 shrink-0"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#D52518' }}
              >
                Read now <ArrowRight weight="bold" className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setBreakingDismissed(true)}
                className="p-1.5 rounded-[6px] transition-colors shrink-0"
                aria-label="Dismiss breaking news"
                style={{ minHeight: 32, minWidth: 32 }}
              >
                <X weight="bold" className="w-3.5 h-3.5" style={{ color: '#D52518' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 pt-16 pb-14 lg:pt-24 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* Left: Text */}
          <motion.div
            className="flex flex-col gap-7"
            initial={prefersReduced ? false : 'hidden'}
            animate="visible"
            variants={stagger}
          >
            {/* Kicker label */}
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
              <div
                className="inline-flex items-center gap-2 w-fit"
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#18542A',
                  background: 'rgba(24,84,42,0.08)',
                  padding: '4px 12px',
                  borderRadius: 9999,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ABC05', flexShrink: 0 }} />
                AI-powered audio news for Africa
              </div>
            </motion.div>

            {/* H1 — Fraunces editorial headline */}
            <motion.h1
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                letterSpacing: '-0.025em',
                lineHeight: 1.06,
                color: '#18542A',
              }}
            >
              Africa's news,<br />
              <em style={{ fontStyle: 'italic', color: '#625B52' }}>in your ears.</em>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 18, fontWeight: 400,
                color: '#625B52',
                lineHeight: 1.7,
                maxWidth: 400,
              }}
            >
              AI reads {totalSources}+ sources so you don't have to. Get the full story
              synthesised, verified, and spoken in your language — in minutes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              className="flex flex-wrap gap-3 items-center"
            >
              <motion.button
                type="button"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3E8CC]"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16, fontWeight: 700,
                  color: '#ffffff',
                  background: '#F96015',
                  border: 'none',
                  height: 56,
                  padding: '0 36px',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-3)',
                }}
                whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
                transition={spring}
                data-testid="hero-start-btn"
              >
                <svg width="14" height="16" viewBox="0 0 10 12" aria-hidden fill="white"><polygon points="0,0 10,6 0,12" /></svg>
                Start listening free
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] transition-colors"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 15, fontWeight: 600,
                  color: '#18542A',
                  background: 'transparent',
                  border: '1.5px solid rgba(24,84,42,0.30)',
                  height: 48,
                  padding: '0 28px',
                  borderRadius: 9999,
                  cursor: 'pointer',
                }}
                whileHover={!prefersReduced ? { scale: 1.01 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.98 } : undefined}
                transition={spring}
                data-testid="hero-voice-btn"
              >
                <SpeakerHigh weight="fill" className="w-4 h-4" aria-hidden />
                Hear a sample
              </motion.button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              {['No credit card required', '5 Nigerian languages', 'Works offline'].map((s) => (
                <div key={s} className="flex items-center gap-1.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 400, color: '#625B52' }}>
                  <CheckCircle weight="fill" className="w-4 h-4 shrink-0" style={{ color: '#9ABC05' }} aria-hidden />
                  {s}
                </div>
              ))}
            </motion.div>

            {/* Push notification teaser */}
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
              <div
                className="inline-flex items-center gap-3 rounded-[14px] border"
                style={{ padding: '10px 16px', background: 'rgba(253,248,239,0.8)', borderColor: 'rgba(24,84,42,0.15)' }}
              >
                {pushEnabled
                  ? <BellRinging weight="fill" className="w-4 h-4 shrink-0" style={{ color: '#18542A' }} />
                  : <Bell className="w-4 h-4 shrink-0" style={{ color: '#807870' }} />}
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#625B52' }}>7AM morning briefing</span>
                <button
                  type="button"
                  onClick={handleEnableAlerts}
                  disabled={pushEnabled || alertsLoading}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 11, fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 9999,
                    height: 32,
                    border: 'none',
                    cursor: 'pointer',
                    background: pushEnabled ? 'rgba(154,188,5,0.12)' : '#18542A',
                    color: pushEnabled ? '#5a7003' : '#FFC926',
                  }}
                >
                  {alertsLoading
                    ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
                    : pushEnabled ? 'Active ✓' : 'Enable alerts'}
                </button>
              </div>
              {alertsError && <p className="mt-1.5 text-xs text-red-500" role="alert" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{alertsError}</p>}
            </motion.div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={prefersReduced ? false : { opacity: 0, x: 20, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────── */}
      <div style={{ background: '#18542A', borderTop: '1px solid rgba(255,201,38,0.15)', borderBottom: '1px solid rgba(255,201,38,0.15)' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-8">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-6"
            {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: stagger })}
          >
            {[
              { value: `${totalSources}+`,   label: 'Sources monitored' },
              { value: totalStories != null ? `${Number(totalStories).toLocaleString()}+` : '10K+', label: 'Stories synthesised' },
              { value: '5',                   label: 'Nigerian languages' },
              { value: totalListeners != null ? String(totalListeners) : '10K+', label: 'Active listeners' },
            ].map(({ value, label }) => (
              <motion.div key={label} variants={prefersReduced ? undefined : fadeInUp} transition={spring} className="text-center">
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: '#FFC926' }}>{value}</div>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 500, color: 'rgba(243,232,204,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── BENTO FEATURES ───────────────────────────────────────── */}
      <section id="features" className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-20 lg:py-24">
        <motion.div className="mb-12" {...inView()}>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#F96015', textTransform: 'uppercase', marginBottom: 10 }}>
            What makes Narvo different
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 'clamp(1.9rem, 3.2vw, 2.8rem)', letterSpacing: '-0.02em', lineHeight: 1.12, color: '#18542A' }}>
            Built for Africa.<br />
            <em style={{ fontStyle: 'italic', color: '#625B52' }}>Powered by AI.</em>
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, color: '#807870', marginTop: 12, maxWidth: 420 }}>
            {totalSources}+ sources. One story. Spoken in your language.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, margin: '-40px' }, variants: stagger })}
        >
          {[
            {
              key: 'synthesis', icon: <Sparkle weight="fill" className="w-5 h-5" />,
              title: 'AI Synthesis',
              desc: `We monitor ${totalSources}+ news sources, cluster related articles, and produce a single broadcast narrative — not just one take.`,
              tags: [`${totalSources}+ sources`, 'Multi-source', 'Gemini AI'],
              bg: '#18542A', textColor: '#FFC926', descColor: 'rgba(243,232,204,0.75)', iconBg: 'rgba(255,201,38,0.15)', iconColor: '#FFC926', tall: true,
            },
            {
              key: 'truthtag', icon: <ShieldCheck weight="fill" className="w-5 h-5" />,
              title: 'Truth Tag',
              desc: 'Every story shows source count, reliability score, and perspectives covered. Trust built in.',
              bg: '#FDF8EF', textColor: '#18542A', descColor: '#625B52', iconBg: 'rgba(154,188,5,0.12)', iconColor: '#5a7003', tall: false,
            },
            {
              key: 'briefing', icon: <Waveform weight="fill" className="w-5 h-5" />,
              title: 'Morning Briefing',
              desc: '5 top stories, synthesised and spoken. Ready at 7AM every day.',
              bg: '#FDF8EF', textColor: '#18542A', descColor: '#625B52', iconBg: 'rgba(24,84,42,0.08)', iconColor: '#18542A', tall: false,
            },
            {
              key: 'languages', icon: <Globe weight="fill" className="w-5 h-5" />,
              title: '5 Nigerian Languages',
              desc: 'English, Yorùbá, Hausa, Igbo, Pidgin — your voice, your news.',
              bg: '#FDF8EF', textColor: '#18542A', descColor: '#625B52', iconBg: 'rgba(255,201,38,0.18)', iconColor: '#856600', tall: false,
            },
            {
              key: 'offline', icon: <CloudArrowDown weight="fill" className="w-5 h-5" />,
              title: 'Works Offline',
              desc: 'Download stories. Listen on the go. No data needed.',
              bg: '#FDF8EF', textColor: '#18542A', descColor: '#625B52', iconBg: 'rgba(249,96,21,0.10)', iconColor: '#F96015', tall: false,
            },
          ].map((feat, i) => (
            <motion.div
              key={feat.key}
              variants={prefersReduced ? undefined : { ...fadeInUp, transition: { ...spring, delay: i * 0.06 } }}
              transition={spring}
              className={feat.tall ? 'sm:row-span-2' : ''}
              style={{
                borderRadius: 20,
                padding: 24,
                background: feat.bg,
                border: feat.bg === '#18542A'
                  ? '1px solid rgba(255,201,38,0.2)'
                  : '1px solid rgba(24,84,42,0.10)',
                boxShadow: feat.bg === '#18542A' ? 'var(--shadow-3)' : 'var(--shadow-2)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: feat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: feat.iconColor, flexShrink: 0 }}>
                {feat.icon}
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 17, color: feat.textColor, marginBottom: 8, lineHeight: 1.2 }}>{feat.title}</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, lineHeight: 1.65, color: feat.descColor, flex: 1 }}>{feat.desc}</p>
              {feat.tags && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {feat.tags.map((tag) => (
                    <span key={tag} style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 9999, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tag}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── LIVE FEED ────────────────────────────────────────────── */}
      <section
        id="live"
        style={{ background: 'rgba(253,248,239,0.7)', borderTop: '1px solid rgba(24,84,42,0.08)', borderBottom: '1px solid rgba(24,84,42,0.08)' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
          <motion.div className="flex items-end justify-between mb-10" {...inView()}>
            <div>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#F96015', textTransform: 'uppercase', marginBottom: 8 }}>Live right now</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', letterSpacing: '-0.02em', color: '#18542A' }}>Latest Stories</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] rounded-[6px] px-2 py-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#18542A' }}
            >
              See all <ArrowRight className="w-4 h-4" weight="bold" />
            </button>
          </motion.div>

          {newsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[16px] animate-pulse" style={{ height: 130, background: 'rgba(24,84,42,0.06)' }} />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, margin: '-40px' }, variants: stagger })}
            >
              {news.slice(0, 4).map((story, i) => (
                <motion.button
                  type="button"
                  key={story.id}
                  onClick={() => navigate(`/news/${story.id}`)}
                  className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015] rounded-[16px]"
                  variants={prefersReduced ? undefined : { ...fadeInUp, transition: { ...spring, delay: i * 0.06 } }}
                  transition={spring}
                  whileHover={!prefersReduced ? { y: -2 } : undefined}
                  whileTap={!prefersReduced   ? { scale: 0.99 } : undefined}
                  aria-label={`Read story: ${story.title}`}
                >
                  <div
                    className="flex gap-4 p-5 rounded-[16px] border h-full"
                    style={{ background: 'var(--color-surface)', borderColor: 'rgba(24,84,42,0.10)', boxShadow: 'var(--shadow-2)' }}
                  >
                    <div className="shrink-0 w-[3px] rounded-full" style={{ background: '#F96015' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span
                          style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(24,84,42,0.08)', color: '#18542A', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                        >
                          {(story.category ?? 'NEWS').toUpperCase()}
                        </span>
                        {(story.narrative || (story.truth_score != null && story.truth_score >= 80)) && (
                          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(249,96,21,0.08)', color: '#F96015' }}>AI</span>
                        )}
                        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, color: '#A09890', marginLeft: 'auto' }}>
                          {story.published ? new Date(story.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </span>
                      </div>
                      <h3
                        className="transition-colors line-clamp-2"
                        style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 10, color: '#18542A' }}
                      >
                        {story.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#807870' }}>{story.source ?? 'RSS'}{story.read_time ? ` · ${story.read_time}` : ''}</span>
                        {story.truth_score != null && story.truth_score >= 70 && (
                          <div className="flex items-center gap-1">
                            <ShieldCheck weight="fill" className="w-3.5 h-3.5" style={{ color: '#9ABC05' }} aria-hidden />
                            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, color: '#5a7003' }}>Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <button type="button" onClick={() => navigate('/auth')} className="flex items-center gap-2 mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#18542A' }}>
              See all stories <ArrowRight className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>
      </section>

      {/* ── WHATSAPP DISTRIBUTION ────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-20 lg:py-24">
        <motion.div
          className="rounded-[24px] overflow-hidden"
          style={{ background: '#18542A', padding: '48px 40px' }}
          {...inView()}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <ShareNetwork weight="fill" className="w-5 h-5" style={{ color: '#FFC926' }} />
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#FFC926', textTransform: 'uppercase' }}>Share the gist</span>
              </div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)', letterSpacing: '-0.02em', lineHeight: 1.12, color: '#FFC926', marginBottom: 16 }}>
                Every story has a<br />
                <em style={{ fontStyle: 'italic', color: '#fff' }}>60-second clip.</em>
              </h2>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, color: 'rgba(243,232,204,0.7)', lineHeight: 1.7, maxWidth: 380, marginBottom: 28 }}>
                Share any story as a 60-second audio clip — straight to WhatsApp. Your contacts
                hear it. They join Narvo. Research shows a 7:1 forwarding ratio on voice content.
              </p>
              <motion.button
                type="button"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 15, fontWeight: 700,
                  color: '#18542A',
                  background: '#FFC926',
                  border: 'none',
                  height: 52,
                  padding: '0 32px',
                  borderRadius: 9999,
                  cursor: 'pointer',
                }}
                whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
                transition={spring}
              >
                <ShareNetwork weight="fill" className="w-4 h-4" />
                Try it free
              </motion.button>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: '95%',    label: 'WhatsApp penetration in Nigeria', sub: 'No other channel comes close' },
                { stat: '7:1',    label: 'Average forwarding ratio', sub: 'For audio voice content' },
                { stat: '75M+',   label: 'Pidgin English speakers', sub: 'Zero audio news product for them — until now' },
                { stat: '3 min',  label: 'Daily Pidgin Brief',          sub: '"E don happen. Make I yarn you the gist."' },
              ].map(({ stat, label, sub }) => (
                <div key={stat} className="rounded-[16px] p-4" style={{ background: 'rgba(255,201,38,0.08)', border: '1px solid rgba(255,201,38,0.18)' }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: '#FFC926', lineHeight: 1 }}>{stat}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(243,232,204,0.85)', marginTop: 6, lineHeight: 1.4 }}>{label}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'rgba(243,232,204,0.45)', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────── */}
      <section
        style={{ background: 'rgba(253,248,239,0.7)', borderTop: '1px solid rgba(24,84,42,0.08)', borderBottom: '1px solid rgba(24,84,42,0.08)' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
            {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: stagger })}
          >
            {/* Testimonial */}
            <motion.blockquote
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              className="rounded-[20px] border p-8"
              style={{ background: 'var(--color-surface)', borderColor: 'rgba(24,84,42,0.10)', borderLeft: '4px solid #F96015', boxShadow: 'var(--shadow-3)' }}
            >
              <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 18, lineHeight: 1.65, color: '#18542A', fontStyle: 'italic', marginBottom: 20 }}>
                "I used to spend 45 minutes reading four different news sites every morning.
                Now I play my Narvo briefing on the way to Ikeja. Done in 8 minutes."
              </p>
              <footer className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(249,96,21,0.12)', fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: '#F96015' }}
                  aria-hidden
                >
                  CO
                </div>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#18542A' }}>Chidi Okafor</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#807870', marginTop: 2 }}>Software Engineer, Lagos</div>
                </div>
              </footer>
            </motion.blockquote>

            {/* Metric grid */}
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring} className="grid grid-cols-2 gap-3">
              {[
                { value: `${totalSources}+`, label: 'News sources' },
                { value: '5',                label: 'Languages' },
                { value: totalStories ? `${Math.round(Number(totalStories) / 1000)}K+` : '10K+', label: 'Stories' },
                { value: '100%',             label: 'Free to try' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center p-6 rounded-[16px] border" style={{ background: 'var(--color-surface)', borderColor: 'rgba(24,84,42,0.10)', boxShadow: 'var(--shadow-1)' }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: '#18542A' }}>{value}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#807870', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── VOICE SECTION ────────────────────────────────────────── */}
      <section id="languages" className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-20 lg:py-24">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: stagger })}
        >
          <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#F96015', textTransform: 'uppercase', marginBottom: 12 }}>Your Narvo Voice</p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)', letterSpacing: '-0.02em', lineHeight: 1.12, color: '#18542A', marginBottom: 16 }}>
              News that sounds<br />
              <em style={{ fontStyle: 'italic', color: '#625B52' }}>like home.</em>
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, color: '#625B52', lineHeight: 1.7, marginBottom: 28, maxWidth: 380 }}>
              Choose how your stories sound. Five Nigerian languages with authentic accents — because
              information in your own language is a right, not a luxury.
            </p>
            <motion.button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3E8CC]"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15, fontWeight: 700,
                color: '#FFC926',
                background: '#18542A',
                border: 'none',
                height: 52,
                padding: '0 32px',
                borderRadius: 9999,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-3)',
              }}
              whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
              whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
              transition={spring}
              data-testid="voice-section-btn"
            >
              <SpeakerHigh weight="fill" className="w-5 h-5" aria-hidden />
              Preview all voices
            </motion.button>
          </motion.div>

          {/* Language cards */}
          <motion.div variants={prefersReduced ? undefined : stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { lang: 'Nigerian English', note: 'Standard Lagos/Abuja accent', emoji: '🇳🇬' },
              { lang: 'Yorùbá',           note: 'SW Nigeria · 40M speakers',   emoji: '🗣' },
              { lang: 'Hausa',            note: 'Northern Nigeria · 50M+',      emoji: '🗣' },
              { lang: 'Igbo',             note: 'SE Nigeria · 30M speakers',    emoji: '🗣' },
              { lang: 'Nigerian Pidgin',  note: '75M+ speakers, growing fast',  emoji: '🌍' },
            ].map(({ lang, note, emoji }) => (
              <motion.div
                key={lang}
                variants={prefersReduced ? undefined : fadeInUp}
                transition={spring}
                className="flex items-center gap-3 rounded-[14px] border cursor-pointer transition-all"
                style={{ padding: '14px 16px', background: 'var(--color-surface)', borderColor: 'rgba(24,84,42,0.10)', boxShadow: 'var(--shadow-1)' }}
                onClick={() => setVoiceModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setVoiceModalOpen(true)}
              >
                <span className="text-2xl" style={{ fontSize: 22 }} aria-hidden>{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: '#18542A', lineHeight: 1.2 }}>{lang}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#807870', marginTop: 2 }}>{note}</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(249,96,21,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Play weight="fill" className="w-3.5 h-3.5" style={{ color: '#F96015' }} aria-hidden />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section style={{ background: '#18542A' }} className="px-6 lg:px-10 py-24 lg:py-28 text-center">
        <div className="max-w-[600px] mx-auto">
          <motion.div {...inView()}>
            <NarvoMark size={56} animated className="mx-auto mb-8" />
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#FFC926', textTransform: 'uppercase', marginBottom: 16 }}>
              Get started today
            </p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 'clamp(2.2rem, 4.2vw, 3.4rem)', letterSpacing: '-0.025em', lineHeight: 1.08, color: '#FFC926', marginBottom: 16 }}>
              Your morning briefing<br />
              <em style={{ fontStyle: 'italic', color: '#F3E8CC' }}>is waiting.</em>
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, color: 'rgba(243,232,204,0.6)', lineHeight: 1.7, marginBottom: 36 }}>
              No credit card required · Works on any device<br />
              5 Nigerian languages · Offline listening
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <motion.button
                type="button"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18542A] focus-visible:ring-offset-2"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16, fontWeight: 700,
                  color: '#18542A',
                  background: '#FFC926',
                  border: 'none',
                  height: 56,
                  padding: '0 36px',
                  borderRadius: 9999,
                  cursor: 'pointer',
                }}
                whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
                transition={spring}
                data-testid="final-cta-btn"
              >
                <svg width="14" height="16" viewBox="0 0 10 12" aria-hidden fill="#18542A"><polygon points="0,0 10,6 0,12" /></svg>
                Start listening free
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 15, fontWeight: 600,
                  color: '#FFC926',
                  background: 'transparent',
                  border: '1.5px solid rgba(255,201,38,0.35)',
                  height: 48,
                  padding: '0 28px',
                  borderRadius: 9999,
                  cursor: 'pointer',
                }}
                whileHover={!prefersReduced ? { scale: 1.01 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.98 } : undefined}
                transition={spring}
              >
                <SpeakerHigh weight="fill" className="w-5 h-5" aria-hidden />
                Hear a sample
              </motion.button>
            </div>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: 'rgba(243,232,204,0.35)', letterSpacing: '0.06em' }}>
              Join 10,000+ early listeners · narvo.news
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--color-surface)', borderTop: '1px solid rgba(24,84,42,0.10)' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <NarvoMark size={28} />
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: '#18542A', letterSpacing: '-0.03em' }}>Narvo</span>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#807870', lineHeight: 1.6, maxWidth: 180 }}>
                Africa's voice, in your ears. AI audio news for Africa.
              </p>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, color: '#A09890', marginTop: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Narvo Intelligence Ltd.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, color: '#807870', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Product</h3>
              <ul className="space-y-3">
                {[['Features', '#features'], ['Languages', '#languages'], ['Live feed', '#live'], ['Pricing', '/subscription']].map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      onClick={href.startsWith('/') ? (e) => { e.preventDefault(); navigate(href); } : undefined}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#625B52' }}
                      className="hover:text-[#18542A] transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, color: '#807870', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Company</h3>
              <ul className="space-y-3">
                {[['About', '#'], ['Investor', 'https://investor.narvo.news'], ['Status', 'https://narvo.statuspage.io/'], ['API', 'https://api.narvo.news/docs']].map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#625B52' }}
                      className="hover:text-[#18542A] transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get started */}
            <div>
              <h3 style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, color: '#807870', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Get started</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#807870', marginBottom: 16, lineHeight: 1.6 }}>Free to try. No credit card required.</p>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015]"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: 700,
                  color: '#ffffff',
                  background: '#F96015',
                  border: 'none',
                  height: 44,
                  borderRadius: 9999,
                  cursor: 'pointer',
                }}
              >
                Start listening
              </button>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-8"
            style={{ borderTop: '1px solid rgba(24,84,42,0.10)' }}
          >
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#A09890' }}>
              © {new Date().getFullYear()} Narvo Intelligence Ltd. All rights reserved.
            </p>
            <div className="flex gap-6">
              {[['Privacy', '#'], ['Terms', '#']].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#A09890' }}
                  className="hover:text-[#18542A] transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── VOICE PREVIEW MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {voiceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(14,51,25,0.75)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) { setPreviewError(null); setVoiceModalOpen(false); } }}
          >
            <motion.div
              initial={prefersReduced ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={spring}
              className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              style={{ background: 'var(--color-surface)', borderRadius: 24, boxShadow: 'var(--shadow-4)', border: '1px solid rgba(24,84,42,0.15)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 shrink-0"
                style={{ borderBottom: '1px solid rgba(24,84,42,0.10)' }}
              >
                <div>
                  <h2
                    id="voice-modal-title"
                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: '#18542A' }}
                  >
                    Your Narvo Voice
                  </h2>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#807870', marginTop: 2 }}>Choose how your stories sound</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPreviewError(null); setVoiceModalOpen(false); }}
                  className="rounded-[10px] hover:bg-[rgba(24,84,42,0.06)] transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015]"
                  style={{ minHeight: 44, minWidth: 44, padding: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  aria-label="Close voice preview"
                >
                  <X weight="bold" className="w-5 h-5" style={{ color: '#807870' }} />
                </button>
              </div>

              {/* Voice list */}
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {voices.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: '#18542A', borderTopColor: 'transparent' }} aria-hidden />
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#807870' }}>Loading voices…</p>
                  </div>
                ) : (
                  voices.map((voice) => (
                    <div
                      key={voice.id}
                      className="flex items-center gap-4 rounded-[14px] border p-4"
                      style={{ background: 'var(--color-bg)', borderColor: 'rgba(24,84,42,0.10)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: '#18542A' }} className="truncate">{voice.name}</p>
                        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#807870', marginTop: 2 }}>{voice.accent} · {voice.gender}</p>
                        {previewError === voice.id && (
                          <p className="text-xs text-red-500 mt-1" role="alert" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Preview failed. Try again.</p>
                        )}
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => handleVoicePreview(voice)}
                        disabled={previewLoading === voice.id}
                        className="shrink-0 flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015]"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 13, fontWeight: 700,
                          color: '#ffffff',
                          background: '#F96015',
                          border: 'none',
                          height: 44, minWidth: 44,
                          padding: '0 16px',
                          borderRadius: 9999,
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-2)',
                        }}
                        whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                        whileTap={!prefersReduced   ? { scale: 0.96 } : undefined}
                        transition={spring}
                        aria-label={`Play preview for ${voice.name}`}
                      >
                        {previewLoading === voice.id
                          ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                          : <Play weight="fill" className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  ))
                )}
              </div>

              {/* Modal footer CTA */}
              <div className="px-6 py-5 shrink-0" style={{ borderTop: '1px solid rgba(24,84,42,0.10)' }}>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="w-full flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F96015]"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 15, fontWeight: 700,
                    color: '#ffffff',
                    background: '#F96015',
                    border: 'none',
                    height: 52,
                    borderRadius: 9999,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-3)',
                  }}
                >
                  Get started free <ArrowRight weight="bold" className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;
