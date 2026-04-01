/**
 * DashboardPage.tsx — Narvo Design System v5.1
 * ───────────────────────────────────────────
 * Modular, grid-based dashboard following the "Emotional Route".
 * 
 * Finalized v5.1 Specs:
 * - Headlines: Newsreader (font-display)
 * - UI/Body: Instrument Sans (font-body)
 * - Metadata: Geist Mono (font-mono)
 * - Base: Petrol Teal (var(--color-primary-deep))
 * - Accent: Signal Vermilion (var(--color-alert))
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { ArrowClockwise, Lightning, GlobeHemisphereEast, Sparkle, X } from '@phosphor-icons/react';

import { useAudio }           from '../contexts/AudioContext';
import {
  useAudioPrefetch,
  useObservedAudioPrefetch,
} from '../hooks/useAudioPrefetch';
import usePullToRefresh        from '../hooks/usePullToRefresh';
import { useNewsRefresh }      from '../hooks/useNewsRefresh';

import { StoryCardLarge }      from '../components/StoryCardLarge';
import { StoryCardCompact }    from '../components/StoryCardCompact';
import { FilterPill }          from '../components/primitives/Pills';

import { NARVO_SETTINGS_UPDATED }  from '../lib/accessibilityApply';
import { useAuth }             from '../contexts/AuthContext';
import * as api                from '../lib/api';
import logger                  from '../lib/logger';
import { readJson, writeJson } from '../lib/storage';
import useSWR from 'swr';
import { asArray, asRecord, isStory } from '../lib/validators';
import type { Story } from '../types/story';

/* ─────────────────────────── Skeletons ─────────────────────────── */

const FeedSkeleton = () => (
  <div className="flex flex-col gap-8 animate-in fade-in duration-700">
    <div className="h-[420px] bg-narvo-mist rounded-[var(--card-radius-lg)] animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-64 bg-narvo-mist rounded-[var(--card-radius-md)] animate-pulse" />
      ))}
    </div>
  </div>
);

/* ─────────────────────────── Main Page ─────────────────────────── */

const DashboardPage = () => {
  const { playTrack, voiceModel, broadcastLanguage, currentTrack, isPlaying } = useAudio();
  const { user } = useAuth();
  const { t } = useTranslation();

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

  const categories = [
    { id: 'trending', label: t('home.trending') },
    { id: 'latest',   label: t('home.latest') },
    { id: 'world',    label: t('categories.world') },
    { id: 'tech',     label: t('categories.tech') },
    { id: 'business', label: t('categories.business') },
    { id: 'sports',   label: t('categories.sports') },
    { id: 'entertainment', label: t('categories.entertainment') },
  ];

  const newsList = useMemo(() =>
    (selectedCat ? news.filter(s => s.category?.toLowerCase() === selectedCat.toLowerCase()) : news),
  [news, selectedCat]);

  const featured = selectedCat ? newsList[0] : news[0];
  const stream = (selectedCat ? newsList : newsList.slice(1)).slice(0, visibleCount);

  /* ── Observer-based prefetch ── */
  const prefetchPool = useMemo(() => {
    const pool: Story[] = [];
    if (featured) pool.push(featured);
    pool.push(...stream);
    return pool;
  }, [featured, stream]);
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.first_name || user?.user_metadata?.display_name || '';
    const key = hour < 12 ? 'home.greeting_morning' : hour < 17 ? 'home.greeting_afternoon' : 'home.greeting_evening';
    if (!name) return t(key + '_generic');
    return t(key, { name });
  }, [user, t]);

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden bg-bg" data-testid="dashboard-page">
      <Helmet>
        <title>{t('home.meta_title')}</title>
        <meta name="description" content={t('home.meta_description')} />
      </Helmet>

      {/* ════════════════════════════ DASHBOARD CONTENT ════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0 overflow-hidden">
        
        {/* ════════════════════════════ MAIN FEED COLUMN ════════════════════════════ */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          
          {/* ── HEADER ── */}
          <header className="px-6 pt-6 pb-4 border-b border-border-subtle bg-narvo-cloud shrink-0">
            <div className="flex items-start justify-between gap-4 max-w-4xl">
              <div className="animate-in slide-in-from-top-4 duration-700">
                <p className="font-mono text-[11px] font-bold text-content-dim tracking-[0.2em] uppercase mb-2 opacity-80">
                  {new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                </p>
                <h1 className="font-display font-extrabold text-3xl lg:text-5xl text-content tracking-tight leading-none mb-3">
                  {greeting}.
                </h1>
                <p className="hidden lg:flex items-center gap-2 font-body text-xs text-content-dim font-medium opacity-70">
                  {t('home.featured_briefing')} <span className="w-1 h-1 rounded-full bg-border-subtle" /> <span className="text-narvo-vermilion font-bold tracking-widest uppercase text-[10px]">● {t('home.status_live')}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => mutate()}
                aria-label="Refresh feed"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-all duration-300"
              >
                <ArrowClockwise weight="bold" size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* New stories banner */}
            <AnimatePresence>
              {newCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  className="mt-6 max-w-lg"
                >
                  <div className="bg-narvo-ink rounded-[var(--card-radius-sm)] p-4 flex items-center justify-between gap-4 shadow-[var(--shadow-md)]">
                    <button 
                      type="button" 
                      onClick={applyRefresh}
                      className="flex items-center gap-3 text-narvo-butter font-body font-bold text-sm tracking-tight text-left"
                    >
                      <Lightning weight="fill" size={18} />
                      {t('home.new_stories_banner', { count: newCount })}
                    </button>
                    <button 
                      type="button" 
                      onClick={clearNew} 
                      aria-label="Dismiss"
                      className="text-white/40 hover:text-white transition-colors p-1"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* ── TOPIC FILTERS ── */}
          <nav 
            className="flex items-center gap-3 px-6 py-4 overflow-x-auto no-scrollbar shrink-0 bg-narvo-cloud border-b border-border-subtle h-[76px]"
            aria-label="Filter by topic"
          >
            <FilterPill
              active={selectedCat === null}
              onClick={() => setSelectedCat(null)}
              className="flex items-center gap-2"
            >
              <Sparkle weight="fill" size={14} className={selectedCat === null ? 'text-narvo-butter' : ''} />
              {t('home.category_foryou')}
            </FilterPill>

            {categories.map(cat => (
              <FilterPill
                key={cat.id}
                active={selectedCat === cat.id}
                onClick={() => setSelectedCat(prev => prev === cat.id ? null : cat.id)}
              >
                {cat.label}
              </FilterPill>
            ))}
          </nav>

          {/* ── SCROLLABLE FEED ── */}
          <div
            ref={containerRef as any}
            {...pullHandlers}
            className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-narvo-cloud"
            data-testid="news-feed"
          >
            {/* Pull to Refresh Indicator */}
            <AnimatePresence>
              {pulling && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: pullDistance, opacity: Math.min(pullDistance / 70, 1) }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-center overflow-hidden bg-primary/10 border-b border-primary/5"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full bg-primary ${refreshing ? 'animate-bounce' : ''}`} />
                    <p className="font-mono text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                      {refreshing ? t('status.syncing') : t('home.refreshing')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-6 py-8 max-w-5xl mx-auto lg:mx-0">
              {isLoading && news.length === 0 ? (
                <FeedSkeleton />
              ) : (
                <div className="flex flex-col gap-12">
                  {/* HERO SECTION */}
                  {featured && (
                    <StoryCardLarge
                      ref={setCardRef(0)}
                      id={featured.id}
                      category={featured.category ?? 'General'}
                      headline={featured.title ?? ''}
                      summary={featured.summary ?? ''}
                      source={featured.source ?? 'Narvo'}
                      timestamp={featured.published ?? ''}
                      imageUrl={featured.image_url ?? undefined}
                      onPlay={() => handlePlay(featured)}
                    />
                  )}

                  {/* STREAM GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {stream.map((story, i) => (
                      <StoryCardCompact
                        key={story.id}
                        ref={setCardRef(i + 1)}
                        id={story.id}
                        category={story.category ?? 'General'}
                        headline={story.title ?? ''}
                        summary={story.summary ?? ''}
                        source={story.source ?? 'Narvo'}
                        timestamp={story.published ?? ''}
                        imageUrl={story.image_url ?? undefined}
                        onPlay={() => handlePlay(story)}
                      />
                    ))}
                  </div>

                  {/* LOAD MORE ANCHOR */}
                  <div ref={loadMoreRef} className="pt-8">
                    {!allLoaded && (
                      <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-3 border-primary/10 border-t-primary rounded-full animate-spin" />
                        <p className="font-mono text-[10px] font-bold text-content-dim uppercase tracking-widest animate-pulse">
                          {t('status.syncing')}
                        </p>
                      </div>
                    )}
                    {allLoaded && newsList.length > 0 && (
                      <div className="text-center pt-16 pb-12 opacity-40">
                        <p className="font-mono text-[11px] text-content-dim uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                          <span className="w-12 h-px bg-border-subtle" />
                          {t('home.end_of_transmission')}
                          <span className="w-12 h-px bg-border-subtle" />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ════════════════════════════ DESKTOP SIDEBAR ════════════════════════════ */}
        <aside className="hidden lg:flex w-[340px] xl:w-[400px] border-l border-border-subtle bg-narvo-cloud flex-col shrink-0">
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-12">
            
            {/* DAILY BRIEF CARD */}
            <section className="p-6 rounded-[var(--card-radius-md)] bg-primary/10 border border-primary/5 space-y-4 hover:shadow-1 transition-all">
              <div className="flex items-center gap-2">
                <Sparkle weight="fill" className="w-4 h-4 text-narvo-vermilion" />
                <span className="font-mono text-[10px] font-bold text-primary tracking-widest uppercase">
                  {t('home.intelligence_brief')}
                </span>
              </div>
              <p className="font-display font-extrabold text-2xl text-content leading-[1.1] tracking-tight">
                {t('home.daily_brief_ready')}
              </p>
            </section>

            {/* LIVE PULSE SECTION */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono text-[11px] font-bold text-content-dim tracking-widest uppercase opacity-70">
                  {t('home.live_signals')}
                </h3>
                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-narvo-vermilion/10 text-narvo-vermilion text-[10px] font-bold font-mono tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-narvo-vermilion animate-pulse" />
                  {t('home.status_live')}
                </div>
              </div>
              
              <div className="space-y-2">
                {[
                  { name: 'Arise News', signal: '100%', code: 'AN' },
                  { name: 'BBC World', signal: '98%', code: 'BB' },
                  { name: 'Channels TV', signal: '94%', code: 'CH' }
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between p-4 rounded-[var(--card-radius-sm)] bg-surface border border-border-subtle hover:border-primary/20 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-md bg-narvo-mist flex items-center justify-center font-mono text-[11px] font-bold text-content-dim group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        {s.code}
                      </div>
                      <span className="font-body text-sm font-bold text-content">{s.name}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{s.signal}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* UPGRADE PROMO */}
            <section className="p-7 rounded-[var(--card-radius-md)] bg-narvo-ink text-white relative overflow-hidden group shadow-3 h-52 flex flex-col justify-end">
              <GlobeHemisphereEast className="absolute -top-6 -right-6 w-36 h-36 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000 ease-out" />
              <div className="relative space-y-4">
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                  {t('common.badge_pro')}
                </p>
                <h4 className="font-display font-extrabold text-2xl leading-tight tracking-tight">
                  {t('home.upgrade_cta_title')}
                </h4>
                <button className="w-max px-6 py-2.5 rounded-full bg-narvo-vermilion text-white text-[11px] font-bold font-mono uppercase tracking-[0.15em] hover:scale-105 active:scale-95 transition-all duration-300 shadow-md">
                  {t('common.action_subscribe')}
                </button>
              </div>
            </section>

          </div>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
