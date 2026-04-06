'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { TrendingUp, Radio, Play, ChevronRight, Zap, Volume2 } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { ErrorState } from '@/components/ErrorState';
import { FilterPillGroup } from '@/components/FilterPillGroup';
import { StatusPill } from '@/components/StatusPill';
import { StoryCardLarge } from '@/components/StoryCardLarge';
import { getAuthSession } from '@/lib/narvo-session';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import {
  COPY,
  homeGreeting,
  homeBriefingMeta,
} from '@/lib/narvo-app-copy';
import {
  fetchNewsList,
  fetchBreakingNews,
  briefingPlayerTrackId,
  type ApiNewsListItem,
} from '@/lib/narvo-api';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';

const BRIEFING_STORIES_FALLBACK = 8;
const BRIEFING_MINUTES_FALLBACK = 12;

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

type FeedFilter = 'all' | 'picked' | 'breaking';

const FILTER_ITEMS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'picked', label: COPY.home_recommended },
  { id: 'breaking', label: COPY.home_breaking },
];

export default function DashboardPage() {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { briefing, error: briefingLoadError, loading: briefingLoading } = useLatestBriefing();
  const [greeting, setGreeting] = useState<string>(() => homeGreeting(null));
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [news, setNews] = useState<ApiNewsListItem[]>([]);
  const [breakingPool, setBreakingPool] = useState<ApiNewsListItem[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);

  const briefingMinutesMeta = BRIEFING_MINUTES_FALLBACK;

  const briefingHeroTitle = briefing?.title?.trim() || COPY.briefing_ready;

  const briefingSubline = useMemo(() => {
    const storyCount =
      briefing?.stories?.length && briefing.stories.length > 0
        ? briefing.stories.length
        : BRIEFING_STORIES_FALLBACK;
    if (briefingLoading) return COPY.home_briefing_syncing;
    if (briefingLoadError && !briefing) return COPY.home_briefing_unavailable;
    if (!briefing && !briefingLoading) return COPY.home_briefing_awaiting;
    return homeBriefingMeta(storyCount, briefingMinutesMeta);
  }, [briefing, briefingLoadError, briefingLoading, briefingMinutesMeta]);

  useEffect(() => {
    const session = getAuthSession();
    setGreeting(homeGreeting(session?.name));
  }, []);

  const loadFeed = useCallback(() => {
    setFeedLoading(true);
    void Promise.all([fetchNewsList({ limit: 24 }), fetchBreakingNews()])
      .then(([n, b]) => {
        setNews(Array.isArray(n) ? n : []);
        setBreakingPool(Array.isArray(b) ? b : []);
        setFeedError(null);
      })
      .catch((e: unknown) => {
        setNews([]);
        setBreakingPool([]);
        setFeedError(e instanceof Error ? e.message : 'Could not load the feed.');
      })
      .finally(() => setFeedLoading(false));
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePlayBriefing = () => {
    if (!briefing) return;
    if (briefing.audio_url) {
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
      return;
    }
    if (currentTrack?.id === 'briefing-pending' && isPlaying) {
      togglePlayPause();
      return;
    }
    playTrack({
      id: 'briefing-pending',
      title: COPY.briefing_title,
      source: COPY.brand_name,
      category: 'BRIEFING',
    });
  };

  const showBreakingStrip = feedFilter === 'all' || feedFilter === 'breaking';

  const { trendingItems, latestItems, breakingLead } = useMemo(() => {
    if (feedFilter === 'breaking') {
      const t = breakingPool.length > 0 ? breakingPool : news.slice(0, 6);
      return {
        trendingItems: t.slice(0, 6),
        latestItems: [] as ApiNewsListItem[],
        breakingLead: t[0],
      };
    }
    if (feedFilter === 'picked') {
      const t = news.filter((_, i) => i % 2 === 0).slice(0, 4);
      const l = news.filter((_, i) => i % 2 === 1).slice(0, 4);
      return {
        trendingItems: t,
        latestItems: l,
        breakingLead: breakingPool[0],
      };
    }
    return {
      trendingItems: news.slice(0, 4),
      latestItems: news.slice(4, 8),
      breakingLead: breakingPool[0],
    };
  }, [news, breakingPool, feedFilter]);

  const filterRail = (
    <div className="rounded-2xl border border-narvo-ink/8 dark:border-white/10 bg-narvo-mist/45 dark:bg-white/[0.04] p-2.5 sm:p-3 shadow-[0_10px_32px_-14px_rgba(23,50,74,0.12)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]">
      <FilterPillGroup
        items={FILTER_ITEMS}
        value={feedFilter}
        onChange={setFeedFilter}
        ariaLabel="Feed filter"
      />
    </div>
  );

  const briefingPlayDisabled = briefingLoading || !briefing;

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

  const feedMain = (
    <>
      {feedLoading ? (
        <p className="text-center py-16 text-narvo-ink/45 dark:text-white/45 font-medium">Loading stories…</p>
      ) : feedError ? (
        <ErrorState message={feedError} onRetry={loadFeed} />
      ) : null}

      {!feedLoading && !feedError && trendingItems.length > 0 && (
        <section className="mb-8 lg:mb-10" aria-labelledby="trending-heading">
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

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6 xl:gap-8">
            {trendingItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: index * 0.05 }}
                className="min-w-0"
              >
                <StoryCardLarge
                  item={item}
                  featured={index === 0 && feedFilter !== 'breaking'}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {!feedLoading && !feedError && latestItems.length > 0 && (
        <section aria-labelledby="latest-heading">
          <div className="flex items-center justify-between mb-4 lg:mb-6 gap-3">
            <h2
              id="latest-heading"
              className="text-lg sm:text-xl lg:text-2xl font-serif font-bold text-narvo-ink dark:text-white flex items-center gap-2 sm:gap-3"
            >
              <Radio size={22} className="text-narvo-teal shrink-0 lg:w-7 lg:h-7" aria-hidden />
              {COPY.home_latest}
            </h2>
          </div>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6 xl:gap-8">
            {latestItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 + index * 0.05 }}
                className="min-w-0"
              >
                <StoryCardLarge item={item} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {!feedLoading && !feedError && trendingItems.length === 0 && latestItems.length === 0 && (
        <p className="text-center py-16 text-narvo-ink/45 dark:text-white/45 font-medium">{COPY.home_empty}</p>
      )}
    </>
  );

  const desktopBriefingCard = (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="rounded-[28px] border border-narvo-ink/8 dark:border-white/10 bg-narvo-cloud/95 dark:bg-narvo-ink/90 backdrop-blur-md p-6 xl:p-8 shadow-[0_20px_60px_-24px_rgba(23,50,74,0.18)] dark:shadow-[0_24px_70px_-20px_rgba(0,0,0,0.5)]"
      aria-labelledby="briefing-card-title-desktop"
    >
      <p
        id="briefing-card-title-desktop"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint"
      >
        {COPY.briefing_title}
      </p>
      <h3 className="mt-2 font-serif text-xl xl:text-2xl font-semibold text-narvo-ink dark:text-white tracking-tight">
        {briefingHeroTitle}
      </h3>
      <p className="mt-2 text-sm text-narvo-ink/50 dark:text-white/45 leading-relaxed">
        {briefingSubline}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePlayBriefing}
          disabled={briefingPlayDisabled}
          className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 min-h-[48px] rounded-full bg-narvo-teal px-5 text-sm font-bold text-white hover:opacity-95 transition-opacity shadow-md shadow-narvo-teal/20 disabled:opacity-45 disabled:pointer-events-none"
        >
          <Play size={18} fill="currentColor" aria-hidden />
          {COPY.briefing_listen_now}
        </button>
        <Link
          href="/briefing"
          className="inline-flex flex-1 min-w-[120px] items-center justify-center min-h-[48px] rounded-full border border-narvo-ink/14 dark:border-white/15 px-4 text-sm font-bold text-narvo-ink dark:text-white hover:bg-narvo-ink/5 dark:hover:bg-white/5"
        >
          {COPY.briefing_transcript}
        </Link>
      </div>
    </motion.section>
  );

  return (
    <AuthenticatedAppShell
      header={{
        title: 'Home',
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="max-w-[1680px] mx-auto w-full">
        {/* ——— Mobile-only: thumb-first scan column (< lg) ——— */}
        <div className="lg:hidden px-4 pt-4 pb-2 space-y-4">
          <div className="rounded-[24px] overflow-hidden border border-narvo-ink/10 dark:border-white/10 bg-gradient-to-br from-narvo-teal/15 via-white to-narvo-vermilion/10 dark:from-narvo-teal/25 dark:via-narvo-ink dark:to-narvo-vermilion/15 shadow-md">
            <div className="p-4 flex items-center gap-4">
              <button
                type="button"
                onClick={handlePlayBriefing}
                disabled={briefingPlayDisabled}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-narvo-vermilion text-white shadow-xl shadow-narvo-vermilion/30 active:scale-95 transition-transform disabled:opacity-45 disabled:pointer-events-none"
                aria-label={COPY.cta_play}
              >
                <Play size={28} fill="currentColor" aria-hidden />
              </button>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-narvo-teal dark:text-narvo-mint">
                  {COPY.briefing_title}
                </p>
                <p className="font-serif text-base font-semibold text-narvo-ink dark:text-white leading-tight mt-0.5 line-clamp-2">
                  {briefingHeroTitle}
                </p>
                <p className="text-xs text-narvo-ink/50 dark:text-white/45 mt-1 leading-snug line-clamp-2">
                  {briefingSubline}
                </p>
              </div>
              <Link
                href="/briefing"
                className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-narvo-ink/12 dark:border-white/15 bg-white/60 dark:bg-white/5 text-narvo-ink dark:text-white"
                aria-label={COPY.briefing_open_full}
              >
                <Volume2 size={18} aria-hidden />
              </Link>
            </div>
          </div>

          {filterRail}

          {breakingBlock}

          <div className="pt-1 pb-2">
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

        {/* Main feed column: mobile continues below thumb-first strip; desktop adds filters/breaking here (single DOM = no duplicate section ids). */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(340px,30vw)] xl:grid-cols-[minmax(0,1fr)_min(400px,28vw)] lg:gap-8 xl:gap-12 lg:px-8 xl:px-10 lg:py-10 items-start">
          <div className="min-w-0 space-y-6 lg:space-y-8 px-4 lg:px-0 pb-8 lg:pb-10 pt-2 lg:pt-0">
            <div className="hidden lg:block space-y-8">
              {filterRail}
              {breakingBlock}
            </div>
            {feedMain}
          </div>

          <aside className="hidden lg:flex flex-col space-y-8 lg:sticky lg:top-0 self-start order-2">
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
              <div className="mt-8 flex flex-col gap-3">
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
            {desktopBriefingCard}
          </aside>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
