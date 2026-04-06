'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Headphones, Newspaper, Bookmark, LayoutDashboard, Play, Pause, ListMusic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { StoryCardLarge } from '@/components/StoryCardLarge';
import { QueueItem } from '@/components/QueueItem';
import { BriefingCardSkeleton, ListRowSkeleton } from '@/components/Skeleton';
import { subscribePlaybackEnded, useAudioPlayer } from '@/components/AudioPlayerContext';
import { COPY } from '@/lib/narvo-app-copy';
import {
  briefingPlayerTrackId,
  fetchNewsList,
  NEWS_LIST_MAX_LIMIT,
  type ApiNewsListItem,
} from '@/lib/narvo-api';
import { resolveStoryPlayback } from '@/lib/story-playback';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';
import { getOfflineStories, type OfflineStory } from '@/lib/offlineStorage';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

export default function ListenPage() {
  const { currentTrack, isPlaying, togglePlayPause, playTrack, progress } = useAudioPlayer();
  const { briefing, loading: briefingLoading, error: briefingErr } = useLatestBriefing();
  const [featured, setFeatured] = useState<ApiNewsListItem | null>(null);
  const [savedStories, setSavedStories] = useState<OfflineStory[]>([]);
  const [recentItems, setRecentItems] = useState<ApiNewsListItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'saved'>('queue');
  const [broadcastOn, setBroadcastOn] = useState(false);
  const [broadcastQueue, setBroadcastQueue] = useState<ApiNewsListItem[]>([]);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const broadcastOnRef = useRef(false);
  const broadcastQueueRef = useRef<ApiNewsListItem[]>([]);
  const broadcastIdxRef = useRef(0);

  useEffect(() => {
    broadcastOnRef.current = broadcastOn;
  }, [broadcastOn]);
  useEffect(() => {
    broadcastQueueRef.current = broadcastQueue;
  }, [broadcastQueue]);

  const briefingAudio = briefing?.audio_url?.trim() || null;
  const briefingId = briefing ? briefingPlayerTrackId(briefing) : '';
  const briefingActive = currentTrack?.id === briefingId || currentTrack?.id === 'briefing-pending';

  const playBriefing = () => {
    if (!briefing) return;
    const title = briefing.title?.trim() || COPY.briefing_title;
    if (briefingAudio) {
      if (briefingActive) { togglePlayPause(); return; }
      playTrack({ id: briefingId, title, source: COPY.brand_name, category: 'BRIEFING', audioUrl: briefingAudio });
    } else {
      if (currentTrack?.id === 'briefing-pending') { togglePlayPause(); return; }
      playTrack({ id: 'briefing-pending', title, source: COPY.brand_name, category: 'BRIEFING' });
    }
  };

  const loadData = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const [news, saved] = await Promise.all([
        fetchNewsList({ limit: 6 }).catch(() => []),
        getOfflineStories().catch(() => []),
      ]);
      const newsArr = Array.isArray(news) ? news : [];
      setFeatured(newsArr[0] ?? null);
      setRecentItems(newsArr.slice(0, 4));
      setSavedStories(Array.isArray(saved) ? saved.slice(0, 6) : []);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    return subscribePlaybackEnded(() => {
      if (!broadcastOnRef.current) return;
      const q = broadcastQueueRef.current;
      if (q.length === 0) return;
      let next = broadcastIdxRef.current + 1;
      if (next >= q.length) next = 0;
      broadcastIdxRef.current = next;
      const item = q[next];
      if (!item?.id) return;
      const title = item.title?.trim() || 'Untitled';
      const source = item.source?.trim() || 'Narvo';
      const category = (item.category || 'General').toUpperCase();
      void resolveStoryPlayback(item.id, { id: item.id, title, source, category }).then((track) =>
        playTrack(track)
      );
    });
  }, [playTrack]);

  const startBroadcast = async () => {
    setBroadcastBusy(true);
    try {
      const list = await fetchNewsList({ limit: NEWS_LIST_MAX_LIMIT }).catch(() => []);
      const arr = Array.isArray(list) ? list : [];
      if (arr.length === 0) return;
      setBroadcastQueue(arr);
      broadcastQueueRef.current = arr;
      broadcastIdxRef.current = 0;
      broadcastOnRef.current = true;
      setBroadcastOn(true);
      const first = arr[0]!;
      const title = first.title?.trim() || 'Untitled';
      const source = first.source?.trim() || 'Narvo';
      const category = (first.category || 'General').toUpperCase();
      void resolveStoryPlayback(first.id, { id: first.id, title, source, category }).then((track) =>
        playTrack(track)
      );
    } finally {
      setBroadcastBusy(false);
    }
  };

  const stopBroadcast = () => {
    broadcastOnRef.current = false;
    setBroadcastOn(false);
  };

  const tabs: { id: 'queue' | 'saved'; label: string }[] = [
    { id: 'queue', label: 'Up next' },
    { id: 'saved', label: 'Saved offline' },
  ];

  return (
    <AuthenticatedAppShell
      header={{ title: COPY.listen_page_title, kicker: COPY.listen_page_kicker }}
    >
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_min(380px,32vw)] lg:gap-8 xl:gap-12 items-start">

        {/* ── Left: Now playing + featured ── */}
        <div className="space-y-6 min-w-0">

          {/* Now playing card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-narvo-cloud/95 dark:bg-narvo-ink/40 p-6 sm:p-8 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.1)]"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-narvo-vermilion/15 text-narvo-vermilion shrink-0">
                <Headphones size={24} aria-hidden />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">{COPY.listen_now_playing}</h2>
                <p className="text-xs font-mono text-narvo-ink/45 dark:text-white/40 uppercase tracking-widest">
                  {COPY.listen_global_player_kicker}
                </p>
              </div>
            </div>
            {currentTrack ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-serif text-base font-semibold text-narvo-ink dark:text-white leading-snug">{currentTrack.title}</p>
                    <p className="text-sm text-narvo-ink/50 dark:text-white/45 mt-1">{currentTrack.source}</p>
                  </div>
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25 active:scale-[0.96] transition-transform"
                    aria-label={isPlaying ? COPY.listen_pause_a11y : COPY.listen_play_a11y}
                  >
                    {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
                  </button>
                </div>
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-narvo-ink/[0.08] dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-narvo-vermilion/80 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-narvo-ink/35 dark:text-white/30">{Math.round(progress)}% complete</span>
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="font-mono text-[9px] font-bold text-narvo-teal dark:text-narvo-mint hover:underline"
                    >
                      {isPlaying ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.listen_nothing_playing}</p>
            )}
          </motion.section>

          {/* Briefing entry */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.04 }}
            className="rounded-[28px] overflow-hidden border border-narvo-ink/10 dark:border-white/10 bg-gradient-to-br from-narvo-teal to-[#0a4959] text-white shadow-[0_16px_48px_-16px_rgba(15,95,115,0.35)]"
            aria-label="Morning Briefing"
          >
            <div className="p-6 sm:p-8 relative">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.07] blur-xl" aria-hidden />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/65 relative z-10">
                {COPY.briefing_title}
              </p>
              {briefingLoading ? (
                <p className="mt-2 font-serif text-xl text-white/80">{COPY.status_loading}</p>
              ) : (
                <h3 className="mt-2 font-serif text-xl sm:text-2xl font-semibold leading-snug max-w-md relative z-10">
                  {briefing?.title?.trim() || COPY.briefing_ready}
                </h3>
              )}
              <div className="mt-5 flex flex-wrap gap-2 relative z-10">
                <button
                  type="button"
                  onClick={playBriefing}
                  disabled={briefingLoading || !briefing}
                  className="inline-flex items-center gap-2 min-h-[48px] rounded-full bg-white/15 border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/20 transition-colors disabled:opacity-40"
                >
                  {briefingActive && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  {briefingActive && isPlaying ? 'Pause' : COPY.briefing_listen_now}
                </button>
                <Link
                  href="/briefing"
                  className="inline-flex items-center min-h-[48px] rounded-full border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                >
                  <Newspaper size={16} className="mr-2" aria-hidden />
                  {COPY.briefing_open_full}
                </Link>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-narvo-cloud/95 dark:bg-narvo-ink/35 p-6 sm:p-8 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.1)]"
            aria-label={COPY.listen_broadcast_title}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.listen_broadcast_title}
                </p>
                <p className="mt-2 text-sm text-narvo-ink/60 dark:text-white/50 leading-relaxed max-w-xl">
                  {COPY.listen_broadcast_desc}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                {broadcastOn ? (
                  <button
                    type="button"
                    onClick={stopBroadcast}
                    className="min-h-[48px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 font-bold text-narvo-ink dark:text-white"
                  >
                    {COPY.listen_broadcast_disable}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={broadcastBusy}
                    onClick={() => void startBroadcast()}
                    className="min-h-[48px] rounded-full bg-narvo-teal px-6 font-bold text-white shadow-md shadow-narvo-teal/20 disabled:opacity-50 dark:bg-narvo-mint dark:text-narvo-ink"
                  >
                    {broadcastBusy ? COPY.status_loading : COPY.listen_broadcast_enable}
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          {/* Featured story */}
          {loadingFeed ? (
            <div className="rounded-[28px] border border-narvo-ink/[0.06] dark:border-white/[0.06] bg-narvo-cloud dark:bg-narvo-ink p-6">
              <div className="h-4 w-24 rounded bg-narvo-ink/8 dark:bg-white/8 animate-pulse mb-4" />
              <div className="h-6 w-full rounded bg-narvo-ink/8 dark:bg-white/8 animate-pulse mb-2" />
              <div className="h-6 w-3/4 rounded bg-narvo-ink/8 dark:bg-white/8 animate-pulse" />
            </div>
          ) : featured ? (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.06 }}
              aria-labelledby="listen-featured-heading"
            >
              <div className="flex items-center gap-2 mb-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.listen_featured_kicker}
                </p>
              </div>
              <StoryCardLarge item={featured} featured />
            </motion.section>
          ) : null}

          {/* Quick nav links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { href: '/dashboard', icon: LayoutDashboard, label: COPY.listen_open_feed },
              { href: '/library', icon: Bookmark, label: COPY.listen_open_library },
              { href: '/briefing', icon: Newspaper, label: COPY.listen_open_briefing },
            ] as const).map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-[22px] border border-narvo-ink/10 bg-narvo-cloud/90 font-bold text-sm text-narvo-ink hover:border-narvo-teal/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-white transition-colors"
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Right: Queue panel ── */}
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.08 }}
          className="mt-6 lg:mt-0 rounded-[28px] border border-narvo-ink/8 dark:border-white/10 bg-narvo-cloud/90 dark:bg-narvo-ink/35 overflow-hidden"
        >
          {/* Tab rail */}
          <div className="flex border-b border-narvo-ink/[0.06] dark:border-white/[0.06]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  activeTab === t.id
                    ? 'text-narvo-teal dark:text-narvo-mint border-b-2 border-narvo-teal dark:border-narvo-mint'
                    : 'text-narvo-ink/45 dark:text-white/40 hover:text-narvo-ink dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === 'queue' ? (
                <motion.div
                  key="queue"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <ListMusic size={14} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                      Queue panel
                    </p>
                  </div>
                  {currentTrack ? (
                    <QueueItem
                      index={1}
                      title={currentTrack.title}
                      source={currentTrack.source}
                      status="playing"
                    />
                  ) : null}
                  {loadingFeed ? (
                    <ListRowSkeleton count={3} />
                  ) : recentItems.length > 0 ? (
                    recentItems.map((item, i) => (
                      <QueueItem
                        key={item.id}
                        index={(currentTrack ? 1 : 0) + i + 1}
                        title={item.title || 'Untitled'}
                        source={item.source || 'Narvo'}
                        status="queued"
                        onRemove={() => {}} // placeholder — full queue state in AudioContext v2
                      />
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-narvo-ink/45 dark:text-white/40">
                      No stories in queue yet. Play something from the feed.
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint mb-4">
                    Saved offline
                  </p>
                  {loadingFeed ? (
                    <ListRowSkeleton count={4} />
                  ) : savedStories.length > 0 ? (
                    savedStories.map((s, i) => (
                      <QueueItem
                        key={s.id}
                        index={i + 1}
                        title={s.title}
                        source={s.source}
                        duration={s.time}
                        status="queued"
                      />
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-sm text-narvo-ink/45 dark:text-white/40">No offline stories yet.</p>
                      <Link href="/library" className="text-xs font-bold text-narvo-teal dark:text-narvo-mint hover:underline">
                        Go to Library →
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>

      </div>
    </AuthenticatedAppShell>
  );
}
