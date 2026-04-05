'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Play, Search, Trash2 } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { getOfflineStories, removeOfflineStory, type OfflineStory } from '@/lib/offlineStorage';
import {
  hasMeAuth,
  getMyOfflineArticles,
  deleteMyOfflineArticle,
} from '@/lib/me-api';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { SwipeToDeleteRow } from '@/components/library/SwipeToDeleteRow';
import { COPY, libraryListenReadTimeLine } from '@/lib/narvo-app-copy';

type SortMode = 'date-desc' | 'date-asc' | 'title-az' | 'title-za';

type LibraryStory = OfflineStory & { cloudOnly?: boolean };

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'date-desc', label: COPY.library_sort_date_new },
  { id: 'date-asc', label: COPY.library_sort_date_old },
  { id: 'title-az', label: COPY.library_sort_title_az },
  { id: 'title-za', label: COPY.library_sort_title_za },
];

export default function LibraryPage() {
  const [stories, setStories] = useState<LibraryStory[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');
  const { playTrack } = useAudioPlayer();

  const loadStories = useCallback(async (isCancelled?: () => boolean) => {
    const dead = () => isCancelled?.() === true;
    try {
      const local = await getOfflineStories();
      if (dead()) return;
      const byId = new Map<string, LibraryStory>(
        local.map((s) => [s.id, { ...s, cloudOnly: false }])
      );
      if (hasMeAuth()) {
        try {
          const remote = await getMyOfflineArticles();
          if (dead()) return;
          for (const row of remote) {
            const id = row.story_id;
            if (!byId.has(id)) {
              const savedAt = row.saved_at ? Date.parse(row.saved_at) : Date.now();
              byId.set(id, {
                id,
                title: row.title,
                source: row.source || '',
                category: row.category || 'General',
                time: '3 min',
                downloadedAt: Number.isFinite(savedAt) ? savedAt : Date.now(),
                cloudOnly: true,
              });
            }
          }
        } catch (e) {
          console.error('Failed to load cloud offline list:', e);
        }
      }
      if (dead()) return;
      setStories(Array.from(byId.values()));
    } catch (error) {
      if (!dead()) console.error('Failed to load offline stories:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => void loadStories(() => cancelled);
    run();
    const id = window.setTimeout(run, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [loadStories]);

  const handleRemove = async (story: LibraryStory) => {
    try {
      if (!story.cloudOnly) await removeOfflineStory(story.id);
      if (hasMeAuth()) {
        try {
          await deleteMyOfflineArticle(story.id);
        } catch {
          /* not on server */
        }
      }
      await loadStories();
    } catch (error) {
      console.error('Failed to remove story:', error);
    }
  };

  const filteredSorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? stories.filter(
          (s) =>
            s.title.toLowerCase().includes(q) || s.source.toLowerCase().includes(q)
        )
      : [...stories];

    switch (sort) {
      case 'date-desc':
        list.sort((a, b) => b.downloadedAt - a.downloadedAt);
        break;
      case 'date-asc':
        list.sort((a, b) => a.downloadedAt - b.downloadedAt);
        break;
      case 'title-az':
        list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
        break;
      case 'title-za':
        list.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }));
        break;
      default:
        break;
    }
    return list;
  }, [stories, search, sort]);

  const cardInner = (story: LibraryStory) => (
    <div className="bg-white dark:bg-narvo-ink p-6 sm:p-8 rounded-[32px] border border-narvo-ink/6 dark:border-white/8 shadow-sm hover:shadow-md transition-all group relative h-full">
      <div className="flex justify-between items-center mb-6 gap-2">
        <span className="font-mono text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase">
          {story.cloudOnly ? `${COPY.library_saved_cloud} · ${story.category}` : story.category}
        </span>
        <span className="text-[10px] text-narvo-ink/40 dark:text-white/40 font-mono text-right">
          Saved {new Date(story.downloadedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}
        </span>
      </div>
      <h3 className="text-xl font-serif font-medium text-narvo-ink dark:text-white leading-tight mb-4 group-hover:text-narvo-teal transition-colors">
        {story.title}
      </h3>
      <p className="text-xs text-narvo-ink/50 dark:text-white/45 mb-6 font-mono leading-relaxed">
        {libraryListenReadTimeLine(story.time)}
      </p>
      <div className="flex justify-between items-center gap-3">
        <div className="text-xs text-narvo-ink/40 dark:text-white/40 font-medium min-w-0 truncate">
          {story.source}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleRemove(story)}
            className="p-3 rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-vermilion/15 hover:text-narvo-vermilion transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Remove from downloads"
            aria-label="Remove from downloads"
          >
            <Trash2 size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => playTrack({ id: story.id, title: story.title, source: story.source })}
            className="p-3 rounded-full bg-narvo-vermilion text-white min-h-[44px] min-w-[44px] flex items-center justify-center shadow-md shadow-narvo-vermilion/20 group-hover:scale-105 transition-transform"
            aria-label={`Play: ${story.title}`}
          >
            <Play size={16} fill="currentColor" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.library_page_title,
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 max-w-[1200px] mx-auto w-full">
        <p className="text-narvo-ink/50 dark:text-white/45 mb-6 sm:mb-8 text-sm sm:text-base">{COPY.library_offline}</p>

        {stories.length > 0 && (
          <div className="space-y-4 sm:space-y-5 mb-8">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
                size={18}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={COPY.library_search_placeholder}
                className="w-full min-h-[48px] rounded-[22px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.06] py-3 pl-11 pr-4 text-[15px] text-narvo-ink dark:text-white placeholder:text-narvo-ink/40 outline-none focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15"
                aria-label={COPY.library_search_placeholder}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label htmlFor="library-sort" className="text-xs font-bold text-narvo-ink/50 dark:text-white/45 shrink-0">
                {COPY.library_sort_label}
              </label>
              <select
                id="library-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="min-h-[44px] rounded-full border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.06] px-4 py-2 text-sm font-bold text-narvo-ink dark:text-white outline-none focus:ring-2 focus:ring-narvo-teal/25 max-w-full"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="lg:hidden text-[11px] text-narvo-ink/40 dark:text-white/35 font-medium">{COPY.library_swipe_hint}</p>
          </div>
        )}

        {stories.length === 0 ? (
          <div className="text-center py-16 sm:py-24 rounded-[32px] border border-dashed border-narvo-ink/12 dark:border-white/10 bg-narvo-mist/20 dark:bg-white/[0.02]">
            <div className="w-20 h-20 mx-auto bg-narvo-ink/5 dark:bg-white/5 rounded-full flex items-center justify-center text-narvo-ink/25 dark:text-white/20 mb-6">
              <Bookmark size={32} aria-hidden />
            </div>
            <h3 className="text-xl font-serif font-bold text-narvo-ink dark:text-white mb-2">No offline stories yet</h3>
            <p className="text-narvo-ink/50 dark:text-white/45 max-w-md mx-auto px-4">{COPY.library_empty_offline}</p>
          </div>
        ) : filteredSorted.length === 0 ? (
          <p className="text-center py-12 text-narvo-ink/50 dark:text-white/45 font-medium">{COPY.search_empty}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {filteredSorted.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="min-w-0"
              >
                <div className="lg:block hidden h-full">{cardInner(story)}</div>
                <div className="lg:hidden">
                  <SwipeToDeleteRow onDelete={() => void handleRemove(story)}>
                    {cardInner(story)}
                  </SwipeToDeleteRow>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedAppShell>
  );
}
