/**
 * LandingPage.tsx — Narvo Design System v4
 * ─────────────────────────────────────────
 * Reed Words structure. Minimal. Four sections only.
 *
 *   Nav → Hero → Stories → Statement → Final CTA → Footer
 *   + Voice Preview Modal
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';

import { ArrowRight }  from '@phosphor-icons/react/ArrowRight';
import { X }           from '@phosphor-icons/react/X';
import { Play }        from '@phosphor-icons/react/Play';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { Waveform }    from '@phosphor-icons/react/Waveform';
import { Lightning }   from '@phosphor-icons/react/Lightning';

import NarvoLogo               from '../components/NarvoLogo';
import { useAudio }            from '../contexts/AudioContext';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import { getTtsPreviewSample } from '../constants/tts';
import * as api                from '../lib/api';
import { subscribeToPush }     from '../lib/notificationService';
import logger                  from '../lib/logger';

/* ─────────────── Types ─────────────── */

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
  published?: string;
  [key: string]: unknown;
}

/* ─────────────── Helpers ─────────────── */

const fetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const getPublicUrl = () =>
  import.meta.env.VITE_PUBLIC_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/* ─────────────── Motion ─────────────── */

const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };

const fadeUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0  },
};

/* ─────────────── Continent Mark ─────────────── */

const ContinentMark = ({ size = 40 }: { size?: number }) => (
  <svg
    width={size}
    height={Math.round(size * 1.25)}
    viewBox="0 0 40 50"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <g className="fragment-1">
      <polygon points="6,0 34,0 40,6 40,16 34,20 6,20 0,14 0,6" fill="#FFC926" />
    </g>
    <g className="fragment-2">
      <polygon points="2,24 38,24 40,28 40,36 36,40 4,40 0,36 0,28" fill="rgba(255,255,255,0.85)" />
    </g>
    <g className="fragment-3">
      <polygon points="4,44 36,44 40,50 30,50 10,50 0,50" fill="#FFC926" opacity="0.5" />
    </g>
  </svg>
);

/* ─────────────── Main ─────────────── */

const LandingPage = () => {
  const navigate       = useNavigate();
  const prefersReduced = useReducedMotion();
  const { playTrack, stopTrack } = useAudio();

  const { data: stories = [], isLoading } =
    useSWR<LandingStory[]>('api/news?limit=9', fetcher);
  const { data: breaking = [] } =
    useSWR<LandingStory[]>('api/news/breaking', fetcher);

  const [scrolled,           setScrolled]          = useState(false);
  const [breakingDismissed,  setBreakingDismissed]  = useState(false);
  const [voiceModalOpen,     setVoiceModalOpen]     = useState(false);
  const [voices,             setVoices]             = useState<Voice[]>([]);
  const [previewLoading,     setPreviewLoading]     = useState<string | null>(null);
  const [previewError,       setPreviewError]       = useState<string | null>(null);
  const previewCache = useRef<Record<string, string>>({});

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

  /* ── Fallback stories for skeleton ── */
  const displayStories: LandingStory[] = isLoading
    ? Array.from({ length: 9 }, (_, i) => ({
        id: `skeleton-${i}`,
        title: '',
        category: '',
        read_time: '',
      }))
    : stories.slice(0, 9);

  /* ── Colours (shorthand) ── */
  const G  = '#18542A';  /* Forest Green */
  const Y  = '#FFC926';  /* Sunshine Yellow */
  const CR = '#F3E8CC';  /* Cream */
  const CC = '#F96015';  /* Crisp Carrot */

  /* ────────────────────────── JSX ────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: CR, color: G }}
      data-testid="landing-page"
    >
      <Helmet>
        <title>Narvo — Africa's voice, in your ears</title>
        <meta name="description" content="AI-synthesised audio news for Africa. Five Nigerian languages. Verified by the Truth Tag." />
        <link rel="canonical" href={`${getPublicUrl()}/`} />
        <meta property="og:url"          content={`${getPublicUrl()}/`} />
        <meta property="og:title"        content="Narvo — Africa's voice, in your ears" />
        <meta property="og:description"  content="AI reads 39 sources so you don't have to. Clear, spoken, verified." />
        <meta property="og:image"        content={`${getPublicUrl()}/screenshot-wide.png`} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Narvo — Africa's voice, in your ears" />
        <meta name="twitter:description" content="Africa's AI-powered audio news. Five Nigerian languages." />
        <meta name="twitter:image"       content={`${getPublicUrl()}/screenshot-wide.png`} />
      </Helmet>

      {/* ─── NAV ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background:           scrolled ? 'rgba(243,232,204,0.96)' : 'rgba(243,232,204,0.88)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom:         `1px solid ${scrolled ? 'rgba(24,84,42,0.14)' : 'transparent'}`,
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
            className="flex items-center gap-2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
            aria-label="Narvo — scroll to top"
          >
            <NarvoLogo className="w-6 h-6" style={{ color: G }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 22,
              color: G,
              letterSpacing: '-0.02em',
            }}>
              Narvo<span style={{ color: CC }}>.</span>
            </span>
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:block"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: '#625B52',
                background: 'transparent',
                border: '1.5px solid rgba(24,84,42,0.22)',
                borderRadius: 9999,
                padding: '0 18px',
                height: 44,
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                background: CC,
                border: 'none',
                borderRadius: 9999,
                height: 48,
                padding: '0 24px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-2)',
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

      {/* ─── BREAKING BANNER ─────────────────────────────── */}
      <AnimatePresence>
        {showBreaking && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{
              background:   'rgba(213,37,24,0.05)',
              borderBottom: '1px solid rgba(213,37,24,0.20)',
            }}
          >
            <div
              className="max-w-[1280px] mx-auto flex items-center gap-3 px-6 lg:px-10"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            >
              <Lightning weight="fill" style={{ width: 13, height: 13, color: '#D52518', flexShrink: 0 }} />
              <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      10,
                fontWeight:    700,
                color:         '#D52518',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                flexShrink:    0,
              }}>
                Breaking
              </span>
              <button
                type="button"
                onClick={() => navigate(`/news/${breaking[0].id}`)}
                className="flex-1 min-w-0 truncate text-left"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize:   13,
                  fontWeight: 500,
                  color:      G,
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    0,
                }}
              >
                {breaking[0].title}
              </button>
              <button
                type="button"
                onClick={() => setBreakingDismissed(true)}
                aria-label="Dismiss"
                style={{
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  minHeight: 32,
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              >
                <X weight="bold" style={{ width: 13, height: 13, color: '#D52518' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — HERO
          Headline + one sentence + one CTA.
          Nothing else.
         ══════════════════════════════════════════════════════ */}
      <section
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 96, paddingBottom: 96 }}
      >
        <motion.div
          className="flex flex-col"
          style={{ gap: 32, maxWidth: 760 }}
          initial={prefersReduced ? false : 'hidden'}
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
        >
          {/* H1 */}
          <motion.h1
            variants={prefersReduced ? undefined : fadeUp}
            transition={spring}
            style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              fontSize:      'clamp(48px, 8vw, 88px)',
              color:         G,
              lineHeight:    1.0,
              letterSpacing: '-0.03em',
            }}
          >
            Africa's news.<br />
            <em style={{ fontStyle: 'italic', color: '#3C5544' }}>Spoken to you.</em>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={prefersReduced ? undefined : fadeUp}
            transition={{ ...spring, delay: 0.08 }}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize:   18,
              fontWeight: 400,
              color:      '#625B52',
              lineHeight: 1.65,
              maxWidth:   480,
            }}
          >
            We synthesise 39+ sources into one clear story and speak it in your language — Yorùbá, Hausa, Igbo, Pidgin, or English.
          </motion.p>

          {/* CTA row */}
          <motion.div
            variants={prefersReduced ? undefined : fadeUp}
            transition={{ ...spring, delay: 0.16 }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
          >
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                fontFamily:  'var(--font-body)',
                fontSize:    16,
                fontWeight:  700,
                color:       '#fff',
                background:  CC,
                border:      'none',
                borderRadius: 9999,
                height:      56,
                padding:     '0 36px',
                cursor:      'pointer',
                display:     'flex',
                alignItems:  'center',
                gap:         10,
                boxShadow:   'var(--shadow-2)',
              }}
              whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
              whileTap={!prefersReduced   ? { scale: 0.96 } : undefined}
              transition={spring}
              data-testid="hero-cta"
            >
              <Play weight="fill" style={{ width: 15, height: 15, flexShrink: 0 }} />
              Oya, Start Listening
            </motion.button>

            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              style={{
                fontFamily:          'var(--font-body)',
                fontSize:            14,
                fontWeight:          500,
                color:               '#625B52',
                background:          'none',
                border:              'none',
                cursor:              'pointer',
                padding:             '0 4px',
                textDecoration:      'underline',
                textDecorationColor: 'rgba(24,84,42,0.22)',
                textUnderlineOffset: 4,
              }}
            >
              Hear a sample first
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Full-bleed divider */}
      <div style={{ width: '100%', height: 1, background: 'rgba(24,84,42,0.10)' }} />

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — STORIES
          Numbered editorial grid. Title, category, listen time.
          Reed Words work-grid rhythm.
         ══════════════════════════════════════════════════════ */}
      <section
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Section header row */}
        <div
          style={{
            display:        'flex',
            alignItems:     'flex-end',
            justifyContent: 'space-between',
            gap:            16,
            marginBottom:   40,
            flexWrap:       'wrap',
          }}
        >
          <motion.h2
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring }}
            style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              fontSize:      'clamp(28px, 4vw, 44px)',
              color:         G,
              lineHeight:    1.05,
              letterSpacing: '-0.02em',
            }}
          >
            What's happening <em style={{ fontStyle: 'italic' }}>now</em>.
          </motion.h2>

          <motion.button
            type="button"
            onClick={() => navigate('/auth')}
            initial={prefersReduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.1 }}
            style={{
              fontFamily:  'var(--font-body)',
              fontSize:    13,
              fontWeight:  600,
              color:       G,
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              display:     'flex',
              alignItems:  'center',
              gap:         6,
              padding:     '0 4px',
              textDecoration:      'underline',
              textDecorationColor: 'rgba(24,84,42,0.25)',
              textUnderlineOffset: 4,
              flexShrink:  0,
            }}
          >
            All stories <ArrowRight weight="bold" style={{ width: 13, height: 13 }} />
          </motion.button>
        </div>

        {/* Story grid */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {displayStories.map((story, i) => {
            const isLast    = i === displayStories.length - 1;
            const isSkeleton = isLoading;
            const verified   = typeof story.truth_score === 'number' && story.truth_score >= 70;

            return (
              <motion.button
                key={story.id}
                type="button"
                onClick={() => !isSkeleton && navigate(`/news/${story.id}`)}
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ ...spring, delay: (i % 3) * 0.05 }}
                whileHover={(!prefersReduced && !isSkeleton) ? { x: 4 } : undefined}
                style={{
                  display:        'grid',
                  gridTemplateColumns: '48px 1fr auto',
                  alignItems:     'center',
                  gap:            24,
                  padding:        '22px 0',
                  borderBottom:   isLast ? 'none' : '1px solid rgba(24,84,42,0.08)',
                  background:     'none',
                  border:         isLast ? 'none' : undefined,
                  borderTop:      'none',
                  borderLeft:     'none',
                  borderRight:    'none',
                  cursor:         isSkeleton ? 'default' : 'pointer',
                  textAlign:      'left',
                  width:          '100%',
                  transition:     'transform 150ms var(--ease-standard)',
                }}
                aria-label={isSkeleton ? undefined : `Listen to: ${story.title}`}
              >
                {/* Story number */}
                <span
                  style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      11,
                    fontWeight:    500,
                    color:         isSkeleton ? 'transparent' : '#C0B9B1',
                    letterSpacing: '0.06em',
                    flexShrink:    0,
                    background:    isSkeleton ? '#EDE9E4' : 'none',
                    borderRadius:  isSkeleton ? 4 : 0,
                    display:       'block',
                    width:         isSkeleton ? 24 : 'auto',
                    height:        isSkeleton ? 14 : 'auto',
                  }}
                >
                  {isSkeleton ? '' : String(i + 1).padStart(2, '0')}
                </span>

                {/* Title + tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  {isSkeleton ? (
                    <>
                      <div style={{ height: 18, background: '#EDE9E4', borderRadius: 4, width: `${60 + (i % 4) * 10}%` }} />
                      <div style={{ height: 12, background: '#EDE9E4', borderRadius: 4, width: 80 }} />
                    </>
                  ) : (
                    <>
                      <span
                        className="line-clamp-2"
                        style={{
                          fontFamily:    'var(--font-display)',
                          fontWeight:    700,
                          fontSize:      17,
                          color:         G,
                          lineHeight:    1.2,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {story.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {story.category && (
                          <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      9,
                            fontWeight:    700,
                            color:         G,
                            background:    'rgba(24,84,42,0.08)',
                            padding:       '2px 8px',
                            borderRadius:  4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}>
                            {story.category}
                          </span>
                        )}
                        {story.read_time && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   9,
                            color:      '#A09890',
                            letterSpacing: '0.04em',
                          }}>
                            {story.read_time} listen
                          </span>
                        )}
                        {verified && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   9,
                            fontWeight: 700,
                            color:      '#5a7003',
                          }}>
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Play CTA — right side */}
                {!isSkeleton && (
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className="hidden sm:block"
                      style={{
                        fontFamily:    'var(--font-body)',
                        fontSize:      13,
                        fontWeight:    600,
                        color:         CC,
                        letterSpacing: '0.01em',
                      }}
                    >
                      Oya, Play
                    </span>
                    <div style={{
                      width:      40,
                      height:     40,
                      borderRadius: 9999,
                      background: CC,
                      display:    'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Play weight="fill" style={{ width: 14, height: 14, color: '#fff' }} />
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Full-bleed divider */}
      <div style={{ width: '100%', height: 1, background: 'rgba(24,84,42,0.10)' }} />

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — STATEMENT
          One manifesto sentence. Full width. Nothing else.
         ══════════════════════════════════════════════════════ */}
      <section
        className="max-w-[1280px] mx-auto w-full px-6 lg:px-10"
        style={{ paddingTop: 96, paddingBottom: 96 }}
      >
        <motion.p
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={spring}
          style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      'clamp(28px, 4.5vw, 56px)',
            color:         G,
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            maxWidth:      880,
          }}
        >
          Every story is synthesised from multiple sources, spoken in your language, and tagged with where it came from.{' '}
          <em style={{ fontStyle: 'italic', color: '#3C5544' }}>That's the whole product.</em>
        </motion.p>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — FINAL CTA
          Two lines on Forest Green. That's it.
         ══════════════════════════════════════════════════════ */}
      <section style={{ background: G, padding: '96px 24px' }}>
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={spring}
          className="max-w-[1280px] mx-auto"
          style={{ display: 'flex', flexDirection: 'column', gap: 36 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <ContinentMark size={52} />
          </div>

          <h2 style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      'clamp(36px, 6vw, 72px)',
            color:         Y,
            lineHeight:    1.0,
            letterSpacing: '-0.03em',
            maxWidth:      700,
          }}>
            Your morning briefing{' '}
            <em style={{ fontStyle: 'italic', color: '#fff' }}>is waiting</em>.
          </h2>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize:   18,
            fontWeight: 400,
            color:      'rgba(255,255,255,0.55)',
            lineHeight: 1.65,
            maxWidth:   460,
          }}>
            Free to start. Works offline. Five Nigerian languages.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                fontFamily:  'var(--font-body)',
                fontSize:    16,
                fontWeight:  700,
                color:       G,
                background:  Y,
                border:      'none',
                borderRadius: 9999,
                height:      56,
                padding:     '0 36px',
                cursor:      'pointer',
                display:     'flex',
                alignItems:  'center',
                gap:         10,
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
                fontFamily:  'var(--font-body)',
                fontSize:    15,
                fontWeight:  500,
                color:       'rgba(255,255,255,0.55)',
                background:  'transparent',
                border:      '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 9999,
                height:      56,
                padding:     '0 28px',
                cursor:      'pointer',
              }}
            >
              Hear a sample
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer style={{ background: '#0e3319', padding: '48px 24px 36px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="max-w-[1280px] mx-auto"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NarvoLogo className="w-5 h-5" style={{ color: Y }} />
              <span style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    700,
                fontSize:      18,
                color:         Y,
                letterSpacing: '-0.02em',
              }}>
                Narvo.
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize:   12,
              color:      'rgba(255,255,255,0.35)',
              lineHeight: 1.6,
              maxWidth:   220,
            }}>
              Africa's AI-powered audio news. Synthesised, verified, spoken.
            </p>
            <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'rgba(255,255,255,0.20)',
              letterSpacing: '0.06em',
            }}>
              NARVO INTELLIGENCE LTD.
            </span>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Product</span>
              {['Features', 'Pricing', 'Truth Tag', 'Voices'].map(item => (
                <button key={item} type="button" onClick={() => navigate('/auth')}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  {item}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Company</span>
              {['About', 'Narvo Platform', 'Press'].map(item => (
                <span key={item} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="max-w-[1280px] mx-auto"
          style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.05em' }}>
            © 2026 NARVO INTELLIGENCE LTD.
          </span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms'].map(item => (
              <span key={item} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', letterSpacing: '0.04em' }}>{item}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* ─── VOICE PREVIEW MODAL ─────────────────────────── */}
      <AnimatePresence>
        {voiceModalOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => { setVoiceModalOpen(false); stopTrack(); }}
              style={{
                position:            'fixed',
                inset:               0,
                background:          'rgba(14,51,25,0.72)',
                zIndex:              100,
                backdropFilter:      'blur(4px)',
                WebkitBackdropFilter:'blur(4px)',
              }}
            />
            <motion.div
              key="modal"
              initial={prefersReduced ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={spring}
              role="dialog"
              aria-modal
              aria-label="Voice preview"
              style={{
                position:     'fixed',
                bottom:       0,
                left:         0,
                right:        0,
                zIndex:       101,
                background:   '#FDF8EF',
                borderRadius: '24px 24px 0 0',
                padding:      '28px 24px 40px',
                maxHeight:    '82vh',
                overflowY:    'auto',
                boxShadow:    'var(--shadow-4)',
              }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: G, lineHeight: 1.1 }}>
                    Your Narvo Voice
                  </h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#625B52', marginTop: 4 }}>
                    Tap to hear how your stories will sound
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setVoiceModalOpen(false); stopTrack(); }}
                  aria-label="Close"
                  style={{
                    width: 40, height: 40, borderRadius: 9999,
                    background: 'rgba(24,84,42,0.08)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X weight="bold" style={{ width: 16, height: 16, color: G }} />
                </button>
              </div>

              {/* Voice list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {voices.length === 0
                  ? ['Yorùbá', 'Hausa', 'Igbo', 'Pidgin', 'English'].map(lang => (
                      <div key={lang} style={{ height: 68, background: '#EDE9E4', borderRadius: 12, animation: 'pulse 2s ease-in-out infinite' }} />
                    ))
                  : voices.map(voice => {
                      const loading  = previewLoading === voice.id;
                      const hasError = previewError   === voice.id;
                      return (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => handleVoicePreview(voice)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 18px',
                            background: 'white',
                            border: `1.5px solid rgba(24,84,42,${loading ? '0.28' : '0.10'})`,
                            borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: 44, height: 44, borderRadius: 9999, flexShrink: 0,
                            background: loading ? CC : G,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {loading
                              ? <Waveform weight="bold" style={{ width: 18, height: 18, color: '#fff' }} />
                              : <SpeakerHigh weight="fill" style={{ width: 18, height: 18, color: Y }} />
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: G }}>{voice.name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890', marginTop: 2, letterSpacing: '0.04em' }}>
                              {hasError ? '⚠ Preview unavailable' : (voice.accent || voice.language || 'Nigerian English')}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: loading ? CC : '#C0B9B1', letterSpacing: '0.06em' }}>
                            {loading ? 'LOADING...' : 'PLAY'}
                          </span>
                        </button>
                      );
                    })
                }
              </div>

              {/* Modal CTA */}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setVoiceModalOpen(false); navigate('/auth'); }}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                    color: '#fff', background: CC, border: 'none', borderRadius: 9999,
                    height: 52, padding: '0 32px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
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
