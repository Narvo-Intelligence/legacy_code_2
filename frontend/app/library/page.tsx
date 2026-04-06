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
  clearMyOfflineRemote,
} from '@/lib/me-api';
import { clearAllOfflineStories } from '@/lib/offlineStorage';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { FilterPillGroup } from '@/components/FilterPillGroup';
import { SwipeToDeleteRow } from '@/components/library/SwipeToDeleteRow';
import { EmptyState } from '@/components/EmptyState';
import { COPY, libraryListenReadTimeLine } from '@/lib/narvo-app-copy';

type SortMode = 'date-desc' | 'date-asc' | 'title-az' | 'title-za';

type LibraryStory = OfflineStory & { cloudOnly?: boolean };

const TOOLBAR_RAIL =
  'rounded-2xl border border-narvo-ink/8 bg-narvo-mist/45 p-2.5 shadow-[0_10px_32px_-14px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] sm:p-3';

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
  const [clearingAll, setClearingAll] = useState(false);
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

  const handleClearAll = async () => {
    if (typeof window === 'undefined' || !window.confirm(COPY.library_clear_all_confirm)) return;
    setClearingAll(true);
    try {
      await clearAllOfflineStories();
      if (hasMeAuth()) {
        try {
          await clearMyOfflineRemote();
        } catch {
          /* ignore */
        }
      }
      await loadStories();
    } catch (e) {
      console.error('Clear all failed:', e);
    } finally {
      setClearingAll(false);
    }
  };

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
    <div className="group relative h-full rounded-[28px] border border-narvo-ink/[0.07] bg-narvo-cloud p-6 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.12)] transition-all hover:shadow-[0_16px_44px_-14px_rgba(23,50,74,0.16)] dark:border-white/[0.08] dark:bg-narvo-ink sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-vermilion">
          {story.cloudOnly ? `${COPY.library_saved_cloud} · ${story.category}` : story.category}
        </span>
        <span className="text-right font-mono text-[10px] text-narvo-ink/40 dark:text-white/40">
          {COPY.library_saved_prefix}{' '}
          {new Date(story.downloadedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}
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
            title={COPY.library_remove_saved_a11y}
            aria-label={COPY.library_remove_saved_a11y}
          >
            <Trash2 size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => playTrack({ id: story.id, title: story.title, source: story.source })}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-narvo-vermilion p-3 text-white shadow-md shadow-narvo-vermilion/20 transition-transform active:scale-[0.96]"
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
          <div className="mb-8 space-y-4 sm:space-y-5">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={clearingAll}
                onClick={() => void handleClearAll()}
                className="min-h-[44px] rounded-full border border-narvo-vermilion/35 px-4 text-sm font-bold text-narvo-vermilion transition-colors hover:bg-narvo-vermilion/10 disabled:opacity-45"
              >
                {clearingAll ? COPY.status_loading : COPY.library_clear_all}
              </button>
            </div>
            <div className={`relative ${TOOLBAR_RAIL}`}>
              <Search
                className="pointer-events-none absolute left-5 top-1/2 z-[1] -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 sm:left-6"
                size={18}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={COPY.library_search_placeholder}
                className="w-full min-h-[48px] rounded-[18px] border border-narvo-ink/10 bg-white py-3 pl-11 pr-4 text-[15px] text-narvo-ink placeholder:text-narvo-ink/40 outline-none transition-shadow focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 dark:border-white/10 dark:bg-narvo-ink/40 dark:text-white sm:pl-12"
                aria-label={COPY.library_search_placeholder}
              />
            </div>
            <div className={TOOLBAR_RAIL}>
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-ink/45 dark:text-white/40">
                {COPY.library_sort_label}
              </p>
              <FilterPillGroup
                items={SORT_OPTIONS}
                value={sort}
                onChange={setSort}
                ariaLabel={COPY.library_sort_label}
              />
            </div>
            <p className="text-[11px] font-medium text-narvo-ink/40 dark:text-white/35 lg:hidden">{COPY.library_swipe_hint}</p>
          </div>
        )}

        {stories.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={COPY.library_empty_saved_title}
            description={COPY.library_empty_offline}
          />
        ) : filteredSorted.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={COPY.library_no_matches_title}
            description={COPY.library_no_matches_desc}
          />
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
