import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useSWR from 'swr';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { PlayCircle } from '@phosphor-icons/react/PlayCircle';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { Pulse } from '@phosphor-icons/react/Pulse';
import { CloudSun } from '@phosphor-icons/react/CloudSun';
import { ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { Queue } from '@phosphor-icons/react/Queue';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';
import { Broadcast } from '@phosphor-icons/react/Broadcast';
import { Lightning } from '@phosphor-icons/react/Lightning';
import { Fingerprint } from '@phosphor-icons/react/Fingerprint';
import { Globe } from '@phosphor-icons/react/Globe';
import { useAudio } from '../contexts/AudioContext';
import { useContentSources } from '../contexts/ContentSourcesContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAudioPrefetch, useObservedAudioPrefetch, prefetchAndCacheStory, prefetchBookmarkedStories } from '../hooks/useAudioPrefetch';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { useNewsRefresh } from '../hooks/useNewsRefresh';
import { TagPill } from '../components/HashtagText';
import { FeaturedSkeleton, StreamCardSkeleton } from '../components/Skeleton';
import TruthTag from '../components/TruthTag';
import { useHapticAlert } from '../components/HapticAlerts';
import { getCategoryImage, getCategoryColor } from '../lib/categoryImages';
import ResponsiveImage from '../components/ResponsiveImage';
import { CARD_SIZES, THUMB_SIZES } from '../lib/responsiveImageUtils';
import { NARVO_SETTINGS_UPDATED } from '../lib/accessibilityApply';
import { getTagLabelClass } from '../lib/tagLabelColors';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';
import logger from '../lib/logger';
import { readJson, writeJson } from '../lib/storage';
import { asArray, asRecord, isStory } from '../lib/validators';
import type { Story } from '../types/story';

interface MetricsData {
  total_sources?: number;
  listeners_today?: number | string;
  total_listeners?: number | string;
  network_load?: string | number;
  signal_strength?: string;
  aggregators?: Record<string, { configured?: boolean; cached_count?: number }>;
  [key: string]: unknown;
}

interface RegionalEnvData {
  temp_c?: number | null;
  humidity?: number | null;
  wind_kmh?: number | null;
  label?: string;
  city?: string;
  region_name?: string;
}

interface RecoProfileData {
  history_count?: number;
  top_categories?: string[];
  expanded_topics?: string[];
}

type SourceFilterType = 'all' | 'rss' | 'aggregators';
type SortOrderType = 'latest' | 'oldest';

// Save article for offline (stored in DB per user for future reference)
const saveForOffline = async (item: Story, userId: string | undefined): Promise<boolean> => {
  try {
    await api.post('api/offline/save', {
      story_id: item.id,
      title: item.title,
      summary: item.summary || '',
      narrative: item.narrative || '',
      source: item.source || '',
      category: item.category || 'General',
      image_url: item.image_url || null,
      ...(userId ? { user_id: userId } : {}),
    });
    return true;
  } catch (e) {
    console.error('Error saving for offline:', e);
    return false;
  }
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [news, setNews] = useState<Story[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>('all');
  const [, setUserAggPrefs] = useState<{ mediastack: boolean; newsdata: boolean } | null>(null);
  const { playTrack, addToQueue, voiceModel, broadcastLanguage } = useAudio();
  const { getTotalSources, getLocalSources, getInternationalSources, getContinentalSources, getSourcesByRegion, getHealthForSource, getHealthSummary, refreshHealth } = useContentSources();
  const { isBookmarked, addBookmark, removeBookmark, bookmarks } = useBookmarks();
  const { showAlert } = useHapticAlert();
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState<SortOrderType>('latest');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Story[]>(() => {
    try {
      const c = readJson<{ at?: number; items?: Story[] }>('narvo_reco_cache', {});
      if (c.at && Date.now() - c.at < 3600000) return c.items || [];
    } catch (err) { logger.debug('[DashboardPage] Failed to read reco cache', err); }
    return [];
  });
  const [recoProfile, setRecoProfile] = useState<RecoProfileData | null>(() => {
    try {
      const c = readJson<{ at?: number; profile_summary?: RecoProfileData }>('narvo_reco_cache', {});
      if (c.at && Date.now() - c.at < 3600000) return c.profile_summary || null;
    } catch (err) { logger.debug('[DashboardPage] Failed to read reco profile cache', err); }
    return null;
  });
  const [, setRecoLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [regionalEnv, setRegionalEnv] = useState<RegionalEnvData | null>(null);

  // Idle-time audio prefetch: top recommendations or first feed items
  const prefetchArticles = recommendations.length > 0 ? recommendations.slice(0, 8) : (Array.isArray(news) ? news : []).slice(0, 8);
  useAudioPrefetch(prefetchArticles, voiceModel, broadcastLanguage, 8);

  // On mount: prefetch audio for bookmarked stories so they play instantly from Library
  useEffect(() => {
    if (!bookmarks.length || !voiceModel || !broadcastLanguage) return;
    const ctrl = new AbortController();
    const articlesToWarm = bookmarks
      .slice(0, 10)
      .map((b) => ({ id: b.story_id, title: b.title, summary: b.summary, source: b.source }));
    prefetchBookmarkedStories(articlesToWarm, voiceModel, broadcastLanguage, ctrl.signal).catch((err) => {
      logger.debug('[DashboardPage] Failed to prefetch bookmarked stories', err);
    });
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks.length, voiceModel, broadcastLanguage]);

  const [showTelemetry, setShowTelemetry] = useState(true);

  const fetcher = useCallback(async (): Promise<{ news: Story[]; metrics: MetricsData | null; settings: { aggregator_mediastack?: boolean; aggregator_newsdata?: boolean; interests?: string[] } }> => {
    const settingsRes = await api.get('api/settings/guest');
    const settingsJson = settingsRes.ok ? await settingsRes.json() : {};
    const settings = asRecord<{ aggregator_mediastack?: boolean; aggregator_newsdata?: boolean; interests?: string[] }>(settingsJson, {});
    const ms = settings.aggregator_mediastack !== false;
    const nd = settings.aggregator_newsdata !== false;
    const enabledSources = [ms && 'mediastack', nd && 'newsdata'].filter(Boolean).join(',');
    const aggParam = enabledSources ? `&aggregator_sources=${enabledSources}` : '';
    const newsRes = await api.get(`api/news?limit=50&include_aggregators=true${aggParam}`);
    if (!newsRes.ok) {
      const msg = newsRes.status === 422 ? 'Invalid request (e.g. limit too high)' : `News API ${newsRes.status}`;
      throw new Error(msg);
    }
    const newsJson = await newsRes.json();
    const newsData = asArray<Story>(newsJson, isStory);
    const metricsJson = await api.get('api/metrics').then(r => r.json()).catch(() => null);
    const metricsData = metricsJson && typeof metricsJson === 'object' ? (metricsJson as MetricsData) : null;
    return { news: newsData, metrics: metricsData, settings };
  }, []);

  const { data, mutate, isLoading: swrLoading } = useSWR('dashboard-feed', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
    refreshInterval: 120_000,           // silent background poll every 2 min
    revalidateOnReconnect: true,        // re-fetch when network comes back
  });

  const loading = swrLoading && !data;
  useEffect(() => {
    if (data) {
      const list = Array.isArray(data.news) ? data.news : [];
      setNews(list);
      setMetrics(data.metrics);
      setVisibleCount(20);
      setAllLoaded(list.length <= 20);
      setUserAggPrefs({
        mediastack: data.settings?.aggregator_mediastack !== false,
        newsdata: data.settings?.aggregator_newsdata !== false,
      });
      if (data.settings?.interests?.length) setUserInterests(data.settings.interests);
    }
  }, [data]);

  const fetchDashboardData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Background news refresh — detects new stories and surfaces a tap-to-apply banner
  const currentIds = useMemo(() => (Array.isArray(news) ? news : []).map((n: Story) => n.id), [news]);
  const { newCount, applyRefresh, clearNew } = useNewsRefresh({
    currentIds,
    onRefresh: fetchDashboardData,
    intervalMs: 120_000,   // poll every 2 min (matches SWR refreshInterval)
    autoApplyMs: 300_000,  // auto-apply after 5 min if user hasn't tapped
  });

  // Telemetry: trending tags and regional env (weather via free API)
  useEffect(() => {
    let cancelled = false;
    api.get('api/trending').then(r => r.json()).then((data: { tags?: string[] }) => {
      if (!cancelled) setTrendingTags(data.tags || []);
    }).catch(() => {
      if (!cancelled) setTrendingTags(['#POLITICS', '#ECONOMY', '#TECH', '#AFRICA', '#HEALTH']);
    });

    const lagos = { latitude: 6.5244, longitude: 3.3792, label: 'LAGOS, NIGERIA' };

    const fetchOpenMeteo = async ({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }): Promise<RegionalEnvData> => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(latitude));
      url.searchParams.set('longitude', String(longitude));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m');
      url.searchParams.set('temperature_unit', 'celsius');
      url.searchParams.set('wind_speed_unit', 'kmh');
      url.searchParams.set('timezone', 'auto');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json() as { current?: { temperature_2m?: number; relative_humidity_2m?: number; wind_speed_10m?: number } };
      const cur = data.current || {};
      return {
        temp_c: cur.temperature_2m ?? null,
        humidity: cur.relative_humidity_2m ?? null,
        wind_kmh: cur.wind_speed_10m ?? null,
        label,
      };
    };

    const resolveCoords = (): Promise<{ latitude: number; longitude: number; label: string }> => new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(lagos);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'NIGERIA, AFRICA',
        }),
        () => resolve(lagos),
        { enableHighAccuracy: false, timeout: 3500, maximumAge: 1000 * 60 * 30 }
      );
    });

    resolveCoords()
      .then(fetchOpenMeteo)
      .then((data) => {
        if (!cancelled) setRegionalEnv(data);
      })
      .catch((err) => {
        logger.debug('[DashboardPage] Failed to load regional environment', err);
        if (!cancelled) setRegionalEnv({ label: lagos.label, temp_c: null, humidity: null, wind_kmh: null });
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch recommendations in parallel (non-blocking)
  useEffect(() => {
    let cancelled = false;
    const userId = user?.id || 'guest';
    setRecoLoading(true);
    api.get(`api/recommendations/${userId}?limit=6`)
      .then(r => r.json())
      .then((data: { recommendations?: Story[]; profile_summary?: RecoProfileData } | null) => {
        const safe = asRecord<{ recommendations?: Story[]; profile_summary?: RecoProfileData }>(data ?? {}, {});
        const items = asArray<Story>(safe.recommendations, isStory);
        const profile_summary = safe.profile_summary || null;
        if (cancelled) return;
        setRecommendations(items);
        setRecoProfile(profile_summary);
        writeJson('narvo_reco_cache', { items, profile_summary, at: Date.now() });
      })
      .catch((err) => {
        logger.debug('[DashboardPage] Failed to load recommendations', err);
      })
      .finally(() => {
        if (!cancelled) setRecoLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Accessibility: lateral swipe (pull-to-refresh) can be disabled in /accessibility
  const [gesturalSwipeEnabled, setGesturalSwipeEnabled] = useState(true);
  useEffect(() => {
    const read = () => {
      try {
        const c = readJson<{ gestural_swipe?: boolean }>('narvo_settings_cache', {});
        setGesturalSwipeEnabled(c.gestural_swipe !== false);
      } catch (err) {
        logger.debug('[DashboardPage] Failed to read gestural swipe setting', err);
        setGesturalSwipeEnabled(true);
      }
    };
    read();
    window.addEventListener('storage', read);
    window.addEventListener(NARVO_SETTINGS_UPDATED, read);
    document.addEventListener('visibilitychange', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener(NARVO_SETTINGS_UPDATED, read);
      document.removeEventListener('visibilitychange', read);
    };
  }, []);

  // Pull-to-refresh
  const { containerRef, pulling, refreshing, pullDistance, handlers: pullHandlers } = usePullToRefresh(
    fetchDashboardData,
    { threshold: 70, disabled: !gesturalSwipeEnabled }
  );

  const newsList = Array.isArray(news) ? news : [];
  const featured = newsList[0];
  const filteredNews = newsList.slice(1).filter((item: Story) => {
    if (sourceFilter === 'rss') return !item.aggregator;
    if (sourceFilter === 'aggregators') return !!item.aggregator;
    return true;
  }).sort((a: Story, b: Story) => {
    // If user has interests, boost matching stories to the top
    if (userInterests.length > 0) {
      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aMatch = userInterests.includes(aCat) ? 1 : 0;
      const bMatch = userInterests.includes(bCat) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
    }
    if (sortOrder === 'oldest') return new Date((a.published as string) || 0).getTime() - new Date((b.published as string) || 0).getTime();
    return new Date((b.published as string) || 0).getTime() - new Date((a.published as string) || 0).getTime();
  });
  const stream = filteredNews.slice(0, visibleCount);

  // Observer: pre-translate/TTS for stories when they enter viewport (featured + recommendations + stream)
  const prefetchStories = useMemo(() => {
    const s: Story[] = [];
    if (featured) s.push(featured);
    s.push(...recommendations.slice(0, 6));
    s.push(...stream.slice(0, Math.max(visibleCount, 20)));
    return s;
  }, [featured, recommendations, stream, visibleCount]);
  const setCardRef = useObservedAudioPrefetch(prefetchStories, {
    voiceId: voiceModel,
    language: broadcastLanguage,
    limit: 15,
    rootMargin: '300px',
  });

  const loadMore = useCallback(() => {
    if (allLoaded || loadingMore) return;
    setLoadingMore(true);
    const next = visibleCount + 10;
    setVisibleCount(next);
    if (next >= filteredNews.length) setAllLoaded(true);
    setLoadingMore(false);
  }, [allLoaded, loadingMore, visibleCount, filteredNews.length]);

  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({
    rootMargin: '200px',
    threshold: 0,
  });
  useEffect(() => {
    if (loadMoreInView && !allLoaded && !loadingMore && !loading && stream.length > 0) loadMore();
  }, [loadMoreInView, allLoaded, loadingMore, loading, stream.length, loadMore]);
  useEffect(() => {
    if (filteredNews.length > 0 && visibleCount >= filteredNews.length) setAllLoaded(true);
  }, [filteredNews.length, visibleCount]);

  const toggleBookmark = (e: React.MouseEvent, item: Story) => {
    e.stopPropagation();
    if (isBookmarked(item.id)) {
      removeBookmark(item.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(item);
      prefetchAndCacheStory(item, voiceModel, broadcastLanguage).catch((err) => {
        logger.debug('[DashboardPage] Failed to prefetch bookmarked audio', err);
      });
      showAlert('BOOKMARK_ADDED');
    }
  };

  const shareStory = async (e: React.MouseEvent, item: Story) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/news/${item.id}`;
    const shareText = `${item.title} - Listen on NARVO`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
        showAlert({
          type: 'success',
          title: 'SHARED_SUCCESS',
          message: 'Story shared successfully.',
          code: 'SHARE_OK',
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareUrl);
          showAlert({
            type: 'sync',
            title: 'LINK_COPIED',
            message: 'Story link copied to clipboard.',
            code: 'CLIP_OK',
          });
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(shareUrl);
      showAlert({
        type: 'sync',
        title: 'LINK_COPIED',
        message: 'Story link copied to clipboard.',
        code: 'CLIP_OK',
      });
    }
  };

  const handleSaveOffline = async (e: React.MouseEvent, item: Story) => {
    e.stopPropagation();
    const success = await saveForOffline(item, user?.id);
    if (success) {
      prefetchAndCacheStory(item, voiceModel, broadcastLanguage).catch((err) => {
        logger.debug('[DashboardPage] Failed to prefetch offline audio', err);
      });
      showAlert({
        type: 'success',
        title: 'SAVED_OFFLINE',
        message: `"${item.title?.slice(0, 30)}..." saved for offline reading.`,
        code: 'OFFLINE_OK',
      });
    } else {
      showAlert({
        type: 'warning',
        title: 'SAVE_FAILED',
        message: 'Could not save article for offline.',
        code: 'OFFLINE_ERR',
      });
    }
  };

  const timeAgo = (idx: number): string => {
    const times = ['1HR_AGO', '2HR_AGO', '3HR_AGO', '4HR_AGO', '6HR_AGO', '8HR_AGO', '12HR_AGO'];
    return times[idx % times.length];
  };

  /* ── v3: Time-based greeting ── */
  const getGreeting = (): string => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /* ── v3: Category chips ── */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const feedCategories = useMemo(() => {
    const cats = new Set<string>();
    newsList.forEach((s: Story) => { if (s.category) cats.add(s.category); });
    return Array.from(cats).slice(0, 6);
  }, [newsList]);

  /* Category filter applied on top of source/sort filters */
  const categoryFiltered = selectedCategory
    ? filteredNews.filter((s: Story) => s.category?.toLowerCase() === selectedCategory.toLowerCase())
    : filteredNews;
  const streamFinal = categoryFiltered.slice(0, visibleCount);
  return (
    <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden" data-testid="dashboard-page">

      {/* ══════════════════════════════════════════════════════
          MAIN FEED
          ══════════════════════════════════════════════════════ */}
      <main
        className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"
        style={{ background: 'rgb(var(--color-bg))' }}
      >
        <Helmet>
          <title>Home — Narvo</title>
          <meta name="description" content="Your personalised audio news feed." />
        </Helmet>

        {/* ── Feed header ── */}
        <header
          className="shrink-0 px-4 md:px-6 py-4 md:py-5"
          style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Greeting */}
            <div>
              <p
                className="font-body text-sm font-medium mb-0.5"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {getGreeting()}, {user?.user_metadata?.first_name ? `${user.user_metadata.first_name}` : 'Oga'} 👋
              </p>
              <h1
                className="font-display font-bold"
                style={{
                  fontSize: 22,
                  letterSpacing: '-0.4px',
                  color: 'rgb(var(--color-text-primary))',
                  lineHeight: 1.2,
                }}
              >
                {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h1>
            </div>

            {/* Stats pill + filter controls */}
            <div className="flex items-center gap-2 shrink-0 mt-1">
              {/* Source filter */}
              <div
                className="hidden sm:flex items-center p-0.5 rounded-[8px]"
                style={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border-subtle))' }}
                data-testid="source-filter-toggle"
              >
                {(['all', 'rss', 'aggregators'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSourceFilter(f)}
                    className="font-body text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                      background: sourceFilter === f ? 'rgb(var(--color-primary))' : 'transparent',
                      color: sourceFilter === f ? 'rgb(var(--color-bg))' : 'rgb(var(--color-text-secondary))',
                    }}
                    data-testid={`filter-${f}`}
                  >
                    {f === 'all' ? 'All' : f === 'rss' ? 'RSS' : 'Agg'}
                  </button>
                ))}
              </div>

              {/* Sort toggle */}
              <button
                type="button"
                onClick={() => setSortOrder((s) => (s === 'latest' ? 'oldest' : 'latest'))}
                className="font-body text-[11px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  background: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text-secondary))',
                  border: '1px solid rgb(var(--color-border-subtle))',
                  minHeight: 32,
                }}
                data-testid="sort-btn"
              >
                {sortOrder === 'latest' ? '↓ Newest' : '↑ Oldest'}
              </button>
            </div>
          </div>
        </header>

        {/* ── Topic chips ── */}
        <div
          className="shrink-0 px-4 md:px-6 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none snap-x"
          style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}
          role="tablist"
          aria-label="Filter by topic"
        >
          {/* "For You" chip — always first */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
            className="font-body text-[12px] font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors snap-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              background: selectedCategory === null ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface))',
              color: selectedCategory === null ? 'rgb(var(--color-bg))' : 'rgb(var(--color-text-secondary))',
              border: `1px solid ${selectedCategory === null ? 'transparent' : 'rgb(var(--color-border-subtle))'}`,
            }}
          >
            ✦ For You
          </button>

          {feedCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              onClick={() => setSelectedCategory((prev) => (prev === cat ? null : cat))}
              className="font-body text-[12px] font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors snap-start capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                background: selectedCategory === cat ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface))',
                color: selectedCategory === cat ? 'rgb(var(--color-bg))' : 'rgb(var(--color-text-secondary))',
                border: `1px solid ${selectedCategory === cat ? 'transparent' : 'rgb(var(--color-border-subtle))'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Mobile telemetry drawer ── */}
        <div className="xl:hidden overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setShowTelemetry((v) => !v)}
            className="w-full h-9 flex items-center justify-between px-4 transition-colors focus:outline-none"
            style={{
              background: 'rgb(var(--color-surface))',
              borderBottom: '1px solid rgb(var(--color-border-subtle))',
            }}
            data-testid="telemetry-toggle"
            aria-expanded={showTelemetry}
          >
            <div className="flex items-center gap-2">
              <Broadcast weight="fill" className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-primary))' }} />
              <span className="font-body text-[11px] font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {getTotalSources()} sources live
              </span>
            </div>
            <span
              className={`font-mono text-[10px] transition-transform ${showTelemetry ? 'rotate-90' : ''}`}
              style={{ color: 'rgb(var(--color-text-secondary))' }}
              aria-hidden
            >
              ▶
            </span>
          </button>

          {showTelemetry && (
            <div
              className="px-4 py-3 space-y-2 max-h-44 overflow-y-auto custom-scroll"
              style={{
                background: 'rgb(var(--color-surface))',
                borderBottom: '1px solid rgb(var(--color-border-subtle))',
              }}
            >
              {trendingTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {trendingTags.slice(0, 6).map((tag) => {
                    const style = getTagLabelClass(tag);
                    return (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 font-body text-[10px] font-semibold rounded-full ${style.text} ${style.bg} ${style.border}`}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}
              {metrics && (
                <div className="flex items-center gap-4 font-body text-[11px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  <span>Sources: <strong style={{ color: 'rgb(var(--color-primary))' }}>{metrics.total_sources ?? '—'}</strong></span>
                  <span>Listeners: <strong style={{ color: 'rgb(var(--color-primary))' }}>{metrics.listeners_today ?? metrics.total_listeners ?? '—'}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            SCROLLABLE FEED
            ══════════════════════════════════════════════════════ */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll px-4 py-4 md:px-6 md:py-5 pb-safe relative"
          data-testid="news-feed"
          {...pullHandlers}
        >
          {/* New stories banner */}
          {newCount > 0 && (
            <div
              className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 mb-4 rounded-[12px] font-body text-[13px] font-semibold shadow-lg"
              style={{ background: 'rgb(var(--color-primary))', color: 'rgb(var(--color-bg))' }}
            >
              <button
                type="button"
                onClick={() => applyRefresh()}
                className="flex-1 text-left"
              >
                ↑ {newCount} new {newCount === 1 ? 'story' : 'stories'} — tap to refresh
              </button>
              <button
                type="button"
                onClick={clearNew}
                aria-label="Dismiss"
                className="opacity-70 hover:opacity-100 transition-opacity text-base leading-none px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Pull-to-refresh indicator */}
          {(pulling || refreshing) && (
            <div
              className="md:hidden flex items-center justify-center py-3 transition-all"
              style={{ height: pulling ? pullDistance : refreshing ? 40 : 0, overflow: 'hidden' }}
            >
              <div
                className={`w-5 h-5 border-2 border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`}
                style={{
                  borderColor: `rgb(var(--color-primary)) transparent transparent transparent`,
                  transform: pulling ? `rotate(${pullDistance * 3}deg)` : undefined,
                }}
              />
              <span className="ml-2 font-body text-[12px] font-medium" style={{ color: 'rgb(var(--color-primary))' }}>
                {refreshing ? 'Refreshing...' : 'Pull to refresh'}
              </span>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
            {loading ? (
              /* ── Skeleton loading ── */
              <>
                <div>
                  <div className="h-3 w-24 rounded animate-pulse mb-4" style={{ background: 'rgb(var(--color-surface-raised))' }} />
                  <FeaturedSkeleton />
                </div>
                <div>
                  <div className="h-3 w-32 rounded animate-pulse mb-4" style={{ background: 'rgb(var(--color-surface-raised))' }} />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StreamCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* ════════════════════════════════════════════
                    HERO CARD — Featured story
                    ════════════════════════════════════════════ */}
                {featured && !selectedCategory && (
                  <motion.section
                    ref={setCardRef(0)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="font-body text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'rgb(var(--color-primary))' }}
                      >
                        Featured
                      </span>
                      <TruthTag storyId={featured.id} compact />
                    </div>

                    <div
                      className="overflow-hidden cursor-pointer group"
                      style={{
                        borderRadius: 20,
                        border: '1px solid rgb(var(--color-border-subtle))',
                        background: 'rgb(var(--color-surface))',
                        boxShadow: '0 4px 8px rgba(var(--color-primary-rgb, 139,90,43), 0.08), 0 2px 4px rgba(var(--color-primary-rgb, 139,90,43), 0.04)',
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        if (e.target instanceof HTMLElement && (e.target.closest('a') || e.target.closest('button'))) return;
                        navigate(`/news/${featured.id}`, { state: { story: featured } });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/news/${featured.id}`, { state: { story: featured } });
                        }
                      }}
                      aria-label={`Open story: ${featured.title ?? 'Featured story'}`}
                      data-testid="featured-card"
                    >
                      {/* Image */}
                      <div className="relative overflow-hidden" style={{ height: 200 }}>
                        <ResponsiveImage
                          alt={featured.title ?? ''}
                          src={featured.image_url || getCategoryImage(featured.category || featured.tags?.[0], featured.id)}
                          sizes={CARD_SIZES}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Gradient overlay */}
                        <div
                          className="absolute inset-0"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
                        />
                        {/* Category chip */}
                        <div className="absolute top-3 left-3">
                          <span
                            className="font-body text-[10px] font-bold px-2.5 py-1 rounded-full uppercase"
                            style={{ background: 'rgb(var(--color-primary))', color: 'white' }}
                          >
                            {featured.category || 'News'}
                          </span>
                        </div>
                        {/* Headline overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h2
                            className="font-display font-bold text-white leading-snug line-clamp-2"
                            style={{ fontSize: 18, letterSpacing: '-0.3px' }}
                          >
                            <Link
                              to={`/news/${featured.id}`}
                              state={{ story: featured }}
                              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:rounded"
                              data-testid="featured-card-link"
                            >
                              {featured.title}
                            </Link>
                          </h2>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-4">
                        <p
                          className="font-body text-sm leading-relaxed line-clamp-2 mb-4"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          {featured.short_summary || featured.summary}
                        </p>
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <motion.button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); playTrack(featured); }}
                            className="flex-1 flex items-center justify-center gap-2 font-display font-bold text-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{
                              height: 52,
                              borderRadius: 12,
                              background: 'rgb(var(--color-primary))',
                              boxShadow: '0 2px 4px rgba(var(--color-primary-rgb, 139,90,43), 0.18)',
                            }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            data-testid="featured-play-btn"
                          >
                            <PlayCircle weight="fill" className="w-5 h-5" aria-hidden />
                            Oya, Play
                          </motion.button>
                          <motion.button
                            type="button"
                            className="flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[12px]"
                            style={{
                              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                              background: 'rgb(var(--color-surface-raised))',
                              color: 'rgb(var(--color-text-secondary))',
                            }}
                            onClick={(e) => handleSaveOffline(e, featured)}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            title="Save for offline"
                            data-testid="featured-offline-btn"
                          >
                            <CloudArrowDown weight="bold" className="w-5 h-5" aria-hidden />
                          </motion.button>
                          <motion.button
                            type="button"
                            className="flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[12px]"
                            style={{
                              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                              background: 'rgb(var(--color-surface-raised))',
                              color: 'rgb(var(--color-text-secondary))',
                            }}
                            onClick={(e) => shareStory(e, featured)}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            title="Share"
                            data-testid="featured-share-btn"
                          >
                            <ShareNetwork weight="bold" className="w-5 h-5" aria-hidden />
                          </motion.button>
                          <motion.button
                            type="button"
                            className="flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[12px]"
                            style={{
                              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                              background: isBookmarked(featured.id) ? 'rgba(var(--color-primary-rgb, 212,133,10), 0.12)' : 'rgb(var(--color-surface-raised))',
                              color: isBookmarked(featured.id) ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-secondary))',
                            }}
                            onClick={(e) => toggleBookmark(e, featured)}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            aria-label={isBookmarked(featured.id) ? 'Remove bookmark' : 'Bookmark this story'}
                            data-testid="featured-bookmark-btn"
                          >
                            <BookmarkSimple weight={isBookmarked(featured.id) ? 'fill' : 'regular'} className="w-5 h-5" aria-hidden />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* ════════════════════════════════════════════
                    FOR YOU — Recommendations
                    ════════════════════════════════════════════ */}
                {recommendations.length > 0 && !selectedCategory && (
                  <section data-testid="recommendations-section">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lightning weight="fill" className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} aria-hidden />
                        <span
                          className="font-display font-bold text-[14px]"
                          style={{ color: 'rgb(var(--color-text-primary))' }}
                        >
                          For You
                        </span>
                        {recoProfile?.history_count != null && (
                          <span className="font-body text-[11px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                            · based on {recoProfile.history_count} listens
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          recommendations.slice(0, 5).forEach((item, i) => {
                            setTimeout(() => addToQueue(item), i * 100);
                          });
                          showAlert({ type: 'success', title: 'PLAYLIST_QUEUED', message: `${Math.min(5, recommendations.length)} recommendations added to queue.`, code: 'PL_OK', duration: 3000 });
                        }}
                        className="flex items-center gap-1.5 font-body text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{
                          background: 'rgba(var(--color-primary-rgb, 212,133,10), 0.1)',
                          color: 'rgb(var(--color-primary))',
                        }}
                        data-testid="play-all-recommendations"
                      >
                        <PlayCircle weight="fill" className="w-3.5 h-3.5" aria-hidden />
                        Play all
                      </button>
                    </div>

                    {/* Category tags from reco profile */}
                    {(recoProfile?.top_categories?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(recoProfile?.top_categories ?? []).map((cat) => (
                          <span
                            key={cat}
                            className="font-body text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                            style={{
                              background: 'rgba(var(--color-primary-rgb, 212,133,10), 0.08)',
                              color: 'rgb(var(--color-primary))',
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 2-col reco grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {recommendations.slice(0, 6).map((item, i) => (
                        <motion.article
                          key={item.id}
                          ref={setCardRef(1 + i)}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.06 }}
                          className="overflow-hidden cursor-pointer group"
                          style={{
                            borderRadius: 14,
                            border: '1px solid rgb(var(--color-border-subtle))',
                            background: 'rgb(var(--color-surface))',
                          }}
                          onClick={() => navigate(`/news/${item.id}`, { state: { story: item } })}
                          data-testid={`reco-card-${item.id}`}
                        >
                          {/* Image */}
                          <div className="relative overflow-hidden" style={{ height: 80 }}>
                            <ResponsiveImage
                              src={item.image_url || getCategoryImage(item.category || item.tags?.[0], item.id)}
                              alt={item.category ?? ''}
                              sizes={CARD_SIZES}
                              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                          </div>
                          <div className="p-2.5">
                            <span
                              className="font-body text-[9px] font-bold uppercase tracking-wider block mb-1 capitalize"
                              style={{ color: 'rgb(var(--color-primary))' }}
                            >
                              {item.category || 'News'}
                            </span>
                            <h3
                              className="font-display font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors"
                              style={{ fontSize: 12, color: 'rgb(var(--color-text-primary))' }}
                            >
                              {item.title}
                            </h3>
                            <p
                              className="font-body text-[10px] mt-1 truncate"
                              style={{ color: 'rgb(var(--color-text-secondary))' }}
                            >
                              {item.source}
                            </p>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  </section>
                )}

                {/* ════════════════════════════════════════════
                    LATEST STORIES — Stream cards
                    ════════════════════════════════════════════ */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-bold text-[14px]"
                      style={{ color: 'rgb(var(--color-text-primary))' }}
                    >
                      {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Stories` : 'Latest Stories'}
                    </h2>
                    <span
                      className="font-body text-[12px]"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {streamFinal.length} {streamFinal.length === 1 ? 'story' : 'stories'}
                    </span>
                  </div>

                  {streamFinal.length === 0 && !loading && (
                    <div
                      className="flex flex-col items-center justify-center py-12 text-center rounded-[16px]"
                      style={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border-subtle))' }}
                    >
                      <Broadcast weight="fill" className="w-8 h-8 mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-hidden />
                      <p className="font-display font-bold text-[15px] mb-1" style={{ color: 'rgb(var(--color-text-primary))' }}>
                        Nothing here yet.
                      </p>
                      <p className="font-body text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {selectedCategory ? 'No stories in this category. Try another.' : 'Stories are being prepared — check back soon.'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {streamFinal.map((item, idx) => (
                      <motion.article
                        key={item.id}
                        ref={setCardRef(7 + idx)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: Math.min(idx * 0.04, 0.3) }}
                        className="flex gap-3 cursor-pointer group overflow-hidden"
                        style={{
                          padding: 12,
                          borderRadius: 16,
                          border: '1px solid rgb(var(--color-border-subtle))',
                          background: 'rgb(var(--color-surface))',
                        }}
                        onClick={() => navigate(`/news/${item.id}`, { state: { story: item } })}
                        data-testid={`stream-card-${item.id}`}
                      >
                        {/* Thumbnail */}
                        <div
                          className="shrink-0 overflow-hidden relative"
                          style={{ width: 80, height: 80, borderRadius: 10 }}
                        >
                          <ResponsiveImage
                            src={item.image_url || getCategoryImage(item.category || item.tags?.[0], item.id)}
                            alt={item.category ?? ''}
                            sizes={THUMB_SIZES}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                          />
                          <div className={`absolute inset-0 ${getCategoryColor(item.category || item.tags?.[0])} mix-blend-multiply opacity-40`} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            {/* Meta row */}
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="font-body text-[10px] font-bold uppercase tracking-wider capitalize shrink-0"
                                style={{ color: 'rgb(var(--color-primary))' }}
                              >
                                {item.category || 'News'}
                              </span>
                              <TruthTag storyId={item.id} compact />
                              {item.aggregator && (
                                <span
                                  className="font-body text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px] shrink-0"
                                  style={{
                                    background: 'rgba(var(--color-primary-rgb, 212,133,10), 0.08)',
                                    color: 'rgb(var(--color-primary))',
                                  }}
                                  data-testid={`aggregator-badge-${item.id}`}
                                >
                                  {item.aggregator === 'mediastack' ? 'Mediastack' : 'NewsData'}
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3
                              className="font-display font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1"
                              style={{ fontSize: 14, color: 'rgb(var(--color-text-primary))', letterSpacing: '-0.2px' }}
                            >
                              {item.title}
                            </h3>
                          </div>

                          {/* Footer row */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Source + time */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="font-body text-[11px] truncate"
                                style={{ color: 'rgb(var(--color-text-secondary))' }}
                              >
                                {item.source ?? 'RSS'}
                              </span>
                              {item.published && (
                                <span
                                  className="font-body text-[11px] shrink-0"
                                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                                >
                                  · {new Date(item.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Play */}
                              <motion.button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); playTrack(item); }}
                                className="flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                style={{
                                  width: 36, height: 36,
                                  background: 'rgb(var(--color-primary))',
                                  color: 'white',
                                  flexShrink: 0,
                                }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                aria-label={`Play: ${item.title}`}
                                data-testid={`play-btn-${item.id}`}
                              >
                                <PlayCircle weight="fill" className="w-4 h-4" aria-hidden />
                              </motion.button>

                              {/* Bookmark */}
                              <motion.button
                                type="button"
                                onClick={(e) => toggleBookmark(e, item)}
                                className="flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                style={{
                                  width: 36, height: 36, flexShrink: 0,
                                  color: isBookmarked(item.id) ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-secondary))',
                                }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                aria-label={isBookmarked(item.id) ? `Remove bookmark: ${item.title}` : `Bookmark: ${item.title}`}
                                data-testid={`bookmark-btn-${item.id}`}
                              >
                                <BookmarkSimple weight={isBookmarked(item.id) ? 'fill' : 'regular'} className="w-4 h-4" aria-hidden />
                              </motion.button>

                              {/* More actions — queue / offline / share */}
                              <motion.button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToQueue(item);
                                  showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: `Added to queue: ${item.title?.slice(0, 40)}...`, code: 'Q_ADD', duration: 2000 });
                                }}
                                className="flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                style={{ width: 36, height: 36, flexShrink: 0, color: 'rgb(var(--color-text-secondary))' }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                title="Add to queue"
                                aria-label="Add to queue"
                                data-testid={`queue-btn-${item.id}`}
                              >
                                <Queue weight="bold" className="w-4 h-4" aria-hidden />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>

                  {/* Load more sentinel */}
                  {!allLoaded && (
                    <div
                      ref={loadMoreRef}
                      className="flex items-center justify-center py-6 min-h-[80px]"
                      data-testid="load-more-sentinel"
                    >
                      {loadingMore && (
                        <div
                          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: 'rgb(var(--color-primary)) transparent transparent transparent' }}
                          aria-hidden
                        />
                      )}
                    </div>
                  )}

                  {allLoaded && filteredNews.length > 10 && (
                    <p
                      className="text-center font-body text-[12px] py-4"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                      data-testid="feed-end"
                    >
                      You're all caught up · {filteredNews.length} stories
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════
          RIGHT SIDEBAR — Telemetry (desktop xl+)
          ══════════════════════════════════════════════════════ */}
      <aside
        className="w-64 xl:w-72 hidden xl:flex flex-col shrink-0"
        style={{ borderLeft: '1px solid rgb(var(--color-border-subtle))', background: 'rgb(var(--color-bg))' }}
        data-testid="telemetry-sidebar"
      >
        <div
          className="h-10 flex items-center px-4 shrink-0"
          style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}
        >
          <span className="font-display font-bold text-[12px] flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <Pulse weight="bold" className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--color-primary))' }} aria-hidden />
            Live data
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-5 custom-scroll">
          {/* Regional weather */}
          <div
            className="p-3 rounded-[14px]"
            style={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border-subtle))' }}
          >
            <p className="font-body text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {regionalEnv?.label || 'Nigeria'}
            </p>
            <div className="flex items-end justify-between">
              <span className="font-display font-bold text-[24px]" style={{ color: 'rgb(var(--color-text-primary))', letterSpacing: '-0.5px' }}>
                {regionalEnv?.temp_c != null ? `${regionalEnv.temp_c}°C` : '—'}
              </span>
              <div className="text-right">
                {regionalEnv?.humidity != null && (
                  <p className="font-body text-[11px] font-semibold" style={{ color: 'rgb(var(--color-primary))' }}>
                    {regionalEnv.humidity}% humidity
                  </p>
                )}
                {regionalEnv?.wind_kmh != null && (
                  <p className="font-body text-[11px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {regionalEnv.wind_kmh} km/h wind
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Trending tags */}
          <div>
            <p className="font-display font-bold text-[12px] mb-2" style={{ color: 'rgb(var(--color-text-primary))' }}>
              Trending
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(trendingTags.length ? trendingTags : ['#Economy', '#Tech', '#Politics', '#Health', '#Africa']).slice(0, 8).map((tag) => {
                const style = getTagLabelClass(tag);
                return (
                  <span
                    key={tag}
                    className={`font-body text-[11px] font-semibold px-2 py-1 rounded-full cursor-default ${style.text} ${style.bg} ${style.border}`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Source matrix */}
          <div
            className="p-3 rounded-[14px]"
            style={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border-subtle))' }}
            data-testid="source-breakdown-widget"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-bold text-[12px]" style={{ color: 'rgb(var(--color-text-primary))' }}>
                Sources
              </p>
              <span className="font-body text-[11px] font-bold" style={{ color: 'rgb(var(--color-primary))' }}>
                {getTotalSources()} live
              </span>
            </div>
            {(() => {
              const hs = getHealthSummary();
              const total = Number(hs?.total) || getTotalSources() || 1;
              const g = Number(hs?.green) || 0, a = Number(hs?.amber) || 0, r = Number(hs?.red) || 0;
              return (
                <>
                  <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-2" data-testid="health-bar">
                    {g > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(g / total) * 100}%` }} />}
                    {a > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(a / total) * 100}%` }} />}
                    {r > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(r / total) * 100}%` }} />}
                  </div>
                  <div className="flex items-center gap-3 font-body text-[11px] mb-3">
                    <span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{g} healthy</span>
                    {a > 0 && <span className="flex items-center gap-1 text-amber-500"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{a}</span>}
                    {r > 0 && <span className="flex items-center gap-1 text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{r}</span>}
                  </div>
                </>
              );
            })()}
            <div className="space-y-0.5 font-body text-[11px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <div className="flex justify-between">
                <span>Local (NG)</span>
                <span className="font-semibold">{getLocalSources()}</span>
              </div>
              <div className="flex justify-between">
                <span>Continental</span>
                <span className="font-semibold">{getContinentalSources()}</span>
              </div>
              <div className="flex justify-between">
                <span>International</span>
                <span className="font-semibold">{getInternationalSources()}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshHealth()}
              className="mt-2.5 font-body text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ color: 'rgb(var(--color-primary))' }}
              data-testid="refresh-health-btn"
            >
              Refresh ↻
            </button>
          </div>

          {/* Listener / source counts */}
          <div
            className="grid grid-cols-2 gap-2"
          >
            <div
              className="p-3 rounded-[12px] flex flex-col gap-1"
              style={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border-subtle))' }}
            >
              <span className="font-body text-[10px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>Listeners</span>
              <span className="font-display font-bold text-[18px]" style={{ color: 'rgb(var(--color-text-primary))', letterSpacing: '-0.3px' }}>
                {metrics?.listeners_today ?? metrics?.total_listeners ?? '—'}
              </span>
            </div>
            <div
              className="p-3 rounded-[12px] flex flex-col gap-1"
              style={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border-subtle))' }}
            >
              <span className="font-body text-[10px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>Sources</span>
              <span className="font-display font-bold text-[18px]" style={{ color: 'rgb(var(--color-primary))', letterSpacing: '-0.3px' }}>
                {metrics?.total_sources ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
};

export default DashboardPage;
