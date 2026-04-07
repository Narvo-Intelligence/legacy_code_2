'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Headphones,
  Newspaper,
  Bookmark,
  LayoutDashboard,
  Play,
  Pause,
  ListMusic,
  History,
  Radio,
  Sunrise,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { StoryCardLarge } from '@/components/StoryCardLarge';
import { QueueItem } from '@/components/QueueItem';
import { ListRowSkeleton } from '@/components/Skeleton';
import { claimNextPlayback, subscribePlaybackEnded, useAudioPlayer } from '@/components/AudioPlayerContext';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';
import { COPY } from '@/lib/narvo-app-copy';
import {
  briefingPlayerTrackId,
  fetchNewsList,
  formatFeedTimeLabel,
  NEWS_LIST_MAX_LIMIT,
  type ApiNewsListItem,
} from '@/lib/narvo-api';
import {
  getMyListeningHistory,
  getMyOfflineArticles,
  hasMeAuth,
  type ListeningHistoryRow,
  type RemoteOfflineArticle,
} from '@/lib/me-api';
import { resolveStoryPlayback } from '@/lib/story-playback';
import { getNewsArticleHrefFromTrack } from '@/lib/player-routes';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';
import { getOfflineStories, type OfflineStory } from '@/lib/offlineStorage';
import { NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function mergeSavedStories(local: OfflineStory[], remote: RemoteOfflineArticle[]): OfflineStory[] {
  type Row = OfflineStory & { sortKey: number };
  const byId = new Map<string, Row>();
  for (const s of local) {
    byId.set(s.id, { ...s, sortKey: s.downloadedAt });
  }
  for (const r of remote) {
    const id = r.story_id?.trim();
    if (!id) continue;
    const prev = byId.get(id);
    const savedAt = r.saved_at ? new Date(r.saved_at).getTime() : Date.now();
    byId.set(id, {
      id,
      title: r.title?.trim() || prev?.title || 'Untitled',
      source: r.source?.trim() || prev?.source || 'Narvo',
      category: (r.category || prev?.category || 'General').toUpperCase(),
      time: r.saved_at ? formatFeedTimeLabel(r.saved_at) : prev?.time || '—',
      downloadedAt: prev?.downloadedAt ?? savedAt,
      audioBlob: prev?.audioBlob,
      sortKey: Math.max(prev?.sortKey ?? 0, savedAt),
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _s, ...rest }) => rest);
}

function historyItemHref(row: ListeningHistoryRow): string | null {
  const tid = row.track_id?.trim();
  if (!tid) return null;
  if (tid === 'briefing-pending' || tid.startsWith('briefing-')) return '/briefing';
  if ((row.category || '').toUpperCase() === 'BRIEFING') return '/briefing';
  return `/news/${encodeURIComponent(tid)}`;
}

function formatHistoryDuration(sec: number | null | undefined): string | undefined {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return undefined;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function ListenPage() {
  const authBridge = useNarvoAuthBridge();
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    playTrack,
    progress,
    playQueue,
    persistedResume,
    enqueueTrack,
    removeFromQueueAt,
    clearPlayQueue,
    resumeFromPersisted,
  } = useAudioPlayer();
  const { briefing, loading: briefingLoading, error: briefingErr } = useLatestBriefing();
  const [featured, setFeatured] = useState<ApiNewsListItem | null>(null);
  const [savedStories, setSavedStories] = useState<OfflineStory[]>([]);
  const [recentItems, setRecentItems] = useState<ApiNewsListItem[]>([]);
  const [historyRows, setHistoryRows] = useState<ListeningHistoryRow[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'saved'>('queue');
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

  const nowArticleHref = currentTrack ? getNewsArticleHrefFromTrack(currentTrack) : null;

  const briefingAudio = briefing?.audio_url?.trim() || null;
  const briefingId = briefing ? briefingPlayerTrackId(briefing) : '';
  const briefingActive = currentTrack?.id === briefingId || currentTrack?.id === 'briefing-pending';

  const playBriefing = () => {
    if (!briefing) return;
    const title = briefing.title?.trim() || COPY.briefing_title;
    if (briefingAudio) {
      if (briefingActive) {
        togglePlayPause();
        return;
      }
      playTrack({ id: briefingId, title, source: COPY.brand_name, category: 'BRIEFING', audioUrl: briefingAudio });
    } else {
      if (currentTrack?.id === 'briefing-pending') {
        togglePlayPause();
        return;
      }
      playTrack({ id: 'briefing-pending', title, source: COPY.brand_name, category: 'BRIEFING' });
    }
  };

  const loadData = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const newsPromise = fetchNewsList({ limit: 8 }).catch(() => [] as ApiNewsListItem[]);
      const localSavedPromise = getOfflineStories().catch(() => [] as OfflineStory[]);
      const remoteSavedPromise = hasMeAuth()
        ? getMyOfflineArticles().catch(() => [] as RemoteOfflineArticle[])
        : Promise.resolve([] as RemoteOfflineArticle[]);
      const historyPromise = hasMeAuth()
        ? getMyListeningHistory(30).catch(() => [] as ListeningHistoryRow[])
        : Promise.resolve([] as ListeningHistoryRow[]);

      const [news, localSaved, remoteSaved, hist] = await Promise.all([
        newsPromise,
        localSavedPromise,
        remoteSavedPromise,
        historyPromise,
      ]);
      const newsArr = Array.isArray(news) ? news : [];
      setFeatured(newsArr[0] ?? null);
      setRecentItems(newsArr.slice(1, 7));
      setSavedStories(mergeSavedStories(Array.isArray(localSaved) ? localSaved : [], remoteSaved));
      setHistoryRows(Array.isArray(hist) ? hist : []);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleLoad = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void loadData();
      }, 400);
    };
    window.addEventListener('narvo-auth-changed', scheduleLoad);
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, scheduleLoad);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener('narvo-auth-changed', scheduleLoad);
      window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, scheduleLoad);
    };
  }, [loadData]);

  useUserTableRealtime('listening_history', () => void loadData(), hasMeAuth());
  useUserTableRealtime('offline_articles', () => void loadData(), hasMeAuth());

  useEffect(() => {
    return subscribePlaybackEnded(() => {
      if (!broadcastOnRef.current) return;
      const q = broadcastQueueRef.current;
      if (q.length === 0) return;
      claimNextPlayback();
      let next = broadcastIdxRef.current + 1;
      if (next >= q.length) next = 0;
      broadcastIdxRef.current = next;
      const item = q[next];
      if (!item?.id) return;
      const title = item.title?.trim() || 'Untitled';
      const source = item.source?.trim() || 'Narvo';
      const category = (item.category || 'General').toUpperCase();
      void resolveStoryPlayback(item.id, { id: item.id, title, source, category }).then((track) => playTrack(track));
    });
  }, [playTrack]);

  const startBroadcast = async () => {
    setBroadcastBusy(true);
    try {
      const list = await fetchNewsList({ limit: NEWS_LIST_MAX_LIMIT }).catch(() => []);
      const arr = Array.isArray(list) ? list : [];
      if (arr.length === 0) return;
      clearPlayQueue();
      setBroadcastQueue(arr);
      broadcastQueueRef.current = arr;
      broadcastIdxRef.current = 0;
      broadcastOnRef.current = true;
      setBroadcastOn(true);
      const first = arr[0]!;
      const title = first.title?.trim() || 'Untitled';
      const source = first.source?.trim() || 'Narvo';
      const category = (first.category || 'General').toUpperCase();
      void resolveStoryPlayback(first.id, { id: first.id, title, source, category }).then((track) => playTrack(track));
    } finally {
      setBroadcastBusy(false);
    }
  };

  const stopBroadcast = () => {
    broadcastOnRef.current = false;
    setBroadcastOn(false);
  };

  const progressLabel = COPY.listen_progress_percent.replace('{n}', String(Math.round(progress)));

  const addFeedItemToQueue = (item: ApiNewsListItem) => {
    const title = item.title?.trim() || 'Untitled';
    const source = item.source?.trim() || 'Narvo';
    const category = (item.category || 'General').toUpperCase();
    void resolveStoryPlayback(item.id, { id: item.id, title, source, category }).then(enqueueTrack);
  };

  const showContinueCard =
    Boolean(persistedResume) &&
    !(currentTrack?.id === persistedResume?.track.id && isPlaying);
  const resumePctLabel = persistedResume
    ? COPY.listen_progress_percent.replace('{n}', String(Math.round(persistedResume.progressRatio * 100)))
    : '';

  const recentHistoryStrip = hasMeAuth() ? historyRows.slice(0, 8) : [];

  const tabs: { id: 'queue' | 'history' | 'saved'; label: string; icon: typeof ListMusic }[] = [
    { id: 'queue', label: COPY.listen_tab_queue, icon: ListMusic },
    { id: 'history', label: COPY.listen_tab_history, icon: History },
    { id: 'saved', label: COPY.listen_tab_saved, icon: Bookmark },
  ];

  const sidePanelInner = (
    <>
      <div className="flex shrink-0 border-b border-narvo-ink/[0.06] dark:border-white/[0.06]">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3.5 text-[11px] font-bold transition-colors sm:flex-row sm:gap-2 sm:text-sm ${
                activeTab === t.id
                  ? 'text-narvo-teal dark:text-narvo-mint border-b-2 border-narvo-teal dark:border-narvo-mint bg-narvo-teal/[0.04] dark:bg-narvo-mint/[0.06]'
                  : 'text-narvo-ink/45 dark:text-white/40 hover:text-narvo-ink dark:hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'queue' ? (
            <motion.div
              key="queue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <ListMusic size={14} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.listen_queue_your_queue_kicker}
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
              {playQueue.length > 0 ? (
                <ul className="mb-6 space-y-1">
                  {playQueue.map((t, i) => (
                    <li key={`${t.id}-${i}`}>
                      <QueueItem
                        index={(currentTrack ? 1 : 0) + i + 1}
                        title={t.title}
                        source={t.source}
                        status="queued"
                        onRemove={() => removeFromQueueAt(i)}
                      />
                    </li>
                  ))}
                </ul>
              ) : !currentTrack ? (
                <p className="mb-6 py-2 text-center text-sm text-narvo-ink/45 dark:text-white/40">
                  {COPY.listen_queue_empty}
                </p>
              ) : null}
              <div className="mb-3 flex items-center gap-2 border-t border-narvo-ink/[0.06] pt-4 dark:border-white/[0.06]">
                <ListMusic size={14} className="text-narvo-ink/35 dark:text-white/35" aria-hidden />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                  {COPY.listen_queue_suggestions_kicker}
                </p>
              </div>
              {loadingFeed ? (
                <ListRowSkeleton count={4} />
              ) : recentItems.length > 0 ? (
                <ul className="space-y-1">
                  {recentItems.map((item, si) => (
                    <li key={item.id} className="flex items-stretch gap-1">
                      <div className="min-w-0 flex-1">
                        <QueueItem
                          index={si + 1}
                          title={item.title || 'Untitled'}
                          source={item.source || 'Narvo'}
                          status="queued"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addFeedItemToQueue(item)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-2xl border border-narvo-ink/10 text-narvo-teal transition-colors hover:bg-narvo-teal/[0.06] dark:border-white/10 dark:text-narvo-mint"
                        aria-label={COPY.listen_enqueue_a11y}
                      >
                        <Plus size={18} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm leading-relaxed text-narvo-ink/45 dark:text-white/40">
                  {COPY.listen_queue_empty}
                </p>
              )}
            </motion.div>
          ) : activeTab === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <History size={14} className="shrink-0 text-narvo-teal dark:text-narvo-mint" aria-hidden />
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint truncate">
                    {COPY.listen_history_panel_kicker}
                  </p>
                </div>
                {authBridge.hydrated && authBridge.hasApiToken ? (
                  <Link
                    href="/insights"
                    className="shrink-0 text-[10px] font-bold text-narvo-teal dark:text-narvo-mint underline underline-offset-2"
                  >
                    {COPY.listen_insights_link}
                  </Link>
                ) : null}
              </div>
              {!authBridge.hydrated ? (
                <ListRowSkeleton count={5} />
              ) : !authBridge.hasApiToken ? (
                <div className="py-6 px-2 text-center space-y-3">
                  <p className="text-sm leading-relaxed text-narvo-ink/50 dark:text-white/45">
                    {authBridge.hasSession ? COPY.cloud_sync_paused_body : COPY.insights_sign_in}
                  </p>
                  <Link
                    href="/auth"
                    className="inline-flex min-h-[44px] items-center justify-center text-sm font-bold text-narvo-teal dark:text-narvo-mint underline-offset-2 hover:underline"
                  >
                    {authBridge.hasSession ? COPY.auth_renew_session_cta : COPY.auth_sign_in}
                  </Link>
                </div>
              ) : loadingFeed ? (
                <ListRowSkeleton count={5} />
              ) : historyRows.length > 0 ? (
                <ul className="space-y-1">
                  {historyRows.map((row, i) => {
                    const href = historyItemHref(row);
                    const title = row.title?.trim() || 'Untitled';
                    const source = row.source?.trim() || 'Narvo';
                    const dur = formatHistoryDuration(row.duration ?? undefined);
                    const played = row.played_at ? formatFeedTimeLabel(row.played_at) : undefined;
                    const meta = [played, dur].filter(Boolean).join(' · ');
                    const item = (
                      <QueueItem
                        index={i + 1}
                        title={title}
                        source={source}
                        duration={meta || undefined}
                        status="queued"
                      />
                    );
                    return (
                      <li key={`${row.track_id}-${row.played_at}-${i}`}>
                        {href ? (
                          <Link href={href} className="-mx-1 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35">
                            {item}
                          </Link>
                        ) : (
                          item
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-narvo-ink/45 dark:text-white/40">{COPY.listen_history_empty}</p>
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
              <div className="mb-4 flex items-center gap-2">
                <Bookmark size={14} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.listen_saved_panel_kicker}
                </p>
              </div>
              {loadingFeed ? (
                <ListRowSkeleton count={4} />
              ) : savedStories.length > 0 ? (
                savedStories.map((s, i) => (
                  <Link key={s.id} href={`/news/${encodeURIComponent(s.id)}`} className="block rounded-2xl">
                    <QueueItem index={i + 1} title={s.title} source={s.source} duration={s.time} status="queued" />
                  </Link>
                ))
              ) : (
                <div className="space-y-3 py-8 text-center">
                  <p className="text-sm text-narvo-ink/45 dark:text-white/40">{COPY.listen_saved_empty}</p>
                  <Link
                    href="/library"
                    className="inline-flex min-h-[44px] items-center justify-center text-xs font-bold text-narvo-teal dark:text-narvo-mint hover:underline"
                  >
                    {COPY.listen_saved_go_library}
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <AuthenticatedAppShell
      header={{ title: COPY.listen_page_title, kicker: COPY.listen_page_kicker }}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_min(360px,32vw)] lg:items-stretch lg:gap-10 xl:gap-12 lg:px-10">
        <div className="min-w-0 space-y-8">
          {(showContinueCard || briefing || briefingLoading) && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="rounded-[28px] border border-narvo-ink/10 bg-narvo-cloud/95 p-5 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.1)] dark:border-white/10 dark:bg-narvo-ink/40 sm:p-6"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                {showContinueCard && persistedResume ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                      {COPY.listen_continue_title}
                    </p>
                    <p className="font-serif text-base font-semibold leading-snug text-narvo-ink dark:text-white">
                      {persistedResume.track.title}
                    </p>
                    <p className="text-xs text-narvo-ink/50 dark:text-white/45">{resumePctLabel}</p>
                    <button
                      type="button"
                      onClick={() => void resumeFromPersisted()}
                      className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-full bg-narvo-teal px-5 text-sm font-bold text-white shadow-md shadow-narvo-teal/20 dark:bg-narvo-mint dark:text-narvo-ink"
                    >
                      {COPY.listen_resume_cta}
                    </button>
                  </div>
                ) : null}
                {briefingLoading && !briefing ? (
                  <div
                    className={`flex min-w-0 flex-col gap-2 ${showContinueCard ? 'sm:max-w-[220px] sm:border-l sm:border-narvo-ink/10 sm:pl-5 dark:sm:border-white/10' : ''}`}
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-vermilion">
                      {COPY.listen_briefing_shortcut_title}
                    </p>
                    <p className="text-sm text-narvo-ink/55 dark:text-white/50">{COPY.status_loading}</p>
                  </div>
                ) : briefing ? (
                  <div
                    className={`flex min-w-0 flex-col gap-2 ${showContinueCard ? 'sm:max-w-[220px] sm:border-l sm:border-narvo-ink/10 sm:pl-5 dark:sm:border-white/10' : ''}`}
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-vermilion">
                      {COPY.listen_briefing_shortcut_title}
                    </p>
                    <button
                      type="button"
                      onClick={playBriefing}
                      disabled={briefingLoading}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-narvo-ink/12 bg-narvo-ink/[0.03] px-4 text-sm font-bold text-narvo-ink transition-colors hover:bg-narvo-ink/[0.06] disabled:opacity-40 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <Sunrise size={18} className="text-narvo-vermilion shrink-0" aria-hidden />
                      {briefingActive && isPlaying ? COPY.briefing_pause : COPY.listen_play_cta}
                    </button>
                    <Link
                      href="/briefing"
                      className="text-xs font-bold text-narvo-teal underline-offset-2 hover:underline dark:text-narvo-mint"
                    >
                      {COPY.briefing_open_full}
                    </Link>
                  </div>
                ) : null}
              </div>
            </motion.section>
          )}

          {recentHistoryStrip.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.02 }}
              aria-labelledby="listen-recent-heading"
            >
              <p
                id="listen-recent-heading"
                className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint"
              >
                {COPY.listen_history_title}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentHistoryStrip.map((row, i) => {
                  const href = historyItemHref(row);
                  const title = row.title?.trim() || 'Untitled';
                  const inner = (
                    <div className="flex h-full min-w-[200px] max-w-[240px] flex-col justify-between rounded-[22px] border border-narvo-ink/10 bg-narvo-cloud/90 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                      <p className="line-clamp-2 font-serif text-sm font-semibold leading-snug text-narvo-ink dark:text-white">
                        {title}
                      </p>
                      <p className="mt-2 font-mono text-[10px] text-narvo-ink/40 dark:text-white/35">
                        {(row.played_at ? formatFeedTimeLabel(row.played_at) : '') || '—'}
                      </p>
                    </div>
                  );
                  return href ? (
                    <Link key={`${row.track_id}-${i}`} href={href} className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35 rounded-[22px]">
                      {inner}
                    </Link>
                  ) : (
                    <div key={`${row.track_id}-${i}`} className="shrink-0">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="rounded-[28px] border border-narvo-ink/10 bg-narvo-cloud/95 p-6 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.1)] dark:border-white/10 dark:bg-narvo-ink/40 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-narvo-vermilion/15 text-narvo-vermilion">
                <Headphones size={24} aria-hidden />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">{COPY.listen_now_playing}</h2>
                <p className="text-xs font-mono uppercase tracking-widest text-narvo-ink/45 dark:text-white/40">
                  {COPY.listen_global_player_kicker}
                </p>
              </div>
            </div>
            {currentTrack ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {nowArticleHref ? (
                      <Link
                        href={nowArticleHref}
                        className="block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 rounded-lg"
                      >
                        <p className="font-serif text-base font-semibold leading-snug text-narvo-ink transition-colors hover:text-narvo-teal dark:text-white dark:hover:text-narvo-mint">
                          {currentTrack.title}
                        </p>
                        <p className="mt-1 text-sm text-narvo-ink/50 dark:text-white/45">{currentTrack.source}</p>
                      </Link>
                    ) : (
                      <>
                        <p className="font-serif text-base font-semibold leading-snug text-narvo-ink dark:text-white">
                          {currentTrack.title}
                        </p>
                        <p className="mt-1 text-sm text-narvo-ink/50 dark:text-white/45">{currentTrack.source}</p>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25 transition-transform active:scale-[0.96]"
                    aria-label={isPlaying ? COPY.listen_pause_a11y : COPY.listen_play_a11y}
                  >
                    {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-narvo-ink/[0.08] dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-narvo-vermilion/80 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-narvo-ink/35 dark:text-white/30">{progressLabel}</span>
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="font-mono text-[9px] font-bold text-narvo-teal dark:text-narvo-mint hover:underline"
                    >
                      {isPlaying ? COPY.briefing_pause : COPY.listen_resume_cta}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-narvo-ink/55 dark:text-white/50">{COPY.listen_nothing_playing}</p>
            )}
          </motion.section>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.04 }}
              className="overflow-hidden rounded-[28px] border border-narvo-ink/10 bg-gradient-to-br from-narvo-teal to-narvo-teal-deep text-white shadow-[0_16px_48px_-16px_rgba(15,95,115,0.35)] dark:border-white/10"
              aria-label={COPY.briefing_title}
            >
              <div className="relative p-6 sm:p-8">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.07] blur-xl" aria-hidden />
                <p className="relative z-10 font-mono text-[10px] font-bold uppercase tracking-widest text-white/65">
                  {COPY.briefing_title}
                </p>
                {briefingLoading ? (
                  <p className="relative z-10 mt-2 font-serif text-xl text-white/80">{COPY.status_loading}</p>
                ) : (
                  <h3 className="relative z-10 mt-2 max-w-md font-serif text-xl font-semibold leading-snug sm:text-2xl">
                    {briefing?.title?.trim() || COPY.briefing_ready}
                  </h3>
                )}
                {briefingErr ? (
                  <p className="relative z-10 mt-2 text-sm text-white/70">{briefingErr}</p>
                ) : null}
                <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={playBriefing}
                    disabled={briefingLoading || !briefing}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 text-sm font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                  >
                    {briefingActive && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    {briefingActive && isPlaying ? COPY.briefing_pause : COPY.briefing_listen_now}
                  </button>
                  <Link
                    href="/briefing"
                    className="inline-flex min-h-[48px] items-center rounded-full border border-white/20 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
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
              className="rounded-[28px] border border-narvo-ink/10 bg-narvo-cloud/95 p-6 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.1)] dark:border-white/10 dark:bg-narvo-ink/35 sm:p-8"
              aria-label={COPY.listen_broadcast_title}
            >
              <div className="mb-3 flex items-center gap-2">
                <Radio size={18} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
                  {COPY.listen_broadcast_title}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-narvo-ink/60 dark:text-white/50">{COPY.listen_broadcast_desc}</p>
              <div className="mt-5">
                {broadcastOn ? (
                  <button
                    type="button"
                    onClick={stopBroadcast}
                    className="min-h-[48px] w-full rounded-full border-2 border-narvo-ink/12 px-6 font-bold text-narvo-ink transition-colors dark:border-white/15 dark:text-white sm:w-auto"
                  >
                    {COPY.listen_broadcast_disable}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={broadcastBusy}
                    onClick={() => void startBroadcast()}
                    className="min-h-[48px] w-full rounded-full bg-narvo-teal px-6 font-bold text-white shadow-md shadow-narvo-teal/20 transition-colors disabled:opacity-50 dark:bg-narvo-mint dark:text-narvo-ink sm:w-auto"
                  >
                    {broadcastBusy ? COPY.status_loading : COPY.listen_broadcast_enable}
                  </button>
                )}
              </div>
            </motion.section>
          </div>

          {loadingFeed ? (
            <div className="rounded-[28px] border border-narvo-ink/[0.06] bg-narvo-cloud p-6 dark:border-white/[0.06] dark:bg-narvo-ink">
              <div className="mb-4 h-4 w-24 animate-pulse rounded bg-narvo-ink/8 dark:bg-white/8" />
              <div className="mb-2 h-6 w-full animate-pulse rounded bg-narvo-ink/8 dark:bg-white/8" />
              <div className="h-6 w-3/4 animate-pulse rounded bg-narvo-ink/8 dark:bg-white/8" />
            </div>
          ) : featured ? (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.06 }}
              aria-labelledby="listen-featured-heading"
            >
              <p
                id="listen-featured-heading"
                className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint"
              >
                {COPY.listen_featured_kicker}
              </p>
              <StoryCardLarge item={featured} featured />
            </motion.section>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                { href: '/dashboard', icon: LayoutDashboard, label: COPY.listen_open_feed },
                { href: '/library', icon: Bookmark, label: COPY.listen_open_library },
                { href: '/briefing', icon: Newspaper, label: COPY.listen_open_briefing },
              ] as const
            ).map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-[22px] border border-narvo-ink/10 bg-narvo-cloud/90 text-sm font-bold text-narvo-ink transition-colors hover:border-narvo-teal/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile / tablet: same panel as desktop sidebar */}
          <div className="mt-2 rounded-[28px] border border-narvo-ink/8 bg-narvo-cloud/90 overflow-hidden dark:border-white/10 dark:bg-narvo-ink/35 lg:hidden">
            {sidePanelInner}
          </div>
        </div>

        <aside className="relative hidden min-h-0 min-w-0 lg:block">
          <div
            className="sticky top-0 z-[5] flex flex-col overflow-hidden rounded-[28px] border border-narvo-ink/10 bg-[var(--bg-card)]/90 shadow-[0_8px_40px_-12px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-narvo-ink/40 dark:shadow-black/25"
            style={{
              height: 'calc(100dvh - 6.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
              maxHeight: 'calc(100dvh - 5.5rem)',
            }}
          >
            {sidePanelInner}
          </div>
        </aside>
      </div>
    </AuthenticatedAppShell>
  );
}
