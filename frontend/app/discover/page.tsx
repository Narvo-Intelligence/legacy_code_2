'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, Radio, RefreshCw, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { NARVO_TOOLBAR_RAIL_CLASS } from '@/lib/narvo-ui-classes';
import {
  fetchNewsList,
  fetchTrendingTopics,
  fetchRadioStations,
  fetchDiscoverPodcasts,
  searchDiscoverPodcasts,
  getNarvoApiBase,
  type ApiNewsListItem,
  type ApiTrendingResponse,
  type ApiRadioStation,
  type ApiDiscoverPodcastEpisode,
} from '@/lib/narvo-api';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { useToast } from '@/components/Toast';
import { useVisibleIntervalRefetch } from '@/hooks/use-visible-interval-refetch';
import { CollectionTile } from '@/components/discover/CollectionTile';
import { RadioStationCard } from '@/components/discover/RadioStationCard';
import { PodcastCard } from '@/components/discover/PodcastCard';
import { getPreferredBroadcastLanguage } from '@/lib/listening-preferences';

type DiscoverTab = 'stories' | 'radio' | 'podcasts';

const DISCOVER_STORIES_REFRESH_MS = 90_000;
const DISCOVER_MANUAL_STORIES_REFRESH_COOLDOWN_MS = 15_000;

const RADIO_LANGS: { id: string; label: string }[] = [
  { id: '', label: 'Any' },
  { id: 'english', label: 'English' },
  { id: 'french', label: 'French' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'swahili', label: 'Swahili' },
  { id: 'portuguese', label: 'Portuguese' },
];

function useDebouncedSearch(raw: string, ms: number, active: boolean): string {
  const [out, setOut] = useState(raw);
  useEffect(() => {
    if (!active) {
      setOut(raw);
      return;
    }
    const t = setTimeout(() => setOut(raw), ms);
    return () => clearTimeout(t);
  }, [raw, ms, active]);
  return active ? out : raw;
}

function DiscoverTabs(props: {
  active: DiscoverTab;
  onChange: (t: DiscoverTab) => void;
  layout: 'mobile' | 'desktop';
}) {
  const { active, onChange, layout } = props;
  const tabs: { id: DiscoverTab; label: string; icon: React.ReactNode }[] = [
    { id: 'stories', label: 'Stories', icon: <Search size={14} /> },
    { id: 'radio', label: 'Radio', icon: <Radio size={14} /> },
    { id: 'podcasts', label: 'Podcasts', icon: <Mic size={14} /> },
  ];

  if (layout === 'desktop') {
    return (
      <nav className="flex flex-col gap-2" aria-label="Discover sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 rounded-[16px] px-4 py-3 text-left text-sm font-bold transition-all ${
              active === t.id
                ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/20'
                : 'bg-narvo-ink/[0.06] text-narvo-ink/65 hover:bg-narvo-ink/10 dark:bg-white/[0.07] dark:text-white/55 dark:hover:bg-white/12'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
            active === t.id
              ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/20'
              : 'bg-narvo-ink/[0.06] text-narvo-ink/65 dark:bg-white/[0.07] dark:text-white/55'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<DiscoverTab>('stories');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedDiscoverQ = useDebouncedSearch(
    searchQuery.trim(),
    420,
    activeTab === 'radio' || activeTab === 'podcasts'
  );

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storiesRefreshing, setStoriesRefreshing] = useState(false);
  const [storiesRefreshLockedUntil, setStoriesRefreshLockedUntil] = useState(0);

  const [trending, setTrending] = useState<ApiTrendingResponse>({
    tags: [],
    topics: [],
    updated_at: undefined,
  });

  const [radioCountry, setRadioCountry] = useState('NG');
  const [radioLanguage, setRadioLanguage] = useState('');
  const [stations, setStations] = useState<ApiRadioStation[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioError, setRadioError] = useState<string | null>(null);

  const [podcastSort, setPodcastSort] = useState<'latest' | 'popular'>('latest');
  const [podcastEpisodes, setPodcastEpisodes] = useState<ApiDiscoverPodcastEpisode[]>([]);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [radioRetryToken, setRadioRetryToken] = useState(0);
  const [podcastRetryToken, setPodcastRetryToken] = useState(0);

  const { playTrack, enqueueTrack } = useAudioPlayer();
  const { success, info } = useToast();

  const loadList = useCallback((opts?: { silent?: boolean; refresh?: boolean }) => {
    const silent = opts?.silent ?? false;
    const refresh = opts?.refresh ?? false;
    const language = getPreferredBroadcastLanguage();
    if (!silent) {
      if (refresh) setStoriesRefreshing(true);
      else setLoading(true);
    }
    void fetchNewsList({ limit: 40, refresh: refresh || undefined, language })
      .then((n) => {
        setItems(Array.isArray(n) ? n : []);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (!silent) {
          setItems([]);
          setLoadError(e instanceof Error ? e.message : COPY.browse_load_failed);
        }
      })
      .finally(() => {
        if (!silent) {
          setLoading(false);
          setStoriesRefreshing(false);
        }
      });
  }, []);

  useEffect(() => {
    if (storiesRefreshLockedUntil <= Date.now()) return;
    const id = window.setTimeout(
      () => setStoriesRefreshLockedUntil(0),
      Math.max(0, storiesRefreshLockedUntil - Date.now())
    );
    return () => window.clearTimeout(id);
  }, [storiesRefreshLockedUntil]);

  const handleStoriesRefresh = useCallback(() => {
    const now = Date.now();
    if (now < storiesRefreshLockedUntil || storiesRefreshing || loading) return;
    setStoriesRefreshLockedUntil(now + DISCOVER_MANUAL_STORIES_REFRESH_COOLDOWN_MS);
    void loadList({ refresh: true });
  }, [storiesRefreshLockedUntil, storiesRefreshing, loading, loadList]);

  useVisibleIntervalRefetch(() => void loadList({ silent: true }), {
    intervalMs: DISCOVER_STORIES_REFRESH_MS,
    enabled: activeTab === 'stories',
  });

  useEffect(() => {
    loadList();
    void fetchTrendingTopics().then(setTrending);
  }, [loadList]);

  useEffect(() => {
    if (activeTab !== 'radio') return;
    let cancelled = false;
    setRadioLoading(true);
    setRadioError(null);
    void fetchRadioStations({
      country: radioCountry,
      language: radioLanguage || undefined,
      search: debouncedDiscoverQ || undefined,
      limit: 28,
    })
      .then((rows) => {
        if (!cancelled) setStations(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setStations([]);
          setRadioError(COPY.discover_radio_load_failed);
        }
      })
      .finally(() => {
        if (!cancelled) setRadioLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, radioCountry, radioLanguage, debouncedDiscoverQ, radioRetryToken]);

  useEffect(() => {
    if (activeTab !== 'podcasts') return;
    let cancelled = false;
    const q = debouncedDiscoverQ;
    setPodcastLoading(true);
    setPodcastError(null);

    const run =
      q.length >= 2
        ? searchDiscoverPodcasts(q, 24)
        : fetchDiscoverPodcasts({ limit: 20, sort: podcastSort });

    void run
      .then((rows) => {
        if (!cancelled) setPodcastEpisodes(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) {
          setPodcastEpisodes([]);
          setPodcastError(COPY.discover_podcasts_load_failed);
        }
      })
      .finally(() => {
        if (!cancelled) setPodcastLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, debouncedDiscoverQ, podcastSort, podcastRetryToken]);

  const categoryBuckets = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const c = (item.category || 'General').trim() || 'General';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = items;
    if (categoryFilter) {
      list = list.filter((item) => (item.category || 'General').trim() === categoryFilter);
    }
    if (!q) return list;
    return list.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q)
    );
  }, [searchQuery, items, categoryFilter]);

  const searchPlaceholder =
    activeTab === 'podcasts' ? COPY.discover_podcasts_search_hint : COPY.search_placeholder;

  const playPodcastEpisode = useCallback(
    (ep: ApiDiscoverPodcastEpisode) => {
      if (!ep.audio_url?.trim()) {
        info(COPY.discover_podcast_no_audio);
        return;
      }
      const base = getNarvoApiBase();
      const proxy = `${base}/api/podcasts/${encodeURIComponent(ep.id)}/audio`;
      playTrack({
        id: ep.id,
        title: (ep.title || 'Episode').trim(),
        source: (ep.podcast_name || ep.source || 'Podcast').trim(),
        category: 'PODCAST',
        audioUrl: proxy,
      });
    },
    [playTrack, info]
  );

  const queuePodcastEpisode = useCallback(
    (ep: ApiDiscoverPodcastEpisode) => {
      if (!ep.audio_url?.trim()) {
        info(COPY.discover_podcast_no_audio);
        return;
      }
      const base = getNarvoApiBase();
      const proxy = `${base}/api/podcasts/${encodeURIComponent(ep.id)}/audio`;
      enqueueTrack({
        id: ep.id,
        title: (ep.title || 'Episode').trim(),
        source: (ep.podcast_name || ep.source || 'Podcast').trim(),
        category: 'PODCAST',
        audioUrl: proxy,
      });
      success(COPY.toast_queued);
    },
    [enqueueTrack, success, info]
  );

  const playRadioStation = useCallback(
    (s: ApiRadioStation) => {
      const url = (s.url_resolved || s.url || '').trim();
      if (!url) {
        info(COPY.discover_radio_no_stream);
        return;
      }
      playTrack({
        id: `radio:${s.id}`,
        title: s.name,
        source: s.country || s.countrycode || 'Radio',
        category: 'RADIO',
        audioUrl: url,
      });
    },
    [playTrack, info]
  );

  const topicPills = (
    <>
      {trending.tags.slice(0, 10).map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => {
            const t = tag.replace(/^#/, '');
            setSearchQuery(t);
            setActiveTab('stories');
          }}
          className="shrink-0 rounded-full border border-narvo-ink/12 bg-white/80 px-3 py-1.5 text-xs font-bold text-narvo-ink/75 dark:border-white/12 dark:bg-narvo-ink/40 dark:text-white/70"
        >
          {tag}
        </button>
      ))}
    </>
  );

  const storiesTopicsAndRefreshRow = (
    <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
      <div className="-mx-1 min-h-10 min-w-0 flex-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
        <div className="flex w-max gap-2">
          {!loading && !loadError && items.length > 0 ? (
            <>
              <CollectionTile
                label="All topics"
                count={items.length}
                selected={categoryFilter === null}
                onClick={() => setCategoryFilter(null)}
              />
              {categoryBuckets.map(([label, count]) => (
                <CollectionTile
                  key={label}
                  label={label}
                  count={count}
                  selected={categoryFilter === label}
                  onClick={() => setCategoryFilter((cur) => (cur === label ? null : label))}
                />
              ))}
            </>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={handleStoriesRefresh}
        disabled={storiesRefreshing || loading || Date.now() < storiesRefreshLockedUntil}
        aria-label={COPY.feed_refresh_latest_aria}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-full border border-narvo-ink/10 bg-narvo-mist/50 px-2.5 py-2 text-[11px] font-bold text-narvo-ink/75 shadow-sm transition-all hover:border-narvo-teal/30 hover:bg-narvo-mist/85 disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/10 min-h-10 min-w-10 sm:min-h-11 sm:min-w-0 sm:px-3.5 sm:py-2.5 sm:text-xs touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35"
      >
        <RefreshCw
          size={16}
          className={`shrink-0 sm:h-[17px] sm:w-[17px] ${storiesRefreshing ? 'animate-spin' : ''}`}
          aria-hidden
        />
        <span className="hidden sm:inline whitespace-nowrap">{COPY.feed_refresh_latest}</span>
      </button>
    </div>
  );

  const radioCountryFilters = (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint">
        Region
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRadioCountry('ALL')}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            radioCountry === 'ALL'
              ? 'bg-narvo-teal text-white'
              : 'border border-narvo-ink/12 dark:border-white/12'
          }`}
        >
          {COPY.discover_radio_region_all}
        </button>
        {['NG', 'GH', 'KE', 'ZA', 'EG', 'MA', 'TZ', 'UG'].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setRadioCountry(code)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              radioCountry === code
                ? 'bg-narvo-teal text-white'
                : 'border border-narvo-ink/12 dark:border-white/12'
            }`}
          >
            {code}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint">
        {COPY.discover_radio_language_label}
      </p>
      <div className="flex flex-wrap gap-2">
        {RADIO_LANGS.map((l) => (
          <button
            key={l.id || 'any'}
            type="button"
            onClick={() => setRadioLanguage(l.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              radioLanguage === l.id
                ? 'bg-narvo-vermilion text-white'
                : 'border border-narvo-ink/12 dark:border-white/12'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );

  const podcastSortPanel = (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint">
        Catalogue
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPodcastSort('latest')}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            podcastSort === 'latest' ? 'bg-narvo-teal text-white' : 'border border-narvo-ink/12 dark:border-white/12'
          }`}
        >
          {COPY.discover_podcasts_sort_latest}
        </button>
        <button
          type="button"
          onClick={() => setPodcastSort('popular')}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            podcastSort === 'popular' ? 'bg-narvo-teal text-white' : 'border border-narvo-ink/12 dark:border-white/12'
          }`}
        >
          {COPY.discover_podcasts_sort_popular}
        </button>
      </div>
    </div>
  );

  const asidePanelClass =
    'rounded-[22px] border border-narvo-ink/10 bg-[var(--bg-card)]/95 p-4 shadow-[0_8px_30px_-18px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-narvo-ink/45 dark:shadow-black/20';

  return (
    <AuthenticatedAppShell header={{ title: COPY.discover_page_title, kicker: COPY.discover_trending }}>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-7 lg:max-w-none lg:px-8 lg:py-8 xl:px-10">
        <div className="lg:mx-auto lg:max-w-[1600px] lg:grid lg:grid-cols-[minmax(0,1fr)_min(300px,26vw)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_min(320px,24vw)] xl:gap-12">
          <div className="min-w-0 lg:order-1">
            <div
              className={`relative mb-5 sm:mb-6 lg:mb-8 ${NARVO_TOOLBAR_RAIL_CLASS} lg:rounded-[28px] lg:border lg:border-narvo-ink/[0.08] lg:bg-[var(--bg-card)]/80 lg:p-6 lg:shadow-[0_12px_48px_-24px_rgba(23,50,74,0.14)] dark:lg:border-white/[0.08] dark:lg:bg-narvo-ink/30 dark:lg:shadow-black/25 xl:p-8`}
            >
              <p className="mb-3 font-serif text-lg font-semibold text-narvo-ink dark:text-white lg:mb-4 lg:text-xl">
                {COPY.discover_trending}
              </p>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 lg:left-5"
                  size={20}
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[48px] rounded-2xl border border-narvo-ink/10 bg-white py-3 pl-11 pr-4 text-[15px] text-narvo-ink placeholder:text-narvo-ink/40 outline-none transition-shadow focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 dark:border-white/10 dark:bg-narvo-ink/40 dark:text-white dark:placeholder:text-white/35 lg:min-h-[56px] lg:rounded-[22px] lg:pl-12 lg:text-[16px] lg:shadow-inner"
                  aria-label={searchPlaceholder}
                />
              </div>
            </div>

            <div className="mb-6 -mx-4 border-y border-narvo-ink/[0.07] bg-gradient-to-b from-narvo-mist/70 to-narvo-cloud/90 px-4 py-4 dark:border-white/[0.08] dark:from-narvo-ink/40 dark:to-narvo-ink/25 lg:hidden">
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/35">
                {COPY.discover_mobile_rail_hint}
              </p>
              <DiscoverTabs active={activeTab} onChange={setActiveTab} layout="mobile" />
              {activeTab === 'stories' ? (
                <div className="mt-4 space-y-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                    {COPY.discover_stories_topics_label}
                  </p>
                  <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {topicPills}
                  </div>
                </div>
              ) : null}
              {activeTab === 'radio' ? <div className="mt-4">{radioCountryFilters}</div> : null}
              {activeTab === 'podcasts' ? <div className="mt-4">{podcastSortPanel}</div> : null}
            </div>

            {activeTab === 'stories' && (
              <motion.div
                key="stories"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {storiesTopicsAndRefreshRow}

                {loading ? (
                  <ListRowSkeleton count={6} />
                ) : loadError ? (
                  <ErrorState message={loadError} onRetry={loadList} />
                ) : filteredData.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
                    {filteredData.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <StoryNewsListCard item={item} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={COPY.discover_no_matches_title} description={COPY.discover_no_matches_desc} />
                )}
              </motion.div>
            )}

            {activeTab === 'radio' && (
              <motion.div
                key="radio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {radioLoading ? (
                  <ListRowSkeleton count={5} />
                ) : radioError ? (
                  <ErrorState message={radioError} onRetry={() => setRadioRetryToken((t) => t + 1)} />
                ) : stations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {stations.map((station) => {
                      const streamMeta =
                        station.bitrate && station.codec
                          ? `${station.bitrate} kbps · ${station.codec}`
                          : station.tags
                            ? String(station.tags).split(',').slice(0, 2).join(' · ')
                            : 'Stream';
                      const meta = [station.country || station.countrycode, streamMeta, station.language]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <RadioStationCard
                          key={station.id}
                          name={station.name}
                          country={station.country || station.countrycode || '—'}
                          stream={streamMeta}
                          meta={meta}
                          live={Boolean(station.url_resolved || station.url)}
                          onPlay={() => playRadioStation(station)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title={COPY.discover_no_matches_title} description={COPY.discover_radio_load_failed} />
                )}
                <p className="text-center text-xs text-narvo-ink/45 dark:text-white/35 lg:text-left">{COPY.discover_sources_note}</p>
              </motion.div>
            )}

            {activeTab === 'podcasts' && (
              <motion.div
                key="podcasts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {debouncedDiscoverQ.length === 1 ? (
                  <p className="text-center text-xs text-narvo-ink/45 dark:text-white/40">{COPY.search_min_chars}</p>
                ) : null}
                {podcastLoading ? (
                  <ListRowSkeleton count={5} />
                ) : podcastError ? (
                  <ErrorState
                    message={podcastError}
                    onRetry={() => setPodcastRetryToken((t) => t + 1)}
                  />
                ) : podcastEpisodes.length > 0 ? (
                  podcastEpisodes.map((ep) => (
                    <PodcastCard
                      key={ep.id}
                      title={(ep.title || 'Episode').trim()}
                      description={`${(ep.podcast_name || ep.source || '').trim()}${ep.description ? ` — ${ep.description.slice(0, 140)}` : ''}`}
                      metaLine={[ep.published, ep.duration].filter(Boolean).join(' · ')}
                      coverUrl={ep.image_url || null}
                      onPlay={() => playPodcastEpisode(ep)}
                      onQueue={() => queuePodcastEpisode(ep)}
                      onDownload={() => info(COPY.discover_podcast_offline_hint)}
                    />
                  ))
                ) : (
                  <EmptyState title={COPY.discover_no_matches_title} description={COPY.discover_podcasts_empty} />
                )}
              </motion.div>
            )}

            {activeTab === 'stories' ? (
              <div className="mt-8 lg:hidden">
                <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.search_trending_kicker}
                </p>
                <div className="flex flex-wrap gap-2">{topicPills}</div>
              </div>
            ) : null}
          </div>

          <aside className="relative hidden lg:order-2 lg:block">
            <div
              className="sticky flex max-h-[min(100dvh-5.5rem,920px)] flex-col gap-6 overflow-y-auto overscroll-y-contain pb-4"
              style={{ top: 'max(5.5rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className={asidePanelClass}>
                <DiscoverTabs active={activeTab} onChange={setActiveTab} layout="desktop" />
              </div>
              {activeTab === 'stories' ? (
                <div className={asidePanelClass}>
                  <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint">
                    {COPY.discover_stories_topics_label}
                  </p>
                  <div className="flex flex-wrap gap-2">{topicPills}</div>
                </div>
              ) : null}
              {activeTab === 'radio' ? <div className={asidePanelClass}>{radioCountryFilters}</div> : null}
              {activeTab === 'podcasts' ? <div className={asidePanelClass}>{podcastSortPanel}</div> : null}
              <p className="px-1 text-[11px] leading-relaxed text-narvo-ink/50 dark:text-white/45">
                {COPY.discover_sources_note}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
