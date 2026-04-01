import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowClockwise, GlobeHemisphereEast, Lightning, Play, Sparkle } from '@phosphor-icons/react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { StoryCardCompact } from '../components/StoryCardCompact';
import { StoryCardLarge } from '../components/StoryCardLarge';
import { ButtonPrimary, ButtonSecondary } from '../components/primitives/Buttons';
import { FilterPill, StatusPill, TruthPill, type TruthType } from '../components/primitives/Pills';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import {
  useAudioPrefetch,
  useObservedAudioPrefetch,
} from '../hooks/useAudioPrefetch';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { useNewsRefresh } from '../hooks/useNewsRefresh';
import { NARVO_SETTINGS_UPDATED } from '../lib/accessibilityApply';
import * as api from '../lib/api';
import logger from '../lib/logger';
import { readJson, writeJson } from '../lib/storage';
import { asArray, asRecord, isStory } from '../lib/validators';
import type { Story } from '../types/story';

const INITIAL_STREAM_COUNT = 6;
const LOAD_MORE_COUNT = 6;

const FeedSkeleton = () => (
  <div className="flex flex-col gap-6 animate-in fade-in duration-500">
    <div className="shell-panel min-h-[320px] animate-pulse" />
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="shell-card min-h-[220px] animate-pulse" />
      ))}
    </div>
  </div>
);

const formatPublished = (story: Story) => {
  const raw = story.published || story.published_at || story.created_at;
  if (!raw) return 'Today';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Today';

  const sameDay = new Date().toDateString() === date.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const toTruthStatus = (story: Story): TruthType => {
  const certainty = typeof story.certainty_score === 'number' ? story.certainty_score : null;
  if (certainty !== null) {
    if (certainty >= 75) return 'verified';
    if (certainty >= 45) return 'mixed';
    if (certainty >= 25) return 'checking';
    return 'disputed';
  }

  const sourceCount = story.original_sources?.length ?? 0;
  if (sourceCount >= 3) return 'verified';
  if (sourceCount === 2) return 'mixed';
  return 'checking';
};

const isBreakingStory = (story: Story) => {
  const published = story.published || story.published_at || story.created_at;
  if (!published) return false;
  const timestamp = new Date(published).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp < 1000 * 60 * 90;
};

const DashboardPage = () => {
  const { playTrack, voiceModel, broadcastLanguage, currentTrack, isPlaying } = useAudio();
  const { user } = useAuth();
  const { t } = useTranslation();

  const fetcher = useCallback(async () => {
    const settingsRes = await api.get('api/settings/guest');
    const settingsJson = settingsRes.ok ? await settingsRes.json() : {};
    const settings = asRecord<{
      aggregator_mediastack?: boolean;
      aggregator_newsdata?: boolean;
      interests?: string[];
    }>(settingsJson, {});
    const ms = settings.aggregator_mediastack !== false;
    const nd = settings.aggregator_newsdata !== false;
    const enabled = [ms && 'mediastack', nd && 'newsdata'].filter(Boolean).join(',');
    const aggParam = enabled ? `&aggregator_sources=${enabled}` : '';
    const newsRes = await api.get(`api/news?limit=50&include_aggregators=true${aggParam}`);
    if (!newsRes.ok) throw new Error(`News API ${newsRes.status}`);
    const news = asArray<Story>(await newsRes.json(), isStory);
    return { news, interests: settings.interests ?? [] };
  }, []);

  const { data, mutate, isLoading } = useSWR('dashboard-feed', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
    refreshInterval: 120000,
    revalidateOnReconnect: true,
  });

  const news = useMemo(() => asArray<Story>(data?.news, isStory), [data]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_STREAM_COUNT);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Story[]>(() => {
    try {
      const cached = readJson<{ at?: number; items?: Story[] }>('narvo_reco_cache', {});
      if (cached.at && Date.now() - cached.at < 3600000) {
        return asArray<Story>(cached.items, isStory);
      }
    } catch {
      // ignore cache corruption
    }
    return [];
  });

  const [gesturalSwipe, setGesturalSwipe] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncSwipePreference = () => {
      try {
        const settings = readJson<{ gestural_swipe?: boolean }>('narvo_settings_cache', {});
        setGesturalSwipe(settings.gestural_swipe !== false);
      } catch {
        setGesturalSwipe(true);
      }
    };

    syncSwipePreference();
    window.addEventListener(NARVO_SETTINGS_UPDATED, syncSwipePreference);
    return () => window.removeEventListener(NARVO_SETTINGS_UPDATED, syncSwipePreference);
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_STREAM_COUNT);
  }, [selectedCat, news.length]);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id || 'guest';

    api.get(`api/recommendations/${userId}?limit=6`)
      .then((response) => response.json())
      .then((payload: { recommendations?: Story[] } | null) => {
        if (cancelled) return;
        const safe = asRecord<{ recommendations?: Story[] }>(payload ?? {}, {});
        const items = asArray<Story>(safe.recommendations, isStory);
        setRecommendations(items);
        writeJson('narvo_reco_cache', { items, at: Date.now() });
      })
      .catch((error) => logger.debug('[DashboardPage] Recommendation fetch failed', error));

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const categories = useMemo(() => {
    const values = news
      .map((story) => story.category?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).slice(0, 8);
  }, [news]);

  const filteredStories = useMemo(() => {
    if (!selectedCat) return news;
    return news.filter((story) => story.category?.toLowerCase() === selectedCat.toLowerCase());
  }, [news, selectedCat]);

  const featured = filteredStories[0];
  const remainingStories = featured ? filteredStories.slice(1) : filteredStories;
  const visibleStories = remainingStories.slice(0, visibleCount);
  const allLoaded = remainingStories.length === 0 || visibleStories.length >= remainingStories.length;

  const prefetchStories = useMemo(() => {
    const pool: Story[] = [];
    if (featured) pool.push(featured);
    pool.push(...visibleStories);
    return pool;
  }, [featured, visibleStories]);

  useAudioPrefetch(prefetchStories.slice(0, 8), voiceModel, broadcastLanguage, 8);
  const setCardRef = useObservedAudioPrefetch(prefetchStories, {
    voiceId: voiceModel,
    language: broadcastLanguage,
    limit: 15,
    rootMargin: '300px',
  });

  const { containerRef, pulling, refreshing, pullDistance, handlers: pullHandlers } = usePullToRefresh(
    useCallback(async () => {
      await mutate();
    }, [mutate]),
    { threshold: 70, disabled: !gesturalSwipe }
  );

  const currentIds = useMemo(() => news.map((story) => story.id), [news]);
  const { newCount, applyRefresh, clearNew } = useNewsRefresh({
    currentIds,
    onRefresh: useCallback(async () => {
      await mutate();
    }, [mutate]),
    intervalMs: 120000,
    autoApplyMs: 300000,
  });

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || isLoading) return;

    const max = remainingStories.length;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount((current) => {
          if (current >= max) return current;
          return Math.min(current + LOAD_MORE_COUNT, max);
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading, remainingStories.length]);

  const handlePlay = useCallback(
    async (story: Story) => {
      if (currentTrack?.id === story.id && isPlaying) return;
      await playTrack({ id: story.id, title: story.title ?? '', source: story.source ?? 'FEED' }, true);
    },
    [currentTrack, isPlaying, playTrack]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.first_name || user?.user_metadata?.display_name || '';
    const key = hour < 12 ? 'home.greeting_morning' : hour < 17 ? 'home.greeting_afternoon' : 'home.greeting_evening';
    if (!name) return t(`${key}_generic`);
    return t(key, { name });
  }, [t, user]);

  const briefingStories = useMemo(() => {
    const pool = recommendations.length > 0 ? recommendations : remainingStories;
    return pool.slice(0, 3);
  }, [remainingStories, recommendations]);

  const sourceSignals = useMemo(() => {
    if (featured?.original_sources?.length) {
      return featured.original_sources.slice(0, 4).map((source, index) => ({
        name: source.name || `Source ${index + 1}`,
        code: (source.name || `S${index + 1}`).slice(0, 2).toUpperCase(),
        level: `${96 - index * 4}%`,
      }));
    }

    return [
      { name: 'Arise News', code: 'AR', level: '98%' },
      { name: 'BBC Africa', code: 'BB', level: '96%' },
      { name: 'Channels TV', code: 'CH', level: '94%' },
      { name: 'Techpoint', code: 'TP', level: '91%' },
    ];
  }, [featured]);

  const nextQueue = useMemo(() => {
    const pool = recommendations.length > 0 ? recommendations : remainingStories;
    return pool.slice(0, 3);
  }, [recommendations, remainingStories]);

  const todayStamp = new Date().toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-bg" data-testid="dashboard-page">
      <Helmet>
        <title>{t('home.meta_title')}</title>
        <meta name="description" content={t('home.meta_description')} />
      </Helmet>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-28 pt-4 md:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:pb-10">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
          <section className="shell-panel overflow-hidden p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="meta-eyebrow">{todayStamp}</div>
                <h1 className="section-heading mt-3 text-[42px] text-content md:text-[56px]">
                  {greeting}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-content-secondary md:text-base">
                  Large cards for scanning. Calm detail when you open a story. Morning Briefing and playback stay one tap away.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status="live">Live signal</StatusPill>
                {currentTrack ? (
                  <div className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold text-content shadow-[var(--shadow-1)]">
                    {isPlaying ? 'Now playing' : 'Ready'}: {currentTrack.title}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => mutate()}
                  aria-label="Refresh feed"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-primary shadow-[var(--shadow-1)] transition-transform hover:-translate-y-0.5"
                >
                  <ArrowClockwise size={20} weight="bold" className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div
                className="relative overflow-hidden rounded-[32px] p-5 text-white md:p-6"
                style={{
                  background:
                    'radial-gradient(circle at 82% 30%, rgba(255,255,255,0.12), transparent 22%), linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="meta-eyebrow !text-white/58">Morning Briefing</div>
                  <TruthPill status="verified" className="!border-white/14 !bg-white/12 !text-white">
                    Trust-first
                  </TruthPill>
                </div>
                <h2 className="mt-6 max-w-[560px] font-display text-[36px] font-bold leading-[0.92] tracking-[-0.05em] md:text-[56px]">
                  One strong briefing. One clear next action.
                </h2>
                <p className="mt-4 max-w-[520px] text-sm leading-7 text-white/78 md:text-base">
                  Start with the summary, then drop into the stories that need attention. The player stays central and obvious.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <ButtonPrimary icon={<Play size={14} weight="fill" />} onClick={() => featured && handlePlay(featured)}>
                    Play briefing
                  </ButtonPrimary>
                  <ButtonSecondary onClick={() => void 0}>Open queue</ButtonSecondary>
                </div>
              </div>

              <div className="shell-card-soft p-5 md:p-6">
                <div className="meta-eyebrow">Signal quality</div>
                <h2 className="section-heading mt-3 text-[30px] text-content md:text-[38px]">
                  The feed should feel clearer, not denser.
                </h2>
                <div className="mt-5 space-y-3">
                  {[
                    'Floating dock and dark rail own navigation',
                    'Large story cards on habit surfaces',
                    'Truth cues stay compact and visible',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-[20px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-1)]">
                      <Sparkle size={16} weight="fill" className="text-primary" />
                      <span className="text-sm font-medium text-content-secondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {newCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="mt-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-primary-deep px-4 py-3 text-white shadow-[var(--shadow-2)]">
                    <button
                      type="button"
                      onClick={applyRefresh}
                      className="inline-flex items-center gap-2 text-left text-sm font-semibold"
                    >
                      <Lightning size={16} weight="fill" />
                      {t('home.new_stories_banner', { count: newCount })}
                    </button>
                    <button
                      type="button"
                      onClick={clearNew}
                      className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/74"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="shell-card-soft p-4 md:p-5">
            <div className="flex flex-col gap-4">
              <div>
                <div className="meta-eyebrow">Filter rail</div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-content">Choose a signal lane</h2>
              </div>
              <nav className="flex items-center gap-3 overflow-x-auto no-scrollbar" aria-label="Filter by topic">
                <FilterPill active={selectedCat === null} onClick={() => setSelectedCat(null)} className="shrink-0">
                  <span className="inline-flex items-center gap-2">
                    <Sparkle size={14} weight="fill" />
                    For you
                  </span>
                </FilterPill>
                {categories.map((category) => (
                  <FilterPill
                    key={category}
                    active={selectedCat === category}
                    onClick={() => setSelectedCat((current) => (current === category ? null : category))}
                    className="shrink-0"
                  >
                    {category}
                  </FilterPill>
                ))}
              </nav>
            </div>
          </section>

          <div
            ref={containerRef as never}
            {...pullHandlers}
            className="flex-1 overflow-y-auto no-scrollbar"
            data-testid="news-feed"
          >
            <AnimatePresence>
              {pulling && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: pullDistance, opacity: Math.min(pullDistance / 70, 1) }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-center overflow-hidden"
                >
                  <div className="rounded-full bg-primary/10 px-4 py-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                      {refreshing ? t('status.syncing') : t('home.refreshing')}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-6">
              {isLoading && news.length === 0 ? (
                <FeedSkeleton />
              ) : (
                <>
                  {featured ? (
                    <div data-testid="featured-card">
                      <StoryCardLarge
                        ref={setCardRef(0)}
                        id={featured.id}
                        category={featured.category ?? 'Top story'}
                        status={isBreakingStory(featured) ? 'breaking' : undefined}
                        headline={featured.title ?? ''}
                        summary={featured.summary || featured.short_summary || 'Open the full gist to hear the synthesis.'}
                        source={featured.source ?? 'Narvo'}
                        timestamp={formatPublished(featured)}
                        imageUrl={featured.image_url ?? undefined}
                        onPlay={() => handlePlay(featured)}
                      />
                    </div>
                  ) : (
                    <div className="shell-card p-6">
                      <div className="meta-eyebrow">No stories yet</div>
                      <h2 className="section-heading mt-3 text-[34px] text-content">The feed is waiting on fresh signal.</h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-content-secondary">
                        Pull to refresh, or check your source settings to bring new stories back into the dashboard.
                      </p>
                    </div>
                  )}

                  {visibleStories.length > 0 ? (
                    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                      {visibleStories.map((story, index) => (
                        <StoryCardCompact
                          key={story.id}
                          ref={setCardRef(index + 1)}
                          id={story.id}
                          category={story.category ?? 'Signal'}
                          headline={story.title ?? ''}
                          summary={story.summary || story.short_summary || ''}
                          source={story.source ?? 'Narvo'}
                          timestamp={formatPublished(story)}
                          truthStatus={toTruthStatus(story)}
                          imageUrl={story.image_url ?? undefined}
                          onPlay={() => handlePlay(story)}
                        />
                      ))}
                    </section>
                  ) : null}

                  <div ref={loadMoreRef} className="py-6">
                    {!allLoaded ? (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="h-8 w-8 rounded-full border-2 border-primary/15 border-t-primary animate-spin" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-content-secondary">
                          {t('status.syncing')}
                        </span>
                      </div>
                    ) : remainingStories.length > 0 ? (
                      <div className="py-8 text-center">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-content-secondary">
                          End of transmission
                        </span>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden w-full max-w-[360px] shrink-0 lg:block" data-testid="telemetry-sidebar">
          <div className="flex flex-col gap-5">
            <section className="surface-rail overflow-hidden p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="meta-eyebrow !text-white/58">PlayerCluster</div>
                <StatusPill status={isPlaying ? 'live' : 'queued'} className={isPlaying ? '!bg-white/14 !border-white/12 !text-white' : ''}>
                  {isPlaying ? 'Listening' : 'Queued'}
                </StatusPill>
              </div>
              <h2 className="mt-4 font-display text-[34px] font-bold leading-[0.95] tracking-[-0.05em] text-white">
                {currentTrack?.title || 'Morning Briefing is ready to play.'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Strong transport controls, clear queue context, and a calmer player surface than a typical media app.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => featured && handlePlay(featured)}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-alert text-white shadow-[0_0_0_1px_rgba(240,75,36,0.18),0_0_24px_rgba(240,75,36,0.18)]"
                  aria-label="Play highlighted story"
                >
                  <Play size={20} weight="fill" />
                </button>
                <div className="flex-1 rounded-[24px] border border-white/10 bg-white/8 px-4 py-3">
                  <div className="meta-eyebrow !text-white/46">Up next</div>
                  <div className="mt-2 text-sm font-semibold text-white">{nextQueue[0]?.title || 'No queued story yet'}</div>
                </div>
              </div>
            </section>

            <section className="shell-card p-5 md:p-6">
              <div className="meta-eyebrow">Morning briefing</div>
              <h2 className="section-heading mt-3 text-[34px] text-content">Your first three stories, already ranked.</h2>
              <div className="mt-5 space-y-3">
                {briefingStories.map((story, index) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => handlePlay(story)}
                    className="flex w-full items-start gap-3 rounded-[22px] border border-border bg-surface px-4 py-4 text-left shadow-[var(--shadow-1)] transition-transform hover:-translate-y-0.5"
                  >
                    <span className="meta-eyebrow min-w-[18px] pt-1">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-6 text-content">
                        {story.title || 'Untitled story'}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-content-secondary">
                        {story.source || 'Narvo'} · {formatPublished(story)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="shell-card-soft p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="meta-eyebrow">Source telemetry</div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-content">Deep rail, live signal.</h2>
                </div>
                <GlobeHemisphereEast size={22} weight="fill" className="text-primary" />
              </div>
              <div className="mt-5 space-y-3">
                {sourceSignals.map((signal) => (
                  <div key={signal.name} className="flex items-center justify-between rounded-[20px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-1)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-[11px] font-bold text-primary">
                        {signal.code}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-content">{signal.name}</div>
                        <div className="text-xs text-content-secondary">Signal reliability</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      {signal.level}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
