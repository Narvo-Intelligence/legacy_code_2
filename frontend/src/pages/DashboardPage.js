import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PlayCircle, Translate, BookmarkSimple, ArrowDown, Pulse, CloudSun, ShareNetwork, Queue, CloudArrowDown, Broadcast, Lightning } from '@phosphor-icons/react';
import { useAudio } from '../contexts/AudioContext';
import { useContentSources } from '../contexts/ContentSourcesContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAudioPrefetch } from '../hooks/useAudioPrefetch';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { TagPill } from '../components/HashtagText';
import { FeaturedSkeleton, StreamCardSkeleton } from '../components/Skeleton';
import TruthTag from '../components/TruthTag';
import { useHapticAlert } from '../components/HapticAlerts';
import { getCategoryImage, getCategoryColor } from '../lib/categoryImages';
import { getTagLabelClass } from '../lib/tagLabelColors';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';

// Save article for offline
const saveForOffline = async (item) => {
  try {
    await api.post('api/offline/save', {
      story_id: item.id,
      title: item.title,
      summary: item.summary || '',
      narrative: item.narrative || '',
      source: item.source || '',
      category: item.category || 'General',
      image_url: item.image_url || null
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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'rss' | 'aggregators'
  const [, setUserAggPrefs] = useState(null);
  const { playTrack, addToQueue } = useAudio();
  const { getTotalSources, getLocalSources, getInternationalSources, getContinentalSources, getSourcesByRegion, getHealthForSource, getHealthSummary, refreshHealth } = useContentSources();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { showAlert } = useHapticAlert();
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState('latest');
  const [userInterests, setUserInterests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recoProfile, setRecoProfile] = useState(null);
  const [, setRecoLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState([]);
  const [regionalEnv, setRegionalEnv] = useState(null);

  // Prefetch audio for the first 3 articles in idle time
  useAudioPrefetch(news.slice(0, 3), 'nova', 3);
  const [showTelemetry, setShowTelemetry] = useState(false);

  const fetchDashboardData = React.useCallback(async () => {
    const settings = await api.get('api/settings/guest').then(r => r.json());
    const ms = settings.aggregator_mediastack !== false;
    const nd = settings.aggregator_newsdata !== false;
    setUserAggPrefs({ mediastack: ms, newsdata: nd });
    if (settings.interests?.length) setUserInterests(settings.interests);

    const enabledSources = [ms && 'mediastack', nd && 'newsdata'].filter(Boolean).join(',');
    const aggParam = enabledSources ? `&aggregator_sources=${enabledSources}` : '';

    const [newsData, metricsData] = await Promise.all([
      api.get(`api/news?limit=50&include_aggregators=true${aggParam}`).then(r => r.json()),
      api.get('api/metrics').then(r => r.json()).catch(() => null),
    ]);

    const seen = new Map();
    const deduped = [];
    for (const item of newsData) {
      const key = (item.title || '').toLowerCase().trim().slice(0, 60);
      if (!key) { deduped.push(item); continue; }
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, item);
        deduped.push(item);
      } else if (item.aggregator && !existing.aggregator) {
        // skip
      } else if (!item.aggregator && existing.aggregator) {
        const idx = deduped.indexOf(existing);
        if (idx !== -1) deduped[idx] = item;
        seen.set(key, item);
      }
    }
    setNews(deduped);
    setMetrics(metricsData);
    if (deduped.length <= 10) setAllLoaded(true);
  }, []);

  useEffect(() => {
    fetchDashboardData().catch(() => {}).finally(() => setLoading(false));
  }, [fetchDashboardData]);

  // Telemetry: trending tags and regional env (optional; backend may not expose regional-env yet)
  useEffect(() => {
    api.get('api/trending').then(r => r.json()).then(data => {
      setTrendingTags(data.tags || []);
    }).catch(() => setTrendingTags(['#POLITICS', '#ECONOMY', '#TECH', '#AFRICA', '#HEALTH']));
    api.get('api/telemetry/regional-env')
      .then(r => (r.ok ? r.json() : null))
      .then(setRegionalEnv)
      .catch(() => setRegionalEnv(null));
  }, []);

  // Fetch recommendations in parallel (non-blocking)
  useEffect(() => {
    const userId = user?.id || 'guest';
    setRecoLoading(true);
    api.get(`api/recommendations/${userId}?limit=6`)
      .then(r => r.json())
      .then(data => {
        setRecommendations(data.recommendations || []);
        setRecoProfile(data.profile_summary || null);
      })
      .catch(() => {})
      .finally(() => setRecoLoading(false));
  }, [user?.id]);

  // Pull-to-refresh
  const { containerRef, pulling, refreshing, pullDistance, handlers: pullHandlers } = usePullToRefresh(
    fetchDashboardData,
    { threshold: 70 }
  );

  const featured = news[0];
  const filteredNews = news.slice(1).filter(item => {
    if (sourceFilter === 'rss') return !item.aggregator;
    if (sourceFilter === 'aggregators') return !!item.aggregator;
    return true;
  }).sort((a, b) => {
    // If user has interests, boost matching stories to the top
    if (userInterests.length > 0) {
      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aMatch = userInterests.includes(aCat) ? 1 : 0;
      const bMatch = userInterests.includes(bCat) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
    }
    if (sortOrder === 'oldest') return new Date(a.published || 0) - new Date(b.published || 0);
    return new Date(b.published || 0) - new Date(a.published || 0);
  });
  const stream = filteredNews.slice(0, visibleCount);

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const next = visibleCount + 10;
      setVisibleCount(next);
      if (next + 1 >= news.length) setAllLoaded(true);
      setLoadingMore(false);
    }, 400);
  };

  const toggleBookmark = (e, item) => {
    e.stopPropagation();
    if (isBookmarked(item.id)) {
      removeBookmark(item.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(item);
      showAlert('BOOKMARK_ADDED');
    }
  };

  const shareStory = async (e, item) => {
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
        if (err.name !== 'AbortError') {
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

  const handleSaveOffline = async (e, item) => {
    e.stopPropagation();
    const success = await saveForOffline(item);
    if (success) {
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

  const timeAgo = (idx) => {
    const times = ['1HR_AGO', '2HR_AGO', '3HR_AGO', '4HR_AGO', '6HR_AGO', '8HR_AGO', '12HR_AGO'];
    return times[idx % times.length];
  };

  return (
    <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
      {/* Primary Feed */}
      <main className="flex-1 flex flex-col bg-background-dark min-w-0 min-h-0 overflow-hidden">
        {/* Sub-Header – compact 8pt grid (§4) */}
        <div className="h-9 md:h-12 flex items-center justify-between px-4 md:px-6 bg-surface/30 narvo-border-b shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="mono-ui text-[9px] md:text-[10px] text-primary font-bold shrink-0 hidden xs:inline">LGS_01</span>
            <div className="w-1.5 h-1.5 bg-primary animate-pulse shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <div className="flex items-center border border-forest p-0.5" data-testid="source-filter-toggle">
              {['all', 'rss', 'aggregators'].map(f => (
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
            <button
              onClick={() => setSortOrder(s => s === 'latest' ? 'oldest' : 'latest')}
              className="mono-ui text-[9px] md:text-[10px] text-primary border border-forest px-2 py-0.5 hover:bg-primary hover:text-background-dark transition-colors font-bold focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
              data-testid="sort-btn"
            >
              {sortOrder === 'latest' ? 'NEW' : 'OLD'}
            </button>
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
                  const total = hs?.total || getTotalSources() || 1;
                  const g = hs?.green || 0, a = hs?.amber || 0, r = hs?.red || 0;
                  return (
                    <div className="flex h-1 w-full gap-px mb-0.5">
                      {g > 0 && <div className="bg-emerald-500" style={{ width: `${(g / total) * 100}%` }} />}
                      {a > 0 && <div className="bg-amber-500" style={{ width: `${(a / total) * 100}%` }} />}
                      {r > 0 && <div className="bg-red-500" style={{ width: `${(r / total) * 100}%` }} />}
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
          ref={containerRef}
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
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <span className="mono-ui text-[12px] md:text-xs text-primary block mb-4 font-bold tracking-[0.2em]">{'//'} {t('dashboard.featured_transmission')}</span>
                    <article
                      className="narvo-border bg-surface/50 group relative overflow-hidden flex flex-col md:flex-row min-h-[280px] md:min-h-[320px] cursor-pointer"
                      onClick={() => navigate(`/news/${featured.id}`)}
                      data-testid="featured-card"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="md:w-1/2 relative bg-background-dark overflow-hidden min-h-[180px] md:min-h-[200px]">
                        <img
                          alt={featured.title}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale hover:grayscale-0 absolute inset-0"
                          src={featured.image_url || getCategoryImage(featured.category || featured.tags?.[0], featured.id)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 to-transparent" />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-primary text-background-dark font-mono text-[11px] md:text-[12px] font-bold px-2 py-0.5 uppercase">Feature</span>
                          <TruthTag storyId={featured.id} compact />
                        </div>
                      </div>
                      <div className="flex-1 p-4 md:p-8 flex flex-col justify-between overflow-hidden">
                        <div>
                          <span className="mono-ui text-[12px] md:text-xs text-forest block mb-2 font-bold tracking-widest">NARRATIVE_NODE {'//'} {featured.category?.toUpperCase()}</span>
                          <h2 className="font-display text-xl md:text-3xl font-bold uppercase tracking-tight text-content mb-2 md:mb-4 leading-none group-hover:text-primary transition-colors line-clamp-3">
                            {featured.title}
                          </h2>
                          <p className="text-sm md:text-base text-forest font-mono leading-relaxed mb-4 md:mb-6 opacity-80 line-clamp-3">
                            {featured.summary}
                          </p>
                        </div>
                        <div className="flex gap-3 md:gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); playTrack(featured); }}
                            className="flex-1 h-11 md:h-12 bg-primary text-background-dark font-display font-bold text-sm md:text-base uppercase flex items-center justify-center gap-2 md:gap-3 hover:bg-white transition-all"
                            data-testid="featured-play-btn"
                          >
                            <PlayCircle weight="fill" className="w-5 h-5 md:w-6 md:h-6" />
                            <span>{t('dashboard.listen_now')}</span>
                          </button>
                          <button className="w-11 h-11 md:w-12 md:h-12 narvo-border flex items-center justify-center text-primary" title="Translate" onClick={(e) => e.stopPropagation()}>
                            <Translate weight="bold" className="w-5 h-5" />
                          </button>
                          <button
                            className="w-11 h-11 md:w-12 md:h-12 narvo-border flex items-center justify-center text-forest hover:text-primary transition-colors"
                            onClick={(e) => handleSaveOffline(e, featured)}
                            title="Save for Offline"
                            data-testid="featured-offline-btn"
                          >
                            <CloudArrowDown weight="bold" className="w-5 h-5" />
                          </button>
                          <button
                            className="w-11 h-11 md:w-12 md:h-12 narvo-border flex items-center justify-center text-forest hover:text-primary transition-colors"
                            onClick={(e) => shareStory(e, featured)}
                            title="Share"
                            data-testid="featured-share-btn"
                          >
                            <ShareNetwork weight="bold" className="w-5 h-5" />
                          </button>
                          <button
                            className={`w-11 h-11 md:w-12 md:h-12 narvo-border flex items-center justify-center transition-colors ${isBookmarked(featured.id) ? 'text-primary border-primary' : 'text-forest hover:text-primary'}`}
                            onClick={(e) => toggleBookmark(e, featured)}
                            aria-label={isBookmarked(featured.id) ? 'Remove bookmark' : 'Bookmark'}
                            data-testid="featured-bookmark-btn"
                          >
                            <BookmarkSimple weight={isBookmarked(featured.id) ? 'fill' : 'regular'} className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </article>
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

                    {recoProfile?.top_categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {recoProfile.top_categories.map(cat => (
                          <span key={cat} className="bg-primary/10 text-primary mono-ui text-[9px] px-1.5 py-0.5 border border-primary/20 uppercase">
                            {cat}
                          </span>
                        ))}
                        {recoProfile.expanded_topics?.slice(0, 3).map(topic => (
                          <span key={topic} className="bg-forest/10 text-forest mono-ui text-[9px] px-1.5 py-0.5 border border-forest/20">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 md:gap-3">
                      {recommendations.slice(0, 6).map((item) => (
                        <motion.article
                          key={item.id}
                          variants={cardVariants}
                          className="narvo-border bg-surface/30 group cursor-pointer hover:bg-surface/50 hover:border-primary/30 transition-all overflow-hidden"
                          onClick={() => navigate(`/news/${item.id}`)}
                          data-testid={`reco-card-${item.id}`}
                        >
                          <div className="h-20 md:h-24 relative overflow-hidden">
                            <img
                              src={item.image_url || getCategoryImage(item.category || item.tags?.[0], item.id)}
                              alt={item.category}
                              className="w-full h-full object-cover opacity-40 group-hover:opacity-70 grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 to-transparent" />
                            <div className="absolute top-1.5 left-1.5">
                              <span className="bg-primary/90 text-background-dark mono-ui text-[8px] md:text-[9px] font-bold px-1 py-0.5 uppercase">{item.category || 'General'}</span>
                            </div>
                            <div className="absolute bottom-1.5 right-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); playTrack(item); }}
                                className="w-7 h-7 bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors"
                                aria-label={`Play ${item.title || 'story'}`}
                                data-testid={`reco-play-${item.id}`}
                              >
                                <PlayCircle weight="fill" className="w-3.5 h-3.5 text-background-dark" />
                              </button>
                            </div>
                          </div>
                          <div className="p-2 md:p-2.5">
                            <h3 className="font-display text-[11px] md:text-xs font-bold text-content uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center justify-between mt-1">
                              <span className="mono-ui text-[8px] md:text-[9px] text-forest truncate">{item.source}</span>
                              {item.recommendation_score > 0 && (
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

                  <motion.div variants={cardVariants} className="narvo-border bg-surface/20 divide-y divide-forest/10">
                    {stream.map((item, idx) => (
                      <motion.article
                        key={item.id}
                        variants={cardVariants}
                        className="p-4 md:p-6 group hover:bg-surface/40 transition-colors cursor-pointer flex gap-4"
                        onClick={() => navigate(`/news/${item.id}`)}
                        data-testid={`stream-card-${item.id}`}
                      >
                        {/* Category thumbnail */}
                        <div className="hidden sm:block w-20 h-20 md:w-24 md:h-24 shrink-0 narvo-border overflow-hidden relative">
                          <img
                            src={item.image_url || getCategoryImage(item.category || item.tags?.[0], item.id)}
                            alt={item.category}
                            className="w-full h-full object-cover opacity-50 group-hover:opacity-80 grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t ${getCategoryColor(item.category || item.tags?.[0])} mix-blend-multiply`} />
                        </div>
                        <div className="flex-1 flex flex-col gap-2 md:gap-3 min-w-0">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div className="flex items-center gap-2 md:gap-3">
                              <span className="bg-forest/20 text-primary mono-ui text-[11px] md:text-[12px] px-1.5 md:px-2 py-0.5 border border-forest/30">SOURCE:{item.source?.toUpperCase().replace(/\s/g, '_').slice(0, 15)}</span>
                              {item.aggregator && (
                                <span className="bg-primary/10 text-primary mono-ui text-[10px] px-1.5 py-0.5 border border-primary/30" data-testid={`aggregator-badge-${item.id}`}>
                                  {item.aggregator === 'mediastack' ? 'MEDIASTACK' : 'NEWSDATA'}
                                </span>
                              )}
                              <span className="mono-ui text-[11px] md:text-[12px] text-content-dim-accessible">{timeAgo(idx)}</span>
                              <TruthTag storyId={item.id} compact />
                            </div>
                            <div className="flex gap-1.5 md:gap-2">
                              {!item.tags?.length && <TagPill tag={item.category || 'GENERAL'} className="text-[10px] md:text-[11px] px-1 md:px-1.5" />}
                              {item.tags?.slice(0, 2).map((tag, i) => (
                                <TagPill key={i} tag={tag} className="text-[10px] md:text-[11px] px-1 md:px-1.5" />
                              ))}
                            </div>
                          </div>
                          <h3 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-content group-hover:text-primary transition-colors leading-tight">
                            {item.title}
                          </h3>
                          <p className="text-sm md:text-base text-content-dim-accessible font-mono leading-relaxed line-clamp-2">
                            {item.summary}
                          </p>
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
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full h-11 md:h-12 narvo-border bg-surface/10 mono-ui text-[12px] md:text-xs text-forest hover:bg-surface hover:text-primary transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    data-testid="load-more-btn"
                  >
                    {loadingMore ? (
                      <div className="w-4 h-4 border-2 border-forest border-t-transparent animate-spin" />
                    ) : (
                      <ArrowDown weight="bold" className="w-4 h-4" />
                    )}
                    <span>{loadingMore ? 'LOADING...' : `LOAD_MORE // ${Math.max(0, filteredNews.length - visibleCount)} REMAINING`}</span>
                  </button>
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
                  {regionalEnv?.label || regionalEnv?.city && regionalEnv?.region_name ? `${regionalEnv.city}, ${regionalEnv.region_name}` : 'LAGOS, NIGERIA'}
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
              const total = hs?.total || getTotalSources() || 1;
              const g = hs?.green || 0, a = hs?.amber || 0, r = hs?.red || 0;
              const u = total - g - a - r;
              return (
                <>
                  <div className="flex h-1 w-full mb-1 gap-px" data-testid="health-bar">
                    {g > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(g / total) * 100}%` }} />}
                    {a > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(a / total) * 100}%` }} />}
                    {r > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(r / total) * 100}%` }} />}
                    {u > 0 && <div className="bg-forest/30 transition-all" style={{ width: `${(u / total) * 100}%` }} />}
                  </div>
                  <div className="flex items-center gap-2 mb-2 mono-ui text-[9px]">
                    <span className="flex items-center gap-1 text-emerald-500"><span className="w-1 h-1 bg-emerald-500 inline-block" />{g}</span>
                    <span className="flex items-center gap-1 text-amber-500"><span className="w-1 h-1 bg-amber-500 inline-block" />{a}</span>
                    <span className="flex items-center gap-1 text-red-500"><span className="w-1 h-1 bg-red-500 inline-block" />{r}</span>
                    {u > 0 && <span className="flex items-center gap-1 text-content-dim-accessible"><span className="w-1 h-1 bg-forest/30 inline-block" />{u}</span>}
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
              const regionSources = getSourcesByRegion(region.key);
              const regionHealthCounts = regionSources.reduce((acc, src) => {
                const h = getHealthForSource(src.name);
                const s = h?.status || 'unknown';
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              }, {});
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
                    {regionSources.slice(0, 5).map((src, i) => {
                      const h = getHealthForSource(src.name);
                      const dotColor = h?.status === 'green' ? 'bg-emerald-500' : h?.status === 'amber' ? 'bg-amber-500' : h?.status === 'red' ? 'bg-red-500' : 'bg-forest/30';
                      const latency = h?.latency_ms > 0 ? `${h.latency_ms}ms` : '';
                      return (
                        <div key={i} className="flex items-center gap-1 mono-ui text-[9px] text-content-dim-accessible" data-testid={`source-health-${src.name.replace(/\s/g, '-').toLowerCase()}`}>
                          <span className={`w-1 h-1 shrink-0 ${dotColor}`} />
                          <span className="truncate">{src.name}</span>
                          {latency && <span className="ml-auto shrink-0">{latency}</span>}
                        </div>
                      );
                    })}
                    {regionSources.length > 5 && <span className="mono-ui text-[8px] text-content-dim-accessible">+{regionSources.length - 5} more</span>}
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
            const sources = hs?.sources || [];
            const byRegion = {};
            sources.forEach(s => {
              const r = s.region || 'local';
              if (!byRegion[r]) byRegion[r] = { green: 0, total: 0 };
              byRegion[r].total += 1;
              if (s.status === 'green') byRegion[r].green += 1;
            });
            const regionLabels = { local: 'LOCAL', continental: 'CONT', international: 'INTL' };
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
