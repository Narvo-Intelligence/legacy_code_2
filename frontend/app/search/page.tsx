'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search as SearchIcon, Clock, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY } from '@/lib/narvo-app-copy';
import { fetchNewsList, formatFeedTimeLabel, type ApiNewsListItem } from '@/lib/narvo-api';
import { truthTagFromListItem } from '@/lib/truth-map';
import { resolveStoryPlayback } from '@/lib/story-playback';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();

  const loadList = () => {
    setLoading(true);
    void fetchNewsList({ limit: 60 })
      .then((n) => {
        setItems(Array.isArray(n) ? n : []);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        setItems([]);
        setLoadError(e instanceof Error ? e.message : 'Could not load stories.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return items;
    return items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const sum = String(item.summary || item.short_summary || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const src = (item.source || '').toLowerCase();
      return (
        title.includes(query) || sum.includes(query) || cat.includes(query) || src.includes(query)
      );
    });
  }, [searchQuery, items]);

  const handlePlay = (e: React.MouseEvent, item: ApiNewsListItem) => {
    e.preventDefault();
    e.stopPropagation();
    const id = item.id;
    const title = item.title?.trim() || 'Untitled';
    const source = item.source?.trim() || 'Narvo';
    const category = (item.category || 'General').toUpperCase();
    if (currentTrack?.id === id) {
      togglePlayPause();
    } else {
      void resolveStoryPlayback(id, { id, title, source, category }).then((track) => playTrack(track));
    }
  };

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.search_page_title,
        kicker: COPY.search_page_kicker,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 max-w-3xl mx-auto w-full">
        <div className="relative mb-8 sm:mb-10">
          <SearchIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
            size={20}
            aria-hidden
          />
          <input
            type="search"
            placeholder={COPY.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[52px] rounded-[22px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.06] py-3.5 pl-12 pr-4 text-[15px] text-narvo-ink dark:text-white placeholder:text-narvo-ink/40 dark:placeholder:text-white/35 outline-none focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 transition-shadow"
            aria-label={COPY.search_placeholder}
          />
        </div>

        {!searchQuery.trim() && !loading && !loadError && items.length > 0 ? (
          <p className="text-sm text-narvo-ink/50 dark:text-white/45 mb-6">{COPY.search_empty}</p>
        ) : null}

        <div className="space-y-4 sm:space-y-5">
          {loading ? (
            <p className="text-center py-16 text-narvo-ink/45 dark:text-white/45 font-medium">Loading stories…</p>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadList} />
          ) : filteredData.length > 0 ? (
            filteredData.map((item, index) => {
              const truth = truthTagFromListItem(item);
              const timeLabel = formatFeedTimeLabel(item.published);
              const cat = (item.category || 'General').toUpperCase();
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link
                    href={`/news/${item.id}`}
                    className="block p-5 sm:p-6 rounded-[28px] bg-white dark:bg-narvo-ink border border-narvo-ink/6 dark:border-white/8 hover:border-narvo-teal/25 dark:hover:border-narvo-teal/30 transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase">
                            {cat}
                          </span>
                          <span className="text-narvo-ink/20 dark:text-white/20" aria-hidden>
                            •
                          </span>
                          <span className="text-[10px] font-medium font-mono text-narvo-ink/45 dark:text-white/40 flex items-center gap-1">
                            <Clock size={10} aria-hidden /> {timeLabel}
                          </span>
                        </div>
                        <h3 className="font-serif font-medium text-lg sm:text-xl group-hover:text-narvo-teal transition-colors line-clamp-2 leading-snug">
                          {item.title || 'Untitled'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handlePlay(e, item)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all min-h-[48px] min-w-[48px] ${
                          currentTrack?.id === item.id && isPlaying
                            ? 'bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/20'
                            : 'bg-narvo-mist dark:bg-white/10 text-narvo-ink dark:text-white group-hover:bg-narvo-teal group-hover:text-white'
                        }`}
                        aria-label={currentTrack?.id === item.id && isPlaying ? 'Pause' : 'Play'}
                      >
                        {currentTrack?.id === item.id && isPlaying ? (
                          <Pause size={20} fill="currentColor" aria-hidden />
                        ) : (
                          <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs font-medium text-narvo-ink/55 dark:text-white/50">{item.source || 'Narvo'}</p>
                      <TruthTag
                        status={truth.status}
                        sources={truth.sources}
                        details={truth.details}
                        lastChecked={truth.lastChecked}
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })
          ) : items.length === 0 ? (
            <EmptyState icon={SearchIcon} title="No stories loaded" description={COPY.search_empty} />
          ) : (
            <EmptyState
              icon={SearchIcon}
              title="No matches"
              description="Try a different keyword, source, or category."
            >
              <Link
                href="/discover"
                className="inline-flex min-h-[48px] items-center rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20"
              >
                {COPY.search_link_discover}
              </Link>
            </EmptyState>
          )}
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
