'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Radio, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { NARVO_TOOLBAR_RAIL_CLASS } from '@/lib/narvo-ui-classes';
import { fetchNewsList, type ApiNewsListItem } from '@/lib/narvo-api';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { useToast } from '@/components/Toast';
import { CollectionTile } from '@/components/discover/CollectionTile';
import { RadioStationCard } from '@/components/discover/RadioStationCard';
import { PodcastCard } from '@/components/discover/PodcastCard';

type DiscoverTab = 'stories' | 'radio' | 'podcasts';

const RADIO_STATIONS = [
  { id: 'beat-lagos', name: 'Beat FM Lagos', country: 'Nigeria', stream: '99.9 FM', live: true },
  { id: 'cool-fm', name: 'Cool FM', country: 'Nigeria', stream: '96.9 FM', live: true },
  { id: 'classic-fm', name: 'Classic FM Lagos', country: 'Nigeria', stream: '97.3 FM', live: false },
  { id: 'nbc-kaduna', name: 'NBC Kaduna', country: 'Nigeria', stream: '103.5 FM', live: false },
  { id: 'joy-fm', name: 'Joy FM', country: 'Ghana', stream: '99.7 FM', live: true },
  { id: 'capital-accra', name: 'Capital Radio', country: 'Ghana', stream: '91.9 FM', live: false },
];

const PODCAST_SEED = [
  {
    id: 'africa-tech',
    title: 'Africa Tech Pulse',
    desc: "Startups, venture, and the continent's tech scene.",
    episodes: 142,
    coverUrl: 'https://picsum.photos/seed/narvo-atp/144/144',
  },
  {
    id: 'naira-now',
    title: 'Naira Now',
    desc: 'Weekly analysis of Nigerian markets and macroeconomics.',
    episodes: 87,
    coverUrl: 'https://picsum.photos/seed/narvo-naira/144/144',
  },
  {
    id: 'policy-brief',
    title: 'Policy Brief',
    desc: 'Breaking down African governance and legislation.',
    episodes: 56,
    coverUrl: null as string | null,
  },
  {
    id: 'founders-talk',
    title: 'Founders Talk',
    desc: 'Conversations with African startup founders.',
    episodes: 211,
    coverUrl: 'https://picsum.photos/seed/narvo-ft/144/144',
  },
];

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<DiscoverTab>('stories');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();
  const { success } = useToast();

  const loadList = () => {
    setLoading(true);
    void fetchNewsList({ limit: 40 })
      .then((n) => {
        setItems(Array.isArray(n) ? n : []);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        setItems([]);
        setLoadError(e instanceof Error ? e.message : COPY.browse_load_failed);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
  }, []);

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

  const tabs: { id: DiscoverTab; label: string; icon: React.ReactNode }[] = [
    { id: 'stories', label: 'Stories', icon: <Search size={14} /> },
    { id: 'radio', label: 'Radio', icon: <Radio size={14} /> },
    { id: 'podcasts', label: 'Podcasts', icon: <Mic size={14} /> },
  ];

  return (
    <AuthenticatedAppShell header={{ title: COPY.discover_page_title, kicker: COPY.discover_trending }}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className={`relative mb-6 ${NARVO_TOOLBAR_RAIL_CLASS}`}>
          <Search
            className="pointer-events-none absolute left-5 top-1/2 z-[1] -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 sm:left-6"
            size={20}
            aria-hidden
          />
          <input
            type="search"
            placeholder={COPY.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] rounded-[18px] border border-narvo-ink/10 bg-white py-3.5 pl-12 pr-4 text-[15px] text-narvo-ink placeholder:text-narvo-ink/40 outline-none transition-shadow focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 dark:border-white/10 dark:bg-narvo-ink/40 dark:text-white dark:placeholder:text-white/35 sm:min-h-[52px] sm:pl-14"
            aria-label={COPY.search_placeholder}
          />
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-narvo-teal text-white shadow-md shadow-narvo-teal/20'
                  : 'bg-narvo-ink/[0.06] dark:bg-white/[0.07] text-narvo-ink/65 dark:text-white/55 hover:bg-narvo-ink/10 dark:hover:bg-white/12'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'stories' && (
          <motion.div
            key="stories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {!loading && !loadError && items.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
              </div>
            ) : null}

            {loading ? (
              <ListRowSkeleton count={6} />
            ) : loadError ? (
              <ErrorState message={loadError} onRetry={loadList} />
            ) : filteredData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RADIO_STATIONS.map((station) => (
                <RadioStationCard
                  key={station.id}
                  name={station.name}
                  country={station.country}
                  stream={station.stream}
                  live={station.live}
                  onPlay={() =>
                    playTrack({
                      id: station.id,
                      title: station.name,
                      source: station.country,
                      category: 'RADIO',
                    })
                  }
                />
              ))}
            </div>
            <div className="flex items-start gap-3 rounded-[18px] bg-narvo-butter/15 dark:bg-narvo-butter/10 border border-narvo-butter/30 px-5 py-4">
              <Radio size={16} className="text-narvo-butter shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-narvo-ink/65 dark:text-white/55 leading-relaxed">
                Live streams need an active connection. Station metadata is illustrative until streams are wired to the
                Radio Browser API.
              </p>
            </div>
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
            {PODCAST_SEED.map((pod) => (
              <PodcastCard
                key={pod.id}
                title={pod.title}
                description={pod.desc}
                episodeCount={pod.episodes}
                coverUrl={pod.coverUrl}
                onPlay={() =>
                  playTrack({
                    id: `podcast-${pod.id}`,
                    title: pod.title,
                    source: 'Podcast',
                    category: 'PODCAST',
                  })
                }
                onQueue={() => {
                  success(COPY.toast_queued);
                }}
                onDownload={() => {
                  success(COPY.offline_saved);
                }}
              />
            ))}
            <p className="text-center py-4 text-xs text-narvo-ink/40 dark:text-white/30">
              Full podcast catalogue and episode search coming soon.
            </p>
          </motion.div>
        )}
      </div>
    </AuthenticatedAppShell>
  );
}
