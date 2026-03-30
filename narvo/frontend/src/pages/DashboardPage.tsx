/**
 * DashboardPage.tsx — Narvo Design System v4
 * ───────────────────────────────────────────
 * Total redesign. Three-zone layout:
 *
 *   ┌─────────────────────────────────────────┐
 *   │  HEADER — greeting + date + new banner   │
 *   ├─────────────────────────────────────────┤
 *   │  CHIPS — sticky topic filter rail        │
 *   ├──────────────────┬──────────────────────┤
 *   │                  │                      │
 *   │  FEED (left)     │  SIDEBAR (desktop)   │
 *   │                  │                      │
 *   │  Hero card       │  Sources live        │
 *   │  Editorial grid  │  Trending tags       │
 *   │  Load more       │  Reco strip          │
 *   │                  │                      │
 *   └──────────────────┴──────────────────────┘
 *
 * Card anatomy (every card):
 *   - Category chip (Geist Mono, always visible)
 *   - Truth Tag pill (coloured, always visible)
 *   - Fraunces headline
 *   - Source + time (Geist Mono)
 *   - 52px Crisp Carrot play button (primary action)
 *   - Download + bookmark actions (secondary)
 */

import type React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

import { Play }           from '@phosphor-icons/react/Play';
import { Pause }          from '@phosphor-icons/react/Pause';
import { ArrowClockwise } from '@phosphor-icons/react/ArrowClockwise';
import { Lightning }      from '@phosphor-icons/react/Lightning';
import { GlobeHemisphereEast } from '@phosphor-icons/react/GlobeHemisphereEast';
import { Sparkle }        from '@phosphor-icons/react/Sparkle';

import { useAudio }           from '../contexts/AudioContext';
import {
  useAudioPrefetch,
  useObservedAudioPrefetch,
} from '../hooks/useAudioPrefetch';
import usePullToRefresh        from '../hooks/usePullToRefresh';
import { useNewsRefresh }      from '../hooks/useNewsRefresh';

import { NARVO_SETTINGS_UPDATED }  from '../lib/accessibilityApply';
import { useAuth }             from '../contexts/AuthContext';
import * as api                from '../lib/api';
import logger                  from '../lib/logger';
import { readJson, writeJson } from '../lib/storage';
import useSWR from 'swr';
import { asArray, asRecord, isStory } from '../lib/validators';
import type { Story } from '../types/story';

/* ─────────────────────────── Constants ─────────────────────────── */

const NB = 'var(--color-bg)';           /* Neutral Background (Cream) */
const NT = 'var(--color-text-primary)'; /* Neutral Text (Dark) */
const G  = 'var(--color-primary)';      /* Forest Green accent */
const Y  = 'var(--color-accent)';       /* Sunshine Yellow accent */
const CC = 'var(--color-cta)';          /* Crisp Carrot accent */
const BG = 'var(--color-bg)';
const SF = 'var(--color-surface)';

const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };

const CATEGORY_EMOJIS: Record<string, string> = {
  nigeria:     '🇳🇬',
  africa:      '🌍',
  business:    '💼',
  tech:        '💻',
  sports:      '⚽',
  health:      '🏥',
  politics:    '🏛️',
  culture:     '🎭',
  environment: '🌱',
  science:     '🔬',
  security:    '🛡️',
  opinion:     '💬',
  finance:     '📈',
};

const catEmoji = (cat?: string) =>
  cat ? (CATEGORY_EMOJIS[cat.toLowerCase()] ?? '📰') : '📰';

/* ─────────────────────────── Helpers ─────────────────────────── */

const timeAgo = (iso?: string): string => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ─────────────────────────── Truth Tag Pill ─────────────────────── */
/* Inline — no async fetch needed for the pill; uses certainty_score */

const TruthPill = ({ score }: { score?: number }) => {
  if (score === undefined || score === null) return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#807870', background: 'rgba(128,120,112,0.12)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      Unverified
    </span>
  );
  if (score >= 70) return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#14542A', border: '1px solid #14542A', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      ✓ Verified
    </span>
  );
  if (score >= 40) return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#856600', border: '1px solid #FFC926', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      ○ Mixed
    </span>
  );
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#D52518', border: '1px solid #D52518', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      ! Disputed
    </span>
  );
};

/* ─────────────────────────── Narvo Brand Icon ─────────────────────── */

const NarvoBrandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="6" rx="1" fill="#14542A" />
    <rect y="7" width="24" height="6" rx="1" fill="#FFC926" />
    <rect y="14" width="24" height="6" rx="1" fill="#807870" />
  </svg>
);

/* ─────────────────────────── Hero Card ─────────────────────────── */

interface HeroCardProps {
  story:        Story;
  isPlaying:    boolean;
  onPlay:       (story: Story) => void;
  cardRef?:     (el: HTMLElement | null) => void;
}

const HeroCard = ({ story, isPlaying, onPlay, cardRef }: HeroCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.article
      ref={cardRef as React.Ref<HTMLElement>}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      data-testid="featured-card"
      style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', cursor: 'pointer', background: NB, border: '1px solid rgba(20,84,42,0.08)', boxShadow: '0 10px 30px -15px rgba(20,84,42,0.1)' }}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return;
        navigate(`/news/${story.id}`, { state: { story } });
      }}
    >
      {/* Top Labels: uppercase spaced orange */}
      <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: CC, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {story.is_breaking ? 'BREAKING · ' : ''}{story.category ?? 'ECONOMY'}
        </span>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {/* Headline: Serif with italic emphasis */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', color: NT, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 }}>
          {story.title}
        </h2>

        {/* Summary/Snippet */}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 1.5vw, 16px)', color: 'rgba(26,29,26,0.7)', lineHeight: 1.5, marginBottom: 24, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {story.summary || story.short_summary}
        </p>

        {/* Footer Meta Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ height: 1, background: 'rgba(20,84,42,0.06)', width: '100%' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <NarvoBrandIcon size={28} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: NT }}>Narvo Intelligence</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(26,29,26,0.5)', letterSpacing: '0.02em' }}>
                  {timeAgo(story.published ?? story.published_at)} · 4 MIN LISTEN · <TruthPill score={story.certainty_score} />
                </span>
              </div>
            </div>

            {/* Play Button - Large Primary CTA */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(story);
              }}
              className="transition-transform active:scale-95"
              style={{ padding: '10px 24px', borderRadius: 99, background: CC, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(249,96,21,0.25)' }}
            >
              {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY NOW'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

/* ─────────────────────────── Standard Card ─────────────────────── */

interface StoryCardProps {
  story:        Story;
  index:        number;
  isPlaying:    boolean;
  isActive:     boolean;
  onPlay:       (story: Story) => void;
  wide?:        boolean;   /* spans 2 cols in the editorial grid */
  cardRef?:     (el: HTMLElement | null) => void;
}

const StoryCard = ({ story, index, isPlaying, isActive, onPlay, wide, cardRef }: StoryCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.article
      ref={cardRef as React.Ref<HTMLElement>}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ ...spring, delay: (index % 4) * 0.05 }}
      data-testid="story-card"
      style={{
        background: NB,
        border: `1px solid ${isActive ? 'rgba(249,96,21,0.2)' : 'rgba(20,84,42,0.06)'}`,
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gridColumn: wide ? 'span 2' : 'span 1',
        boxShadow: isActive ? '0 8px 24px -10px rgba(249,96,21,0.15)' : 'none',
      }}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return;
        navigate(`/news/${story.id}`, { state: { story } });
      }}
      whileHover={{ y: -2 }}
    >
      <div style={{ padding: '16px 18px' }}>
        {/* Top Meta Labels */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(26,29,26,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {story.category ?? 'POLITICS'}
          </span>
          <span style={{ color: 'rgba(26,29,26,0.2)', fontSize: 9 }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(26,29,26,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {story.source?.split(' ')?.[0] ?? 'LAGOS'}
          </span>
        </div>

        {/* Headline */}
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: wide ? 19 : 17, color: NT, lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 16 }}>
          {story.title}
        </h3>

        {/* Card Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(26,29,26,0.5)', fontWeight: 600 }}>
              {timeAgo(story.published ?? story.published_at)}
            </span>
            <span style={{ color: 'rgba(26,29,26,0.2)', fontSize: 9 }}>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(26,29,26,0.5)', fontWeight: 600 }}>
              3min
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(story);
            }}
            className="transition-all active:scale-95"
            style={{ 
              padding: '6px 14px', 
              borderRadius: 99, 
              background: CC, 
              color: '#fff', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 12,
              boxShadow: '0 2px 8px rgba(249,96,21,0.15)'
            }}
          >
            {isPlaying ? <Pause weight="fill" size={12} /> : <Play weight="fill" size={12} />}
            <span>Play</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
};

/* ─────────────────────────── Skeleton ─────────────────────────── */

const FeedSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ height: 320, background: SF, borderRadius: 20, animation: 'pulse 2s ease-in-out infinite' }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ height: 180, background: SF, borderRadius: 16, animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  </div>
);

/* ─────────────────────────── Main Page ─────────────────────────── */

const DashboardPage = () => {
  const navigate = useNavigate();
  const { playTrack, voiceModel, broadcastLanguage, currentTrack, isPlaying } = useAudio();
  const { user } = useAuth();

  /* ── Data ── */
  const [news, setNews]   = useState<Story[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [allLoaded, setAllLoaded]       = useState(false);

  const fetcher = useCallback(async () => {
    const settingsRes = await api.get('api/settings/guest');
    const settingsJson = settingsRes.ok ? await settingsRes.json() : {};
    const settings = asRecord<{ aggregator_mediastack?: boolean; aggregator_newsdata?: boolean; interests?: string[] }>(settingsJson, {});
    const ms = settings.aggregator_mediastack !== false;
    const nd = settings.aggregator_newsdata !== false;
    const enabled = [ms && 'mediastack', nd && 'newsdata'].filter(Boolean).join(',');
    const aggParam = enabled ? `&aggregator_sources=${enabled}` : '';
    const newsRes = await api.get(`api/news?limit=50&include_aggregators=true${aggParam}`);
    if (!newsRes.ok) throw new Error(`News API ${newsRes.status}`);
    const newsData = asArray<Story>(await newsRes.json(), isStory);
    return { news: newsData, interests: settings.interests ?? [] };
  }, []);

  const { data, mutate, isLoading } = useSWR('dashboard-feed', fetcher, {
    revalidateOnFocus: true, dedupingInterval: 2000, refreshInterval: 120_000, revalidateOnReconnect: true,
  });

  useEffect(() => {
    if (data) {
      setNews(Array.isArray(data.news) ? data.news : []);
      setVisibleCount(12);
      setAllLoaded((data.news?.length ?? 0) <= 12);
    }
  }, [data]);

  /* ── Pull to refresh ── */
  const [gesturalSwipe, setGesturalSwipe] = useState(true);
  useEffect(() => {
    const read = () => {
      try { setGesturalSwipe(readJson<{ gestural_swipe?: boolean }>('narvo_settings_cache', {}).gestural_swipe !== false); }
      catch { setGesturalSwipe(true); }
    };
    read();
    window.addEventListener(NARVO_SETTINGS_UPDATED, read);
    return () => window.removeEventListener(NARVO_SETTINGS_UPDATED, read);
  }, []);

  const { containerRef, pulling, refreshing, pullDistance, handlers: pullHandlers } = usePullToRefresh(
    useCallback(async () => { await mutate(); }, [mutate]),
    { threshold: 70, disabled: !gesturalSwipe }
  );

  /* ── New stories banner ── */
  const currentIds = useMemo(() => news.map(n => n.id), [news]);
  const { newCount, applyRefresh, clearNew } = useNewsRefresh({
    currentIds,
    onRefresh: useCallback(async () => { await mutate(); }, [mutate]),
    intervalMs: 120_000,
    autoApplyMs: 300_000,
  });

  /* ── Recommendations ── */
  const [recommendations, setRecommendations] = useState<Story[]>(() => {
    try {
      const c = readJson<{ at?: number; items?: Story[] }>('narvo_reco_cache', {});
      if (c.at && Date.now() - c.at < 3_600_000) return c.items ?? [];
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id || 'guest';
    api.get(`api/recommendations/${userId}?limit=6`)
      .then(r => r.json())
      .then((d: { recommendations?: Story[] } | null) => {
        const safe = asRecord<{ recommendations?: Story[] }>(d ?? {}, {});
        const items = asArray<Story>(safe.recommendations, isStory);
        if (!cancelled) {
          setRecommendations(items);
          writeJson('narvo_reco_cache', { items, at: Date.now() });
        }
      })
      .catch(err => logger.debug('[DashboardPage] Reco fetch failed', err));
    return () => { cancelled = true; };
  }, [user?.id]);

  /* ── Audio prefetch ── */
  const prefetchArticles = recommendations.length > 0 ? recommendations.slice(0, 8) : news.slice(0, 8);
  useAudioPrefetch(prefetchArticles, voiceModel, broadcastLanguage, 8);

  /* ── Category filter ── */
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const feedCategories = useMemo(() => {
    const cats = new Set<string>();
    news.forEach(s => { if (s.category) cats.add(s.category); });
    return Array.from(cats).slice(0, 8);
  }, [news]);

  const newsList = useMemo(() =>
    (selectedCat ? news.filter(s => s.category?.toLowerCase() === selectedCat.toLowerCase()) : news),
  [news, selectedCat]);

  const featured = selectedCat ? newsList[0] : news[0];
  const stream = (selectedCat ? newsList : newsList.slice(1)).slice(0, visibleCount);

  /* ── Observer-based prefetch ── */
  const prefetchPool = useMemo(() => {
    const pool: Story[] = [];
    if (featured) pool.push(featured);
    pool.push(...recommendations.slice(0, 6));
    pool.push(...stream.slice(0, visibleCount));
    return pool;
  }, [featured, recommendations, stream, visibleCount]);
  const setCardRef = useObservedAudioPrefetch(prefetchPool, { voiceId: voiceModel, language: broadcastLanguage, limit: 15, rootMargin: '300px' });

  /* ── Load more ── */
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !allLoaded && !isLoading) {
        const next = visibleCount + 8;
        setVisibleCount(next);
        if (next >= newsList.length) setAllLoaded(true);
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [allLoaded, isLoading, visibleCount, newsList.length]);

  /* ── Actions ── */
  const handlePlay = useCallback(async (story: Story) => {
    if (currentTrack?.id === story.id && isPlaying) return;
    await playTrack({ id: story.id, title: story.title ?? '', source: 'FEED' }, true);
  }, [playTrack, currentTrack, isPlaying]);

  /* ── Greeting ── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.user_metadata?.first_name || user?.user_metadata?.display_name || 'Oga';

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden" data-testid="dashboard-page">
      <Helmet>
        <title>Home — Narvo</title>
        <meta name="description" content="Your personalised audio news feed." />
      </Helmet>

      {/* ════════════════════════════ DASHBOARD CONTENT ════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0 overflow-hidden">
        
        {/* ════════════════════════════ MAIN FEED COLUMN ════════════════════════════ */}
        <main
        className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"
        style={{ background: BG }}
      >
        {/* ── HEADER ── */}
        <header
          style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, background: BG }}
          data-testid="feed-header"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--color-text-meta)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                {new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
              </p>
              <h1 
                className="lg:text-4xl" 
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: G, lineHeight: 1, letterSpacing: '-0.03em' }}
              >
                {greeting}, {name}.
              </h1>
              <p className="hidden lg:block" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-meta)', marginTop: 8, fontWeight: 500 }}>
                Your daily intelligence briefing is ready. <span style={{ color: CC }}>● LIVE</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => mutate()}
              aria-label="Refresh feed"
              style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(24,84,42,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G, flexShrink: 0, marginTop: 2 }}
            >
              <ArrowClockwise style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* New stories banner */}
          <AnimatePresence>
            {newCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden', marginTop: 10 }}
              >
                <div style={{ background: G, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button type="button" onClick={applyRefresh}
                    style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: Y, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                    <Lightning weight="fill" style={{ width: 14, height: 14 }} />
                    {newCount} new {newCount === 1 ? 'story' : 'stories'} — tap to load
                  </button>
                  <button type="button" onClick={clearNew} aria-label="Dismiss"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,201,38,0.5)', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}>
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ── TOPIC CHIPS ── sticky filter rail ── */}
        <div
          role="tablist"
          aria-label="Filter by topic"
          className="no-scrollbar"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            overflowX: 'auto', flexShrink: 0,
            background: BG,
            borderBottom: '1px solid var(--color-border)',
            WebkitOverflowScrolling: 'touch',
            height: 68, /* ensures enough space for 44px chips + padding */
          }}
        >
          {/* For You */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedCat === null}
            onClick={() => setSelectedCat(null)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              padding: '0 20px', height: 44, borderRadius: 12,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: selectedCat === null ? G : 'rgba(24,84,42,0.06)',
              color: selectedCat === null ? Y : G,
              flexShrink: 0,
              transition: 'all 200ms var(--ease-standard)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✦ For You
          </button>

          {feedCategories.map(cat => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCat === cat}
              onClick={() => setSelectedCat(prev => prev === cat ? null : cat)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                padding: '0 20px', height: 44, borderRadius: 12,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: selectedCat === cat ? G : 'rgba(24,84,42,0.06)',
                color: selectedCat === cat ? Y : G,
                flexShrink: 0,
                transition: 'all 200ms var(--ease-standard)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {catEmoji(cat)} <span style={{ marginLeft: 6 }}>{cat}</span>
            </button>
          ))}
        </div>

        {/* ── SCROLLABLE FEED ── */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll pb-safe"
          style={{ padding: '20px 20px 40px' }}
          data-testid="news-feed"
          {...pullHandlers}
        >
          {/* Pull-to-refresh indicator */}
          {(pulling || refreshing) && (
            <div className="md:hidden flex items-center justify-center" style={{ height: pulling ? pullDistance : refreshing ? 40 : 0, overflow: 'hidden', transition: 'height 0.2s' }}>
              <div className={`w-5 h-5 border-2 rounded-full ${refreshing ? 'animate-spin' : ''}`}
                style={{ borderColor: `${G} transparent transparent transparent`, transform: pulling ? `rotate(${pullDistance * 3}deg)` : undefined }} />
            </div>
          )}

          {isLoading && !news.length ? (
            <FeedSkeleton />
          ) : (
            <div 
              className="lg:ml-0"
              style={{ maxWidth: 840, display: 'flex', flexDirection: 'column', gap: 24 }}
            >

              {/* ════ HERO CARD ════ */}
              {featured && (
                <HeroCard
                  story={featured}
                  isPlaying={currentTrack?.id === featured.id && isPlaying}
                  onPlay={() => handlePlay(featured)}
                  cardRef={setCardRef(0)}
                />
              )}

              {/* ════ EDITORIAL GRID ════
                  Asymmetric: every 3rd card is wide (spans 2 cols).
                  Gives the grid editorial rhythm instead of uniform tiles.
              ════════════════════════ */}
              <div
                className="grid gap-4 lg:gap-6"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                }}
              >
                {stream.map((story, i) => {
                  /* Wide card every 5th starting from 2nd position */
                  const isWide = (i === 1 || i === 6 || i === 11);
                  return (
                    <StoryCard
                      key={story.id}
                      story={story}
                      index={i}
                      isPlaying={currentTrack?.id === story.id && isPlaying}
                      isActive={currentTrack?.id === story.id}
                      onPlay={() => handlePlay(story)}
                      wide={isWide}
                      cardRef={setCardRef(i + 1)}
                    />
                  );
                })}
              </div>

              {/* ════ RECOMMENDATIONS STRIP (MOBILE ONLY) ════ */}
              {recommendations.length > 0 && !selectedCat && (
                <div className="lg:hidden" style={{ paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Sparkle weight="fill" style={{ width: 14, height: 14, color: CC }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      For You
                    </span>
                  </div>
                  <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                    {recommendations.map(story => (
                      <button
                        key={story.id}
                        type="button"
                        onClick={() => navigate(`/news/${story.id}`, { state: { story } })}
                        style={{ flexShrink: 0, width: 220, background: 'rgba(24,84,42,0.04)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '16px', textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(24,84,42,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(24,84,42,0.04)'}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: G, background: 'rgba(24,84,42,0.08)', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-block', marginBottom: 10 }}>
                          {catEmoji(story.category)} {story.category ?? 'General'}
                        </span>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: G, lineHeight: 1.25, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {story.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ LOAD MORE SENTINEL ════ */}
              <div ref={loadMoreRef}>
                {!allLoaded && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--color-border)', borderTopColor: G, animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
                {allLoaded && stream.length > 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)', textAlign: 'center', padding: '16px 0', letterSpacing: '0.08em' }}>
                    ALL CAUGHT UP · {stream.length} STORIES
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      {/* ════════════════════════════ UTILITY SIDEBAR (DESKTOP) ════════════════════════════ */}
      <aside 
        className="hidden lg:flex w-[320px] xl:w-[380px] border-l border-[var(--color-border)] flex-col overflow-y-auto no-scrollbar"
        style={{ background: BG, padding: '24px' }}
      >
        {/* Sources / Info Section */}
        <div style={{ background: 'rgba(26,29,26,0.03)', borderRadius: 20, padding: '24px', border: '1px solid var(--color-border)', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Sparkle weight="fill" style={{ width: 18, height: 18, color: CC }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: NT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Narvo Intelligence
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: NT, lineHeight: 1.2 }}>
            Your daily brief <br/> is ready for listening.
          </p>
        </div>

        {/* Recommendations (Desktop Sidebar) */}
        {!selectedCat && recommendations.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {['All', 'Politics', 'Business', 'Tech', 'Science', 'Health', 'Sports'].map(topic => {
                const isActive = (topic === 'All' && !selectedCat) || (selectedCat?.toLowerCase() === topic.toLowerCase());
                return (
                  <button
                    key={topic}
                    onClick={() => setSelectedCat(topic === 'All' ? null : topic)}
                    className="transition-all duration-200"
                    style={{
                      padding: '6px 14px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isActive ? G : 'rgba(255,255,255,0.03)',
                      color: isActive ? '#fff' : '#ccc',
                      border: `1px solid ${isActive ? G : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 12, background: CC, borderRadius: 2 }} />
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: NT, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                For You
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommendations.slice(0, 4).map(story => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => navigate(`/news/${story.id}`, { state: { story } })}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: CC, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {story.category ?? 'General'}
                  </span>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: G, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                    {story.title}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Trending Sources */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <GlobeHemisphereEast weight="bold" style={{ width: 16, height: 16, color: G }} />
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Active Sources
            </h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Array.from(new Set(news.map(s => s.source))).slice(0, 6).map(src => (
              <span key={src} style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: G, background: 'rgba(24,84,42,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                {src}
              </span>
            ))}
          </div>
        </section>
      </aside>
    </div>
  </div>
);
};

export default DashboardPage;
