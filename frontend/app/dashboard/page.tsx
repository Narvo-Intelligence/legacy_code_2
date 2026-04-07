'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { TrendingUp, Radio, Play, ChevronRight, Zap, Volume2, Rss, Hash, Loader2 } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { ErrorState } from '@/components/ErrorState';
import { StatusPill } from '@/components/StatusPill';
import {
  DashboardFeedToolbar,
  type DashboardFeedFilter as FeedFilter,
  type DashboardSortOrder as SortOrder,
} from '@/components/DashboardFeedToolbar';
import { StoryCardLarge } from '@/components/StoryCardLarge';
import { getAuthSession } from '@/lib/narvo-session';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import {
  COPY,
  homeGreeting,
  homeBriefingMeta,
} from '@/lib/narvo-app-copy';
import {
  BRIEFING_PLACEHOLDER_STORY_MID,
  briefingMinutesFromEstimate,
} from '@/lib/briefing-defaults';
import { FeedSkeleton } from '@/components/Skeleton';
import {
  fetchNewsList,
  fetchBreakingNews,
  fetchNewsFeedSources,
  briefingPlayerTrackId,
  type ApiNewsListItem,
  type ApiFeedSourceRow,
} from '@/lib/narvo-api';
import { hasMeAuth, fetchMyRecommendations } from '@/lib/me-api';
import { NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';
import { NotificationPromptBanner } from '@/components/NotificationPromptBanner';
import { useToast } from '@/components/Toast';
import { DashboardLiveClock } from '@/components/DashboardLiveClock';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };
const TRENDING_SLOTS = 4;
const FEED_INITIAL_LIMIT = 24;
const FEED_PAGE = 12;

function sourceActivityDotClass(storyCount: number): string {
  if (storyCount >= 15) return 'bg-narvo-mint';
  if (storyCount >= 5) return 'bg-narvo-butter';
  return 'bg-narvo-ink/30 dark:bg-white/30';
}

export default function DashboardPage() {
  const authBridge = useNarvoAuthBridge();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { briefing, error: briefingLoadError, loading: briefingLoading } = useLatestBriefing();
  const { error: toastError } = useToast();
  const [greeting, setGreeting] = useState<string>(() => homeGreeting(null));
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [feedPool, setFeedPool] = useState<ApiNewsListItem[]>([]);
  const [breakingPool, setBreakingPool] = useState<ApiNewsListItem[]>([]);
  const [feedSources, setFeedSources] = useState<ApiFeedSourceRow[]>([]);
  const [personalizedRecs, setPersonalizedRecs] = useState<ApiNewsListItem[]>([]);
  const [personalizedLoading, setPersonalizedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const latestSentinelRef = useRef<HTMLDivElement | null>(null);
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;
  /** Refs keep infinite-scroll guards current without recreating IntersectionObserver every load (which re-fires on observe() and spams fetch + flickers the footer). */
  const feedFilterRef = useRef(feedFilter);
  feedFilterRef.current = feedFilter;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const feedLoadingRef = useRef(feedLoading);
  feedLoadingRef.current = feedLoading;
  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;
  const feedPoolLenRef = useRef(0);
  feedPoolLenRef.current = feedPool.length;

  const briefingHeroTitle = briefing?.title?.trim() || COPY.briefing_ready;

  const briefingSubline = useMemo(() => {
    if (briefingLoading) return COPY.home_briefing_syncing;
    if (briefingLoadError && !briefing) return COPY.home_briefing_unavailable;
    if (!briefing && !briefingLoading) return COPY.home_briefing_awaiting;
    if (!briefing) return COPY.home_briefing_syncing;
    const storyCount =
      briefing.stories?.length && briefing.stories.length > 0
        ? briefing.stories.length
        : BRIEFING_PLACEHOLDER_STORY_MID;
    const minutes = briefingMinutesFromEstimate(briefing.duration_estimate);
    return homeBriefingMeta(storyCount, minutes);
  }, [briefing, briefingLoadError, briefingLoading]);

  useEffect(() => {
    const session = getAuthSession();
    setGreeting(homeGreeting(session?.name));
  }, []);

  const loadPersonalized = useCallback(() => {
    if (!hasMeAuth()) {
      setPersonalizedRecs([]);
      setPersonalizedLoading(false);
      return;
    }
    setPersonalizedLoading(true);
    void fetchMyRecommendations(24)
      .then((rows) => setPersonalizedRecs(Array.isArray(rows) ? rows : []))
      .catch(() => setPersonalizedRecs([]))
      .finally(() => setPersonalizedLoading(false));
  }, []);

  useUserTableRealtime('user_preferences', () => void loadPersonalized(), hasMeAuth());

  useEffect(() => {
    loadPersonalized();
    if (typeof window === 'undefined') return;
    const onAuth = () => loadPersonalized();
    window.addEventListener('narvo-auth-changed', onAuth);
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onAuth);
    return () => {
      window.removeEventListener('narvo-auth-changed', onAuth);
      window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onAuth);
    };
  }, [loadPersonalized]);

  const loadFeed = useCallback(() => {
    setFeedLoading(true);
    setHasMore(true);
    void Promise.all([
      fetchNewsList({ limit: FEED_INITIAL_LIMIT, includeAggregators: true }),
      fetchBreakingNews(),
      fetchNewsFeedSources(10),
    ])
      .then(([n, b, sources]) => {
        const list = Array.isArray(n) ? n : [];
        setFeedPool(list);
        setBreakingPool(Array.isArray(b) ? b : []);
        setFeedSources(Array.isArray(sources) ? sources : []);
        setFeedError(null);
        setHasMore(list.length >= FEED_INITIAL_LIMIT);
      })
      .catch((e: unknown) => {
        setFeedPool([]);
        setBreakingPool([]);
        setFeedSources([]);
        setFeedError(e instanceof Error ? e.message : COPY.dashboard_feed_load_failed);
        setHasMore(false);
      })
      .finally(() => setFeedLoading(false));
  }, []);

  const loadMoreLatest = useCallback(async () => {
    if (
      feedFilterRef.current !== 'all' ||
      loadingMoreRef.current ||
      !hasMoreRef.current ||
      feedLoadingRef.current
    ) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const skip = feedPoolLenRef.current;
    try {
      const batch = await fetchNewsList({
        limit: FEED_PAGE,
        skip,
        includeAggregators: true,
      });
      const arr = Array.isArray(batch) ? batch : [];
      let appendedCount = 0;
      setFeedPool((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const add = arr.filter((x) => x.id && !seen.has(x.id));
        appendedCount = add.length;
        return [...prev, ...add];
      });
      // Short page = end of feed. Full page but 0 new rows = stuck offset / duplicate slice — stop to avoid infinite fetch.
      if (arr.length < FEED_PAGE || appendedCount === 0) setHasMore(false);
    } catch {
      toastErrorRef.current(COPY.toast_load_more_failed);
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (feedFilter !== 'all' || !hasMore || feedLoading || loadingMore) return;
    const el = latestSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreLatest();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [feedFilter, hasMore, feedLoading, loadingMore, loadMoreLatest]);

  const poolForDisplay =
    feedFilter === 'picked' && hasMeAuth() ? personalizedRecs : feedPool;

  const displayPool = useMemo(() => {
    let list = [...poolForDisplay];
    if (categoryFilter) {
      const c = categoryFilter.toLowerCase();
      list = list.filter((x) => (x.category || '').toLowerCase() === c);
    }
    if (sortOrder === 'oldest') {
      list.sort((a, b) => String(a.published || '').localeCompare(String(b.published || '')));
    } else if (sortOrder === 'source') {
      list.sort((a, b) =>
        (a.source || '').localeCompare(b.source || '', undefined, { sensitivity: 'base' })
      );
    } else {
      list.sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    }
    return list;
  }, [poolForDisplay, sortOrder, categoryFilter]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    poolForDisplay.forEach((x) => {
      const c = (x.category || '').trim();
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [poolForDisplay]);

  const pickedFeedLoading = feedFilter === 'picked' && hasMeAuth() && personalizedLoading;

  const upNextItems = useMemo(() => {
    if (hasMeAuth() && personalizedRecs.length > 0) return personalizedRecs.slice(0, 3);
    return feedPool.slice(0, 3);
  }, [personalizedRecs, feedPool]);

  const handlePlayBriefing = () => {
    if (!briefing?.audio_url?.trim()) return;
    const id = briefingPlayerTrackId(briefing);
    if (currentTrack?.id === id && isPlaying) {
      togglePlayPause();
      return;
    }
    playTrack({
      id,
      title: briefing.title || COPY.briefing_title,
      source: COPY.brand_name,
      category: 'BRIEFING',
      audioUrl: briefing.audio_url,
    });
  };

  const showBreakingStrip = feedFilter === 'all' || feedFilter === 'breaking';

  const { trendingItems, latestItems, breakingLead } = useMemo(() => {
    if (feedFilter === 'breaking') {
      const t = breakingPool.length > 0 ? breakingPool : displayPool.slice(0, 6);
      return {
        trendingItems: t.slice(0, 6),
        latestItems: [] as ApiNewsListItem[],
        breakingLead: t[0],
      };
    }
    return {
      trendingItems: displayPool.slice(0, TRENDING_SLOTS),
      latestItems: displayPool.slice(TRENDING_SLOTS),
      breakingLead: breakingPool[0],
    };
  }, [displayPool, breakingPool, feedFilter]);

  const feedToolbar = (
    <DashboardFeedToolbar
      feedFilter={feedFilter}
      onFeedFilterChange={setFeedFilter}
      sortOrder={sortOrder}
      onSortOrderChange={setSortOrder}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      categoryOptions={categoryOptions}
    />
  );

  const stickyToolbarClass =
    'sticky top-0 z-[28] py-2.5 sm:py-3 mb-3 sm:mb-4 bg-[var(--bg-primary)]/[0.98] backdrop-blur-xl border-b border-narvo-ink/10 dark:border-white/10 shadow-[0_8px_28px_-10px_rgba(23,50,74,0.14)] dark:shadow-black/25 supports-[backdrop-filter]:bg-[var(--bg-primary)]/90';

  const briefingPlayDisabled = briefingLoading || !briefing?.audio_url?.trim();

  const breakingBlock =
    showBreakingStrip && breakingLead?.id ? (
      <Link
        href={`/news/${breakingLead.id}`}
        className="flex items-center gap-3 sm:gap-4 rounded-[20px] lg:rounded-[24px] border border-narvo-vermilion/30 bg-gradient-to-r from-narvo-vermilion/10 to-transparent dark:from-narvo-vermilion/20 px-3.5 py-3.5 sm:px-5 sm:py-4 text-left transition-all hover:border-narvo-vermilion/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-vermilion/35"
      >
        <span className="flex h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25">
          <Zap size={20} className="sm:w-[22px] sm:h-[22px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <StatusPill variant="breaking" className="mb-1.5">
            {COPY.home_breaking}
          </StatusPill>
          <p className="text-[13px] sm:text-sm lg:text-base font-semibold text-narvo-ink dark:text-white leading-snug line-clamp-2 lg:line-clamp-none">
            {breakingLead.title || 'Breaking — tap for the full gist'}
          </p>
        </div>
        <ChevronRight className="shrink-0 text-narvo-ink/35 dark:text-white/35" size={20} aria-hidden />
      </Link>
    ) : null;

  const showPickedCloudGate =
    !feedLoading &&
    !feedError &&
    feedFilter === 'picked' &&
    authBridge.hydrated &&
    !authBridge.hasApiToken;
  const showPickedEmpty =
    !feedLoading &&
    !feedError &&
    !pickedFeedLoading &&
    feedFilter === 'picked' &&
    hasMeAuth() &&
    displayPool.length === 0;

  const feedMain = (
    <>
      {feedLoading ? (
        <FeedSkeleton count={3} />
      ) : feedError ? (
        <ErrorState message={feedError} onRetry={loadFeed} />
      ) : null}

      {showPickedCloudGate ? (
        <div className="rounded-[24px] border border-narvo-teal/20 bg-narvo-teal/5 dark:bg-narvo-teal/10 px-5 py-6 text-center space-y-4 mb-8 w-full max-w-xl mx-auto sm:px-6">
          <p className="text-[15px] text-narvo-ink/75 dark:text-white/70 leading-relaxed">
            {authBridge.hasSession ? COPY.dashboard_picked_cloud_paused : COPY.dashboard_picked_sign_in}
          </p>
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-narvo-vermilion px-8 text-sm font-bold text-white shadow-md shadow-narvo-vermilion/20 touch-manipulation"
          >
            {authBridge.hasSession ? COPY.auth_renew_session_cta : COPY.dashboard_picked_sign_in_cta}
          </Link>
        </div>
      ) : null}

      {!feedLoading && !feedError && pickedFeedLoading ? <FeedSkeleton count={3} /> : null}

      {showPickedEmpty ? (
        <p className="text-center py-12 text-narvo-ink/55 dark:text-white/50 font-medium px-4">
          {COPY.dashboard_picked_empty}
        </p>
      ) : null}

      {!feedLoading &&
        !feedError &&
        !pickedFeedLoading &&
        !showPickedCloudGate &&
        !showPickedEmpty &&
        trendingItems.length > 0 && (
        <section
          className="mb-8 lg:mb-10 rounded-[24px] lg:rounded-[28px] border-2 border-narvo-ink/10 dark:border-white/10 bg-[var(--bg-card)]/40 p-3 sm:p-5 lg:p-6 shadow-sm"
          aria-labelledby="trending-heading"
        >
          <div className="flex items-center justify-between mb-4 lg:mb-6 gap-3">
            <h2
              id="trending-heading"
              className="text-lg sm:text-xl lg:text-2xl font-serif font-bold text-narvo-ink dark:text-white flex items-center gap-2 sm:gap-3 min-w-0"
            >
              <TrendingUp size={22} className="text-narvo-vermilion shrink-0 lg:w-7 lg:h-7" aria-hidden />
              <span className="truncate">{COPY.home_trending}</span>
            </h2>
            <Link
              href="/discover"
              className="text-xs sm:text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline shrink-0"
            >
              {COPY.home_nav_see_all}
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6 xl:gap-8 lg:items-stretch">
            {trendingItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: index * 0.05 }}
                className="min-w-0 h-full w-full flex"
              >
                <StoryCardLarge
                  item={item}
                  feedVariant="trending"
                  featured={index === 0 && feedFilter !== 'breaking'}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {!feedLoading &&
        !feedError &&
        !pickedFeedLoading &&
        !showPickedCloudGate &&
        !showPickedEmpty &&
        latestItems.length > 0 && (
        <section
          className="rounded-[24px] lg:rounded-[28px] border-2 border-dashed border-narvo-ink/12 dark:border-white/12 bg-narvo-mist/20 dark:bg-white/[0.02] p-3 sm:p-5 lg:p-6"
          aria-labelledby="latest-heading"
        >
          <div className="flex items-center justify-between mb-4 lg:mb-6 gap-3">
            <h2
              id="latest-heading"
              className="text-lg sm:text-xl lg:text-2xl font-serif font-bold text-narvo-ink dark:text-white flex items-center gap-2 sm:gap-3"
            >
              <Radio size={22} className="text-narvo-teal shrink-0 lg:w-7 lg:h-7" aria-hidden />
              {COPY.home_latest}
            </h2>
          </div>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6 xl:gap-8 lg:items-stretch">
            {latestItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 + index * 0.05 }}
                className="min-w-0 h-full w-full flex"
              >
                <StoryCardLarge item={item} feedVariant="latest" />
              </motion.div>
            ))}
          </div>
          {feedFilter === 'all' ? (
            <div ref={latestSentinelRef} className="flex flex-col items-center justify-center gap-2 pt-6 pb-2 min-h-[48px]">
              {loadingMore ? (
                <p className="flex items-center gap-2 text-sm font-medium text-narvo-ink/50 dark:text-white/45">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  {COPY.feed_loading_more}
                </p>
              ) : !hasMore && latestItems.length > 0 ? (
                <p className="text-center text-xs font-mono text-narvo-ink/40 dark:text-white/35">{COPY.feed_end_of_list}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      {!feedLoading &&
        !feedError &&
        !pickedFeedLoading &&
        !showPickedCloudGate &&
        !showPickedEmpty &&
        trendingItems.length === 0 &&
        latestItems.length === 0 && (
        <p className="text-center py-16 text-narvo-ink/45 dark:text-white/45 font-medium">{COPY.home_empty}</p>
      )}
    </>
  );

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.dashboard_page_title,
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="max-w-[1680px] mx-auto w-full">
        <div className="px-4 pt-4 lg:px-8 xl:px-10 lg:pt-6">
          <NotificationPromptBanner />
        </div>
        {/* ——— Mobile: sticky toolbar (feed + clock + breaking) ——— */}
        <div className="lg:hidden px-4 pt-0 pb-2">
          <div className={`${stickyToolbarClass} flex flex-col gap-2.5`}>
            {feedToolbar}
            <DashboardLiveClock variant="compact" />
            {breakingBlock}
          </div>

          <div className="pt-3 pb-2">
          <div className="pt-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal/80 dark:text-narvo-mint/80">
              Today
            </p>
            <h2 className="font-serif text-[1.35rem] font-semibold text-narvo-ink dark:text-white leading-tight mt-1">
              {greeting}
            </h2>
            <p className="text-sm text-narvo-ink/50 dark:text-white/45 mt-2 leading-snug">
              <span className="font-medium text-narvo-ink dark:text-white/85">{briefingHeroTitle}</span>
              <span className="mx-1.5 text-narvo-ink/25 dark:text-white/25">·</span>
              <span>{briefingSubline}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handlePlayBriefing}
                disabled={briefingPlayDisabled}
                className="flex-1 min-h-[48px] rounded-full bg-narvo-vermilion text-sm font-bold text-white shadow-lg shadow-narvo-vermilion/20 disabled:opacity-45 disabled:pointer-events-none"
              >
                {COPY.cta_play}
              </button>
              <Link
                href="/briefing"
                className="flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full border-2 border-narvo-ink/12 dark:border-white/15 text-sm font-bold text-narvo-ink dark:text-white"
              >
                {COPY.briefing_open_full}
              </Link>
            </div>
          </div>
        </div>
        </div>

        {/* Main feed column: mobile continues below thumb-first strip; desktop adds filters/breaking here (single DOM = no duplicate section ids). */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(340px,30vw)] xl:grid-cols-[minmax(0,1fr)_min(400px,28vw)] lg:gap-8 xl:gap-12 lg:px-8 xl:px-10 lg:py-10 items-start">
          <div className="min-w-0 space-y-6 lg:space-y-8 px-4 lg:px-0 pb-8 lg:pb-10 pt-2 lg:pt-0">
            <div className={`hidden lg:block ${stickyToolbarClass} space-y-3`}>
              {feedToolbar}
              {breakingBlock}
            </div>
            {feedMain}
          </div>

          <aside className="hidden lg:flex flex-col gap-6 lg:sticky lg:top-0 self-start order-2">
            <DashboardLiveClock />

            {/* Greeting + briefing CTA */}
            <div className="rounded-[28px] border border-narvo-ink/8 dark:border-white/10 bg-narvo-mist/25 dark:bg-white/[0.04] p-6 xl:p-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint">
                {COPY.brand_subtitle}
              </p>
              <h2 className="mt-3 font-serif text-3xl xl:text-[2.125rem] font-semibold tracking-tight text-narvo-ink dark:text-white leading-[1.15]">
                {greeting}
              </h2>
              <p className="mt-4 text-base text-narvo-ink/55 dark:text-white/50 leading-relaxed">
                <span className="font-medium text-narvo-ink dark:text-white/88">{briefingHeroTitle}</span>
                <span className="mx-2 text-narvo-ink/25 dark:text-white/20">·</span>
                <span>{briefingSubline}</span>
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handlePlayBriefing}
                  disabled={briefingPlayDisabled}
                  className="inline-flex w-full items-center justify-center gap-2 min-h-[56px] rounded-full bg-narvo-vermilion text-[15px] font-bold text-white shadow-xl shadow-narvo-vermilion/25 hover:bg-[#e0441f] transition-colors disabled:opacity-45 disabled:pointer-events-none"
                >
                  <Play size={22} fill="currentColor" aria-hidden />
                  {COPY.cta_play}
                </button>
                <Link
                  href="/briefing"
                  className="inline-flex w-full items-center justify-center min-h-[52px] rounded-full font-bold border-2 border-narvo-ink/12 dark:border-white/15 text-narvo-ink dark:text-white hover:bg-narvo-ink/[0.04] dark:hover:bg-white/[0.06] transition-colors text-[15px]"
                >
                  {COPY.briefing_open_full}
                </Link>
              </div>
            </div>

            {/* Sources live */}
            <div className="rounded-[24px] border border-narvo-ink/8 dark:border-white/10 bg-narvo-cloud/90 dark:bg-narvo-ink/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Rss size={14} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint">
                  {COPY.dashboard_sources_live_title}
                </p>
              </div>
              <div className="space-y-2">
                {feedSources.length === 0 ? (
                  <p className="text-xs text-narvo-ink/50 dark:text-white/40 leading-snug">{COPY.dashboard_sources_empty}</p>
                ) : (
                  feedSources.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${sourceActivityDotClass(s.story_count)}`}
                          aria-hidden
                        />
                        <span className="text-sm text-narvo-ink/80 dark:text-white/75 truncate">{s.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-narvo-ink/40 dark:text-white/35 shrink-0">
                        {COPY.dashboard_feed_sources_count.replace('{n}', String(s.story_count))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trending tags */}
            <div className="rounded-[24px] border border-narvo-ink/8 dark:border-white/10 bg-narvo-cloud/90 dark:bg-narvo-ink/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Hash size={14} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint">
                  {COPY.dashboard_trending_title}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(trendingItems.slice(0, 5).map((i) => i.category).filter(Boolean) as string[])
                  .filter((c, idx, arr) => arr.indexOf(c) === idx)
                  .map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-narvo-teal/8 dark:bg-narvo-teal/15 border border-narvo-teal/15 dark:border-narvo-teal/25 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-narvo-teal dark:text-narvo-mint"
                    >
                      {cat}
                    </span>
                  ))}
                {breakingPool.slice(0, 1).map((i) => i.id ? (
                  <span
                    key="breaking-tag"
                    className="rounded-full bg-narvo-vermilion/10 border border-narvo-vermilion/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-narvo-vermilion"
                  >
                    Breaking
                  </span>
                ) : null)}
              </div>
            </div>

            {/* Recommended next */}
            <div className="rounded-[24px] border border-narvo-ink/8 dark:border-white/10 bg-narvo-cloud/90 dark:bg-narvo-ink/40 p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint mb-3">
                {COPY.dashboard_recommended_title}
              </p>
              <div className="space-y-3">
                {upNextItems.length === 0 ? (
                  <p className="text-xs text-narvo-ink/50 dark:text-white/40">{COPY.dashboard_up_next_empty}</p>
                ) : (
                  upNextItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/news/${item.id}`}
                      className="flex items-center justify-between gap-3 group"
                    >
                      <p className="text-sm text-narvo-ink/75 dark:text-white/65 line-clamp-1 group-hover:text-narvo-teal dark:group-hover:text-narvo-mint transition-colors flex-1 min-w-0">
                        {item.title}
                      </p>
                      <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/30 shrink-0">
                        {item.category ? item.category.slice(0, 8) : '—'}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
