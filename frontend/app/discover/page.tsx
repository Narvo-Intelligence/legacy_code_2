'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Radio, Mic, Bookmark, Play, Wifi } from 'lucide-react';
import { motion } from 'motion/react';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { StatusPill } from '@/components/StatusPill';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { NARVO_TOOLBAR_RAIL_CLASS } from '@/lib/narvo-ui-classes';
import { fetchNewsList, type ApiNewsListItem } from '@/lib/narvo-api';
import { useAudioPlayer } from '@/components/AudioPlayerContext';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

type DiscoverTab = 'stories' | 'radio' | 'podcasts';

/** Live station seed data — replaces when /api/discover/radio is wired */
const RADIO_STATIONS = [
  { id: 'beat-lagos', name: 'Beat FM Lagos', country: 'Nigeria', stream: '99.9 FM', live: true },
  { id: 'cool-fm', name: 'Cool FM', country: 'Nigeria', stream: '96.9 FM', live: true },
  { id: 'classic-fm', name: 'Classic FM Lagos', country: 'Nigeria', stream: '97.3 FM', live: false },
  { id: 'nbc-kaduna', name: 'NBC Kaduna', country: 'Nigeria', stream: '103.5 FM', live: false },
  { id: 'joy-fm', name: 'Joy FM', country: 'Ghana', stream: '99.7 FM', live: true },
  { id: 'capital-accra', name: 'Capital Radio', country: 'Ghana', stream: '91.9 FM', live: false },
];

const PODCAST_SEED = [
  { id: 'africa-tech', name: 'Africa Tech Pulse', desc: "Startups, venture, and the continent's tech scene.", episodes: 142 },
  { id: 'naira-now', name: 'Naira Now', desc: 'Weekly analysis of Nigerian markets and macroeconomics.', episodes: 87 },
  { id: 'policy-brief', name: 'Policy Brief', desc: 'Breaking down African governance and legislation.', episodes: 56 },
  { id: 'founders-talk', name: 'Founders Talk', desc: 'Conversations with African startup founders.', episodes: 211 },
];

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<DiscoverTab>('stories');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();

  const loadList = () => {
    setLoading(true);
    void fetchNewsList({ limit: 40 })
      .then((n) => { setItems(Array.isArray(n) ? n : []); setLoadError(null); })
      .catch((e: unknown) => { setItems([]); setLoadError(e instanceof Error ? e.message : COPY.browse_load_failed); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, []);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.source || '').toLowerCase().includes(q),
    );
  }, [searchQuery, items]);

  const tabs: { id: DiscoverTab; label: string; icon: React.ReactNode }[] = [
    { id: 'stories', label: 'Stories', icon: <Search size={14} /> },
    { id: 'radio', label: 'Radio', icon: <Radio size={14} /> },
    { id: 'podcasts', label: 'Podcasts', icon: <Mic size={14} /> },
  ];

  return (
    <AuthenticatedAppShell
      header={{ title: COPY.discover_page_title, kicker: COPY.discover_trending }}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">

        {/* Search bar */}
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

        {/* Tab rail */}
        <div className="flex gap-2 mb-8">
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

        {/* Stories tab */}
        {activeTab === 'stories' && (
          <motion.div
            key="stories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="space-y-4 sm:space-y-5"
          >
            {loading ? (
              <ListRowSkeleton count={6} />
            ) : loadError ? (
              <ErrorState message={loadError} onRetry={loadList} />
            ) : filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <StoryNewsListCard item={item} />
                </motion.div>
              ))
            ) : (
              <EmptyState
                title={COPY.discover_no_matches_title}
                description={COPY.discover_no_matches_desc}
              />
            )}
          </motion.div>
        )}

        {/* Radio tab */}
        {activeTab === 'radio' && (
          <motion.div
            key="radio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RADIO_STATIONS.map((station) => (
                <div
                  key={station.id}
                  className="rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-5 flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-narvo-teal/12 dark:bg-narvo-teal/20 text-narvo-teal dark:text-narvo-mint">
                    <Radio size={22} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-narvo-ink dark:text-white text-sm leading-tight">{station.name}</p>
                      {station.live && (
                        <StatusPill variant="live">Live</StatusPill>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-narvo-ink/45 dark:text-white/40 mt-0.5 uppercase tracking-wide">
                      {station.country} · {station.stream}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => playTrack({ id: station.id, title: station.name, source: station.country, category: 'RADIO' })}
                    className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-narvo-vermilion text-white shadow-md shadow-narvo-vermilion/20 active:scale-[0.96] transition-transform"
                    aria-label={`Play ${station.name}`}
                  >
                    <Play size={16} fill="currentColor" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-[18px] bg-narvo-butter/15 dark:bg-narvo-butter/10 border border-narvo-butter/30 px-5 py-4">
              <Wifi size={16} className="text-narvo-butter shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-narvo-ink/65 dark:text-white/55 leading-relaxed">
                Live streams require an active internet connection. Radio via Radio Browser API — quality and availability vary by station.
              </p>
            </div>
          </motion.div>
        )}

        {/* Podcasts tab */}
        {activeTab === 'podcasts' && (
          <motion.div
            key="podcasts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {PODCAST_SEED.map((pod) => (
              <div
                key={pod.id}
                className="rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-5 flex items-center gap-4"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-narvo-mist dark:bg-white/10 text-narvo-teal dark:text-narvo-mint">
                  <Mic size={22} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-base font-semibold text-narvo-ink dark:text-white leading-tight">{pod.name}</p>
                  <p className="text-xs text-narvo-ink/55 dark:text-white/50 mt-1 leading-snug line-clamp-2">{pod.desc}</p>
                  <p className="font-mono text-[9px] text-narvo-ink/35 dark:text-white/30 mt-1.5 uppercase tracking-wider">{pod.episodes} episodes</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    className="flex h-9 items-center gap-1.5 rounded-full bg-narvo-teal px-3 text-[11px] font-bold text-white"
                    aria-label={`Play ${pod.name}`}
                  >
                    <Play size={12} fill="currentColor" aria-hidden /> Play
                  </button>
                  <button
                    type="button"
                    className="flex h-9 items-center gap-1.5 rounded-full border border-narvo-ink/12 dark:border-white/12 px-3 text-[11px] font-bold text-narvo-ink/70 dark:text-white/60"
                    aria-label={`Save ${pod.name}`}
                  >
                    <Bookmark size={12} aria-hidden /> Save
                  </button>
                </div>
              </div>
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
