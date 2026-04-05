'use client';

import React from 'react';
import Link from 'next/link';
import { Headphones, Newspaper, Bookmark, LayoutDashboard, Play, Pause } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { COPY } from '@/lib/narvo-app-copy';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';

export default function ListenPage() {
  const { currentTrack, isPlaying, togglePlayPause, playTrack } = useAudioPlayer();
  const { briefing, loading: briefingLoading, error: briefingErr } = useLatestBriefing();

  const briefingAudio = briefing?.audio_url?.trim() || null;
  const briefingId = briefing ? `briefing-${briefing.date}` : '';

  const playBriefing = () => {
    if (!briefing) return;
    const title = briefing.title?.trim() || COPY.briefing_title;
    if (currentTrack?.id === briefingId) {
      togglePlayPause();
      return;
    }
    playTrack({
      id: briefingId,
      title,
      source: 'Narvo',
      category: 'BRIEFING',
      audioUrl: briefingAudio || undefined,
    });
  };

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.listen_page_title,
        kicker: COPY.listen_page_kicker,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 max-w-xl mx-auto w-full space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-narvo-ink/40 p-6 sm:p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-narvo-vermilion/15 text-narvo-vermilion">
              <Headphones size={24} aria-hidden />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">{COPY.listen_now_playing}</h2>
              <p className="text-xs font-mono text-narvo-ink/45 dark:text-white/40 uppercase tracking-widest">
                Global player
              </p>
            </div>
          </div>
          {currentTrack ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-narvo-ink dark:text-white truncate">{currentTrack.title}</p>
                <p className="text-sm text-narvo-ink/50 dark:text-white/45 truncate">{currentTrack.source}</p>
              </div>
              <button
                type="button"
                onClick={() => togglePlayPause()}
                className="shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
          ) : (
            <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.listen_nothing_playing}</p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-[32px] border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/25 dark:bg-white/[0.04] p-6 sm:p-8"
        >
          <h2 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white mb-2 flex items-center gap-2">
            <Newspaper size={20} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
            {COPY.listen_briefing_card}
          </h2>
          {briefingLoading ? (
            <p className="text-sm text-narvo-ink/50">{COPY.status_loading}</p>
          ) : briefingErr ? (
            <p className="text-sm text-narvo-ink/55">{briefingErr}</p>
          ) : briefing ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-narvo-ink/70 dark:text-white/65 line-clamp-2">
                {briefing.title?.trim() || COPY.briefing_ready}
              </p>
              <button
                type="button"
                disabled={!briefingAudio}
                onClick={playBriefing}
                className="shrink-0 min-h-[48px] rounded-full bg-narvo-teal px-6 font-bold text-white disabled:opacity-45 disabled:pointer-events-none"
              >
                {COPY.listen_briefing_play}
              </button>
            </div>
          ) : (
            <Link href="/briefing" className="text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline">
              {COPY.briefing_open_full}
            </Link>
          )}
        </motion.section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 min-h-[52px] rounded-[22px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.05] font-bold text-sm text-narvo-ink dark:text-white hover:border-narvo-teal/30"
          >
            <LayoutDashboard size={18} aria-hidden />
            {COPY.listen_open_feed}
          </Link>
          <Link
            href="/library"
            className="flex items-center justify-center gap-2 min-h-[52px] rounded-[22px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.05] font-bold text-sm text-narvo-ink dark:text-white hover:border-narvo-teal/30"
          >
            <Bookmark size={18} aria-hidden />
            {COPY.listen_open_library}
          </Link>
          <Link
            href="/briefing"
            className="flex items-center justify-center gap-2 min-h-[52px] rounded-[22px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.05] font-bold text-sm text-narvo-ink dark:text-white hover:border-narvo-teal/30"
          >
            <Newspaper size={18} aria-hidden />
            {COPY.listen_open_briefing}
          </Link>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
