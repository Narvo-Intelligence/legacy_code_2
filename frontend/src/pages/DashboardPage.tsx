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
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { Bookmark }       from '@phosphor-icons/react/Bookmark';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';
import { ShareNetwork }   from '@phosphor-icons/react/ShareNetwork';
import { ArrowClockwise } from '@phosphor-icons/react/ArrowClockwise';
import { Lightning }      from '@phosphor-icons/react/Lightning';
import { Sparkle }        from '@phosphor-icons/react/Sparkle';
import { ShieldCheck }    from '@phosphor-icons/react/ShieldCheck';
import { ShieldWarning }  from '@phosphor-icons/react/ShieldWarning';
import { Question }       from '@phosphor-icons/react/Question';

import { useAudio }           from '../contexts/AudioContext';
import { useBookmarks }       from '../hooks/useBookmarks';
import {
  useAudioPrefetch,
  useObservedAudioPrefetch,
  prefetchAndCacheStory,
  prefetchBookmarkedStories,
} from '../hooks/useAudioPrefetch';
import usePullToRefresh        from '../hooks/usePullToRefresh';
import { useNewsRefresh }      from '../hooks/useNewsRefresh';

import { getCategoryImage }    from '../lib/categoryImages';
import ResponsiveImage         from '../components/ResponsiveImage';
import { CARD_SIZES, THUMB_SIZES } from '../lib/responsiveImageUtils';
import { NARVO_SETTINGS_UPDATED }  from '../lib/accessibilityApply';
import { useHapticAlert }      from '../components/HapticAlerts';
import { useAuth }             from '../contexts/AuthContext';
import * as api                from '../lib/api';
import logger                  from '../lib/logger';
import { readJson, writeJson } from '../lib/storage';
import useSWR from 'swr';
import { asArray, asRecord, isStory } from '../lib/validators';
import type { Story } from '../types/story';

/* ─────────────────────────── Constants ─────────────────────────── */

const G  = 'var(--color-primary)';     /* Forest Green */
const Y  = 'var(--color-accent)';      /* Sunshine Yellow */
const CC = 'var(--color-cta)';         /* Crisp Carrot */
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

const saveForOffline = async (item: Story, userId?: string): Promise<boolean> => {
  try {
    await api.post('api/offline/save', {
      story_id: item.id, title: item.title,
      summary: item.summary ?? '', narrative: item.narrative ?? '',
      source: item.source ?? '', category: item.category ?? 'General',
      image_url: item.image_url ?? null,
      ...(userId ? { user_id: userId } : {}),
    });
    return true;
  } catch { return false; }
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
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--color-verified-text)', background: 'var(--color-verified-tint)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <ShieldCheck weight="fill" style={{ width: 10, height: 10 }} />
      Verified
    </span>
  );
  if (score >= 40) return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#856600', background: 'rgba(255,201,38,0.15)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <ShieldWarning weight="fill" style={{ width: 10, height: 10 }} />
      Mixed
    </span>
  );
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#D52518', background: 'rgba(213,37,24,0.10)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <Question weight="fill" style={{ width: 10, height: 10 }} />
      Disputed
    </span>
  );
};

/* ─────────────────────────── Hero Card ─────────────────────────── */

interface HeroCardProps {
  story:        Story;
  isPlaying:    boolean;
  onPlay:       (e: React.MouseEvent) => void;
  onBookmark:   (e: React.MouseEvent) => void;
  onDownload:   (e: React.MouseEvent) => void;
  onShare:      (e: React.MouseEvent) => void;
  isBookmarked: boolean;
  cardRef?:     (el: HTMLElement | null) => void;
}

const HeroCard = ({ story, isPlaying, onPlay, onBookmark, onDownload, onShare, isBookmarked: bmked, cardRef }: HeroCardProps) => {
  const navigate = useNavigate();
  const imgSrc = story.image_url || getCategoryImage(story.category || story.tags?.[0], story.id);

  return (
    <motion.article
      ref={cardRef as React.RefObject<HTMLElement>}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      data-testid="featured-card"
      style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', background: G, boxShadow: 'var(--shadow-3)' }}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return;
        navigate(`/news/${story.id}`, { state: { story } });
      }}
    >
      {/* Image with Forest Green gradient overlay */}
      <div style={{ position: 'relative', height: 'clamp(200px, 30vw, 320px)', overflow: 'hidden' }}>
        <ResponsiveImage
          alt={story.title ?? ''}
          src={imgSrc}
          sizes={CARD_SIZES}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Deep gradient so text reads cleanly */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,51,25,0.96) 0%, rgba(14,51,25,0.55) 45%, rgba(14,51,25,0.10) 100%)' }} />

        {/* Top row: category + truth tag */}
        <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: Y, background: 'rgba(255,201,38,0.18)', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            {catEmoji(story.category)} {story.category ?? 'General'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Featured
          </span>
        </div>

        {/* Bottom row: headline + play */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 16px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px, 3vw, 26px)', color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {story.title}
          </h2>
        </div>
      </div>

      {/* Card footer — on Forest Green */}
      <div style={{ background: G, padding: '14px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Play button */}
        <button
          type="button"
          onClick={onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play story'}
          style={{ width: 52, height: 52, borderRadius: 9999, background: CC, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-2)' }}
        >
          {isPlaying
            ? <Pause weight="fill" style={{ width: 20, height: 20, color: '#fff' }} />
            : <Play  weight="fill" style={{ width: 20, height: 20, color: '#fff', marginLeft: 2 }} />
          }
        </button>

        {/* Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TruthPill score={story.certainty_score} />
            {story.multi_source && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ✦ AI Synthesis
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }} className="line-clamp-1">
            {story.source} · {timeAgo(story.published ?? story.published_at)}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {[
            { icon: <CloudArrowDown weight={bmked ? 'fill' : 'regular'} style={{ width: 16, height: 16 }} />, fn: onDownload, label: 'Save offline' },
            { icon: bmked ? <Bookmark weight="fill" style={{ width: 16, height: 16, color: Y }} /> : <BookmarkSimple style={{ width: 16, height: 16 }} />, fn: onBookmark, label: bmked ? 'Remove bookmark' : 'Bookmark' },
            { icon: <ShareNetwork style={{ width: 16, height: 16 }} />, fn: onShare, label: 'Share' },
          ].map(({ icon, fn, label }) => (
            <button key={label} type="button" onClick={fn} aria-label={label}
              style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
              {icon}
            </button>
          ))}
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
  onPlay:       (e: React.MouseEvent) => void;
  onBookmark:   (e: React.MouseEvent) => void;
  onDownload:   (e: React.MouseEvent) => void;
  isBookmarked: boolean;
  wide?:        boolean;   /* spans 2 cols in the editorial grid */
  cardRef?:     (el: HTMLElement | null) => void;
}

const StoryCard = ({ story, index, isPlaying, isActive, onPlay, onBookmark, onDownload, isBookmarked: bmked, wide, cardRef }: StoryCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.article
      ref={cardRef as React.RefObject<HTMLElement>}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ ...spring, delay: (index % 4) * 0.05 }}
      data-testid="story-card"
      style={{
        background: SF,
        border: `1px solid ${isActive ? 'rgba(249,96,21,0.35)' : 'var(--color-border)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        transition: 'border-color 150ms',
        gridColumn: wide ? 'span 2' : 'span 1',
      }}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return;
        navigate(`/news/${story.id}`, { state: { story } });
      }}
      whileHover={{ y: -2 }}
    >
      {/* Thumbnail */}
      {story.image_url && (
        <div style={{ position: 'relative', flexShrink: 0, ...(wide ? { width: 180, height: '100%', minHeight: 120 } : { height: 110 }) }}>
          <ResponsiveImage
            alt={story.title ?? ''}
            src={story.image_url}
            sizes={THUMB_SIZES}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Waveform playing indicator overlay */}
          {isActive && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(249,96,21,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
                {[10, 16, 12, 18, 10].map((h, i) => (
                  <div key={i} className="wave-bar" style={{ width: 3, height: h, background: '#fff', borderRadius: 2, transformOrigin: 'bottom' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
        {/* Top row: category + truth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: G, background: 'rgba(24,84,42,0.08)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {catEmoji(story.category)} {story.category ?? 'General'}
          </span>
          <TruthPill score={story.certainty_score} />
          {story.multi_source && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CC, letterSpacing: '0.06em' }}>✦</span>
          )}
        </div>

        {/* Headline */}
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: wide ? 17 : 15, color: G, lineHeight: 1.2, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: wide ? 3 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
          {story.title}
        </h3>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
          {/* Play btn */}
          <button
            type="button"
            onClick={onPlay}
            aria-label={isPlaying ? 'Pause' : 'Oya, Play'}
            style={{ width: 40, height: 40, borderRadius: 9999, background: CC, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {isPlaying
              ? <Pause weight="fill" style={{ width: 15, height: 15, color: '#fff' }} />
              : <Play  weight="fill" style={{ width: 15, height: 15, color: '#fff', marginLeft: 1 }} />
            }
          </button>

          {/* Source + time */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-meta)', letterSpacing: '0.04em' }} className="line-clamp-1">
              {story.source} · {timeAgo(story.published ?? story.published_at)}
            </p>
          </div>

          {/* Bookmark + download */}
          <button type="button" onClick={onDownload} aria-label="Save offline"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(24,84,42,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-mid)' }}>
            <CloudArrowDown style={{ width: 15, height: 15 }} />
          </button>
          <button type="button" onClick={onBookmark} aria-label={bmked ? 'Remove bookmark' : 'Bookmark'}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(24,84,42,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: bmked ? CC : 'var(--color-text-mid)' }}>
            {bmked
              ? <Bookmark weight="fill" style={{ width: 15, height: 15 }} />
              : <BookmarkSimple style={{ width: 15, height: 15 }} />
            }
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
  const { playTrack, addToQueue, voiceModel, broadcastLanguage, currentTrack, isPlaying } = useAudio();
  const { isBookmarked, addBookmark, removeBookmark, bookmarks } = useBookmarks();
  const { showAlert } = useHapticAlert();
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
    useCallback(() => mutate(), [mutate]),
    { threshold: 70, disabled: !gesturalSwipe }
  );

  /* ── New stories banner ── */
  const currentIds = useMemo(() => news.map(n => n.id), [news]);
  const { newCount, applyRefresh, clearNew } = useNewsRefresh({
    currentIds,
    onRefresh: useCallback(() => mutate(), [mutate]),
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

  useEffect(() => {
    if (!bookmarks.length || !voiceModel || !broadcastLanguage) return;
    const ctrl = new AbortController();
    prefetchBookmarkedStories(
      bookmarks.slice(0, 10).map(b => ({ id: b.story_id, title: b.title, summary: b.summary, source: b.source })),
      voiceModel, broadcastLanguage, ctrl.signal
    ).catch(err => logger.debug('[DashboardPage] Bookmark prefetch failed', err));
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks.length, voiceModel, broadcastLanguage]);

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
  const handlePlay = useCallback(async (e: React.MouseEvent, story: Story) => {
    e.stopPropagation();
    if (currentTrack?.id === story.id && isPlaying) return;
    await playTrack({ id: story.id, title: story.title ?? '', source: 'FEED' }, true);
  }, [playTrack, currentTrack, isPlaying]);

  const handleBookmark = useCallback((e: React.MouseEvent, story: Story) => {
    e.stopPropagation();
    if (isBookmarked(story.id)) {
      removeBookmark(story.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(story);
      prefetchAndCacheStory(story, voiceModel, broadcastLanguage).catch(err => logger.debug('[DashboardPage] Prefetch failed', err));
      showAlert('BOOKMARK_ADDED');
    }
  }, [isBookmarked, addBookmark, removeBookmark, showAlert, voiceModel, broadcastLanguage]);

  const handleDownload = useCallback(async (e: React.MouseEvent, story: Story) => {
    e.stopPropagation();
    const ok = await saveForOffline(story, user?.id);
    if (ok) {
      prefetchAndCacheStory(story, voiceModel, broadcastLanguage).catch(err => logger.debug('[DashboardPage] Prefetch offline failed', err));
      showAlert({ type: 'success', title: 'SAVED_OFFLINE', message: `"${story.title?.slice(0, 30)}…" saved for offline.`, code: 'OFFLINE_OK' });
    } else {
      showAlert({ type: 'warning', title: 'SAVE_FAILED', message: 'Could not save for offline.', code: 'OFFLINE_ERR' });
    }
  }, [user?.id, voiceModel, broadcastLanguage, showAlert]);

  const handleShare = useCallback(async (e: React.MouseEvent, story: Story) => {
    e.stopPropagation();
    const url = `${window.location.origin}/news/${story.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: story.title, url }); }
      catch { /* user cancelled or unsupported */ }
    } else {
      await navigator.clipboard.writeText(url);
      showAlert({ type: 'sync', title: 'LINK_COPIED', message: 'Link copied.', code: 'CLIP_OK' });
    }
  }, [showAlert]);

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

      {/* ════════════════════════════ MAIN COLUMN ════════════════════════════ */}
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
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 3 }}>
                {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: G, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                {greeting}, {name}.
              </h1>
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
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            overflowX: 'auto', flexShrink: 0,
            background: BG,
            borderBottom: '1px solid var(--color-border)',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* For You */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedCat === null}
            onClick={() => setSelectedCat(null)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
              padding: '6px 14px', borderRadius: 9999,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: selectedCat === null ? G : 'rgba(24,84,42,0.08)',
              color: selectedCat === null ? Y : G,
              flexShrink: 0,
              transition: 'all 150ms',
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
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: selectedCat === cat ? 700 : 500,
                padding: '6px 14px', borderRadius: 9999,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: selectedCat === cat ? G : 'rgba(24,84,42,0.08)',
                color: selectedCat === cat ? Y : G,
                flexShrink: 0,
                transition: 'all 150ms',
              }}
            >
              {catEmoji(cat)} {cat}
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
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ════ HERO CARD ════ */}
              {featured && (
                <HeroCard
                  story={featured}
                  isPlaying={currentTrack?.id === featured.id && isPlaying}
                  onPlay={e => handlePlay(e, featured)}
                  onBookmark={e => handleBookmark(e, featured)}
                  onDownload={e => handleDownload(e, featured)}
                  onShare={e => handleShare(e, featured)}
                  isBookmarked={isBookmarked(featured.id)}
                  cardRef={setCardRef(0)}
                />
              )}

              {/* ════ EDITORIAL GRID ════
                  Asymmetric: every 3rd card is wide (spans 2 cols).
                  Gives the grid editorial rhythm instead of uniform tiles.
              ════════════════════════ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
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
                      onPlay={e => handlePlay(e, story)}
                      onBookmark={e => handleBookmark(e, story)}
                      onDownload={e => handleDownload(e, story)}
                      isBookmarked={isBookmarked(story.id)}
                      wide={isWide}
                      cardRef={setCardRef(i + 1)}
                    />
                  );
                })}
              </div>

              {/* ════ RECOMMENDATIONS STRIP ════ */}
              {recommendations.length > 0 && !selectedCat && (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Sparkle weight="fill" style={{ width: 14, height: 14, color: CC }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      For You
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {recommendations.map(story => (
                      <button
                        key={story.id}
                        type="button"
                        onClick={() => navigate(`/news/${story.id}`, { state: { story } })}
                        style={{ flexShrink: 0, width: 200, background: SF, border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px', textAlign: 'left', cursor: 'pointer' }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: G, background: 'rgba(24,84,42,0.08)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-block', marginBottom: 8 }}>
                          {story.category ?? 'General'}
                        </span>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: G, lineHeight: 1.25, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
    </div>
  );
};

export default DashboardPage;
