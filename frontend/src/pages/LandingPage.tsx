/**
 * LandingPage.tsx — Narvo Design System v4
 * ─────────────────────────────────────────
 * Option 4: Staggered reveal — full-viewport panels, one feature per scroll.
 *
 * Panel sequence: Hero (0) → Synthesis (1) → Truth (2) →
 *   Briefing (3) → Languages (4) → Offline (5) → Stories → Statement → CTA
 *
 * Scroll mechanics:
 *   - Wheel/touch events intercepted while panel section is active
 *   - Body scroll locked during panel sequence
 *   - On last panel exit → body scroll released, page continues normally
 *   - prefers-reduced-motion: all panels rendered as a static grid, no intercept
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';

import { ArrowRight }     from '@phosphor-icons/react/ArrowRight';
import { ArrowDown }      from '@phosphor-icons/react/ArrowDown';
import { X }              from '@phosphor-icons/react/X';
import { Play }           from '@phosphor-icons/react/Play';
import { SpeakerHigh }    from '@phosphor-icons/react/SpeakerHigh';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { Lightning }      from '@phosphor-icons/react/Lightning';
import { Sun }            from '@phosphor-icons/react/Sun';
import { Moon }           from '@phosphor-icons/react/Moon';
import NarvoLogo               from '../components/NarvoLogo';
import { useAudio }            from '../contexts/AudioContext';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import { getTtsPreviewSample } from '../constants/tts';
import * as api                from '../lib/api';
import logger                  from '../lib/logger';

/* ────────────── Types ────────────── */

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

/* ────────────── Theme Palettes ────────────── */

const LIGHT = {
  bg:        '#F3E8CC',
  surface:   '#FDF8EF',
  surface2:  '#EDE9E4',
  text:      '#18542A',
  textMid:   '#625B52',
  textDim:   '#A09890',
  border:    '#DDD8D2',
  divider:   'rgba(24,84,42,0.10)',
  cardBg:    '#FDF8EF',
  cardBorder:'rgba(24,84,42,0.10)',
  numColor:  '#C0B9B1',
  tagBg:     'rgba(24,84,42,0.08)',
  tagColor:  '#18542A',
  toggleBg:  'rgba(24,84,42,0.08)',
  toggleIcon:'#625B52',
  navBg:     'rgba(243,232,204,0.95)',
  navBorder: 'rgba(24,84,42,0.12)',
};

const DARK = {
  bg:        '#1E1A16',
  surface:   '#2E2922',
  surface2:  '#47413A',
  text:      '#F7F5F2',
  textMid:   '#C0B9B1',
  textDim:   '#807870',
  border:    '#47413A',
  divider:   'rgba(255,255,255,0.07)',
  cardBg:    '#2E2922',
  cardBorder:'rgba(255,255,255,0.08)',
  numColor:  '#47413A',
  tagBg:     'rgba(255,255,255,0.08)',
  tagColor:  '#C0B9B1',
  toggleBg:  'rgba(255,255,255,0.08)',
  toggleIcon:'#C0B9B1',
  navBg:     'rgba(30,26,22,0.96)',
  navBorder: 'rgba(255,255,255,0.07)',
};

/* ────────────── Constants ────────────── */

const G  = '#18542A';
const Y  = '#FFC926';
const CC = '#F96015';

const spring     = { type: 'spring' as const, stiffness: 280, damping: 26 };
const springFast = { type: 'spring' as const, stiffness: 320, damping: 30 };
const fadeUp     = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

const fetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const getPublicUrl = () =>
  import.meta.env.VITE_PUBLIC_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/* ────────────── Brand Mark ────────────── */

const ContinentMark = ({ size = 40, light = false }: { size?: number; light?: boolean }) => (
  <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 40 50" aria-hidden>
    <g className="fragment-1">
      <polygon points="6,0 34,0 40,6 40,16 34,20 6,20 0,14 0,6" fill={light ? 'rgba(255,255,255,0.9)' : Y} />
    </g>
    <g className="fragment-2">
      <polygon points="2,24 38,24 40,28 40,36 36,40 4,40 0,36 0,28" fill={light ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)'} />
    </g>
    <g className="fragment-3">
      <polygon points="4,44 36,44 40,50 30,50 10,50 0,50" fill={light ? 'rgba(255,255,255,0.35)' : Y} opacity={light ? 1 : 0.5} />
    </g>
  </svg>
);

/* ────────────── Feature Data ────────────── */

interface Feature {
  id: string;
  index: number;          /* 1–5, shown as counter */
  label: string;
  title: string;
  body: string;
  bg: string;             /* panel background colour */
  accentText: string;     /* headline colour on panel */
  accentDim: string;      /* label + body colour on panel */
  visual: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    id: 'synthesis', index: 1,
    label: 'AI Synthesis',
    title: 'We read 39 sources.\nYou hear one story.',
    body:  "Narvo's AI distils dozens of outlets into a single clear narrative — every angle, no noise.",
    bg: G,
    accentText: Y,
    accentDim:  'rgba(255,201,38,0.55)',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <ContinentMark size={72} />
        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 28 }}>
          {[10, 18, 13, 24, 16, 22, 10, 18, 13].map((h, i) => (
            <div key={i} className="wave-bar" style={{ width: 4, height: h, background: Y, borderRadius: 2, transformOrigin: 'bottom' }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'truth', index: 2,
    label: 'Truth Tag',
    title: 'Know where it\ncame from.',
    body:  'Every story scored for source count, outlet credibility, and perspective breadth. Africa\'s first in-product credibility layer.',
    bg: '#0e3319',
    accentText: '#9ABC05',
    accentDim:  'rgba(154,188,5,0.55)',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 240 }}>
        {['Channels Television', 'Premium Times', 'Punch Newspapers', 'The Cable', 'Vanguard'].map((src, i) => (
          <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 1 - i * 0.12 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(154,188,5,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#9ABC05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#C0B9B1' }}>{src}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, height: 4, background: 'rgba(154,188,5,0.15)', borderRadius: 2 }}>
          <div style={{ width: '87%', height: '100%', background: '#9ABC05', borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(154,188,5,0.55)', letterSpacing: '0.08em' }}>87% VERIFICATION SCORE</span>
      </div>
    ),
  },
  {
    id: 'briefing', index: 3,
    label: 'Morning Briefing',
    title: '8 minutes.\nEvery morning.',
    body:  '5 top stories synthesised, spoken, and waiting before your commute. Pre-downloaded on WiFi — plays even without data.',
    bg: Y,
    accentText: G,
    accentDim:  'rgba(24,84,42,0.55)',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 260 }}>
        {[
          { time: '7:00 AM', label: 'CBN rate decision fallout' },
          { time: '7:02 AM', label: 'Lagos traffic bill passes third reading' },
          { time: '7:04 AM', label: 'Super Eagles World Cup qualifier preview' },
          { time: '7:06 AM', label: 'Dangote refinery output update' },
          { time: '7:08 AM', label: 'Naira stabilises at ₦1,560 to dollar' },
        ].map((item, i) => (
          <div key={item.time} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 1 - i * 0.15 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(24,84,42,0.45)', letterSpacing: '0.04em', flexShrink: 0, width: 52 }}>{item.time}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(24,84,42,0.12)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(24,84,42,0.75)', maxWidth: 140, lineHeight: 1.3 }}>{item.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'languages', index: 4,
    label: '5 Languages',
    title: 'Your language.\nYour voice.',
    body:  'Yorùbá, Hausa, Igbo, Pidgin, English. Authentic Nigerian accents powered by YarnGPT — not a Western voice reading African news.',
    bg: '#1A1208',
    accentText: CC,
    accentDim:  'rgba(249,96,21,0.55)',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 260 }}>
        {[
          { lang: 'Yorùbá',  sample: 'Ẹ káàárọ̀, Oga. Ìròyìn rẹ ti ṣetán.' },
          { lang: 'Hausa',   sample: 'Sannu da zuwa. Labarin yau yana nan.' },
          { lang: 'Igbo',    sample: 'Nnọọ. Akụkọ gị dị njikere taa.' },
          { lang: 'Pidgin',  sample: 'E don happen. Make I yarn you the gist.' },
          { lang: 'English', sample: 'Good morning. Your briefing is ready.' },
        ].map((item, i) => (
          <div key={item.lang} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 1 - i * 0.12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: CC, letterSpacing: '0.04em', flexShrink: 0, width: 56, paddingTop: 2 }}>{item.lang}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#A09890', lineHeight: 1.45 }}>{item.sample}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'offline', index: 5,
    label: 'Works Offline',
    title: 'Dead zone?\nStill listening.',
    body:  'Download your briefing on WiFi. Play it anywhere — the 3rd Mainland Bridge, the Lekki-Epe expressway, underground. No data, no problem.',
    bg: '#111A10',
    accentText: '#F7F5F2',
    accentDim:  'rgba(247,245,242,0.45)',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 260 }}>
        {[
          { name: 'CBN rate decision fallout',       size: '3.2 MB', done: true },
          { name: 'Lagos traffic bill passes',        size: '2.8 MB', done: true },
          { name: 'Super Eagles qualifier preview',   size: '4.1 MB', done: true },
          { name: 'Dangote refinery output',          size: '3.6 MB', done: false },
        ].map(item => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.done ? 'rgba(154,188,5,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.done
                ? <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="#9ABC05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.25)' }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: item.done ? '#F7F5F2' : '#807870', lineHeight: 1.3 }}>{item.name}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: item.done ? 'rgba(154,188,5,0.7)' : '#47413A', letterSpacing: '0.04em' }}>
              {item.done ? '✓ ' : ''}{item.size}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 4, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#807870', letterSpacing: '0.06em' }}>OFFLINE STORAGE</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9ABC05' }}>13.7 MB used</span>
        </div>
      </div>
    ),
  },
];

/* ─────────── Panel sequence total: 0 = hero, 1–5 = features ─────────── */
const TOTAL_PANELS = FEATURES.length + 1; /* 6 */

/* ────────────── Main Component ────────────── */

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

  /* ── Panel state ── */
  const [panel,    setPanel]    = useState(0);   /* 0 = hero, 1–5 = features */
  const [dir,      setDir]      = useState(1);   /* 1 = forward/down, -1 = backward/up */
  const [locked,   setLocked]   = useState(true);/* scroll locked during panel section */
  const transitioning = useRef(false);

  const previewCache = useRef<Record<string, string>>({});
  const C = isDark ? DARK : LIGHT;

  /* ── Nav scroll indicator ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Panel navigation ── */
  const goToPanel = useCallback((next: number, direction: number) => {
    if (transitioning.current) return;
    transitioning.current = true;
    setDir(direction);
    setPanel(next);
    setTimeout(() => { transitioning.current = false; }, 600);
  }, []);

  const advance = useCallback(() => {
    if (panel < TOTAL_PANELS - 1) {
      goToPanel(panel + 1, 1);
    } else {
      /* Exit panel section — release scroll */
      setLocked(false);
    }
  }, [panel, goToPanel]);

  const retreat = useCallback(() => {
    if (panel > 0) {
      goToPanel(panel - 1, -1);
    }
  }, [panel, goToPanel]);

  /* ── Re-lock when scrolled back to top ── */
  useEffect(() => {
    if (!locked) {
      const onScroll = () => {
        if (window.scrollY < 10) {
          setLocked(true);
          setPanel(0);
          window.scrollTo({ top: 0 });
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
    return undefined;
  }, [locked]);

  /* ── Wheel intercept ── */
  useEffect(() => {
    if (prefersReduced || !locked) return;
    let wheelAccum = 0;
    const THRESHOLD = 60;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (wheelAccum > THRESHOLD)  { wheelAccum = 0; advance(); }
      if (wheelAccum < -THRESHOLD) { wheelAccum = 0; retreat(); }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [locked, prefersReduced, advance, retreat]);

  /* ── Touch intercept ── */
  useEffect(() => {
    if (prefersReduced || !locked) return;
    let startY = 0;
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onEnd   = (e: TouchEvent) => {
      const diff = startY - e.changedTouches[0].clientY;
      if (diff >  40) advance();
      if (diff < -40) retreat();
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend',   onEnd);
    };
  }, [locked, prefersReduced, advance, retreat]);

  /* ── Body scroll lock ── */
  useEffect(() => {
    if (prefersReduced) return;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [locked, prefersReduced]);

  /* ── Keyboard ── */
  useEffect(() => {
    if (prefersReduced || !locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); advance(); }
      if (e.key === 'ArrowUp')                    { e.preventDefault(); retreat(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, prefersReduced, advance, retreat]);

  /* ── Voice modal ── */
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
    initial: 'hidden', whileInView: 'visible',
    viewport: { once: true, margin: '-40px' },
    variants: fadeUp, transition: { ...spring, delay },
  } as const);

  /* ── Panel slide variants ── */
  const panelVariants = {
    enter:  (d: number) => ({ y: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { y: '0%', opacity: 1 },
    exit:   (d: number) => ({ y: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };
  const panelTransition = { type: 'tween' as const, ease: [0.76, 0, 0.24, 1], duration: 0.55 };

  /* ── Current feature (panel 1–5) ── */
  const currentFeature = panel > 0 ? FEATURES[panel - 1] : null;

  /* ────────────────────────── JSX ────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, transition: 'background 300ms, color 300ms', overflowX: 'hidden' }}
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

      {/* ═══════════════════════════════════════
          NAV — always fixed
         ═══════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background:           currentFeature ? currentFeature.bg : C.navBg,
          backdropFilter:       'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom:         `1px solid ${scrolled || currentFeature ? 'transparent' : C.navBorder}`,
          boxShadow:            (!currentFeature && scrolled) ? 'var(--shadow-1)' : 'none',
          transition:           'background 500ms ease, border-color 250ms, box-shadow 250ms',
        }}
      >
        <nav
          className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-10"
          style={{ height: 72 }}
          aria-label="Main navigation"
        >
          <button
            type="button"
            onClick={() => { setPanel(0); setLocked(true); window.scrollTo({ top: 0 }); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
            aria-label="Narvo — back to top"
          >
            <NarvoLogo className="w-6 h-6" style={{ color: currentFeature ? currentFeature.accentText : (isDark ? Y : G) }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: currentFeature ? currentFeature.accentText : (isDark ? Y : G) }}>
              Narvo<span style={{ color: CC }}>.</span>
            </span>
          </button>

          {/* Panel progress shown in nav during feature sequence */}
          {currentFeature && !prefersReduced ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {FEATURES.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => goToPanel(i + 1, i + 1 > panel ? 1 : -1)}
                  aria-label={`Go to ${f.label}`}
                  style={{
                    width: i + 1 === panel ? 24 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i + 1 === panel ? currentFeature.accentText : `${currentFeature.accentText}33`,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'width 300ms var(--ease-standard), background 300ms',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="hidden lg:flex items-center" style={{ gap: 32 }}>
              {[['#features', 'Features'], ['#stories', 'Stories'], ['#about', 'About']].map(([href, label]) => (
                <a key={href} href={href} style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: C.textMid, textDecoration: 'none', transition: 'color 150ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMid; }}>
                  {label}
                </a>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => setIsDark(d => !d)} aria-label="Toggle theme"
              style={{ width: 40, height: 40, borderRadius: 9999, background: currentFeature ? `${currentFeature.accentText}18` : C.toggleBg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 300ms' }}>
              {isDark
                ? <Sun  weight="bold" style={{ width: 17, height: 17, color: currentFeature ? currentFeature.accentText : C.toggleIcon }} />
                : <Moon weight="bold" style={{ width: 17, height: 17, color: currentFeature ? currentFeature.accentText : C.toggleIcon }} />
              }
            </button>
            <motion.button type="button" onClick={() => navigate('/auth')}
              style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: '#fff', background: CC, border: 'none', borderRadius: 9999, height: 44, padding: '0 22px', cursor: 'pointer', boxShadow: 'var(--shadow-2)' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={springFast}
              data-testid="nav-get-started">
              Get started
            </motion.button>
          </div>
        </nav>
      </header>

      {/* ═══════════════════════════════════════
          BREAKING BANNER
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showBreaking && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ background: 'rgba(213,37,24,0.06)', borderBottom: '1px solid rgba(213,37,24,0.18)', position: 'relative', zIndex: 40, marginTop: 72 }}
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
          PANEL SECTION — Hero + 5 feature panels
          Full viewport. Scroll-intercepted. Panels slide vertically.
          prefers-reduced-motion: rendered as static stack, no intercept.
         ═══════════════════════════════════════════════════════════════ */}
      {prefersReduced ? (
        /* ── Reduced motion: static stack ── */
        <div style={{ paddingTop: 72 }}>
          {/* Hero */}
          <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 24px' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(48px, 8vw, 96px)', color: C.text, lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: 28 }}>
                Africa's news.<br /><em style={{ fontStyle: 'italic', color: C.textMid }}>Spoken to you.</em>
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: C.textMid, lineHeight: 1.65, maxWidth: 440, marginBottom: 28 }}>
                We synthesise 39+ sources into one clear story and speak it in your language.
              </p>
              <button type="button" onClick={() => navigate('/auth')}
                style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: '#fff', background: CC, border: 'none', borderRadius: 9999, height: 56, padding: '0 36px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Play weight="fill" style={{ width: 15, height: 15 }} />
                Oya, Start Listening
              </button>
            </div>
          </section>
          {/* Features as grid */}
          <section id="features" style={{ padding: '72px 24px', maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {FEATURES.map(f => (
                <div key={f.id} style={{ background: f.bg, borderRadius: 20, padding: 32, minHeight: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: f.accentDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{f.label}</div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: f.accentText, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'pre-line' }}>{f.title}</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: f.accentDim, lineHeight: 1.65 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* ── Animated panels ── */
        <div
          style={{
            position: locked ? 'fixed' : 'relative',
            top:   locked ? 0 : 'auto',
            left:  locked ? 0 : 'auto',
            right: locked ? 0 : 'auto',
            bottom:locked ? 0 : 'auto',
            width: '100%',
            height: locked ? '100vh' : 'auto',
            overflow: 'hidden',
            zIndex: locked ? 10 : 'auto',
          }}
        >
          <AnimatePresence initial={false} custom={dir} mode="sync">
            {panel === 0 ? (
              /* ───── PANEL 0: HERO ───── */
              <motion.section
                key="hero"
                custom={dir}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={panelTransition}
                style={{
                  position: 'absolute', inset: 0,
                  background: C.bg,
                  paddingTop: 72,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div
                  className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 48 }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.1 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 720 }}
                  >
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(52px, 8.5vw, 108px)', color: C.text, lineHeight: 0.97, letterSpacing: '-0.03em' }}>
                      Africa's news.<br />
                      <em style={{ fontStyle: 'italic', color: C.textMid }}>Spoken to you.</em>
                    </h1>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: C.textMid, lineHeight: 1.65, maxWidth: 420 }}>
                      We synthesise 39+ sources into one clear story and speak it in your language — Yorùbá, Hausa, Igbo, Pidgin, or English.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <motion.button type="button" onClick={() => navigate('/auth')}
                        style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: '#fff', background: CC, border: 'none', borderRadius: 9999, height: 56, padding: '0 36px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-2)' }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} transition={springFast}
                        data-testid="hero-cta">
                        <Play weight="fill" style={{ width: 15, height: 15 }} />
                        Oya, Start Listening
                      </motion.button>
                      <button type="button" onClick={() => setVoiceModalOpen(true)}
                        style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: C.textMid, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline', textDecorationColor: C.border, textUnderlineOffset: 4 }}>
                        Hear a sample first
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Scroll nudge */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 28, paddingTop: 8 }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Scroll to explore
                  </span>
                  <ArrowDown weight="bold" style={{ width: 14, height: 14, color: C.textDim }} />
                </motion.div>
              </motion.section>
            ) : (
              /* ───── PANELS 1–5: FEATURES ───── */
              <motion.section
                key={`feature-${panel}`}
                custom={dir}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={panelTransition}
                style={{
                  position: 'absolute', inset: 0,
                  background: currentFeature!.bg,
                  display: 'flex', flexDirection: 'column',
                  paddingTop: 72,
                }}
              >
                <div
                  className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
                  style={{ flex: 1, display: 'grid', alignItems: 'center', paddingTop: 32, paddingBottom: 32 }}
                  /* Desktop: two-column — text left, visual right */
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 48, alignItems: 'center', height: '100%' }}
                    className="lg:[grid-template-columns:1fr_1fr]">

                    {/* Text */}
                    <motion.div
                      key={`text-${panel}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: 0.2 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: currentFeature!.accentDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                          {String(currentFeature!.index).padStart(2, '0')}
                        </span>
                        <span style={{ width: 24, height: 1, background: currentFeature!.accentDim, display: 'inline-block' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: currentFeature!.accentDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                          {currentFeature!.label}
                        </span>
                      </div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(36px, 5vw, 68px)', color: currentFeature!.accentText, lineHeight: 1.0, letterSpacing: '-0.03em', whiteSpace: 'pre-line' }}>
                        {currentFeature!.title}
                      </h2>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: currentFeature!.accentDim, lineHeight: 1.7, maxWidth: 400 }}>
                        {currentFeature!.body}
                      </p>
                    </motion.div>

                    {/* Visual */}
                    <motion.div
                      key={`visual-${panel}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: 0.28 }}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      className="hidden lg:flex"
                    >
                      {currentFeature!.visual}
                    </motion.div>
                  </div>
                </div>

                {/* Bottom controls */}
                <div style={{ padding: '0 24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button type="button" onClick={retreat}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: currentFeature!.accentDim, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.06em', padding: '8px 4px' }}>
                    ← PREV
                  </button>

                  {/* Progress dots */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {FEATURES.map((f, i) => (
                      <button key={f.id} type="button" onClick={() => goToPanel(i + 1, i + 1 > panel ? 1 : -1)}
                        aria-label={f.label}
                        style={{ width: i + 1 === panel ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i + 1 === panel ? currentFeature!.accentText : `${currentFeature!.accentText}33`, transition: 'width 300ms var(--ease-standard), background 300ms' }} />
                    ))}
                  </div>

                  <button type="button" onClick={advance}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: currentFeature!.accentText, background: 'none', border: `1px solid ${currentFeature!.accentText}55`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.06em', padding: '8px 16px', borderRadius: 99 }}>
                    {panel === TOTAL_PANELS - 1 ? 'SEE STORIES →' : 'NEXT →'}
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Spacer to push rest of page below the locked panel section ── */}
      {!prefersReduced && locked && <div style={{ height: '100vh' }} />}

      {/* ═══════════════════════════════════════════════════════════════
          STORIES SECTION
         ═══════════════════════════════════════════════════════════════ */}
      <section
        id="stories"
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 72, paddingBottom: 72 }}
      >
        <motion.div {...inView()} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: C.text, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            What's happening <em style={{ fontStyle: 'italic', color: C.textMid }}>now</em>.
          </h2>
          <button type="button" onClick={() => navigate('/auth')}
            style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: C.textMid, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', textDecoration: 'underline', textDecorationColor: C.border, textUnderlineOffset: 4, flexShrink: 0 }}>
            All stories <ArrowRight weight="bold" style={{ width: 13, height: 13 }} />
          </button>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {displayStories.map((story, i) => {
            const isSkeleton = isLoading;
            const verified   = typeof story.truth_score === 'number' && story.truth_score >= 70;
            const isLast     = i === displayStories.length - 1;
            return (
              <motion.button key={story.id} type="button"
                onClick={() => !isSkeleton && navigate(`/news/${story.id}`)}
                initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ ...spring, delay: i * 0.06 }}
                whileHover={!isSkeleton ? { x: 4 } : undefined}
                style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', alignItems: 'center', gap: 24, padding: '22px 0', background: 'none', border: 'none', borderBottom: isLast ? 'none' : `1px solid ${C.divider}`, cursor: isSkeleton ? 'default' : 'pointer', textAlign: 'left', width: '100%' }}
                aria-label={isSkeleton ? undefined : `Listen: ${story.title}`}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: C.numColor, letterSpacing: '0.06em', flexShrink: 0, ...(isSkeleton && { background: C.surface2, borderRadius: 4, width: 24, height: 14, display: 'block', color: 'transparent' }) }}>
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
                        {story.category && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: C.tagColor, background: C.tagBg, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{story.category}</span>}
                        {story.read_time && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: C.textDim, letterSpacing: '0.04em' }}>{story.read_time} listen</span>}
                        {verified && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#5a7003' }}>✓ Verified</span>}
                      </div>
                    </>
                  )}
                </div>
                {!isSkeleton && (
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="hidden sm:block" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: CC }}>Oya, Play</span>
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

      <div style={{ width: '100%', height: 1, background: C.divider }} />

      {/* ═══════════════════════════════════════════════════════════════
          STATEMENT
         ═══════════════════════════════════════════════════════════════ */}
      <section className="max-w-[1280px] mx-auto w-full px-6 lg:px-10" style={{ paddingTop: 96, paddingBottom: 96 }}>
        <motion.p {...inView()} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4.5vw, 58px)', color: C.text, lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: 860 }}>
          Every story is synthesised from multiple sources, spoken in your language, and tagged with where it came from.{' '}
          <em style={{ fontStyle: 'italic', color: C.textMid }}>That's the whole product.</em>
        </motion.p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA
         ═══════════════════════════════════════════════════════════════ */}
      <section style={{ background: G, padding: '96px 24px' }}>
        <motion.div {...inView()} className="max-w-[1280px] mx-auto w-full" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <ContinentMark size={48} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(36px, 6vw, 80px)', color: Y, lineHeight: 1.0, letterSpacing: '-0.03em', maxWidth: 680 }}>
            Your morning briefing{' '}
            <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.85)' }}>is waiting</em>.
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65, maxWidth: 400 }}>
            Free to start. Works offline. Five Nigerian languages.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <motion.button type="button" onClick={() => navigate('/auth')}
              style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: G, background: Y, border: 'none', borderRadius: 9999, height: 56, padding: '0 36px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} transition={springFast}>
              <Play weight="fill" style={{ width: 15, height: 15 }} />
              Get started — it's free
            </motion.button>
            <button type="button" onClick={() => setVoiceModalOpen(true)}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.50)', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 9999, height: 56, padding: '0 28px', cursor: 'pointer' }}>
              Hear a sample
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0e3319', padding: '48px 24px 36px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1280px] mx-auto" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
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
            {[['Product', ['Features', 'Pricing', 'Truth Tag', 'Voices']], ['Company', ['About', 'Narvo Platform', 'Press']]].map(([heading, items]) => (
              <div key={heading as string} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.40)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{heading as string}</span>
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

      {/* ═══════════════════════════════════════════════════════════════
          VOICE PREVIEW MODAL
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {voiceModalOpen && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              onClick={() => { setVoiceModalOpen(false); stopTrack(); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(14,51,25,0.72)', zIndex: 200, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
            <motion.div key="modal"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={spring}
              role="dialog" aria-modal aria-label="Voice preview"
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: isDark ? '#2E2922' : '#FDF8EF', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', maxHeight: '82vh', overflowY: 'auto', boxShadow: 'var(--shadow-4)' }}>
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
                  Start listening free <ArrowRight weight="bold" style={{ width: 15, height: 15 }} />
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
