import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useSWR from 'swr';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
import { useAudioPrefetch, useObservedAudioPrefetch, prefetchAndCacheStory } from '../hooks/useAudioPrefetch';
import usePullToRefresh from '../hooks/usePullToRefresh';
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
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { showAlert } = useHapticAlert();
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState<SortOrderType>('latest');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Story[]>(() => {
    try {
      const c = JSON.parse(localStorage.getItem('narvo_reco_cache') || '{}') as { at?: number; items?: Story[] };
      if (c.at && Date.now() - c.at < 3600000) return c.items || [];
    } catch { /* ignore */ }
    return [];
  });
  const [recoProfile, setRecoProfile] = useState<RecoProfileData | null>(() => {
    try {
      const c = JSON.parse(localStorage.getItem('narvo_reco_cache') || '{}') as { at?: number; profile_summary?: RecoProfileData };
      if (c.at && Date.now() - c.at < 3600000) return c.profile_summary || null;
    } catch { /* ignore */ }
    return null;
  });
  const [, setRecoLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [regionalEnv, setRegionalEnv] = useState<RegionalEnvData | null>(null);

  // Prefetch audio: idle batch uses user voice/language and writes to client cache
  const prefetchArticles = recommendations.length > 0 ? recommendations.slice(0, 5) : (Array.isArray(news) ? news : []).slice(0, 5);
  useAudioPrefetch(prefetchArticles, voiceModel, broadcastLanguage, 5);

  const [showTelemetry, setShowTelemetry] = useState(true);

  const fetcher = useCallback(async (): Promise<{ news: Story[]; metrics: MetricsData | null; settings: { aggregator_mediastack?: boolean; aggregator_newsdata?: boolean; interests?: string[] } }> => {
    const settings = (await api.get('api/settings/guest').then(r => r.json())) as { aggregator_mediastack?: boolean; aggregator_newsdata?: boolean; interests?: string[] };
    const ms = settings.aggregator_mediastack !== false;
    const nd = settings.aggregator_newsdata !== false;
    const enabledSources = [ms && 'mediastack', nd && 'newsdata'].filter(Boolean).join(',');
    const aggParam = enabledSources ? `&aggregator_sources=${enabledSources}` : '';
    const newsRes = await api.get(`api/news?limit=50&include_aggregators=true${aggParam}`);
    const newsJson = await newsRes.json();
    const newsData = Array.isArray(newsJson) ? newsJson : [];
    if (!newsRes.ok) throw new Error(newsRes.status === 422 ? 'Invalid request (e.g. limit too high)' : `News API ${newsRes.status}`);
    const metricsData = await api.get('api/metrics').then(r => r.json()).catch(() => null) as MetricsData | null;
    return { news: newsData, metrics: metricsData, settings };
  }, []);

  const { data, mutate, isLoading: swrLoading } = useSWR('dashboard-feed', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
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

  // Telemetry: trending tags and regional env (weather via free API)
  useEffect(() => {
    api.get('api/trending').then(r => r.json()).then((data: { tags?: string[] }) => {
      setTrendingTags(data.tags || []);
    }).catch(() => setTrendingTags(['#POLITICS', '#ECONOMY', '#TECH', '#AFRICA', '#HEALTH']));

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
      .then(setRegionalEnv)
      .catch(() => setRegionalEnv({ label: lagos.label, temp_c: null, humidity: null, wind_kmh: null }));
  }, []);

  // Fetch recommendations in parallel (non-blocking)
  useEffect(() => {
    const userId = user?.id || 'guest';
    setRecoLoading(true);
    api.get(`api/recommendations/${userId}?limit=6`)
      .then(r => r.json())
      .then((data: { recommendations?: Story[]; profile_summary?: RecoProfileData }) => {
        const items = data.recommendations || [];
        const profile_summary = data.profile_summary || null;
        setRecommendations(items);
        setRecoProfile(profile_summary);
        try {
          localStorage.setItem('narvo_reco_cache', JSON.stringify({ items, profile_summary, at: Date.now() }));
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setRecoLoading(false));
  }, [user?.id]);

  // Accessibility: lateral swipe (pull-to-refresh) can be disabled in /accessibility
  const [gesturalSwipeEnabled, setGesturalSwipeEnabled] = useState(true);
  useEffect(() => {
    const read = () => {
      try {
        const c = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}') as { gestural_swipe?: boolean };
        setGesturalSwipeEnabled(c.gestural_swipe !== false);
      } catch { setGesturalSwipeEnabled(true); }
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
    limit: 10,
    rootMargin: '120px',
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
      prefetchAndCacheStory(item, voiceModel, broadcastLanguage).catch(() => {});
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
      prefetchAndCacheStory(item, voiceModel, broadcastLanguage).catch(() => {});
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

  return (
    <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
      {/* Primary Feed */}
      <main className="flex-1 flex flex-col bg-background-dark min-w-0 min-h-0 overflow-hidden">
        {/* Sub-Header – compact 8pt grid (§4) */}
        <div className="h-9 md:h-12 flex items-center justify-between px-4 md:px-6 bg-surface/30 narvo-border-b shrink-0 overflow-hidden gap-2">
          {/* Left: LGS + pulse; on mobile, weather is left-aligned here for space before sort */}
          <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
            <span className="mono-ui text-[9px] md:text-[10px] text-primary font-bold shrink-0 hidden xs:inline">LGS_01</span>
            <div className="w-1.5 h-1.5 bg-primary animate-pulse shrink-0" />
            {/* Mobile: weather left-aligned to create space between it and sort/filter */}
            <div className="md:hidden flex items-center gap-1.5 narvo-border bg-surface/20 px-2 py-1 min-h-[28px] ml-1" data-testid="mobile-regional-env">
              <CloudSun weight="fill" className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-display text-xs font-bold text-content whitespace-nowrap">
                {regionalEnv?.temp_c != null ? `${regionalEnv.temp_c}°` : '—'}
              </span>
              <span className="mono-ui text-[8px] text-forest truncate max-w-[4rem]">
                {regionalEnv?.label?.split(',')[0] || '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-0">
            <div className="flex items-center border border-forest p-0.5" data-testid="source-filter-toggle">
              <span className="mono-ui text-[8px] md:text-[9px] text-forest mr-1 hidden sm:inline">SOURCE:</span>
              {(['all', 'rss', 'aggregators'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSourceFilter(f)}
                  className={`px-2 py-0.5 mono-ui text-[9px] md:text-[10px] font-bold transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 ${sourceFilter === f ? 'bg-primary text-background-dark' : 'text-content-dim-accessible hover:text-content'}`}
                  data-testid={`filter-${f}`}
                >
                  {f === 'all' ? 'ALL' : f === 'rss' ? 'RSS' : 'AGG'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 border border-forest p-0.5">
              <span className="mono-ui text-[8px] md:text-[9px] text-forest font-bold uppercase">SORT:</span>
              <button
                onClick={() => setSortOrder(s => s === 'latest' ? 'oldest' : 'latest')}
                className="mono-ui text-[9px] md:text-[10px] text-primary px-2 py-0.5 hover:bg-primary hover:text-background-dark transition-colors font-bold focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                data-testid="sort-btn"
              >
                {sortOrder === 'latest' ? 'NEW' : 'OLD'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Telemetry Drawer – compact, real data (hidden on xl) */}
        <div className="xl:hidden overflow-hidden">
          <button
            onClick={() => setShowTelemetry(v => !v)}
            className="w-full h-8 flex items-center justify-between px-3 bg-surface/20 narvo-border-b"
            data-testid="telemetry-toggle"
            aria-expanded={showTelemetry}
          >
            <div className="flex items-center gap-2">
              <Broadcast weight="fill" className="w-3 h-3 text-primary shrink-0" />
              <span className="mono-ui text-[9px] text-content-secondary font-bold tracking-widest">TELEMETRY</span>
              <span className="mono-ui text-[9px] text-primary font-bold">{getTotalSources()} FEEDS</span>
            </div>
            <span className={`mono-ui text-[9px] text-forest transition-transform ${showTelemetry ? 'rotate-90' : ''}`} aria-hidden>&#9654;</span>
          </button>
          {showTelemetry && (
            <div className="bg-surface/10 narvo-border-b px-3 py-2 space-y-2 max-h-52 overflow-y-auto custom-scroll">
              {trendingTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {trendingTags.slice(0, 6).map(tag => {
                    const style = getTagLabelClass(tag);
                    return (
                      <span key={tag} className={`narvo-border px-1.5 py-0.5 mono-ui text-[9px] ${style.text} ${style.bg} ${style.border}`}>{tag}</span>
                    );
                  })}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="mono-ui text-[9px] text-content-secondary font-bold">SOURCE_MATRIX</span>
                  <span className="mono-ui text-[9px] text-primary font-bold">{getTotalSources()} FEEDS</span>
                </div>
                {(() => {
                  const hs = getHealthSummary();
                  const total = Number(hs?.total) || getTotalSources() || 1;
                  const g = Number(hs?.green) || 0, a = Number(hs?.amber) || 0, r = Number(hs?.red) || 0;
                  return (
                    <div className="flex h-1 w-full gap-px mb-0.5">
                      {g > 0 ? <div className="bg-emerald-500" style={{ width: `${(g / total) * 100}%` }} /> : null}
                      {a > 0 ? <div className="bg-amber-500" style={{ width: `${(a / total) * 100}%` }} /> : null}
                      {r > 0 ? <div className="bg-red-500" style={{ width: `${(r / total) * 100}%` }} /> : null}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2 mono-ui text-[8px] text-content-dim-accessible">
                  <span>LOCAL: {getLocalSources()}</span>
                  <span>CONT: {getContinentalSources()}</span>
                  <span>INTL: {getInternationalSources()}</span>
                </div>
              </div>
              {metrics && (
                <div className="flex items-center gap-2 mono-ui text-[8px] text-content-dim-accessible">
                  <span>SOURCES: <span className="text-primary font-bold">{metrics.total_sources ?? 0}</span></span>
                  <span>LISTENERS: <span className="text-primary font-bold">{metrics.listeners_today ?? metrics.total_listeners ?? '—'}</span></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feed Content */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll px-4 py-3 md:px-6 md:py-4 pb-28 md:pb-6 relative"
          data-testid="news-feed"
          {...pullHandlers}
        >
          {/* Pull-to-refresh indicator (mobile) */}
          {(pulling || refreshing) && (
            <div
              className="md:hidden flex items-center justify-center py-3 transition-all"
              style={{ height: pulling ? pullDistance : refreshing ? 40 : 0, overflow: 'hidden' }}
            >
              <div className={`w-5 h-5 border-2 border-[rgb(var(--color-primary))] border-t-transparent ${refreshing ? 'animate-spin' : ''}`}
                style={{ transform: pulling ? `rotate(${pullDistance * 3}deg)` : undefined, borderRadius: '50%' }}
              />
              <span className="ml-2 font-mono text-[11px] text-[rgb(var(--color-primary))]">
                {refreshing ? 'REFRESHING...' : 'PULL TO REFRESH'}
              </span>
            </div>
          )}
          <div className="max-w-4xl mx-auto flex flex-col gap-8 md:gap-12">
            {loading ? (
              <>
                <div>
                  <div className="h-3 w-32 bg-forest/10 animate-pulse mb-4" />
                  <FeaturedSkeleton />
                </div>
                <div>
                  <div className="h-3 w-40 bg-forest/10 animate-pulse mb-4" />
                  <div className="narvo-border bg-surface/20 divide-y divide-forest/10">
                    {Array.from({ length: 5 }).map((_, i) => <StreamCardSkeleton key={i} />)}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Featured Transmission */}
                {featured && (
                  <motion.section
                    ref={setCardRef(0)}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <span className="mono-ui text-[12px] md:text-xs text-primary block mb-4 font-bold tracking-[0.2em]">{'//'} {t('dashboard.featured_transmission')}</span>
                    <div
                      role="button"
                      tabIndex={0}
                      className="narvo-border narvo-featured-card bg-surface/50 group relative overflow-hidden flex flex-col md:flex-row min-h-[200px] md:min-h-[320px] cursor-pointer w-full text-left border"
                      onClick={(e) => {
                        if (e.target instanceof HTMLElement && (e.target.closest('a') || e.target.closest('button'))) return;
                        navigate(`/news/${featured.id}`, { state: { story: featured } });
                      }}
                      onKeyDown={(e) => {
                        if (e.target instanceof HTMLElement && (e.target.closest('a') || e.target.closest('button'))) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/news/${featured.id}`, { state: { story: featured } });
                        }
                      }}
                      aria-label={`Open article: ${featured.title ?? 'Featured story'}`}
                      data-testid="featured-card"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="md:w-1/2 relative bg-background-dark overflow-hidden min-h-[120px] md:min-h-[200px]">
                        <ResponsiveImage
                          alt={featured.title ?? ''}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale hover:grayscale-0 absolute inset-0"
                          src={featured.image_url || getCategoryImage(featured.category || featured.tags?.[0], featured.id)}
                          sizes={CARD_SIZES}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 to-transparent" />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-primary text-background-dark font-mono text-[11px] md:text-[12px] font-bold px-2 py-0.5 uppercase">Feature</span>
                          <TruthTag storyId={featured.id} compact />
                        </div>
                      </div>
                      <div className="flex-1 p-3 md:p-8 flex flex-col justify-between overflow-hidden min-w-0">
                        <div className="min-w-0">
                          <span className="mono-ui text-[11px] md:text-xs text-forest block mb-1 md:mb-2 font-bold tracking-widest truncate">NARRATIVE_NODE {'//'} {featured.category?.toUpperCase()}</span>
                          <h2 className="font-display text-lg md:text-3xl font-bold uppercase tracking-tight text-content mb-1 md:mb-4 leading-none group-hover:text-primary transition-colors line-clamp-2 md:line-clamp-3 break-words min-w-0">
                            <Link
                              to={`/news/${featured.id}`}
                              state={{ story: featured }}
                              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))]"
                              data-testid="featured-card-link"
                            >
                              {featured.title}
                            </Link>
                          </h2>
                          <p className="text-xs md:text-base text-forest font-mono leading-relaxed mb-2 md:mb-6 opacity-80 line-clamp-2 md:line-clamp-3 break-words min-w-0 overflow-hidden">
                            {featured.short_summary || featured.summary}
                          </p>
                        </div>
                        <div className="flex gap-2 md:gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); playTrack(featured); }}
                            className="flex-1 h-9 md:h-12 bg-primary text-background-dark font-display font-bold text-xs md:text-base uppercase flex items-center justify-center gap-2 md:gap-3 hover:bg-white transition-all"
                            data-testid="featured-play-btn"
                          >
                            <PlayCircle weight="fill" className="w-5 h-5 md:w-6 md:h-6" />
                            <span>{t('dashboard.listen_now')}</span>
                          </button>
                          <button
                            className="w-9 h-9 md:w-12 md:h-12 narvo-border flex items-center justify-center text-forest hover:text-primary transition-colors"
                            onClick={(e) => handleSaveOffline(e, featured)}
                            title="Save for Offline"
                            data-testid="featured-offline-btn"
                          >
                            <CloudArrowDown weight="bold" className="w-5 h-5" />
                          </button>
                          <button
                            className="w-9 h-9 md:w-12 md:h-12 narvo-border flex items-center justify-center text-forest hover:text-primary transition-colors"
                            onClick={(e) => shareStory(e, featured)}
                            title="Share"
                            data-testid="featured-share-btn"
                          >
                            <ShareNetwork weight="bold" className="w-5 h-5" />
                          </button>
                          <button
                            className={`w-9 h-9 md:w-12 md:h-12 narvo-border flex items-center justify-center transition-colors ${isBookmarked(featured.id) ? 'text-primary border-primary' : 'text-forest hover:text-primary'}`}
                            onClick={(e) => toggleBookmark(e, featured)}
                            aria-label={isBookmarked(featured.id) ? 'Remove bookmark' : 'Bookmark'}
                            data-testid="featured-bookmark-btn"
                          >
                            <BookmarkSimple weight={isBookmarked(featured.id) ? 'fill' : 'regular'} className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Recommended For You */}
                {recommendations.length > 0 && (
                  <motion.section
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    data-testid="recommendations-section"
                  >
                    <div className="flex items-center justify-between border-b border-primary/30 pb-2 mb-3 gap-2">
                      <div className="flex items-center gap-2 min-w-0 shrink">
                        <Lightning weight="fill" className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="mono-ui text-[11px] md:text-xs text-primary font-bold tracking-[0.15em] shrink-0">{'//'} FOR_YOU</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {recoProfile && (
                          <span className="mono-ui text-[9px] md:text-[10px] text-content-dim-accessible uppercase hidden sm:inline">
                            {recoProfile.history_count} listens
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            recommendations.slice(0, 5).forEach((item, i) => {
                              setTimeout(() => addToQueue(item), i * 100);
                            });
                            showAlert({ type: 'success', title: 'PLAYLIST_QUEUED', message: `${Math.min(5, recommendations.length)} recommendations added to queue.`, code: 'PL_OK', duration: 3000 });
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-primary text-background-dark mono-ui text-[9px] md:text-[11px] font-bold hover:bg-white transition-colors whitespace-nowrap"
                          data-testid="play-all-recommendations"
                        >
                          <PlayCircle weight="fill" className="w-3 h-3" />
                          PLAY_ALL
                        </button>
                      </div>
                    </div>

                    {(recoProfile?.top_categories?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(recoProfile?.top_categories ?? []).map(cat => (
                          <span key={cat} className="bg-primary/10 text-primary mono-ui text-[9px] px-1.5 py-0.5 border border-primary/20 uppercase">
                            {cat}
                          </span>
                        ))}
                        {(recoProfile?.expanded_topics ?? []).slice(0, 3).map(topic => (
                          <span key={topic} className="bg-forest/10 text-forest mono-ui text-[9px] px-1.5 py-0.5 border border-forest/20">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 narvo-reco-grid" style={{ gap: 'var(--density-gap, 12px)' }}>
                      {recommendations.slice(0, 6).map((item, i) => (
                        <motion.article
                          key={item.id}
                          ref={setCardRef(1 + i)}
                          variants={cardVariants}
                          className="narvo-border bg-surface/30 group cursor-pointer hover:bg-surface/50 hover:border-primary/30 transition-all overflow-hidden narvo-reco-card"
                          onClick={() => navigate(`/news/${item.id}`, { state: { story: item } })}
                          data-testid={`reco-card-${item.id}`}
                        >
                          <div className="hidden md:block h-24 relative overflow-hidden">
                            <ResponsiveImage
                              src={item.image_url || getCategoryImage(item.category || item.tags?.[0], item.id)}
                              alt={item.category ?? ''}
                              sizes={CARD_SIZES}
                              className="w-full h-full object-cover opacity-40 group-hover:opacity-70 grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 to-transparent" />
                            <div className="absolute top-1.5 left-1.5">
                              <span className="bg-primary/90 text-background-dark mono-ui text-[9px] font-bold px-1 py-0.5 leading-none inline-flex items-center uppercase">{item.category || 'General'}</span>
                            </div>
                          </div>
                          <div className="p-2 md:p-2.5 narvo-reco-card-inner" style={{ padding: 'var(--density-card-padding, 12px)' }}>
                            <span className="md:hidden mono-ui text-[9px] text-primary font-bold uppercase mb-0.5 block">{item.category || 'General'}</span>
                            <h3 className="font-display text-xs font-bold text-content uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center justify-between mt-0.5 md:mt-1">
                              <span className="mono-ui text-[8px] md:text-[9px] text-forest truncate">{item.source}</span>
                              {item.recommendation_score != null && item.recommendation_score > 0 && (
                                <span className="mono-ui text-[8px] text-primary/60 font-bold shrink-0 ml-1">{Math.round(item.recommendation_score)}%</span>
                              )}
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  </motion.section>
                )}

                {/* Synthesized Streams */}
                <motion.section
                  className="space-y-4 md:space-y-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <div className="flex items-center justify-between border-b border-forest/30 pb-2">
                    <span className="mono-ui text-[12px] md:text-xs text-forest font-bold tracking-[0.2em]">{'//'} {t('dashboard.synthesized_streams')}</span>
                    <span className="mono-ui text-[11px] md:text-[12px] text-content-dim-accessible uppercase">Nodes: {String(stream.length).padStart(2, '0')}</span>
                  </div>

                  <motion.div variants={cardVariants} className="narvo-border bg-surface/20">
                    {stream.map((item, idx) => (
                      <motion.article
                        key={item.id}
                        ref={setCardRef(7 + idx)}
                        variants={cardVariants}
                        className={`narvo-stream-card group hover:bg-surface/40 transition-colors cursor-pointer flex gap-4 overflow-hidden min-w-0 border-b border-[rgb(var(--color-border))]/30 ${idx === stream.length - 1 ? 'border-b-0' : ''}`}
                        onClick={() => navigate(`/news/${item.id}`, { state: { story: item } })}
                        data-testid={`stream-card-${item.id}`}
                      >
                        {/* Category thumbnail */}
                        <div className="hidden sm:block w-20 h-20 md:w-24 md:h-24 shrink-0 narvo-border overflow-hidden relative">
                          <ResponsiveImage
                            src={item.image_url || getCategoryImage(item.category || item.tags?.[0], item.id)}
                            alt={item.category ?? ''}
                            sizes={THUMB_SIZES}
                            className="w-full h-full object-cover opacity-50 group-hover:opacity-80 grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t ${getCategoryColor(item.category || item.tags?.[0])} mix-blend-multiply`} />
                        </div>
                        <div className="flex-1 flex flex-col gap-2 md:gap-3 min-w-0">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div className="flex items-center flex-wrap gap-2 md:gap-3 min-w-0">
                              <span className="bg-forest/20 text-primary mono-ui text-[11px] md:text-[12px] px-1.5 md:px-2 py-0.5 leading-none inline-flex items-center border border-forest/30">SOURCE:{item.source?.toUpperCase().replace(/\s/g, '_').slice(0, 15)}</span>
                              {(item.original_sources?.length ?? 0) > 2 && (
                                <div className="flex items-center gap-1 text-primary animate-pulse" data-testid={`consensus-badge-${item.id}`}>
                                  <Fingerprint size={12} />
                                  <span className="mono-ui text-[8px] font-bold">VERIFIED_CONSENSUS</span>
                                </div>
                              )}
                              {item.aggregator && (
                                <span className="bg-primary/10 text-primary mono-ui text-[10px] px-1.5 py-0.5 leading-none inline-flex items-center border border-primary/30" data-testid={`aggregator-badge-${item.id}`}>
                                  {item.aggregator === 'mediastack' ? 'MEDIASTACK' : 'NEWSDATA'}
                                </span>
                              )}
                              <span className="mono-ui text-[11px] md:text-[12px] text-content-dim-accessible leading-none py-0.5">{timeAgo(idx)}</span>
                              <TruthTag storyId={item.id} compact />
                            </div>
                            <div className="flex flex-wrap gap-1.5 md:gap-2 max-w-full items-center">
                              {!item.tags?.length ? <TagPill tag={item.category || 'GENERAL'} className="text-[10px] md:text-[11px] px-1 md:px-1.5 py-0.5 min-h-0 leading-none" /> : null}
                              {item.tags?.slice(0, 2).map((tag, i) => (
                                <TagPill key={i} tag={tag} className="text-[10px] md:text-[11px] px-1 md:px-1.5 py-0.5 min-h-0 leading-none" />
                              ))}
                            </div>
                          </div>
                          <h3 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-content group-hover:text-primary transition-colors leading-tight break-words min-w-0 line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-sm md:text-base text-content-dim-accessible font-mono leading-relaxed line-clamp-2 break-words min-w-0 overflow-hidden">
                            {item.short_summary || item.summary}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5 mono-ui text-[10px] text-forest">
                            <Globe size={14} className="text-forest shrink-0" />
                            <span>
                              {(item.original_sources?.length ?? 1)} {(item.original_sources?.length ?? 1) === 1 ? 'SOURCE' : 'SOURCES'} ANALYZED
                            </span>
                          </div>
                          <div className="flex items-center gap-4 md:gap-6 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); playTrack(item); }}
                              className="mono-ui text-[12px] md:text-xs text-primary flex items-center gap-2 hover:text-content transition-colors"
                              data-testid={`play-btn-${item.id}`}
                            >
                              <Pulse weight="bold" className="w-4 h-4 text-forest" />
                              <span>GENERATE_AUDIO</span>
                            </button>
                            <div className="flex-1 h-[1px] bg-forest/10" />
                            <button
                              onClick={(e) => { e.stopPropagation(); addToQueue(item); showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: `Added to queue: ${item.title?.slice(0, 40)}...`, code: 'Q_ADD', duration: 2000 }); }}
                              className="text-forest hover:text-primary transition-colors"
                              title="Add to Queue"
                              data-testid={`queue-btn-${item.id}`}
                            >
                              <Queue weight="bold" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleSaveOffline(e, item)}
                              className="text-forest hover:text-primary transition-colors"
                              title="Save for Offline"
                              data-testid={`offline-btn-${item.id}`}
                            >
                              <CloudArrowDown weight="bold" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => shareStory(e, item)}
                              className="text-forest hover:text-primary transition-colors"
                              title="Share"
                              data-testid={`share-btn-${item.id}`}
                            >
                              <ShareNetwork weight="bold" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => toggleBookmark(e, item)}
                              className={`transition-colors ${isBookmarked(item.id) ? 'text-primary' : 'text-forest hover:text-primary'}`}
                              aria-label={isBookmarked(item.id) ? `Remove bookmark: ${item.title || 'story'}` : `Bookmark: ${item.title || 'story'}`}
                              data-testid={`bookmark-btn-${item.id}`}
                            >
                              <BookmarkSimple weight={isBookmarked(item.id) ? 'fill' : 'regular'} className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>

                  {!allLoaded && (
                    <div
                      ref={loadMoreRef}
                      className="min-h-[80px] flex items-center justify-center py-4"
                      data-testid="load-more-sentinel"
                    >
                      {loadingMore && (
                        <div className="w-5 h-5 border-2 border-forest border-t-transparent animate-spin rounded-full" aria-hidden />
                      )}
                    </div>
                  )}
                  {allLoaded && filteredNews.length > 10 && (
                    <div className="py-3 mono-ui text-[10px] text-content-dim-accessible text-center" data-testid="feed-end">
                      END_OF_STREAM // {filteredNews.length} NODES
                    </div>
                  )}
                  </motion.section>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar: Telemetry – compact, real data (hidden on mobile/tablet) */}
      <aside className="w-64 xl:w-72 hidden xl:flex flex-col narvo-border-l bg-background-dark shrink-0" data-testid="telemetry-sidebar">
        <div className="h-10 flex items-center px-3 narvo-border-b bg-surface/10 shrink-0">
          <span className="mono-ui text-[10px] font-bold text-content-secondary tracking-widest uppercase flex items-center gap-2">
            <Pulse weight="bold" className="text-primary w-3.5 h-3.5 shrink-0" /> {t('dashboard.telemetry')}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scroll">
          {/* REGIONAL_ENV – from API */}
          <div className="narvo-border bg-surface/20 p-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 opacity-20" aria-hidden><CloudSun weight="fill" className="w-6 h-6" /></div>
            <span className="mono-ui text-[10px] text-content block mb-2 font-bold tracking-widest">REGIONAL_ENV</span>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <span className="font-display text-xl font-bold text-content tracking-tighter">
                  {regionalEnv?.temp_c != null ? `${regionalEnv.temp_c}°C` : '—'}
                </span>
                <span className="mono-ui text-[10px] text-content-dim-accessible block mt-0.5 truncate">
                  {regionalEnv?.label || (regionalEnv?.city && regionalEnv?.region_name ? `${regionalEnv.city}, ${regionalEnv.region_name}` : 'NIGERIA, AFRICA')}
                </span>
              </div>
              <div className="text-right shrink-0">
                {regionalEnv?.humidity != null && <span className="mono-ui text-[10px] text-primary font-bold">HUM: {regionalEnv.humidity}%</span>}
                {regionalEnv?.wind_kmh != null && <span className="mono-ui text-[10px] text-content-dim-accessible block">WIND: {regionalEnv.wind_kmh}km/h</span>}
              </div>
            </div>
          </div>

          {/* Trending – from api/trending, color mapping */}
          <div>
            <span className="mono-ui text-[10px] text-content block mb-2 font-bold tracking-widest">{t('dashboard.trending')}</span>
            <div className="flex flex-wrap gap-1">
              {(trendingTags.length ? trendingTags : ['#ECONOMY', '#TECH', '#POLITICS', '#HEALTH', '#AFRICA']).slice(0, 8).map(tag => {
                const style = getTagLabelClass(tag);
                return (
                  <span key={tag} className={`narvo-border px-1.5 py-0.5 mono-ui text-[9px] hover:opacity-90 transition-opacity cursor-default ${style.text} ${style.bg} ${style.border}`}>
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Source Breakdown Widget – real health from api/sources/health */}
          <div className="narvo-border bg-surface/20 p-3 relative overflow-hidden" data-testid="source-breakdown-widget">
            <div className="absolute top-0 right-0 p-1 opacity-20" aria-hidden><Broadcast weight="fill" className="w-6 h-6" /></div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="mono-ui text-[10px] text-content font-bold tracking-widest">SOURCE_MATRIX</span>
              <span className="mono-ui text-[9px] text-primary font-bold">{getTotalSources()} FEEDS</span>
            </div>
            {(() => {
              const hs = getHealthSummary();
              const total = Number(hs?.total) || getTotalSources() || 1;
              const g = Number(hs?.green) || 0, a = Number(hs?.amber) || 0, r = Number(hs?.red) || 0;
              const u = total - g - a - r;
              return (
                <>
                  <div className="flex h-1 w-full mb-1 gap-px" data-testid="health-bar">
                    {g > 0 ? <div className="bg-emerald-500 transition-all" style={{ width: `${(g / total) * 100}%` }} /> : null}
                    {a > 0 ? <div className="bg-amber-500 transition-all" style={{ width: `${(a / total) * 100}%` }} /> : null}
                    {r > 0 ? <div className="bg-red-500 transition-all" style={{ width: `${(r / total) * 100}%` }} /> : null}
                    {u > 0 ? <div className="bg-forest/30 transition-all" style={{ width: `${(u / total) * 100}%` }} /> : null}
                  </div>
                  <div className="flex items-center gap-2 mb-2 mono-ui text-[9px]">
                    <span className="flex items-center gap-1 text-emerald-500"><span className="w-1 h-1 bg-emerald-500 inline-block" />{g}</span>
                    <span className="flex items-center gap-1 text-amber-500"><span className="w-1 h-1 bg-amber-500 inline-block" />{a}</span>
                    <span className="flex items-center gap-1 text-red-500"><span className="w-1 h-1 bg-red-500 inline-block" />{r}</span>
                    {u > 0 ? <span className="flex items-center gap-1 text-content-dim-accessible"><span className="w-1 h-1 bg-forest/30 inline-block" />{u}</span> : null}
                  </div>
                </>
              );
            })()}

            {/* Region groups – compact */}
            {[
              { key: 'local', label: 'LOCAL_NG', count: getLocalSources() },
              { key: 'continental', label: 'CONT_AF', count: getContinentalSources() },
              { key: 'international', label: 'INTL', count: getInternationalSources() },
            ].map(region => {
              const regionSources = getSourcesByRegion(region.key) as { name: string }[];
              const regionHealthCounts = regionSources.reduce((acc: Record<string, number>, src: { name: string }) => {
                const h = getHealthForSource(src.name) as { status?: string } | null | undefined;
                const s = h?.status || 'unknown';
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              return (
                <details key={region.key} className="group mb-1" data-testid={`source-region-${region.key}`}>
                  <summary className="flex items-center justify-between cursor-pointer py-1 list-none">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 shrink-0 ${regionHealthCounts.red ? 'bg-red-500' : regionHealthCounts.amber ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                      <span className="mono-ui text-[10px] text-content font-bold">{region.label}</span>
                    </div>
                    <span className="mono-ui text-[10px] font-bold text-content-dim-accessible">{region.count}</span>
                  </summary>
                  <div className="pl-3 pt-0.5 pb-0.5 space-y-0.5">
                    {regionSources.slice(0, 5).map((src: { name: string }, i: number) => {
                      const h = getHealthForSource(src.name) as { status?: string; latency_ms?: number } | null | undefined;
                      const dotColor = h?.status === 'green' ? 'bg-emerald-500' : h?.status === 'amber' ? 'bg-amber-500' : h?.status === 'red' ? 'bg-red-500' : 'bg-forest/30';
                      const latency = h?.latency_ms && h.latency_ms > 0 ? `${h.latency_ms}ms` : '';
                      return (
                        <div key={i} className="flex items-center gap-1 mono-ui text-[9px] text-content-dim-accessible" data-testid={`source-health-${src.name.replace(/\s/g, '-').toLowerCase()}`}>
                          <span className={`w-1 h-1 shrink-0 ${dotColor}`} />
                          <span className="truncate">{src.name}</span>
                          {latency ? <span className="ml-auto shrink-0">{latency}</span> : null}
                        </div>
                      );
                    })}
                    {regionSources.length > 5 ? <span className="mono-ui text-[8px] text-content-dim-accessible">+{regionSources.length - 5} more</span> : null}
                  </div>
                </details>
              );
            })}

            <div className="mt-1.5 pt-1.5 border-t border-forest" data-testid="aggregator-counts">
              <span className="mono-ui text-[9px] text-content font-bold tracking-widest block mb-1">AGGREGATOR_APIs</span>
              {[
                { name: 'Mediastack', key: 'mediastack' },
                { name: 'NewsData.io', key: 'newsdata' },
              ].map(agg => {
                const status = metrics?.aggregators?.[agg.key];
                const configured = status?.configured;
                const cached = status?.cached_count || 0;
                return (
                  <div key={agg.key} className="flex items-center justify-between py-0.5 mono-ui text-[9px]" data-testid={`aggregator-${agg.key}`}>
                    <div className="flex items-center gap-1">
                      <span className={`w-1 h-1 ${configured ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-content-dim-accessible">{agg.name}</span>
                    </div>
                    <span className={`font-bold ${cached > 0 ? 'text-primary' : 'text-content-dim-accessible'}`}>{cached > 0 ? `${cached}` : configured ? 'OK' : 'OFF'}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-forest flex items-center justify-between">
              <span className="mono-ui text-[9px] text-primary flex items-center gap-1">
                <span className="w-1 h-1 bg-primary animate-pulse" /> LIVE
              </span>
              <button
                onClick={() => refreshHealth()}
                className="mono-ui text-[8px] text-content-dim-accessible hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                data-testid="refresh-health-btn"
              >
                REFRESH
              </button>
            </div>
          </div>

          {/* NODE_HEALTH – from api/sources/health, grouped by region */}
          {(() => {
            const hs = getHealthSummary();
            const sources = hs?.sources || [] as { region?: string; status?: string }[];
            const byRegion: Record<string, { green: number; total: number }> = {};
            sources.forEach((s: { region?: string; status?: string }) => {
              const r = s.region || 'local';
              if (!byRegion[r]) byRegion[r] = { green: 0, total: 0 };
              byRegion[r].total += 1;
              if (s.status === 'green') byRegion[r].green += 1;
            });
            const regionLabels: Record<string, string> = { local: 'LOCAL', continental: 'CONT', international: 'INTL' };
            const nodes = Object.entries(byRegion).map(([key, v]) => ({
              name: regionLabels[key] || key.toUpperCase(),
              pct: v.total ? Math.round((v.green / v.total) * 100) : 0,
            })).sort((a, b) => b.pct - a.pct);
            if (nodes.length === 0) return null;
            return (
              <div>
                <span className="mono-ui text-[10px] text-content block mb-2 font-bold tracking-widest">NODE_HEALTH</span>
                <div className="space-y-2">
                  {nodes.map(node => (
                    <div key={node.name} className="space-y-0.5">
                      <div className="flex justify-between mono-ui text-[10px]">
                        <span className="text-content">{node.name}</span>
                        <span className="text-primary font-bold">{node.pct}%</span>
                      </div>
                      <div className="h-1 w-full bg-forest/20"><div className="h-full bg-primary transition-all" style={{ width: `${node.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Metrics – from api/metrics */}
          <div className="grid grid-cols-2 gap-px narvo-border bg-forest">
            <div className="bg-background-dark p-2 flex flex-col justify-between min-h-[56px]">
              <span className="mono-ui text-[9px] text-content-dim-accessible">LISTENERS</span>
              <span className="font-display text-lg font-bold text-content tracking-tighter">{metrics?.listeners_today ?? metrics?.total_listeners ?? '—'}</span>
            </div>
            <div className="bg-background-dark p-2 flex flex-col justify-between min-h-[56px]">
              <span className="mono-ui text-[9px] text-content-dim-accessible">SOURCES</span>
              <span className="font-display text-lg font-bold text-primary tracking-tighter">{metrics?.total_sources ?? '—'}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DashboardPage;
