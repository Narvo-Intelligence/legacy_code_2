/**
 * LandingPage.tsx — Narvo Design System v4
 * ─────────────────────────────────────────────────────────────
 * Complete rebuild. Reed Words editorial rhythm.
 * Fraunces 700 headlines · Plus Jakarta Sans body · Geist Mono labels
 * Forest Green + Cream + Sunshine Yellow palette
 * Continent fragment brand mark · 56px Crisp Carrot CTAs
 *
 * Sections:
 *   Nav → Breaking Banner → Hero → Stats Strip → Bento Features
 *   → Live Feed → Truth Tag Demo → Social Proof → WhatsApp Section
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
import { ShieldCheck }    from '@phosphor-icons/react/ShieldCheck';
import { Waveform }       from '@phosphor-icons/react/Waveform';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';
import { Globe }          from '@phosphor-icons/react/Globe';
import { Sparkle }        from '@phosphor-icons/react/Sparkle';
import { CheckCircle }    from '@phosphor-icons/react/CheckCircle';



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
  total_listeners?: string | number;
  active_listeners?: number;
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

const formatNumber = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)}K`
  : String(n);

/* ─────────────────────── Animation Variants ─────────────────── */

const fadeInUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0  },
};

const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/* ─────────────────────── Brand Mark ────────────────────────── */
/* Continent fragment mark — three horizontal hexagonal polygons */

const ContinentMark = ({
  size = 64,
  playing = false,
  className = '',
}: {
  size?: number;
  playing?: boolean;
  className?: string;
}) => (
  <svg
    width={size}
    height={Math.round(size * 1.25)}
    viewBox="0 0 40 50"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className={className}
  >
    {/* Fragment 1 — Sunshine Yellow */}
    <g className={playing ? 'fragment-1 fragment-playing' : 'fragment-1'}>
      <polygon points="6,0 34,0 40,6 40,16 34,20 6,20 0,14 0,6" fill="#FFC926" />
    </g>
    {/* Fragment 2 — White (anchor) */}
    <g className="fragment-2">
      <polygon points="2,24 38,24 40,28 40,36 36,40 4,40 0,36 0,28" fill="rgba(255,255,255,0.88)" />
    </g>
    {/* Fragment 3 — Sunshine Yellow 50% */}
    <g className={playing ? 'fragment-3 fragment-playing' : 'fragment-3'}>
      <polygon points="4,44 36,44 40,50 30,50 10,50 0,50" fill="#FFC926" opacity="0.5" />
    </g>
  </svg>
);

/* ────────────────────────────────────────────────────────────── */
/* Phone Mockup — v4 redesign, aria-hidden                       */
/* ────────────────────────────────────────────────────────────── */

const PhoneMockup = () => (
  <div aria-hidden="true" className="relative mx-auto lg:mx-0 select-none" style={{ width: 224, flexShrink: 0 }}>
    {/* Ambient glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ borderRadius: 38, boxShadow: '0 32px 64px rgba(24,84,42,0.20), 0 8px 24px rgba(24,84,42,0.12)' }}
    />
    {/* Outer frame */}
    <div style={{ width: 224, height: 444, borderRadius: 38, border: '5px solid #0e3319', background: '#0e3319', overflow: 'hidden', position: 'relative' }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 60, height: 20, borderRadius: '0 0 12px 12px', background: '#0e3319', zIndex: 20 }} />

      {/* Screen */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F3E8CC' }}>

        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '28px 14px 4px', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#18542A', fontFamily: 'monospace' }}>9:41</span>
          <span style={{ fontSize: 8, color: '#625B52', fontFamily: 'monospace' }}>NR ●●●</span>
        </div>

        {/* App header */}
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid rgba(24,84,42,0.12)', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#18542A' }}>Good morning, Oga</div>
          <div style={{ fontSize: 8, color: '#625B52', marginTop: 1 }}>Thursday, 26 March 2026</div>
        </div>

        {/* Morning Briefing card */}
        <div style={{ margin: '8px 10px 6px', borderRadius: 11, background: '#18542A', padding: '9px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,201,38,0.8)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Morning Briefing</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#FFC926', marginTop: 2 }}>5 stories · 8 min</div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F96015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="10" viewBox="0 0 9 10"><polygon points="1,0 9,5 1,10" fill="white" /></svg>
          </div>
        </div>

        {/* Topic chips */}
        <div style={{ display: 'flex', gap: 5, padding: '0 10px 8px', flexShrink: 0 }}>
          {['For You', 'Nigeria', 'Business'].map((chip, i) => (
            <div key={chip} style={{ padding: '3px 8px', borderRadius: 999, fontSize: 7, fontWeight: 700, background: i === 0 ? '#18542A' : 'rgba(24,84,42,0.08)', color: i === 0 ? '#FFC926' : '#18542A', whiteSpace: 'nowrap' }}>
              {chip}
            </div>
          ))}
        </div>

        {/* Story card */}
        <div style={{ margin: '0 10px 8px', borderRadius: 11, border: '1px solid rgba(24,84,42,0.12)', overflow: 'hidden', flexShrink: 0, background: '#FDF8EF' }}>
          <div style={{ height: 62, background: 'rgba(24,84,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(24,84,42,0.12)' }} />
            <div style={{ position: 'absolute', bottom: 7, right: 9, width: 28, height: 28, borderRadius: '50%', background: '#F96015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="9" viewBox="0 0 8 9"><polygon points="1,0 8,4.5 1,9" fill="white" /></svg>
            </div>
          </div>
          <div style={{ padding: '7px 9px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 7, fontWeight: 700, color: '#18542A', background: 'rgba(24,84,42,0.08)', padding: '1px 5px', borderRadius: 4 }}>POLITICS</span>
              <span style={{ fontSize: 7, color: '#A09890' }}>2h ago</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#18542A', lineHeight: 1.3, marginBottom: 4 }}>Senate passes landmark economic reform bill</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 7, color: '#625B52' }}>4 min listen</span>
              <span style={{ fontSize: 7, fontWeight: 700, color: '#5a7003' }}>✓ Verified · 5 sources</span>
            </div>
          </div>
        </div>

        {/* Mini audio bar */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(24,84,42,0.10)', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#18542A', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,201,38,0.15)', flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#FFC926', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Why the NNPC deal matters...</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,201,38,0.2)', borderRadius: 2 }}>
                <div style={{ width: '35%', height: '100%', background: '#FFC926', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
                {[5, 8, 6, 10, 7, 9, 5].map((h, i) => (
                  <div key={i} className="wave-bar" style={{ width: 2, height: h, background: '#FFC926', borderRadius: 1 }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F96015', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="7" height="9" viewBox="0 0 7 9" fill="white"><rect x="0" y="0" width="2.5" height="9" /><rect x="4.5" y="0" width="2.5" height="9" /></svg>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 8px 10px', borderTop: '1px solid rgba(24,84,42,0.10)', background: '#FDF8EF', flexShrink: 0 }}>
          {([['Home', true], ['Discover', false], ['Listen', false], ['Library', false], ['Profile', false]] as [string, boolean][]).map(([label, active]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 14, height: 2, borderRadius: 1, background: active ? '#18542A' : 'rgba(24,84,42,0.2)' }} />
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFC926' }} />}
              <span style={{ fontSize: 6, fontWeight: 600, color: active ? '#18542A' : '#A09890' }}>{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  </div>
);

/* ───────────────────── Truth Tag Demo ─────────────────────── */

const TruthTagDemo = () => (
  <div style={{ background: '#FDF8EF', borderRadius: 14, border: '1px solid rgba(24,84,42,0.10)', overflow: 'hidden', maxWidth: 340 }}>
    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(24,84,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#18542A' }}>Truth Tag</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#5a7003', background: 'rgba(154,188,5,0.12)', padding: '3px 8px', borderRadius: 99 }}>✓ Verified</span>
    </div>
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#625B52' }}>Verification score</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#18542A' }}>87%</span>
      </div>
      <div style={{ height: 5, background: '#EDE9E4', borderRadius: 3, marginBottom: 14 }}>
        <div style={{ width: '87%', height: '100%', background: '#9ABC05', borderRadius: 3 }} />
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#A09890', marginBottom: 8 }}>Confirmed by 5 independent sources</div>
      {['Channels Television', 'Premium Times', 'Punch Newspapers', 'The Cable', 'Vanguard'].map((src) => (
        <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(154,188,5,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="7" height="7" viewBox="0 0 7 7"><polyline points="1,3.5 3,5.5 6,1.5" fill="none" stroke="#5a7003" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#18542A' }}>{src}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ─────────────────────── Story Card ───────────────────────── */

const StoryCard = ({ story, onPlay }: { story: LandingStory; onPlay: (id: string) => void }) => {
  const score = typeof story.truth_score === 'number' ? story.truth_score : null;
  const verified = score !== null && score >= 70;
  const mixed    = score !== null && score >= 40 && score < 70;

  return (
    <article
      style={{ background: '#FDF8EF', border: '1px solid rgba(24,84,42,0.10)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      aria-label={story.title}
    >
      {/* Thumbnail placeholder */}
      <div style={{ height: 100, background: 'rgba(24,84,42,0.06)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Waveform weight="light" style={{ width: 28, height: 28, color: 'rgba(24,84,42,0.25)' }} />
        {story.category && (
          <span style={{ position: 'absolute', top: 8, left: 10, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#18542A', background: '#F3E8CC', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {story.category}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#18542A', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {story.title}
        </h3>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
          {story.read_time && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#A09890', letterSpacing: '0.04em' }}>
              {story.read_time} listen
            </span>
          )}
          {verified && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#5a7003', background: 'rgba(154,188,5,0.12)', padding: '2px 7px', borderRadius: 99 }}>
              ✓ Verified
            </span>
          )}
          {mixed && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#856600', background: 'rgba(255,201,38,0.18)', padding: '2px 7px', borderRadius: 99 }}>
              ⚠ Mixed
            </span>
          )}
        </div>

        {/* Play row */}
        <button
          type="button"
          onClick={() => onPlay(story.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F96015', color: '#fff', border: 'none', borderRadius: 9999, height: 44, padding: '0 18px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4, alignSelf: 'flex-start' }}
          aria-label={`Play: ${story.title}`}
        >
          <Play weight="fill" style={{ width: 13, height: 13 }} />
          Oya, Play
        </button>
      </div>
    </article>
  );
};

/* ─────────────────────── Main Component ─────────────────────── */

const LandingPage = () => {
  const navigate       = useNavigate();
  const prefersReduced = useReducedMotion();
  const { playTrack, stopTrack } = useAudio();

  const { data: news = [], isLoading: newsLoading } =
    useSWR<LandingStory[]>('api/news?limit=6', landingFetcher);
  const { data: breaking = [] } =
    useSWR<LandingStory[]>('api/news/breaking', landingFetcher);
  const { data: metrics = null } =
    useSWR<LandingMetrics | null>('api/metrics', landingFetcher);

  const [breakingDismissed, setBreakingDismissed] = useState(false);
  const [pushEnabled, setPushEnabled]   = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voices, setVoices]             = useState<Voice[]>([]);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [scrolled, setScrolled]         = useState(false);
  const previewCacheRef = useRef<Record<string, string>>({});
  const VOICE_CACHE_PREFIX = 'voice_preview:';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const handleEnableAlerts = useCallback(async () => {
    if (alertsLoading || pushEnabled) return;
    setAlertsLoading(true);
    try {
      const sub = await subscribeToPush();
      if (sub) setPushEnabled(true);
    } catch {
      /* silent */
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsLoading, pushEnabled]);

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
      if (mem) {
        await playTrack({ id: idbKey, title: `Narvo Voice: ${voice.name}`, url: mem, source: 'VOICE_PREVIEW' }, true);
        setPreviewLoading(null); return;
      }
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

  const totalSources   = metrics?.total_sources ?? 39;
  const totalStories   = metrics?.stories_processed ?? metrics?.total_stories ?? 12400;
  const totalListeners = metrics?.total_listeners ?? metrics?.active_listeners ?? 10000;
  const showBreaking   = !breakingDismissed && breaking.length > 0;

  const inView = (delay = 0) => prefersReduced ? {} : {
    initial:    'hidden',
    whileInView:'visible',
    viewport:   { once: true, margin: '-40px' },
    variants:   fadeInUp,
    transition: { ...spring, delay },
  };

  const G  = '#18542A';  /* Forest Green */
  const Y  = '#FFC926';  /* Sunshine Yellow */
  const CR = '#F3E8CC';  /* Cream */
  const CC = '#F96015';  /* Crisp Carrot */
  const SF = '#FDF8EF';  /* Surface */

  /* ─────────────────────────────── JSX ───────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: CR, color: G }}
      data-testid="landing-page"
    >
      <Helmet>
        <title>Narvo — Africa's voice, in your ears</title>
        <meta name="description" content="AI-synthesised audio news for Africa. Five Nigerian languages. Verified by the Truth Tag. Start listening free." />
        <link rel="canonical" href={`${getPublicUrl()}/`} />
        <meta property="og:url"         content={`${getPublicUrl()}/`} />
        <meta property="og:title"       content="Narvo — Africa's voice, in your ears" />
        <meta property="og:description" content="AI reads 39 sources so you don't have to. Clear, spoken, verified." />
        <meta property="og:image"       content={`${getPublicUrl()}/screenshot-wide.png`} />
        <meta name="twitter:card"       content="summary_large_image" />
        <meta name="twitter:title"      content="Narvo — Africa's voice, in your ears" />
        <meta name="twitter:description" content="Africa's AI-powered audio news. Five Nigerian languages. Truth Tag verified." />
        <meta name="twitter:image"      content={`${getPublicUrl()}/screenshot-wide.png`} />
      </Helmet>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background:           scrolled ? 'rgba(243,232,204,0.95)' : 'rgba(243,232,204,0.85)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom:         scrolled ? `1px solid rgba(24,84,42,0.15)` : '1px solid transparent',
          boxShadow:            scrolled ? 'var(--shadow-2)' : 'none',
          transition:           'all 300ms var(--ease-standard)',
        }}
      >
        <nav
          className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-10"
          style={{ height: 72 }}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 focus-visible:outline-none"
            style={{ borderRadius: 8 }}
            aria-label="Narvo — scroll to top"
          >
            <NarvoLogo className="w-7 h-7" style={{ color: G }} />
            <span
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: G, letterSpacing: '-0.02em' }}
            >
              Narvo<span style={{ color: CC }}>.</span>
            </span>
          </button>

          {/* Nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {[['#features', 'Features'], ['#languages', 'Languages'], ['#live', 'Stories'], ['#truth', 'Truth Tag']].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: '#625B52', textDecoration: 'none' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = G; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = '#625B52'; }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:block"
              style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#625B52', background: 'transparent', border: '1.5px solid rgba(24,84,42,0.25)', borderRadius: 9999, padding: '0 18px', height: 44, cursor: 'pointer' }}
            >
              Sign in
            </button>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: '#fff', background: CC, border: 'none', borderRadius: 9999, height: 48, padding: '0 24px', cursor: 'pointer', boxShadow: 'var(--shadow-2)' }}
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

      {/* ── BREAKING BANNER ──────────────────────────────────── */}
      <AnimatePresence>
        {showBreaking && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ background: 'rgba(213,37,24,0.06)', borderBottom: '1px solid rgba(213,37,24,0.22)' }}
            data-testid="landing-breaking-banner"
          >
            <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-6 lg:px-10 py-3">
              <Lightning weight="fill" style={{ width: 14, height: 14, color: '#D52518', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#D52518', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Breaking</span>
              <button
                type="button"
                onClick={() => navigate(`/news/${breaking[0].id}`)}
                className="flex-1 min-w-0 text-left truncate"
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: G, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {breaking[0].title}
              </button>
              <button
                type="button"
                onClick={() => setBreakingDismissed(true)}
                style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', minHeight: 32, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}
                aria-label="Dismiss breaking news"
              >
                <X weight="bold" style={{ width: 13, height: 13, color: '#D52518' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '72px 24px 64px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: Text */}
          <motion.div
            className="flex flex-col"
            style={{ gap: 28 }}
            initial={prefersReduced ? false : 'hidden'}
            animate="visible"
            variants={stagger}
          >
            {/* Kicker */}
            <motion.div variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 9999, background: 'rgba(24,84,42,0.08)', border: '1px solid rgba(24,84,42,0.15)' }}>
                <Sparkle weight="fill" style={{ width: 12, height: 12, color: CC, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: G, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  AI-powered news for Africa
                </span>
              </div>
            </motion.div>

            {/* H1 */}
            <motion.h1
              variants={prefersReduced ? undefined : fadeInUp}
              transition={{ ...spring, delay: 0.06 }}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(44px, 7vw, 72px)', color: G, lineHeight: 1.0, letterSpacing: '-0.03em' }}
            >
              Africa's news.<br />
              <em style={{ fontStyle: 'italic', color: '#3C5544' }}>Spoken to you.</em>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={prefersReduced ? undefined : fadeInUp}
              transition={{ ...spring, delay: 0.12 }}
              style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 400, color: '#625B52', lineHeight: 1.7, maxWidth: 460 }}
            >
              Narvo synthesises {totalSources}+ sources into one clear story and speaks it in your language — Yorùbá, Hausa, Igbo, Pidgin, or English. No reading. No scrolling. Just listen.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={prefersReduced ? undefined : fadeInUp}
              transition={{ ...spring, delay: 0.18 }}
              className="flex items-center flex-wrap"
              style={{ gap: 12 }}
            >
              <motion.button
                type="button"
                onClick={() => navigate('/auth')}
                className="btn-primary btn-landing flex items-center gap-3"
                whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
                whileTap={!prefersReduced   ? { scale: 0.96 } : undefined}
                transition={spring}
                data-testid="hero-cta"
              >
                <Play weight="fill" style={{ width: 16, height: 16, flexShrink: 0 }} />
                Oya, Start Listening
              </motion.button>
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: '#625B52', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline', textDecorationColor: 'rgba(24,84,42,0.25)', textUnderlineOffset: 4 }}
              >
                Hear a sample first
              </button>
            </motion.div>

            {/* Trust signal */}
            <motion.div
              variants={prefersReduced ? undefined : fadeInUp}
              transition={{ ...spring, delay: 0.22 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', letterSpacing: '0.06em' }}>
                Free to start · No credit card
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C0B9B1', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', letterSpacing: '0.06em' }}>
                Works offline
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C0B9B1', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', letterSpacing: '0.06em' }}>
                5 Nigerian languages
              </span>
            </motion.div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={prefersReduced ? false : { opacity: 0, x: 24, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <section style={{ background: G, padding: '28px 24px' }}>
        <div
          className="max-w-[1280px] mx-auto grid grid-cols-2 lg:grid-cols-4"
          style={{ gap: 2 }}
        >
          {[
            { value: `${totalSources}+`,                label: 'News sources synthesised' },
            { value: formatNumber(Number(totalStories)),label: 'Stories processed' },
            { value: '5',                               label: 'Nigerian languages' },
            { value: formatNumber(Number(totalListeners)), label: 'Listeners and counting' },
          ].map(({ value, label }, i) => (
            <motion.div
              key={label}
              style={{ padding: '20px 28px', textAlign: 'center' }}
              {...inView(i * 0.06)}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, color: Y, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BENTO FEATURES ───────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '80px 24px 64px' }}>

        <motion.div {...inView()} style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: CC, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            What makes Narvo different
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 52px)', color: G, lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: 560 }}>
            The news, <em style={{ fontStyle: 'italic' }}>the way it should be</em>.
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>

          {/* Large: AI Synthesis — spans 2 rows on lg */}
          <motion.div
            {...inView(0.05)}
            className="lg:row-span-2"
            style={{ background: G, borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 320 }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,201,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkle weight="fill" style={{ width: 24, height: 24, color: Y }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'rgba(255,201,38,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                01
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: Y, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 12 }}>
                AI reads<br /><em style={{ fontStyle: 'italic' }}>39 sources</em>.
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
                Narvo's AI synthesises across news sources, cuts through the noise, and gives you the clearest version of the story — not just one outlet's angle.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Channels TV', 'Punch', 'Premium Times', 'The Cable', 'Vanguard', '+34 more'].map((src) => (
                <span key={src} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px', background: 'rgba(255,201,38,0.10)', color: 'rgba(255,201,38,0.7)', borderRadius: 4, letterSpacing: '0.04em' }}>{src}</span>
              ))}
            </div>
          </motion.div>

          {/* Truth Tag */}
          <motion.div
            {...inView(0.10)}
            style={{ background: SF, border: `1px solid rgba(24,84,42,0.10)`, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(154,188,5,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck weight="fill" style={{ width: 22, height: 22, color: '#9ABC05' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#A09890', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>02</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: G, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 8 }}>
                Truth Tag
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#625B52', lineHeight: 1.6 }}>
                Every story is scored for source count, credibility, and perspective breadth. You'll always know if something is verified before you listen.
              </p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#5a7003', background: 'rgba(154,188,5,0.12)', padding: '3px 10px', borderRadius: 99 }}>✓ Verified · 87%</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#856600', background: 'rgba(255,201,38,0.18)', padding: '3px 10px', borderRadius: 99 }}>⚠ Mixed</span>
            </div>
          </motion.div>

          {/* Morning Briefing */}
          <motion.div
            {...inView(0.15)}
            style={{ background: Y, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(24,84,42,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell weight="fill" style={{ width: 22, height: 22, color: G }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'rgba(24,84,42,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>03</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: G, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 8 }}>
                Morning Briefing
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(24,84,42,0.75)', lineHeight: 1.6 }}>
                5 top stories every morning. Ready by 7AM. 8 minutes to listen. Pre-downloaded on WiFi so your commute is covered — data or no data.
              </p>
            </div>
          </motion.div>

          {/* 5 Languages */}
          <motion.div
            id="languages"
            {...inView(0.20)}
            style={{ background: SF, border: `1px solid rgba(24,84,42,0.10)`, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(249,96,21,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe weight="fill" style={{ width: 22, height: 22, color: CC }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#A09890', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>04</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: G, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 8 }}>
                5 Nigerian languages
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#625B52', lineHeight: 1.6 }}>
                Yorùbá, Hausa, Igbo, Pidgin, English. Real voices, real accents, powered by YarnGPT. Not a Western voice reading Nigerian news — your news, in your tongue.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
              {['Yorùbá', 'Hausa', 'Igbo', 'Pidgin', 'English'].map((lang) => (
                <span key={lang} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, padding: '3px 10px', background: 'rgba(24,84,42,0.08)', color: G, borderRadius: 99 }}>{lang}</span>
              ))}
            </div>
          </motion.div>

          {/* Offline */}
          <motion.div
            {...inView(0.25)}
            style={{ background: SF, border: `1px solid rgba(24,84,42,0.10)`, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(24,84,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CloudArrowDown weight="fill" style={{ width: 22, height: 22, color: G }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#A09890', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>05</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: G, lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 8 }}>
                Works offline
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#625B52', lineHeight: 1.6 }}>
                Save stories. Listen on the go. No data needed. From the 3rd Mainland Bridge to the Lekki-Epe Expressway — dead zones can't stop your briefing.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── LIVE FEED ────────────────────────────────────────── */}
      <section id="live" style={{ background: G, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div {...inView()} style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'rgba(255,201,38,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                Live right now
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: Y, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                What's happening <em style={{ fontStyle: 'italic' }}>in Nigeria</em>.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: G, background: Y, border: 'none', borderRadius: 9999, height: 44, padding: '0 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              See all stories <ArrowRight weight="bold" style={{ width: 14, height: 14 }} />
            </button>
          </motion.div>

          {newsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, height: 220, animation: 'pulse 2s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 12 }}
              initial={prefersReduced ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            >
              {news.slice(0, 6).map((story) => (
                <motion.div key={story.id} variants={prefersReduced ? undefined : fadeInUp} transition={spring}>
                  <StoryCard story={story} onPlay={() => navigate(`/news/${story.id}`)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── TRUTH TAG SECTION ────────────────────────────────── */}
      <section id="truth" style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '80px 24px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div {...inView()}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: CC, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Know your sources</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: G, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
              Trust built into <em style={{ fontStyle: 'italic' }}>every story</em>.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#625B52', lineHeight: 1.7, marginBottom: 24, maxWidth: 440 }}>
              The Truth Tag shows you how many sources confirmed a story, the reliability of each outlet, and whether different perspectives were covered. No other news app in Africa does this.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: CheckCircle, text: 'Source count — how many outlets reported it' },
                { icon: ShieldCheck, text: 'Source reliability — editorial standards scored' },
                { icon: Globe,       text: 'Perspective breadth — not just one angle' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon weight="fill" style={{ width: 20, height: 20, color: '#9ABC05', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#625B52', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...inView(0.10)} className="flex justify-center lg:justify-end">
            <TruthTagDemo />
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────── */}
      <section style={{ background: SF, borderTop: `1px solid rgba(24,84,42,0.08)`, borderBottom: `1px solid rgba(24,84,42,0.08)`, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div {...inView()} style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: G, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              From the first <em style={{ fontStyle: 'italic' }}>10,000 listeners</em>.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
            {[
              { quote: 'I used to spend 45 minutes reading four sites every morning. Now I play my Narvo briefing during my commute. Done in 8 minutes.', name: 'Chidi Okafor', role: 'Software Engineer, Lagos' },
              { quote: 'The Truth Tag is what got me. I always wondered if I could trust what I was reading. Now I can see exactly where the story came from.', name: 'Amina Yusuf', role: 'Civil Servant, Abuja' },
              { quote: 'E don happen. When dem add Pidgin, I start share am for my WhatsApp group every morning. My people love am die.', name: 'Emeka Nwosu', role: 'Market Trader, Onitsha' },
            ].map(({ quote, name, role }, i) => (
              <motion.blockquote
                key={name}
                {...inView(i * 0.08)}
                style={{ background: '#FDF8EF', border: `1px solid rgba(24,84,42,0.10)`, borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: CC, lineHeight: 1 }}>"</div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#47413A', lineHeight: 1.7, flex: 1 }}>{quote}</p>
                <footer>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: G }}>{name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', marginTop: 2, letterSpacing: '0.04em' }}>{role}</div>
                </footer>
              </motion.blockquote>
            ))}
          </div>

          {/* Powered by */}
          <motion.div {...inView(0.2)} style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 16 }}>Powered by</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
              {['Google Gemini', 'YarnGPT', 'Supabase', 'Vercel'].map((name) => (
                <span key={name} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#C0B9B1', letterSpacing: '0.06em' }}>{name}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHATSAPP SECTION ─────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '80px 24px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div {...inView()}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: CC, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
              Share the gist
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: G, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
              Send the full story <em style={{ fontStyle: 'italic' }}>straight to WhatsApp</em>.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#625B52', lineHeight: 1.7, marginBottom: 28, maxWidth: 440 }}>
              Every Narvo story generates a shareable 60-second audio clip — Narvo-branded, in any of your languages. Forward it the way you'd forward a voice note. Let the story reach people who don't have the app yet.
            </p>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="btn-primary btn-landing flex items-center gap-3"
              style={{ display: 'inline-flex' }}
            >
              <svg width="20" height="20" viewBox="0 0 256 258" style={{ flexShrink: 0 }} fill="currentColor" aria-hidden><path d="M128 0C57.3 0 0 57.3 0 128c0 22.5 5.9 43.7 16.1 62L0 258l69.7-18.2C87.5 249 107 256 128 256c70.7 0 128-57.3 128-128S198.7 0 128 0Zm0 232c-18.6 0-36.1-5.1-51.1-14L45.7 228l10.3-29.5C46.8 183 40 156.4 40 128c0-48.5 39.5-88 88-88s88 39.5 88 88-39.5 88-88 88Zm48-67.4c-2.6-1.3-15.5-7.6-17.9-8.5-2.4-.9-4.1-1.3-5.8 1.3-1.7 2.6-6.6 8.5-8.1 10.2-1.5 1.7-3 1.9-5.6.6-2.6-1.3-10.9-4-20.8-12.8-7.7-6.8-12.9-15.3-14.4-17.9-1.5-2.6-.2-4 1.1-5.3 1.2-1.2 2.6-3.1 3.9-4.7 1.3-1.5 1.7-2.6 2.6-4.3.9-1.7.4-3.2-.2-4.5-.6-1.3-5.8-13.9-7.9-19-2.1-5-4.2-4.3-5.8-4.4-1.5-.1-3.2-.1-4.9-.1s-4.5.6-6.8 3.2c-2.3 2.6-8.9 8.7-8.9 21.2s9.1 24.6 10.4 26.3c1.3 1.7 17.9 27.3 43.4 38.3 6.1 2.6 10.8 4.2 14.5 5.3 6.1 1.9 11.6 1.7 16 1 4.9-.7 15.1-6.2 17.2-12.2 2.1-6 2.1-11.1 1.5-12.2-.6-1-2.3-1.7-4.9-3Z"/></svg>
              Try it free
            </button>
          </motion.div>
          <motion.div {...inView(0.10)}>
            {/* WhatsApp preview mockup */}
            <div style={{ background: '#E8F5E9', borderRadius: 20, padding: 24, maxWidth: 360 }}>
              <div style={{ background: '#075E54', borderRadius: '16px 16px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#fff' }}>Narvo · Daily Gist</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>Channel · 10,847 followers</div>
                </div>
              </div>
              <div style={{ background: '#fff', padding: 16, borderRadius: '0 0 16px 16px' }}>
                <div style={{ background: '#DCF8C6', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#075E54', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>🎙 Morning Gist · 26 Mar</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Senate passes landmark economic reform — here's what it means for your pocket</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F96015', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="12" viewBox="0 0 10 12"><polygon points="0,0 10,6 0,12" fill="white" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 3, background: 'rgba(0,0,0,0.12)', borderRadius: 2, marginBottom: 4 }}>
                        <div style={{ width: '30%', height: '100%', background: '#075E54', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#999' }}>0:18 / 1:02</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#999', marginTop: 6, textAlign: 'right' }}>09:14 ✓✓</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#A09890', textAlign: 'center', letterSpacing: '0.06em' }}>Shared from Narvo · narvo.news</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section style={{ background: G, padding: '80px 24px' }}>
        <motion.div
          {...inView()}
          style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}
        >
          <ContinentMark size={64} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: Y, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Your morning briefing <em style={{ fontStyle: 'italic' }}>is waiting</em>.
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, maxWidth: 480 }}>
            Free to start. No credit card. Works offline. In five Nigerian languages. The full story, spoken to you.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: G, background: Y, border: 'none', borderRadius: 9999, height: 56, padding: '0 36px', cursor: 'pointer', boxShadow: 'var(--shadow-2)', display: 'flex', alignItems: 'center', gap: 10 }}
              whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
              whileTap={!prefersReduced   ? { scale: 0.96 } : undefined}
              transition={spring}
            >
              <Play weight="fill" style={{ width: 16, height: 16, flexShrink: 0 }} />
              Get started — it's free
            </motion.button>
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 9999, height: 56, padding: '0 28px', cursor: 'pointer' }}
            >
              Hear a sample
            </button>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginTop: 4 }}>
            TRUSTED IN LAGOS · ABUJA · ACCRA · NAIROBI · LONDON
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: '#0e3319', padding: '56px 24px 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 40, marginBottom: 48 }}>

            {/* Brand column */}
            <div className="col-span-2 lg:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <NarvoLogo className="w-6 h-6" style={{ color: Y }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: Y, letterSpacing: '-0.02em' }}>Narvo.</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                Africa's AI-powered audio news. Synthesised, verified, and spoken in your language.
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
                NARVO INTELLIGENCE LTD.
              </div>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Product</div>
              {['Features', 'Pricing', 'Morning Briefing', 'Truth Tag', 'Voice Studio', 'Offline Mode'].map((item) => (
                <div key={item} style={{ marginBottom: 10 }}>
                  <button type="button" onClick={() => navigate('/auth')} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    {item}
                  </button>
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Company</div>
              {['About', 'Narvo Platform', 'Narvo Intelligence', 'Careers', 'Press'].map((item) => (
                <div key={item} style={{ marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Get started */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Get started</div>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: G, background: Y, border: 'none', borderRadius: 9999, height: 48, padding: '0 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
              >
                <Play weight="fill" style={{ width: 13, height: 13 }} />
                Start listening
              </button>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Free forever.<br />No credit card required.
              </div>
            </div>

          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
              © 2026 NARVO INTELLIGENCE LTD. ALL RIGHTS RESERVED.
            </span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy Policy', 'Terms of Service'].map((item) => (
                <span key={item} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', letterSpacing: '0.04em' }}>{item}</span>
              ))}
            </div>
          </div>

        </div>
      </footer>

      {/* ── VOICE PREVIEW MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {voiceModalOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(14,51,25,0.75)', zIndex: 100, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              onClick={() => setVoiceModalOpen(false)}
            />
            <motion.div
              key="modal"
              initial={prefersReduced ? false : { opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={spring}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
                background: SF, borderRadius: '24px 24px 0 0',
                padding: '28px 24px 40px', maxHeight: '85vh', overflowY: 'auto',
                boxShadow: 'var(--shadow-4)',
              }}
              role="dialog"
              aria-modal
              aria-label="Voice preview"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: G, lineHeight: 1.1 }}>
                    Your Narvo Voice
                  </h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#625B52', marginTop: 4 }}>
                    Tap to hear how your stories will sound
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setVoiceModalOpen(false); stopTrack(); }}
                  style={{ width: 40, height: 40, borderRadius: 9999, background: 'rgba(24,84,42,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Close"
                >
                  <X weight="bold" style={{ width: 16, height: 16, color: G }} />
                </button>
              </div>

              {voices.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Yorùbá', 'Hausa', 'Igbo', 'Pidgin', 'English'].map((lang) => (
                    <div key={lang} style={{ height: 72, background: 'rgba(24,84,42,0.06)', borderRadius: 12, animation: 'pulse 2s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {voices.map((voice) => {
                    const isLoading = previewLoading === voice.id;
                    const hasError  = previewError === voice.id;
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => handleVoicePreview(voice)}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'white', border: `1.5px solid rgba(24,84,42,${isLoading ? '0.30' : '0.10'})`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 9999, background: isLoading ? CC : G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isLoading
                            ? <Waveform weight="bold" style={{ width: 20, height: 20, color: '#fff' }} />
                            : <SpeakerHigh weight="fill" style={{ width: 20, height: 20, color: Y }} />
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: G }}>{voice.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', marginTop: 2, letterSpacing: '0.04em' }}>
                            {hasError ? '⚠ Preview unavailable' : voice.accent || voice.language || 'Nigerian English'}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isLoading ? CC : '#C0B9B1', letterSpacing: '0.06em' }}>
                          {isLoading ? 'LOADING...' : 'PLAY'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setVoiceModalOpen(false); navigate('/auth'); }}
                  className="btn-primary btn-landing"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
                >
                  Start listening free
                  <ArrowRight weight="bold" style={{ width: 16, height: 16 }} />
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
