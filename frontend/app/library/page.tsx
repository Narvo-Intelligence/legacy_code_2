'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Bookmark, Play, Search, Trash2, HardDrive, Cloud } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { useToast } from '@/components/Toast';
import {
  getOfflineStories,
  getOfflineStorageStats,
  removeOfflineStory,
  type OfflineStory,
} from '@/lib/offlineStorage';
import {
  hasMeAuth,
  getMyOfflineArticles,
  getMyOfflineStats,
  deleteMyOfflineArticle,
  clearMyOfflineRemote,
  type RemoteOfflineArticle,
} from '@/lib/me-api';
import { clearAllOfflineStories } from '@/lib/offlineStorage';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { CloudFeatureGateBanner } from '@/components/CloudFeatureGateBanner';
import { FilterPillGroup } from '@/components/FilterPillGroup';
import { SwipeToDeleteRow } from '@/components/library/SwipeToDeleteRow';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { COPY, libraryListenReadTimeLine } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel } from '@/lib/narvo-api';
import { NARVO_TOOLBAR_RAIL_CLASS } from '@/lib/narvo-ui-classes';
import { resolveStoryPlayback } from '@/lib/story-playback';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';

type SortMode = 'date-desc' | 'date-asc' | 'title-az' | 'title-za';

type LibraryStory = OfflineStory & {
  cloudOnly?: boolean;
  /** True when this story exists in IndexedDB and in cloud `offline_articles`. */
  syncedToCloud?: boolean;
  hasLocalAudio?: boolean;
  /** ISO saved_at from server when known */
  remoteSavedAt?: string;
  /** Optional narrative from cloud for read-time hint */
  narrativeSnippet?: string;
};

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'date-desc', label: COPY.library_sort_date_new },
  { id: 'date-asc', label: COPY.library_sort_date_old },
  { id: 'title-az', label: COPY.library_sort_title_az },
  { id: 'title-za', label: COPY.library_sort_title_za },
];

function formatStorageBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function readMinutesFromNarrative(narrative?: string | null): number {
  const len = (narrative || '').trim().length;
  if (len <= 0) return 0;
  return Math.max(1, Math.round(len / 1000));
}

function mergeLibraryRows(local: OfflineStory[], remote: RemoteOfflineArticle[]): LibraryStory[] {
  const remoteById = new Map<string, RemoteOfflineArticle>();
  for (const r of remote) {
    const id = r.story_id?.trim();
    if (id) remoteById.set(id, r);
  }

  const byId = new Map<string, LibraryStory>();

  for (const s of local) {
    const row = remoteById.get(s.id);
    const remoteSavedAt = row?.saved_at;
    const savedMs = remoteSavedAt ? Date.parse(remoteSavedAt) : NaN;
    byId.set(s.id, {
      ...s,
      cloudOnly: false,
      syncedToCloud: Boolean(row),
      hasLocalAudio: Boolean(s.audioBlob && s.audioBlob.size > 0),
      remoteSavedAt,
      narrativeSnippet: row?.narrative,
      downloadedAt: Number.isFinite(savedMs)
        ? Math.max(s.downloadedAt, savedMs)
        : s.downloadedAt,
      title: row?.title?.trim() || s.title,
      source: row?.source?.trim() || s.source,
      category: (row?.category || s.category || 'General').toUpperCase(),
    });
  }

  for (const r of remote) {
    const id = r.story_id?.trim();
    if (!id || byId.has(id)) continue;
    const savedAt = r.saved_at ? Date.parse(r.saved_at) : Date.now();
    const readM = readMinutesFromNarrative(r.narrative);
    byId.set(id, {
      id,
      title: r.title?.trim() || 'Untitled',
      source: r.source?.trim() || 'Narvo',
      category: (r.category || 'General').toUpperCase(),
      time: readM > 0 ? `${readM} min` : '—',
      downloadedAt: Number.isFinite(savedAt) ? savedAt : Date.now(),
      cloudOnly: true,
      syncedToCloud: false,
      hasLocalAudio: false,
      remoteSavedAt: r.saved_at,
      narrativeSnippet: r.narrative,
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export default function LibraryPage() {
  const [stories, setStories] = useState<LibraryStory[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');
  const [clearingAll, setClearingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localCache, setLocalCache] = useState<{ storyCount: number; totalBytes: number; audioBytes: number } | null>(
    null
  );
  const [cloudArticleCount, setCloudArticleCount] = useState<number | null>(null);
  const { playTrack, currentTrack, togglePlayPause } = useAudioPlayer();
  const { info: toastInfo } = useToast();

  const loadStories = useCallback(async (isCancelled?: () => boolean) => {
    const dead = () => isCancelled?.() === true;
    setLoading(true);
    try {
      const localP = getOfflineStories();
      const statsP = getOfflineStorageStats();
      const remoteP = hasMeAuth()
        ? getMyOfflineArticles().catch(() => [] as RemoteOfflineArticle[])
        : Promise.resolve([] as RemoteOfflineArticle[]);
      const cloudStatsP = hasMeAuth() ? getMyOfflineStats() : Promise.resolve(null);

      const [local, stats, remote, cloudStats] = await Promise.all([localP, statsP, remoteP, cloudStatsP]);
      if (dead()) return;

      setLocalCache(stats);
      setCloudArticleCount(
        typeof cloudStats?.article_count === 'number' ? cloudStats.article_count : hasMeAuth() ? remote.length : null
      );

      const merged = mergeLibraryRows(Array.isArray(local) ? local : [], Array.isArray(remote) ? remote : []);
      if (!dead()) setStories(merged);
    } catch (error) {
      if (!dead()) {
        console.error('Failed to load library:', error);
        setStories([]);
        setLocalCache({ storyCount: 0, totalBytes: 0, audioBytes: 0 });
        setCloudArticleCount(hasMeAuth() ? 0 : null);
      }
    } finally {
      if (!dead()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadStories(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadStories]);

  useEffect(() => {
    const onAuth = () => void loadStories();
    window.addEventListener('narvo-auth-changed', onAuth);
    return () => window.removeEventListener('narvo-auth-changed', onAuth);
  }, [loadStories]);

  useUserTableRealtime('offline_articles', () => void loadStories(), hasMeAuth());

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

  const playLibraryStory = useCallback(
    (story: LibraryStory) => {
      if (currentTrack?.id === story.id) {
        togglePlayPause();
        return;
      }
      const category = (story.category || 'General').toUpperCase();
      const base = {
        id: story.id,
        title: story.title,
        source: story.source,
        category,
      };
      if (story.audioBlob && story.audioBlob.size > 0) {
        const url = URL.createObjectURL(story.audioBlob);
        playTrack({ ...base, audioUrl: url });
        return;
      }
      void resolveStoryPlayback(story.id, base).then((track) => {
        playTrack(track);
        if (!track.audioUrl?.trim()) {
          toastInfo(COPY.toast_story_no_audio);
        }
      });
    },
    [currentTrack?.id, playTrack, togglePlayPause, toastInfo]
  );

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

  const metaLineForStory = (story: LibraryStory): string => {
    if (story.remoteSavedAt) {
      const date = formatFeedTimeLabel(story.remoteSavedAt);
      return COPY.library_meta_saved_on.replace('{date}', date);
    }
    return `${COPY.library_saved_prefix} ${new Date(story.downloadedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}`;
  };

  const subLineForStory = (story: LibraryStory): string => {
    if (story.hasLocalAudio && story.time && story.time !== '—') {
      return libraryListenReadTimeLine(story.time);
    }
    const readM = readMinutesFromNarrative(story.narrativeSnippet);
    if (readM > 0) {
      return COPY.library_meta_read_estimate.replace('{n}', String(readM));
    }
    if (story.cloudOnly || (!story.hasLocalAudio && story.syncedToCloud)) {
      return COPY.library_meta_stream_hint;
    }
    if (story.time && story.time !== '—') {
      return libraryListenReadTimeLine(story.time);
    }
    return COPY.library_meta_stream_hint;
  };

  const badgeLabel = (story: LibraryStory): string => {
    if (story.cloudOnly) return COPY.library_badge_cloud;
    if (story.hasLocalAudio && story.syncedToCloud) {
      return `${COPY.library_badge_offline_audio} · ${COPY.library_badge_synced}`;
    }
    if (story.hasLocalAudio) return COPY.library_badge_offline_audio;
    if (story.syncedToCloud) return `${story.category} · ${COPY.library_badge_synced}`;
    return story.category;
  };

  const cardInner = (story: LibraryStory) => (
    <div className="group relative h-full rounded-[28px] border border-narvo-ink/[0.07] bg-narvo-cloud p-6 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.12)] transition-all hover:shadow-[0_16px_44px_-14px_rgba(23,50,74,0.16)] dark:border-white/[0.08] dark:bg-narvo-ink sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-vermilion">
          {badgeLabel(story)}
        </span>
        <span className="text-right font-mono text-[10px] text-narvo-ink/40 dark:text-white/40">
          {metaLineForStory(story)}
        </span>
      </div>
      <Link
        href={`/news/${encodeURIComponent(story.id)}`}
        className="block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 rounded-lg"
      >
        <h3 className="text-xl font-serif font-medium text-narvo-ink dark:text-white leading-tight mb-4 group-hover:text-narvo-teal transition-colors">
          {story.title}
        </h3>
      </Link>
      <p className="text-xs text-narvo-ink/50 dark:text-white/45 mb-6 font-mono leading-relaxed">
        {subLineForStory(story)}
      </p>
      <div className="flex justify-between items-center gap-3">
        <div className="text-xs text-narvo-ink/40 dark:text-white/40 font-medium min-w-0 truncate">
          {story.source}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/news/${encodeURIComponent(story.id)}`}
            className="hidden sm:inline-flex min-h-[44px] items-center rounded-full border border-narvo-ink/12 px-3 text-[11px] font-bold text-narvo-teal transition-colors hover:bg-narvo-teal/[0.06] dark:border-white/12 dark:text-narvo-mint"
          >
            {COPY.library_open_article}
          </Link>
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
            onClick={() => playLibraryStory(story)}
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
        kicker: COPY.library_saved,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 max-w-[1200px] mx-auto w-full">
        <p className="text-narvo-ink/50 dark:text-white/45 mb-6 sm:mb-8 text-sm sm:text-base max-w-2xl">
          {COPY.library_offline}
        </p>

        <CloudFeatureGateBanner className="mb-6 sm:mb-8" />

        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-[28px] border border-narvo-ink/10 bg-[var(--bg-card)]/90 p-5 shadow-[0_8px_32px_-16px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-narvo-ink/35 sm:p-6"
          aria-label={COPY.library_cache_title}
        >
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
            {COPY.library_cache_title}
          </p>
          {loading && !localCache ? (
            <ListRowSkeleton count={2} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3 rounded-[22px] border border-narvo-ink/[0.06] bg-narvo-cloud/90 p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-narvo-teal/12 text-narvo-teal dark:bg-narvo-mint/15 dark:text-narvo-mint">
                  <HardDrive size={20} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-narvo-ink dark:text-white">{COPY.library_cache_on_device}</p>
                  <p className="mt-1 font-mono text-[11px] text-narvo-ink/55 dark:text-white/50">
                    {COPY.library_cache_stories_count.replace('{n}', String(localCache?.storyCount ?? 0))}
                    {' · '}
                    {COPY.library_cache_total_approx.replace('{size}', formatStorageBytes(localCache?.totalBytes ?? 0))}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-narvo-ink/45 dark:text-white/40">
                    {COPY.library_cache_audio}:{' '}
                    {COPY.library_cache_audio_size.replace('{size}', formatStorageBytes(localCache?.audioBytes ?? 0))}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-[22px] border border-narvo-ink/[0.06] bg-narvo-cloud/90 p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-narvo-vermilion/12 text-narvo-vermilion">
                  <Cloud size={20} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-narvo-ink dark:text-white">{COPY.library_cache_cloud}</p>
                  <p className="mt-1 font-mono text-[11px] text-narvo-ink/55 dark:text-white/50">
                    {hasMeAuth()
                      ? COPY.library_cache_cloud_count.replace('{n}', String(cloudArticleCount ?? 0))
                      : '—'}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-narvo-ink/50 dark:text-white/45">
                    {COPY.library_cache_cloud_note}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {!loading && stories.length > 0 && (
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
            <div className={`relative ${NARVO_TOOLBAR_RAIL_CLASS}`}>
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
            <div className={NARVO_TOOLBAR_RAIL_CLASS}>
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
            <p className="text-[11px] font-medium text-narvo-ink/40 dark:text-white/35 lg:hidden">
              {COPY.library_swipe_hint}
            </p>
          </div>
        )}

        {loading && stories.length === 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ListRowSkeleton count={4} />
          </div>
        ) : stories.length === 0 ? (
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
