/**
 * LandingPage.tsx — Design System v3
 * ─────────────────────────────────────────────────────────────
 * Narvo B2C consumer landing page.
 * Warm champagne background · Sunset amber primary · Adire indigo accent
 * General Sans typography · 8px grid · Spring physics motion
 *
 * Sections:
 *   Nav → Breaking Banner → Hero → Stats Strip → Bento Features
 *   → Live Feed → Social Proof → Voice Section → Final CTA → Footer
 *   → Voice Preview Modal (overlay)
 *
 * Design tokens: data-theme="warm" on root element activates v3 palette.
 * All colour references via Tailwind CSS vars (bg-background-dark, bg-primary, etc.)
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';

/* ── Phosphor Icons (24px grid, 2px stroke) ── */
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

/* ── Internal ── */
import NarvoLogo            from '../components/NarvoLogo';
import { useAudio }         from '../contexts/AudioContext';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import { getTtsPreviewSample }        from '../constants/tts';
import * as api             from '../lib/api';
import { subscribeToPush }  from '../lib/notificationService';
import logger               from '../lib/logger';

/* ─────────────────────────── Types ─────────────────────────── */

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
  verification_apis?: number;
  total_listeners?: string | number;
  active_listeners?: number;
  broadcast_ready?: boolean;
  last_sync?: string;
  [key: string]: unknown;
}

/* ─────────────────────────── Helpers ────────────────────────── */

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

/* ────────────────────────────────────────────────────────────── */
/* Phone Mockup — decorative UI preview, aria-hidden             */
/* ────────────────────────────────────────────────────────────── */

const PhoneMockup = () => (
  <div
    aria-hidden="true"
    className="relative mx-auto lg:mx-0 select-none"
    style={{ width: 224, flexShrink: 0 }}
  >
    {/* Ambient glow */}
    <div
      className="absolute inset-0 rounded-[38px] pointer-events-none"
      style={{ boxShadow: '0 32px 64px rgba(212,133,10,0.18), 0 8px 24px rgba(212,133,10,0.10)' }}
    />
    {/* Outer frame */}
    <div
      className="relative overflow-hidden"
      style={{ width: 224, height: 444, borderRadius: 38, border: '5px solid #1E1812', background: '#1E1812' }}
    >
      {/* Notch */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
        style={{ width: 60, height: 20, borderRadius: '0 0 12px 12px', background: '#1E1812' }}
      />
      {/* Screen content */}
      <div className="absolute inset-0 flex flex-col" style={{ background: '#1E1812' }}>

        {/* Status bar */}
        <div className="flex justify-between px-4 pt-7 pb-1 shrink-0">
          <span style={{ fontSize: 9, fontWeight: 700, color: '#F8F0E0', fontFamily: 'General Sans, sans-serif' }}>9:41</span>
          <span style={{ fontSize: 8, color: '#C4A878', fontFamily: 'General Sans, sans-serif' }}>NR ●●●</span>
        </div>

        {/* App header */}
        <div className="px-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(207,164,110,0.15)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F8F0E0', fontFamily: 'General Sans, sans-serif' }}>Good morning, Oga</div>
          <div style={{ fontSize: 8, color: '#C4A878', marginTop: 1, fontFamily: 'General Sans, sans-serif' }}>Thursday, 26 March 2026</div>
        </div>

        {/* Morning Briefing card */}
        <div
          className="mx-3 my-2 shrink-0 flex items-center justify-between"
          style={{ background: '#D4850A', borderRadius: 11, padding: '9px 11px' }}
        >
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.07em', fontFamily: 'General Sans, sans-serif' }}>MORNING BRIEFING</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginTop: 2, fontFamily: 'General Sans, sans-serif' }}>5 stories · 8 min</div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden><polygon points="1,0 9,5 1,10" fill="white" /></svg>
          </div>
        </div>

        {/* Topic chips */}
        <div className="flex gap-1 px-3 mb-2 shrink-0">
          {['For You', 'Nigeria', 'Business', 'Tech'].map((chip, i) => (
            <div key={chip} style={{ padding: '3px 8px', borderRadius: 999, fontSize: 7, fontWeight: 700, fontFamily: 'General Sans, sans-serif', background: i === 0 ? '#D4850A' : 'rgba(207,164,110,0.15)', color: i === 0 ? '#fff' : '#C4A878', border: i === 0 ? 'none' : '1px solid rgba(207,164,110,0.25)', whiteSpace: 'nowrap' }}>
              {chip}
            </div>
          ))}
        </div>

        {/* Story card */}
        <div className="mx-3 mb-2 shrink-0 overflow-hidden" style={{ borderRadius: 11, border: '1px solid rgba(207,164,110,0.18)' }}>
          <div style={{ height: 64, background: 'rgba(212,133,10,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(212,133,10,0.18)' }} />
            <div style={{ position: 'absolute', bottom: 7, right: 9, width: 26, height: 26, borderRadius: '50%', background: '#D4850A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden><polygon points="1,0 8,4.5 1,9" fill="white" /></svg>
            </div>
          </div>
          <div style={{ padding: '7px 9px', background: '#2A221A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 6, fontWeight: 700, color: '#D4850A', background: 'rgba(212,133,10,0.12)', padding: '1px 5px', borderRadius: 4, fontFamily: 'General Sans, sans-serif' }}>POLITICS</span>
              <span style={{ fontSize: 7, color: '#C4A878', fontFamily: 'General Sans, sans-serif' }}>2h ago</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#F8F0E0', lineHeight: 1.3, marginBottom: 4, fontFamily: 'General Sans, sans-serif' }}>Senate passes landmark economic reform bill</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 7, color: '#C4A878', fontFamily: 'General Sans, sans-serif' }}>4 min listen</span>
              <span style={{ fontSize: 7, fontWeight: 700, color: '#18967E', fontFamily: 'General Sans, sans-serif' }}>✓ Verified · 5 sources</span>
            </div>
          </div>
        </div>

        {/* Mini audio player */}
        <div className="mt-auto shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid rgba(207,164,110,0.18)', padding: '7px 12px' }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(212,133,10,0.18)', flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#F8F0E0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'General Sans, sans-serif' }}>Why the NNPC deal matters for...</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <div style={{ flex: 1, height: 2, background: 'rgba(212,133,10,0.18)', borderRadius: 1 }}>
                <div style={{ width: '35%', height: '100%', background: '#D4850A', borderRadius: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
                {[5, 8, 6, 10, 7, 9, 5].map((h, i) => (
                  <div key={i} className="wave-bar" style={{ width: 2, height: h, background: '#D4850A', borderRadius: 1 }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#D4850A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="7" height="9" viewBox="0 0 7 9" fill="white" aria-hidden><rect x="0" y="0" width="2.5" height="9"/><rect x="4.5" y="0" width="2.5" height="9"/></svg>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 8px 8px', borderTop: '1px solid rgba(207,164,110,0.15)' }}>
          {[['Home', true], ['Discover', false], ['Listen', false], ['Library', false], ['Profile', false]].map(([label, active]) => (
            <div key={label as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 14, height: 2, borderRadius: 1, background: active ? '#D4850A' : 'rgba(196,168,120,0.4)' }} />
              {active ? <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#D4850A' }} /> : null}
              <span style={{ fontSize: 6, fontWeight: 600, color: active ? '#D4850A' : '#C4A878', fontFamily: 'General Sans, sans-serif' }}>{label as string}</span>
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
    initial:    'hidden',
    whileInView:'visible',
    viewport:   { once: true, margin: '-40px' },
    variants:   fadeInUp,
    transition: { ...spring, delay },
  };

  /* ─────────────────────────────── JSX ───────────────────────── */

  return (
    <div
      data-theme="warm"
      className="min-h-screen flex flex-col bg-background-dark overflow-x-hidden"
      data-testid="landing-page"
    >

      {/* ── HEAD ──────────────────────────────────────────────── */}
      <Helmet>
        <title>Narvo — The Local Pulse, Refined</title>
        <meta name="description" content="AI-powered audio news for Africa. Narvo synthesises 39+ sources into one clear story, spoken in your language. Nigerian English, Yorùbá, Hausa, Igbo, Pidgin." />
        <link rel="canonical" href={`${getPublicUrl()}/`} />
        <meta property="og:url"          content={`${getPublicUrl()}/`} />
        <meta property="og:title"        content="Narvo — The Local Pulse, Refined" />
        <meta property="og:description"  content="AI reads 39+ sources so you don't have to. Clear, spoken, verified." />
        <meta property="og:image"        content={`${getPublicUrl()}/screenshot-wide.png`} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Narvo — The Local Pulse, Refined" />
        <meta name="twitter:description" content="Africa's AI-powered audio news companion." />
        <meta name="twitter:image"       content={`${getPublicUrl()}/screenshot-wide.png`} />
      </Helmet>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background:    scrolled ? 'rgba(253,248,240,0.92)' : 'rgba(253,248,240,0.82)',
          backdropFilter:'blur(12px)',
          WebkitBackdropFilter:'blur(12px)',
          borderBottom:  `1px solid ${scrolled ? 'rgba(207,164,110,0.35)' : 'transparent'}`,
          boxShadow:     scrolled ? '0 2px 8px rgba(139,90,43,0.07)' : 'none',
        }}
      >
        <nav
          className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-10"
          style={{ height: 64 }}
          aria-label="Main navigation"
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-[6px]"
            aria-label="Narvo — back to top"
          >
            <NarvoLogo className="w-7 h-7" />
            <span className="font-display font-bold text-xl text-content" style={{ letterSpacing: '-0.5px' }}>narvo</span>
          </button>

          <div className="hidden lg:flex items-center gap-7">
            {[['#features', 'Features'], ['#languages', 'Languages'], ['#live', 'Live Feed']].map(([href, label]) => (
              <a key={href} href={href} className="font-body text-sm font-medium text-content-secondary hover:text-content transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[4px] px-1">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:block font-body text-sm font-semibold text-content-secondary hover:text-content transition-colors px-3 py-2 rounded-[8px] border border-forest/40 hover:border-forest/70"
              style={{ minHeight: 40 }}
            >
              Sign in
            </button>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              className="font-display font-bold text-sm text-white px-5 py-2.5 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ background: '#D4850A', minHeight: 44, boxShadow: '0 2px 4px rgba(139,90,43,0.18)' }}
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

      {/* ── BREAKING BANNER ───────────────────────────────────── */}
      <AnimatePresence>
        {showBreaking && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full border-b"
            style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.22)' }}
            data-testid="landing-breaking-banner"
          >
            <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-6 lg:px-10 py-2.5">
              <Lightning weight="fill" className="w-3.5 h-3.5 text-red-500 shrink-0" aria-hidden />
              <span className="font-mono text-[11px] font-bold text-red-500 tracking-wider shrink-0 uppercase">Breaking</span>
              <button
                type="button"
                onClick={() => navigate(`/news/${breaking[0].id}`)}
                className="flex-1 min-w-0 text-left font-body text-sm font-medium text-content hover:text-primary transition-colors truncate"
              >
                {breaking[0].title}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/news/${breaking[0].id}`)}
                className="hidden sm:flex items-center gap-1 font-display text-xs font-bold text-red-500 hover:text-red-600 shrink-0"
              >
                Read now <ArrowRight weight="bold" className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setBreakingDismissed(true)}
                className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors shrink-0"
                aria-label="Dismiss breaking news"
                style={{ minHeight: 32, minWidth: 32 }}
              >
                <X weight="bold" className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 pt-14 pb-12 lg:pt-20 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Text */}
          <motion.div
            className="flex flex-col gap-6"
            initial={prefersReduced ? false : 'hidden'}
            animate="visible"
            variants={stagger}
          >
            {/* Tag pill */}
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[11px] font-bold tracking-wider w-fit"
                style={{ background: 'rgba(91,91,214,0.1)', color: '#5B5BD6' }}
              >
                <div className="w-[6px] h-[6px] rounded-full bg-[#5B5BD6] shrink-0" />
                AI-powered news for Africa
              </div>
            </motion.div>

            {/* H1 */}
            <motion.h1
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              className="font-display font-bold text-content"
              style={{ fontSize: 'clamp(2.2rem, 4.2vw, 3.5rem)', letterSpacing: '-1.5px', lineHeight: 1.08 }}
            >
              Africa's news,<br />
              explained —<br />
              <span style={{ color: '#D4850A' }}>then spoken.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={prefersReduced ? undefined : fadeInUp}
              transition={spring}
              className="font-body text-lg text-content-secondary leading-relaxed max-w-[400px]"
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
                className="font-display font-bold text-base text-white px-7 py-3.5 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ background: '#D4850A', minHeight: 52, boxShadow: '0 4px 8px rgba(139,90,43,0.18)' }}
                whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
                transition={spring}
                data-testid="hero-start-btn"
              >
                Start listening free
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-2 font-display font-semibold text-base text-content px-6 py-3.5 rounded-[12px] border border-forest/50 hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ minHeight: 52, background: 'transparent' }}
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
                <div key={s} className="flex items-center gap-1.5 font-body text-sm text-content-secondary">
                  <CheckCircle weight="fill" className="w-4 h-4 shrink-0" style={{ color: '#18967E' }} aria-hidden />
                  {s}
                </div>
              ))}
            </motion.div>

            {/* Push notification teaser */}
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
              <div
                className="inline-flex items-center gap-3 p-3 rounded-[12px] border border-forest/30"
                style={{ background: 'rgba(250,246,238,0.7)' }}
              >
                {pushEnabled
                  ? <BellRinging weight="fill" className="w-4 h-4 text-primary shrink-0" />
                  : <Bell className="w-4 h-4 text-content-secondary shrink-0" />}
                <span className="font-body text-sm text-content-secondary">7AM morning briefing</span>
                <button
                  type="button"
                  onClick={handleEnableAlerts}
                  disabled={pushEnabled || alertsLoading}
                  className="font-display text-xs font-bold px-3 py-1.5 rounded-[8px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{ minHeight: 32, background: pushEnabled ? 'rgba(24,150,126,0.12)' : '#D4850A', color: pushEnabled ? '#18967E' : 'white' }}
                >
                  {alertsLoading
                    ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
                    : pushEnabled ? 'Active ✓' : 'Enable alerts'}
                </button>
              </div>
              {alertsError && <p className="mt-1.5 font-body text-xs text-red-500" role="alert">{alertsError}</p>}
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

      {/* ── STATS STRIP ───────────────────────────────────────── */}
      <div className="border-y border-forest/25" style={{ background: 'rgba(250,246,238,0.7)' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6">
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
              <motion.div
                key={label}
                variants={prefersReduced ? undefined : fadeInUp}
                transition={spring}
                className="text-center"
              >
                <div className="font-display font-bold text-primary" style={{ fontSize: 28, letterSpacing: '-0.5px' }}>{value}</div>
                <div className="font-body text-sm text-content-secondary mt-0.5">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── BENTO FEATURES ────────────────────────────────────── */}
      <section id="features" className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-16 lg:py-20">

        {/* Section header */}
        <motion.div className="mb-10" {...inView()}>
          <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-primary uppercase mb-2">
            What makes Narvo different
          </p>
          <h2 className="font-display font-bold text-content" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', letterSpacing: '-0.8px', lineHeight: 1.15 }}>
            Built for Africa.<br />Powered by AI.
          </h2>
          <p className="font-body text-content-secondary mt-3 max-w-md">{totalSources}+ sources. One story. Spoken in your language.</p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, margin: '-40px' }, variants: stagger })}
        >
          {[
            { key: 'synthesis', icon: <Sparkle weight="fill" className="w-5 h-5" />,       title: 'AI Synthesis',       desc: `We monitor ${totalSources}+ news sources, cluster related articles, and produce a single broadcast narrative — not just one take.`, tags: [`${totalSources}+ sources`, 'Multi-source', 'Gemini AI'], accent: 'amber', tall: true },
            { key: 'truthtag',  icon: <ShieldCheck weight="fill" className="w-5 h-5" />,    title: 'Truth Tag',          desc: 'Every story shows source count, reliability score, and perspectives covered. Trust built in.',              accent: 'teal', tall: false },
            { key: 'briefing',  icon: <Waveform weight="fill" className="w-5 h-5" />,       title: 'Morning Briefing',   desc: '5 top stories, synthesised and spoken. Ready at 7AM every day.',                                       accent: 'neutral', tall: false },
            { key: 'languages', icon: <Globe weight="fill" className="w-5 h-5" />,          title: '5 Nigerian Languages', desc: 'English, Yorùbá, Hausa, Igbo, Pidgin — your voice, your news.',                                   accent: 'indigo', tall: false },
            { key: 'offline',   icon: <CloudArrowDown weight="fill" className="w-5 h-5" />, title: 'Works Offline',      desc: 'Download stories. Listen on the go. No data needed.',                                              accent: 'teal', tall: false },
          ].map((feat, i) => {
            const isAmber  = feat.accent === 'amber';
            const isTeal   = feat.accent === 'teal';
            const isIndigo = feat.accent === 'indigo';
            return (
              <motion.div
                key={feat.key}
                variants={prefersReduced ? undefined : { ...fadeInUp, transition: { ...spring, delay: i * 0.06 } }}
                transition={spring}
                className={feat.tall ? 'sm:row-span-2' : ''}
                style={{
                  borderRadius: 20, padding: 20,
                  border: `1px solid ${isAmber ? '#D4850A' : isTeal ? 'rgba(24,150,126,0.22)' : isIndigo ? 'rgba(91,91,214,0.22)' : 'rgba(207,164,110,0.25)'}`,
                  background:   isAmber ? '#D4850A' : isTeal ? 'rgba(24,150,126,0.07)' : isIndigo ? 'rgba(91,91,214,0.07)' : 'rgb(250,246,238)',
                  boxShadow:    isAmber ? '0 4px 8px rgba(212,133,10,0.2), 0 2px 4px rgba(212,133,10,0.12)' : '0 2px 4px rgba(139,90,43,0.08)',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 11, background: isAmber ? 'rgba(255,255,255,0.2)' : isTeal ? 'rgba(24,150,126,0.14)' : isIndigo ? 'rgba(91,91,214,0.14)' : 'rgba(212,133,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: isAmber ? 'white' : isTeal ? '#18967E' : isIndigo ? '#5B5BD6' : '#D4850A' }}>
                  {feat.icon}
                </div>
                <h3 className="font-display font-bold mb-2" style={{ fontSize: 16, color: isAmber ? 'white' : '#2A2420' }}>{feat.title}</h3>
                <p className="font-body text-sm leading-relaxed" style={{ color: isAmber ? 'rgba(255,255,255,0.8)' : '#6B5A40' }}>{feat.desc}</p>
                {feat.tags && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {feat.tags.map((tag) => (
                      <span key={tag} className="font-mono text-[10px] font-bold px-2 py-1 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.88)' }}>{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── LIVE FEED ─────────────────────────────────────────── */}
      <section id="live" className="border-y border-forest/25" style={{ background: 'rgba(250,246,238,0.5)' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14 lg:py-18">

          <motion.div className="flex items-end justify-between mb-8" {...inView()}>
            <div>
              <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-primary uppercase mb-1">Live right now</p>
              <h2 className="font-display font-bold text-content" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', letterSpacing: '-0.5px' }}>Latest Stories</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:flex items-center gap-1.5 font-display text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px] px-2 py-1"
            >
              See all <ArrowRight className="w-4 h-4" weight="bold" />
            </button>
          </motion.div>

          {newsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[16px] animate-pulse" style={{ height: 130, background: 'rgba(207,164,110,0.1)' }} />
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
                  className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[16px]"
                  variants={prefersReduced ? undefined : { ...fadeInUp, transition: { ...spring, delay: i * 0.06 } }}
                  transition={spring}
                  whileHover={!prefersReduced ? { y: -2 } : undefined}
                  whileTap={!prefersReduced   ? { scale: 0.99 } : undefined}
                  aria-label={`Read story: ${story.title}`}
                >
                  <div
                    className="flex gap-4 p-4 rounded-[16px] border h-full"
                    style={{ background: 'rgb(250,246,238)', borderColor: 'rgba(207,164,110,0.25)', boxShadow: '0 2px 4px rgba(139,90,43,0.06)' }}
                  >
                    <div className="shrink-0 w-1 rounded-full" style={{ background: '#D4850A' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px]" style={{ background: 'rgba(212,133,10,0.1)', color: '#D4850A' }}>
                          {(story.category ?? 'NEWS').toUpperCase()}
                        </span>
                        {(story.narrative || (story.truth_score != null && story.truth_score >= 80)) && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px]" style={{ background: 'rgba(91,91,214,0.1)', color: '#5B5BD6' }}>AI</span>
                        )}
                        <span className="font-body text-xs text-content-secondary ml-auto">
                          {story.published ? new Date(story.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-content text-[15px] leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {story.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-content-secondary">{story.source ?? 'RSS'}{story.read_time ? ` · ${story.read_time}` : ''}</span>
                        {story.truth_score != null && story.truth_score >= 70 && (
                          <div className="flex items-center gap-1">
                            <ShieldCheck weight="fill" className="w-3.5 h-3.5" style={{ color: '#18967E' }} aria-hidden />
                            <span className="font-body text-xs font-semibold" style={{ color: '#18967E' }}>Verified</span>
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
            <button type="button" onClick={() => navigate('/auth')} className="flex items-center gap-2 font-display text-sm font-bold text-primary mx-auto">
              See all stories <ArrowRight className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-16 lg:py-20">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: stagger })}
        >
          {/* Testimonial */}
          <motion.blockquote
            variants={prefersReduced ? undefined : fadeInUp}
            transition={spring}
            className="p-7 rounded-[20px] border"
            style={{ background: 'rgb(250,246,238)', borderColor: 'rgba(207,164,110,0.3)', borderLeft: '4px solid #D4850A', boxShadow: '0 4px 8px rgba(139,90,43,0.08)' }}
          >
            <p className="font-body text-content text-lg leading-relaxed italic mb-5">
              "I used to spend 45 minutes reading four different news sites every morning. Now I play my Narvo briefing on the way to Ikeja. Done in 8 minutes."
            </p>
            <footer className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full font-display font-bold text-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(212,133,10,0.15)', color: '#D4850A' }} aria-hidden>CO</div>
              <div>
                <div className="font-display font-bold text-sm text-content">Chidi Okafor</div>
                <div className="font-body text-xs text-content-secondary">Software Engineer, Lagos</div>
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
              <div key={label} className="text-center p-5 rounded-[16px] border" style={{ background: 'rgb(250,246,238)', borderColor: 'rgba(207,164,110,0.25)', boxShadow: '0 1px 2px rgba(139,90,43,0.06)' }}>
                <div className="font-display font-bold text-primary" style={{ fontSize: 26, letterSpacing: '-0.5px' }}>{value}</div>
                <div className="font-body text-sm text-content-secondary mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── VOICE SECTION ─────────────────────────────────────── */}
      <section id="languages" className="border-t border-forest/25" style={{ background: 'rgba(250,246,238,0.5)' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
            {...(prefersReduced ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: stagger })}
          >
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
              <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-primary uppercase mb-3">Your Narvo Voice</p>
              <h2 className="font-display font-bold text-content mb-4" style={{ fontSize: 'clamp(1.7rem, 2.8vw, 2.2rem)', letterSpacing: '-0.7px', lineHeight: 1.15 }}>
                News that sounds<br />like home.
              </h2>
              <p className="font-body text-content-secondary text-lg mb-6 leading-relaxed">
                Choose how your stories sound. Five Nigerian languages with authentic accents — because information in your own language is a right, not a luxury.
              </p>
              <motion.button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-3 font-display font-bold text-base text-white px-7 py-4 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ background: '#D4850A', minHeight: 52, boxShadow: '0 4px 8px rgba(139,90,43,0.18)' }}
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
                { lang: 'Nigerian Pidgin',  note: '75M+ speakers, growing fast', emoji: '🌍' },
              ].map(({ lang, note, emoji }) => (
                <motion.div
                  key={lang}
                  variants={prefersReduced ? undefined : fadeInUp}
                  transition={spring}
                  className="flex items-center gap-3 p-4 rounded-[14px] border cursor-pointer hover:border-primary transition-colors"
                  style={{ background: 'rgb(250,246,238)', borderColor: 'rgba(207,164,110,0.25)', boxShadow: '0 1px 2px rgba(139,90,43,0.05)' }}
                  onClick={() => setVoiceModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setVoiceModalOpen(true)}
                >
                  <span className="text-2xl" aria-hidden>{emoji}</span>
                  <div>
                    <div className="font-display font-bold text-sm text-content">{lang}</div>
                    <div className="font-body text-xs text-content-secondary">{note}</div>
                  </div>
                  <Play weight="fill" className="w-4 h-4 text-primary ml-auto" aria-hidden />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section style={{ background: '#2A2420' }} className="px-6 lg:px-10 py-20 lg:py-24 text-center">
        <div className="max-w-[640px] mx-auto">
          <motion.div {...inView()}>
            <p className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase mb-4" style={{ color: '#D4850A' }}>Get started today</p>
            <h2 className="font-display font-bold mb-4" style={{ color: 'white', fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-1px', lineHeight: 1.1 }}>
              Your morning briefing<br />is waiting.
            </h2>
            <p className="font-body text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              No credit card required · Works on any device<br />5 Nigerian languages · Offline listening
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-6">
              <motion.button
                type="button"
                onClick={() => navigate('/auth')}
                className="font-display font-bold text-base px-8 py-4 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ background: 'white', color: '#2A2420', minHeight: 52 }}
                whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.97 } : undefined}
                transition={spring}
                data-testid="final-cta-btn"
              >
                Start listening free
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-2 font-display font-semibold text-base px-7 py-4 rounded-[12px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ color: 'white', borderColor: 'rgba(255,255,255,0.25)', minHeight: 52, background: 'transparent' }}
                whileHover={!prefersReduced ? { scale: 1.01 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.98 } : undefined}
                transition={spring}
              >
                <SpeakerHigh weight="fill" className="w-5 h-5" aria-hidden />
                Hear a sample
              </motion.button>
            </div>
            <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Join 10,000+ early listeners · narvo.news</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-forest/25" style={{ background: 'rgb(250,246,238)' }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <NarvoLogo className="w-6 h-6" />
                <span className="font-display font-bold text-lg text-content" style={{ letterSpacing: '-0.4px' }}>narvo</span>
              </div>
              <p className="font-body text-sm text-content-secondary leading-relaxed max-w-[180px]">The Local Pulse, Refined. AI news for Africa.</p>
            </div>
            <div>
              <h3 className="font-display font-bold text-xs text-content-secondary uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                {[['Features', '#features'], ['Languages', '#languages'], ['Live feed', '#live'], ['Pricing', '/subscription']].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} onClick={href.startsWith('/') ? (e) => { e.preventDefault(); navigate(href); } : undefined} className="font-body text-sm text-content-secondary hover:text-content transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-bold text-xs text-content-secondary uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-3">
                {[['About', '#'], ['Investor', 'https://investor.narvo.news'], ['Status', 'https://narvo.statuspage.io/'], ['API', '/tools']].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="font-body text-sm text-content-secondary hover:text-content transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-bold text-xs text-content-secondary uppercase tracking-wider mb-4">Get started</h3>
              <p className="font-body text-sm text-content-secondary mb-4 leading-relaxed">Free to try. No credit card required.</p>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="font-display font-bold text-sm text-white px-5 py-3 rounded-[10px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ background: '#D4850A', boxShadow: '0 2px 4px rgba(139,90,43,0.14)' }}
              >
                Start listening
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 pt-6 border-t border-forest/25">
            <p className="font-body text-xs text-content-secondary">© {new Date().getFullYear()} Narvo Intelligence Ltd. All rights reserved.</p>
            <div className="flex gap-5">
              {[['Privacy', '#'], ['Terms', '#']].map(([label, href]) => (
                <a key={label} href={href} className="font-body text-xs text-content-secondary hover:text-content transition-colors">{label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── VOICE PREVIEW MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {voiceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(42,36,32,0.72)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) { setPreviewError(null); setVoiceModalOpen(false); } }}
          >
            <motion.div
              data-theme="warm"
              initial={prefersReduced ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={spring}
              className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              style={{ background: 'rgb(253,248,240)', borderRadius: 24, boxShadow: '0 24px 48px rgba(42,36,32,0.28)', border: '1px solid rgba(207,164,110,0.4)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(207,164,110,0.25)' }}>
                <div>
                  <h2 id="voice-modal-title" className="font-display font-bold text-lg text-content">Your Narvo Voice</h2>
                  <p className="font-body text-sm text-content-secondary">Choose how your stories sound</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPreviewError(null); setVoiceModalOpen(false); }}
                  className="p-2 rounded-[10px] hover:bg-surface-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center"
                  style={{ minHeight: 44, minWidth: 44 }}
                  aria-label="Close voice preview"
                >
                  <X weight="bold" className="w-5 h-5 text-content-secondary" />
                </button>
              </div>

              {/* Voice list */}
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {voices.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" aria-hidden />
                    <p className="font-body text-sm text-content-secondary">Loading voices…</p>
                  </div>
                ) : (
                  voices.map((voice) => (
                    <div
                      key={voice.id}
                      className="flex items-center gap-4 p-4 rounded-[14px] border"
                      style={{ background: 'rgb(250,246,238)', borderColor: 'rgba(207,164,110,0.25)', boxShadow: '0 1px 2px rgba(139,90,43,0.04)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-content truncate">{voice.name}</p>
                        <p className="font-body text-sm text-content-secondary">{voice.accent} · {voice.gender}</p>
                        {previewError === voice.id && (
                          <p className="font-body text-xs text-red-500 mt-1" role="alert">Preview failed. Try again.</p>
                        )}
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => handleVoicePreview(voice)}
                        disabled={previewLoading === voice.id}
                        className="shrink-0 flex items-center justify-center gap-2 font-display font-bold text-sm text-white px-4 py-2.5 rounded-[10px] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ background: '#D4850A', minHeight: 44, minWidth: 44, boxShadow: '0 2px 4px rgba(139,90,43,0.14)' }}
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
              <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(207,164,110,0.25)' }}>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="w-full font-display font-bold text-base text-white py-4 rounded-[12px] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{ background: '#D4850A', boxShadow: '0 4px 8px rgba(139,90,43,0.18)' }}
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
