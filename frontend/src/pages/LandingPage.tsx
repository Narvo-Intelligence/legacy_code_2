/**
 * LandingPage.tsx — Narvo Design System v4
 * ─────────────────────────────────────────
 * Reed Words structure. Minimal. Five sections.
 *
 *   Nav → Hero → Features (Reed Words grid) → Stories → Statement → CTA → Footer
 *
 * Theme: local light/dark toggle. No dependency on app ThemeContext.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';

import { ArrowRight }     from '@phosphor-icons/react/ArrowRight';
import { X }              from '@phosphor-icons/react/X';
import { Play }           from '@phosphor-icons/react/Play';
import { SpeakerHigh }    from '@phosphor-icons/react/SpeakerHigh';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { Lightning }      from '@phosphor-icons/react/Lightning';
import { Sun }            from '@phosphor-icons/react/Sun';
import { Moon }           from '@phosphor-icons/react/Moon';
import { Sparkle }        from '@phosphor-icons/react/Sparkle';
import { ShieldCheck }    from '@phosphor-icons/react/ShieldCheck';
import { Bell }           from '@phosphor-icons/react/Bell';
import { Globe }          from '@phosphor-icons/react/Globe';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';

import NarvoLogo               from '../components/NarvoLogo';
import { useAudio }            from '../contexts/AudioContext';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import { getTtsPreviewSample } from '../constants/tts';
import * as api                from '../lib/api';
import logger                  from '../lib/logger';

/* ────────────────── Types ────────────────── */

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
  category?: string;
  read_time?: string;
  truth_score?: number;
  [key: string]: unknown;
}

/* ────────────────── Theme Palettes ────────────────── */

const LIGHT = {
  bg:        '#F3E8CC',
  surface:   '#FDF8EF',
  surface2:  '#EDE9E4',
  text:      '#18542A',
  textMid:   '#625B52',
  textDim:   '#A09890',
  border:    '#DDD8D2',
  borderSub: '#EDE9E4',
  navBg:     'rgba(243,232,204,0.94)',
  navBorder: 'rgba(24,84,42,0.12)',
  divider:   'rgba(24,84,42,0.10)',
  cardBg:    '#FDF8EF',
  cardBorder:'rgba(24,84,42,0.10)',
  numColor:  '#C0B9B1',
  tagBg:     'rgba(24,84,42,0.08)',
  tagColor:  '#18542A',
  toggleBg:  'rgba(24,84,42,0.08)',
  toggleIcon:'#625B52',
};

const DARK = {
  bg:        '#1E1A16',
  surface:   '#2E2922',
  surface2:  '#47413A',
  text:      '#F7F5F2',
  textMid:   '#C0B9B1',
  textDim:   '#807870',
  border:    '#47413A',
  borderSub: '#2E2922',
  navBg:     'rgba(30,26,22,0.96)',
  navBorder: 'rgba(255,255,255,0.07)',
  divider:   'rgba(255,255,255,0.07)',
  cardBg:    '#2E2922',
  cardBorder:'rgba(255,255,255,0.08)',
  numColor:  '#47413A',
  tagBg:     'rgba(255,255,255,0.08)',
  tagColor:  '#C0B9B1',
  toggleBg:  'rgba(255,255,255,0.08)',
  toggleIcon:'#C0B9B1',
};

/* ────────────────── Constants ────────────────── */

const G  = '#18542A';   /* Forest Green — always */
const Y  = '#FFC926';   /* Sunshine Yellow — always */
const CC = '#F96015';   /* Crisp Carrot — always */

const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };
const fadeUp  = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

const fetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const getPublicUrl = () =>
  import.meta.env.VITE_PUBLIC_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/* ────────────────── Brand Mark ────────────────── */

const ContinentMark = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 40 50" aria-hidden>
    <g className="fragment-1">
      <polygon points="6,0 34,0 40,6 40,16 34,20 6,20 0,14 0,6" fill={Y} />
    </g>
    <g className="fragment-2">
      <polygon points="2,24 38,24 40,28 40,36 36,40 4,40 0,36 0,28" fill="rgba(255,255,255,0.85)" />
    </g>
    <g className="fragment-3">
      <polygon points="4,44 36,44 40,50 30,50 10,50 0,50" fill={Y} opacity="0.5" />
    </g>
  </svg>
);

/* ────────────────── Feature Cards ────────────────── */

interface FeatureCard {
  id: string;
  label: string;
  title: string;
  body: string;
  visualBg: string;
  visualIcon: React.ReactNode;
  large?: boolean;
}

const FEATURES: FeatureCard[] = [
  {
    id: 'synthesis',
    label: 'AI Synthesis',
    title: 'We read 39 sources.\nYou hear one story.',
    body:  "Narvo's AI distils dozens of outlets into a single clear narrative — every angle, no noise.",
    visualBg:   G,
    visualIcon: <Sparkle weight="fill" style={{ width: 32, height: 32, color: Y }} />,
    large: true,
  },
  {
    id: 'truth',
    label: 'Truth Tag',
    title: 'Know where it\ncame from.',
    body:  'Every story is scored for source count, outlet credibility, and perspective breadth.',
    visualBg:   'rgba(154,188,5,0.14)',
    visualIcon: <ShieldCheck weight="fill" style={{ width: 28, height: 28, color: '#5a7003' }} />,
  },
  {
    id: 'briefing',
    label: 'Morning Briefing',
    title: '8 minutes.\nEvery morning.',
    body:  '5 top stories synthesised, spoken, and waiting before your commute begins.',
    visualBg:   Y,
    visualIcon: <Bell weight="fill" style={{ width: 28, height: 28, color: G }} />,
  },
  {
    id: 'languages',
    label: '5 Languages',
    title: 'Your language.\nYour voice.',
    body:  'Yorùbá, Hausa, Igbo, Pidgin, English. Authentic accents powered by YarnGPT.',
    visualBg:   'rgba(249,96,21,0.10)',
    visualIcon: <Globe weight="fill" style={{ width: 28, height: 28, color: CC }} />,
  },
  {
    id: 'offline',
    label: 'Works Offline',
    title: 'Dead zone?\nStill listening.',
    body:  'Download stories on WiFi. Play them anywhere — no data, no problem.',
    visualBg:   'rgba(24,84,42,0.08)',
    visualIcon: <CloudArrowDown weight="fill" style={{ width: 28, height: 28, color: G }} />,
  },
];

/* ────────────────── Main Component ────────────────── */

const LandingPage = () => {
  const navigate       = useNavigate();
  const prefersReduced = useReducedMotion();
  const { playTrack, stopTrack } = useAudio();

  const { data: stories = [], isLoading } =
    useSWR<LandingStory[]>('api/news?limit=5', fetcher);
  const { data: breaking = [] } =
    useSWR<LandingStory[]>('api/news/breaking', fetcher);

  const [isDark,            setIsDark]            = useState(false);
  const [scrolled,          setScrolled]          = useState(false);
  const [breakingDismissed, setBreakingDismissed] = useState(false);
  const [voiceModalOpen,    setVoiceModalOpen]    = useState(false);
  const [voices,            setVoices]            = useState<Voice[]>([]);
  const [previewLoading,    setPreviewLoading]    = useState<string | null>(null);
  const [previewError,      setPreviewError]      = useState<string | null>(null);
  const previewCache = useRef<Record<string, string>>({});

  const C = isDark ? DARK : LIGHT;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (voiceModalOpen && voices.length === 0) {
      let cancelled = false;
      api.get('api/voices')
        .then(r => r.ok ? r.json() : [])
        .then((list: Voice[]) => { if (!cancelled) setVoices(Array.isArray(list) ? list : []); })
        .catch(() => { if (!cancelled) setVoices([]); });
      return () => { cancelled = true; };
    }
    return undefined;
  }, [voiceModalOpen, voices.length]);

  const handleVoicePreview = useCallback(async (voice: Voice) => {
    const lang       = voice.language?.toLowerCase().split('-')[0] ?? 'en';
    const sampleText = getTtsPreviewSample(lang);
    const cacheKey   = `${voice.id}:${lang}`;
    const idbKey     = `voice_preview:${cacheKey}`;
    setPreviewLoading(voice.id);
    setPreviewError(null);
    stopTrack();
    try {
      const mem = previewCache.current[cacheKey];
      if (mem) {
        await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: mem, source: 'VOICE_PREVIEW' }, true);
        setPreviewLoading(null); return;
      }
      const local = await getCachedAudio(idbKey);
      if (local?.audio_url) {
        previewCache.current[cacheKey] = local.audio_url;
        await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: local.audio_url, source: 'VOICE_PREVIEW' }, true);
        setPreviewLoading(null); return;
      }
      const res  = await api.post('api/tts/generate', { text: sampleText, voice_id: voice.id, language: lang, skip_translation: true });
      if (!res.ok) throw new Error('TTS failed');
      const data = (await res.json()) as { audio_url?: string };
      if (!data.audio_url) { setPreviewLoading(null); setPreviewError(voice.id); return; }
      previewCache.current[cacheKey] = data.audio_url;
      await cacheAudio(idbKey, data.audio_url, { title: `Narvo Voice: ${voice.name}`, source: 'VOICE_PREVIEW' });
      await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: data.audio_url, source: 'VOICE_PREVIEW' }, true);
      setPreviewLoading(null);
    } catch (err) {
      logger.debug('[LandingPage] Voice preview error', err);
      setPreviewLoading(null);
      setPreviewError(voice.id);
    }
  }, [playTrack, stopTrack]);

  const showBreaking = !breakingDismissed && breaking.length > 0;

  const displayStories: LandingStory[] = isLoading
    ? Array.from({ length: 5 }, (_, i) => ({ id: `sk-${i}`, title: '', category: '', read_time: '' }))
    : stories.slice(0, 5);

  const inView = (delay = 0) => prefersReduced ? {} : ({
    initial:     'hidden',
    whileInView: 'visible',
    viewport:    { once: true, margin: '-40px' },
    variants:    fadeUp,
    transition:  { ...spring, delay },
  } as const);

  /* ──────────────────────── JSX ──────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: C.bg, color: C.text, transition: 'background 300ms, color 300ms' }}
      data-testid="landing-page"
    >
      <Helmet>
        <title>Narvo — Africa's voice, in your ears</title>
        <meta name="description" content="AI-synthesised audio news for Africa. Five Nigerian languages. Verified by the Truth Tag." />
        <link rel="canonical" href={`${getPublicUrl()}/`} />
        <meta property="og:title"       content="Narvo — Africa's voice, in your ears" />
        <meta property="og:description" content="AI reads 39 sources so you don't have to. Clear, spoken, verified." />
        <meta property="og:image"       content={`${getPublicUrl()}/screenshot-wide.png`} />
        <meta name="twitter:card"       content="summary_large_image" />
      </Helmet>

      {/* ═══ NAV ════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background:           scrolled ? C.navBg : 'transparent',
          backdropFilter:       scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom:         scrolled ? `1px solid ${C.navBorder}` : '1px solid transparent',
          boxShadow:            scrolled ? 'var(--shadow-1)' : 'none',
          transition:           'all 250ms var(--ease-standard)',
        }}
      >
        <nav
          className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-10"
          style={{ height: 72 }}
          aria-label="Main navigation"
        >
          {/* Wordmark */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
            aria-label="Narvo — scroll to top"
          >
            <NarvoLogo className="w-6 h-6" style={{ color: isDark ? Y : G }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: isDark ? Y : G, letterSpacing: '-0.02em' }}>
              Narvo<span style={{ color: CC }}>.</span>
            </span>
          </button>

          {/* Nav links — desktop */}
          <div className="hidden lg:flex items-center" style={{ gap: 32 }}>
            {[['#features', 'Features'], ['#stories', 'Stories'], ['#about', 'About']].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: C.textMid, textDecoration: 'none', letterSpacing: '0.01em', transition: 'color 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.text; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.textMid; }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right: theme toggle + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setIsDark(d => !d)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 40, height: 40,
                borderRadius: 9999,
                background: C.toggleBg,
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 200ms',
              }}
            >
              {isDark
                ? <Sun  weight="bold" style={{ width: 17, height: 17, color: C.toggleIcon }} />
                : <Moon weight="bold" style={{ width: 17, height: 17, color: C.toggleIcon }} />
              }
            </button>

            {/* Get started */}
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
                color: '#fff', background: CC, border: 'none',
                borderRadius: 9999, height: 44, padding: '0 22px',
                cursor: 'pointer', boxShadow: 'var(--shadow-2)',
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

      {/* ═══ BREAKING BANNER ════════════════════════════════════ */}
      <AnimatePresence>
        {showBreaking && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ background: 'rgba(213,37,24,0.06)', borderBottom: '1px solid rgba(213,37,24,0.18)' }}
          >
            <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-6 lg:px-10 py-3">
              <Lightning weight="fill" style={{ width: 13, height: 13, color: '#D52518', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#D52518', letterSpacing: '0.10em', textTransform: 'uppercase', flexShrink: 0 }}>Breaking</span>
              <button type="button" onClick={() => navigate(`/news/${breaking[0].id}`)} className="flex-1 min-w-0 truncate text-left"
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: C.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {breaking[0].title}
              </button>
              <button type="button" onClick={() => setBreakingDismissed(true)} aria-label="Dismiss"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32, borderRadius: 6, flexShrink: 0 }}>
                <X weight="bold" style={{ width: 13, height: 13, color: '#D52518' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — HERO
          Full viewport. Headline only. One CTA.
         ═══════════════════════════════════════════════════════════════ */}
      <section
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10 flex flex-col justify-center"
        style={{ minHeight: 'calc(100vh - 72px)', paddingTop: 80, paddingBottom: 80 }}
      >
        <motion.div
          className="flex flex-col"
          style={{ gap: 32, maxWidth: 800 }}
          initial={prefersReduced ? false : 'hidden'}
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
        >
          <motion.h1
            variants={prefersReduced ? undefined : fadeUp}
            transition={spring}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 8vw, 96px)',
              color: C.text,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
            }}
          >
            Africa's news.<br />
            <em style={{ fontStyle: 'italic', color: C.textMid }}>Spoken to you.</em>
          </motion.h1>

          <motion.p
            variants={prefersReduced ? undefined : fadeUp}
            transition={{ ...spring, delay: 0.08 }}
            style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: C.textMid, lineHeight: 1.65, maxWidth: 460 }}
          >
            We synthesise 39+ sources into one clear story and speak it in your language — Yorùbá, Hausa, Igbo, Pidgin, or English.
          </motion.p>

          <motion.div
            variants={prefersReduced ? undefined : fadeUp}
            transition={{ ...spring, delay: 0.16 }}
          >
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
                color: '#fff', background: CC, border: 'none',
                borderRadius: 9999, height: 56, padding: '0 36px',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                boxShadow: 'var(--shadow-2)',
              }}
              whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
              whileTap={!prefersReduced   ? { scale: 0.96 } : undefined}
              transition={spring}
              data-testid="hero-cta"
            >
              <Play weight="fill" style={{ width: 15, height: 15, flexShrink: 0 }} />
              Oya, Start Listening
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, background: C.divider }} />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — FEATURES (Reed Words grid)
          Single flat grid. AI Synthesis wide column on desktop.
          Mobile: 1 column. Tablet: 2 columns. Desktop: 2fr 1fr 1fr 1fr 1fr.
         ═══════════════════════════════════════════════════════════════ */}
      <section
        id="features"
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 72, paddingBottom: 80 }}
      >
        {/* Section header */}
        <motion.div
          {...inView()}
          style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
        >
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 44px)', color: C.text,
            lineHeight: 1.05, letterSpacing: '-0.02em',
          }}>
            What makes Narvo <em style={{ fontStyle: 'italic', color: C.textMid }}>different</em>.
          </h2>
          <button type="button" onClick={() => navigate('/auth')}
            style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: C.textMid, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', textDecoration: 'underline', textDecorationColor: C.border, textUnderlineOffset: 4 }}>
            Start free <ArrowRight weight="bold" style={{ width: 13, height: 13 }} />
          </button>
        </motion.div>

        {/*
          Single flat grid — no wrapper div.
          grid-template-columns logic:
            mobile  (<768px): 1 column
            tablet  (768px+): repeat(2, 1fr)
            desktop (1024px+): 2fr 1fr 1fr 1fr 1fr  (AI Synthesis wide)
          Inline style handles desktop; Tailwind className handles smaller breakpoints.
          The inline style takes precedence at ≥1024px via specificity.
        */}
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(2, 1fr)',  /* tablet default */
          }}
          className="grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:2fr_1fr_1fr_1fr_1fr]"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.id}
              {...inView(i * 0.06)}
              style={{
                display: 'flex', flexDirection: 'column',
                background: C.cardBg,
                border: `1px solid ${C.cardBorder}`,
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'border-color 200ms, transform 200ms',
              }}
              whileHover={!prefersReduced ? { y: -3 } : undefined}
              transition={{ duration: 0.2 }}
            >
              {/* Visual area */}
              <div style={{
                background: f.visualBg,
                aspectRatio: f.large ? '16/9' : '3/2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {f.id === 'synthesis' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <ContinentMark size={44} />
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
                      {[8, 14, 10, 18, 12, 16, 8].map((h, idx) => (
                        <div key={idx} className="wave-bar" style={{ width: 3, height: h, background: Y, borderRadius: 2, transformOrigin: 'bottom' }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {f.visualIcon}
                  </div>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: '18px 20px 22px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                  color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>
                  {f.label}
                </span>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: f.large ? 20 : 17, color: C.text,
                  lineHeight: 1.2, letterSpacing: '-0.01em',
                  whiteSpace: 'pre-line',
                }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>
                  {f.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, background: C.divider }} />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — STORIES
          5 numbered editorial rows.
         ═══════════════════════════════════════════════════════════════ */}
      <section
        id="stories"
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 72, paddingBottom: 72 }}
      >
        {/* Header row */}
        <motion.div
          {...inView()}
          style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: C.text, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            What's happening <em style={{ fontStyle: 'italic', color: C.textMid }}>now</em>.
          </h2>
          <motion.button type="button" onClick={() => navigate('/auth')}
            {...inView(0.1)}
            style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: C.textMid, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', textDecoration: 'underline', textDecorationColor: C.border, textUnderlineOffset: 4, flexShrink: 0 }}>
            All stories <ArrowRight weight="bold" style={{ width: 13, height: 13 }} />
          </motion.button>
        </motion.div>

        {/* Story rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {displayStories.map((story, i) => {
            const isSkeleton = isLoading;
            const verified   = typeof story.truth_score === 'number' && story.truth_score >= 70;
            const isLast     = i === displayStories.length - 1;

            return (
              <motion.button
                key={story.id}
                type="button"
                onClick={() => !isSkeleton && navigate(`/news/${story.id}`)}
                {...(prefersReduced ? {} : {
                  initial: { opacity: 0, y: 6 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: '-20px' },
                  transition: { ...spring, delay: i * 0.06 },
                  whileHover: !isSkeleton ? { x: 4 } : undefined,
                })}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr auto',
                  alignItems: 'center',
                  gap: 24,
                  padding: '22px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: isLast ? 'none' : `1px solid ${C.divider}`,
                  cursor: isSkeleton ? 'default' : 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                aria-label={isSkeleton ? undefined : `Listen: ${story.title}`}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                  color: C.numColor, letterSpacing: '0.06em', flexShrink: 0,
                  ...(isSkeleton && { background: C.surface2, borderRadius: 4, width: 24, height: 14, display: 'block', color: 'transparent' }),
                }}>
                  {isSkeleton ? '' : String(i + 1).padStart(2, '0')}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                  {isSkeleton ? (
                    <>
                      <div style={{ height: 18, background: C.surface2, borderRadius: 4, width: `${60 + (i % 4) * 10}%` }} />
                      <div style={{ height: 11, background: C.surface2, borderRadius: 4, width: 80 }} />
                    </>
                  ) : (
                    <>
                      <span className="line-clamp-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: C.text, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                        {story.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {story.category && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: C.tagColor, background: C.tagBg, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {story.category}
                          </span>
                        )}
                        {story.read_time && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.textDim, letterSpacing: '0.04em' }}>
                            {story.read_time} listen
                          </span>
                        )}
                        {verified && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#5a7003' }}>✓ Verified</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!isSkeleton && (
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="hidden sm:block" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: CC }}>
                      Oya, Play
                    </span>
                    <div style={{ width: 40, height: 40, borderRadius: 9999, background: CC, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Play weight="fill" style={{ width: 14, height: 14, color: '#fff' }} />
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, background: C.divider }} />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — STATEMENT
          One sentence. Generous padding. Not forced full-height.
         ═══════════════════════════════════════════════════════════════ */}
      <section
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 96, paddingBottom: 96 }}
      >
        <motion.p
          {...inView()}
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(28px, 4.5vw, 58px)',
            color: C.text, lineHeight: 1.1, letterSpacing: '-0.02em',
            maxWidth: 860,
          }}
        >
          Every story is synthesised from multiple sources, spoken in your language, and tagged with where it came from.{' '}
          <em style={{ fontStyle: 'italic', color: C.textMid }}>That's the whole product.</em>
        </motion.p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — FINAL CTA
          Forest Green block. Always dark.
         ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{ background: G, padding: '96px 24px' }}
      >
        <motion.div
          {...inView()}
          className="max-w-[1280px] mx-auto w-full"
          style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
        >
          <ContinentMark size={48} />

          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(36px, 6vw, 80px)',
            color: Y, lineHeight: 1.0, letterSpacing: '-0.03em', maxWidth: 680,
          }}>
            Your morning briefing{' '}
            <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.85)' }}>is waiting</em>.
          </h2>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65, maxWidth: 400 }}>
            Free to start. Works offline. Five Nigerian languages.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
                color: G, background: Y, border: 'none',
                borderRadius: 9999, height: 56, padding: '0 36px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              }}
              whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
              whileTap={!prefersReduced   ? { scale: 0.96 } : undefined}
              transition={spring}
            >
              <Play weight="fill" style={{ width: 15, height: 15 }} />
              Get started — it's free
            </motion.button>

            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500,
                color: 'rgba(255,255,255,0.50)', background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 9999, height: 56, padding: '0 28px', cursor: 'pointer',
              }}
            >
              Hear a sample
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════════ */}
      <footer
        style={{
          background: '#0e3319',
          padding: '48px 24px 36px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          className="max-w-[1280px] mx-auto"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NarvoLogo className="w-5 h-5" style={{ color: Y }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: Y, letterSpacing: '-0.02em' }}>Narvo.</span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 220 }}>
              Africa's AI-powered audio news. Synthesised, verified, spoken.
            </p>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>NARVO INTELLIGENCE LTD.</span>
          </div>

          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            {[
              ['Product',  ['Features', 'Pricing', 'Truth Tag', 'Voices']],
              ['Company',  ['About', 'Narvo Platform', 'Press']],
            ].map(([heading, items]) => (
              <div key={heading as string} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.40)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  {heading as string}
                </span>
                {(items as string[]).map(item => (
                  <span key={item} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.40)' }}>{item}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto" style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.05em' }}>© 2026 NARVO INTELLIGENCE LTD.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms'].map(item => (
              <span key={item} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.22)', cursor: 'pointer', letterSpacing: '0.04em' }}>{item}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* ═══ VOICE PREVIEW MODAL ════════════════════════════════════ */}
      <AnimatePresence>
        {voiceModalOpen && (
          <>
            <motion.div key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => { setVoiceModalOpen(false); stopTrack(); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(14,51,25,0.72)', zIndex: 100, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            />
            <motion.div key="modal"
              initial={prefersReduced ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={spring}
              role="dialog" aria-modal aria-label="Voice preview"
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, background: isDark ? '#2E2922' : '#FDF8EF', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', maxHeight: '82vh', overflowY: 'auto', boxShadow: 'var(--shadow-4)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1.1 }}>Your Narvo Voice</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: C.textMid, marginTop: 4 }}>Tap to hear how your stories will sound</p>
                </div>
                <button type="button" onClick={() => { setVoiceModalOpen(false); stopTrack(); }} aria-label="Close"
                  style={{ width: 40, height: 40, borderRadius: 9999, background: C.surface2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X weight="bold" style={{ width: 16, height: 16, color: C.text }} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {voices.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height: 68, background: C.surface2, borderRadius: 12, animation: 'pulse 2s ease-in-out infinite' }} />
                    ))
                  : voices.map(voice => {
                      const loading  = previewLoading === voice.id;
                      const hasError = previewError   === voice.id;
                      return (
                        <button key={voice.id} type="button" onClick={() => handleVoicePreview(voice)}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: isDark ? '#47413A' : 'white', border: `1.5px solid ${loading ? CC : C.cardBorder}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 9999, flexShrink: 0, background: loading ? CC : G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {loading
                              ? <Waveform weight="bold" style={{ width: 18, height: 18, color: '#fff' }} />
                              : <SpeakerHigh weight="fill" style={{ width: 18, height: 18, color: Y }} />
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: C.text }}>{voice.name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: C.textDim, marginTop: 2, letterSpacing: '0.04em' }}>
                              {hasError ? '⚠ Preview unavailable' : (voice.accent || voice.language || 'Nigerian English')}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: loading ? CC : C.numColor, letterSpacing: '0.06em' }}>
                            {loading ? 'LOADING...' : 'PLAY'}
                          </span>
                        </button>
                      );
                    })
                }
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => { setVoiceModalOpen(false); navigate('/auth'); }}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: '#fff', background: CC, border: 'none', borderRadius: 9999, height: 52, padding: '0 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  Start listening free
                  <ArrowRight weight="bold" style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
