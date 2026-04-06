'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, SkipForward, SkipBack, X,
  Radio, ChevronDown, ListMusic, Gauge,
} from 'lucide-react';
import { useAudioPlayer } from './AudioPlayerContext';
import { QueueItem } from '@/components/QueueItem';
import { COPY } from '@/lib/narvo-app-copy';
import { getNewsArticleHrefFromTrack } from '@/lib/player-routes';

/* ─────────────────────────────────────────────────────────────
   AudioPlayer — persistent bottom bar + full-screen expanded sheet.
   Component DS §8.1 PlayerCluster + PlayerBarPersistent.
───────────────────────────────────────────────────────────── */

const SPRING      = { type: 'spring' as const, stiffness: 260, damping: 20 };
const SHEET_SPRING = { type: 'spring' as const, stiffness: 280, damping: 26 };

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;

function isAuthenticatedShellPath(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/briefing') ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/library') ||
    pathname.startsWith('/listen') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/onboarding')
  );
}

function playerBottomClass(pathname: string | null): string {
  if (pathname && isAuthenticatedShellPath(pathname)) {
    return 'max-lg:bottom-[calc(5.65rem+env(safe-area-inset-bottom,0px))] lg:bottom-8';
  }
  return 'bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] lg:bottom-8';
}

/** Waveform visualiser bars */
function WaveformBars({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-7" aria-hidden>
      {[12, 22, 16, 28, 14, 24, 18, 20, 10].map((h, i) => (
        <span
          key={i}
          className={`w-[4px] rounded-full bg-narvo-teal dark:bg-narvo-mint transition-transform ${
            isPlaying ? 'animate-[narvoWave_0.9s_ease-in-out_infinite]' : ''
          }`}
          style={{ height: h, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

/** Progress bar track */
function ProgressTrack({ progress, accent }: { progress: number; accent: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-narvo-ink/10 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${accent}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ── Full-screen expanded sheet ───────────────────────────── */

function ExpandedSheet({
  onClose,
  speed,
  onSpeedChange,
}: {
  onClose: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
}) {
  const {
    currentTrack, isPlaying, progress,
    togglePlayPause, skipForward, skipBackward,
  } = useAudioPlayer();

  const isBriefing = currentTrack?.category?.toUpperCase() === 'BRIEFING';
  const articleHref = getNewsArticleHrefFromTrack(currentTrack);

  if (!currentTrack) return null;

  const accentFill = isBriefing ? 'bg-narvo-vermilion' : 'bg-narvo-teal';
  const accentText = isBriefing ? 'text-narvo-vermilion' : 'text-narvo-teal dark:text-narvo-mint';

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={SHEET_SPRING}
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-primary)] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.player_sheet_title}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-4 pb-2 shrink-0">
        <div className="h-1 w-10 rounded-full bg-narvo-ink/15 dark:bg-white/15" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-narvo-mist/60 dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60"
          aria-label={COPY.player_collapse_a11y}
        >
          <ChevronDown size={20} aria-hidden />
        </button>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
          {COPY.player_sheet_title}
        </p>
        <div className="w-10" />
      </div>

      {/* Track info */}
      <div className="px-6 pt-4 pb-6 text-center shrink-0">
        {/* Cover art placeholder */}
        <div className={`mx-auto mb-6 h-52 w-52 rounded-[28px] flex items-center justify-center ${isBriefing ? 'bg-narvo-vermilion/10 dark:bg-narvo-vermilion/15' : 'bg-narvo-teal/10 dark:bg-narvo-teal/15'}`}>
          {isBriefing ? (
            <Radio size={64} className="text-narvo-vermilion opacity-50" aria-hidden />
          ) : (
            <Radio size={64} className="text-narvo-teal dark:text-narvo-mint opacity-40" aria-hidden />
          )}
        </div>

        <p className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-2 ${accentText}`}>
          {currentTrack.category ?? 'Story'}
        </p>
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-narvo-ink dark:text-white leading-tight mb-1 line-clamp-2">
          {currentTrack.title}
        </h2>
        <p className="text-sm text-narvo-ink/45 dark:text-white/45">{currentTrack.source}</p>
        {articleHref ? (
          <Link
            href={articleHref}
            className="mt-4 inline-flex items-center justify-center rounded-full border-2 border-narvo-teal/35 bg-narvo-teal/8 px-5 py-2.5 text-sm font-bold text-narvo-teal dark:border-narvo-mint/40 dark:bg-narvo-mint/10 dark:text-narvo-mint"
          >
            {COPY.player_open_article}
          </Link>
        ) : null}
      </div>

      {/* Waveform */}
      <div className="flex justify-center px-6 mb-4 shrink-0">
        <WaveformBars isPlaying={isPlaying} />
      </div>

      {/* Progress */}
      <div className="px-6 mb-6 shrink-0">
        <ProgressTrack progress={progress} accent={accentFill} />
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/35">
            {Math.round(progress)}%
          </span>
          <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/35">
            {progress < 100 ? `${Math.round(100 - progress)}% left` : 'Done'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 px-6 mb-8 shrink-0">
        <button
          type="button"
          onClick={skipBackward}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-narvo-ink/[0.05] dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Skip back 10s"
        >
          <SkipBack size={22} aria-hidden />
        </button>

        <button
          type="button"
          onClick={togglePlayPause}
          className={`flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-full ${accentFill} text-white shadow-2xl transition-transform active:scale-[0.96]`}
          style={{ height: 72, width: 72 }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying
            ? <Pause size={28} fill="currentColor" aria-hidden />
            : <Play size={28} fill="currentColor" aria-hidden />
          }
        </button>

        <button
          type="button"
          onClick={skipForward}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-narvo-ink/[0.05] dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Skip forward 10s"
        >
          <SkipForward size={22} aria-hidden />
        </button>
      </div>

      {/* Speed selector */}
      <div className="px-6 mb-6 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-narvo-ink/40 dark:text-white/40" aria-hidden />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
              {COPY.player_speed_label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`flex-1 min-h-[36px] rounded-full text-xs font-bold border transition-colors ${
                speed === s
                  ? 'bg-narvo-teal text-white border-narvo-teal'
                  : 'border-narvo-ink/10 dark:border-white/10 text-narvo-ink/60 dark:text-white/55 hover:border-narvo-teal/30'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Up next label */}
      <div className="px-6 mb-3 flex items-center gap-2 shrink-0">
        <ListMusic size={14} className="text-narvo-ink/35 dark:text-white/35" aria-hidden />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/35 dark:text-white/35">
          {COPY.player_queue_label}
        </span>
      </div>

      {/* Placeholder queue — empty state */}
      <div className="px-6 pb-8">
        <p className="text-sm text-narvo-ink/40 dark:text-white/40 italic">{COPY.queue_empty_title}</p>
      </div>
    </motion.div>
  );
}

/* ── Compact persistent bar ───────────────────────────────── */

export function AudioPlayer() {
  const pathname     = usePathname();
  const bottomPosition = useMemo(() => playerBottomClass(pathname), [pathname]);
  const [expanded, setExpanded] = useState(false);
  const [speed,    setSpeed]    = useState(1);

  const {
    currentTrack,
    isPlaying,
    progress,
    briefingHandoff,
    togglePlayPause,
    skipForward,
    skipBackward,
    closePlayer,
    dismissBriefingHandoff,
  } = useAudioPlayer();

  const isBriefing = currentTrack?.category?.toUpperCase() === 'BRIEFING';

  const accentBorder = useMemo(() => {
    if (isBriefing) return 'border-l-narvo-vermilion';
    const cat = currentTrack?.category?.toUpperCase();
    if (cat === 'BREAKING') return 'border-l-narvo-vermilion/90';
    return 'border-l-narvo-teal/55 dark:border-l-narvo-mint/45';
  }, [currentTrack?.category, isBriefing]);

  const accentFill = isBriefing ? 'bg-narvo-vermilion' : 'bg-narvo-teal';
  const articleHref = currentTrack ? getNewsArticleHrefFromTrack(currentTrack) : null;

  return (
    <>
      {/* Full-screen sheet */}
      <AnimatePresence>
        {expanded && currentTrack && (
          <ExpandedSheet
            onClose={() => setExpanded(false)}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        )}
      </AnimatePresence>

      {/* Compact bar */}
      <AnimatePresence>
        {currentTrack && !expanded && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={SPRING}
            className={`fixed left-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 ${bottomPosition}`}
            role="region"
            aria-label="Audio player"
          >
            <div
              className={`flex flex-col gap-2.5 overflow-hidden rounded-[22px] border border-y border-r border-narvo-ink/10 border-l-4 bg-white/94 px-3 py-3 shadow-[0_14px_44px_-12px_rgba(23,50,74,0.22)] backdrop-blur-xl dark:border-y dark:border-r dark:border-white/10 dark:bg-[#121c28]/94 dark:shadow-[0_18px_50px_-10px_rgba(0,0,0,0.55)] sm:px-4 sm:py-3.5 lg:rounded-[28px] lg:gap-3 ${accentBorder}`}
            >
              {/* Briefing handoff */}
              <AnimatePresence>
                {briefingHandoff && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING}
                    className="flex items-center justify-between gap-3 text-xs overflow-hidden"
                  >
                    <span className="text-narvo-ink/65 dark:text-white/60 truncate">
                      Just finished: <strong className="font-semibold">{briefingHandoff.title}</strong>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href="/briefing" className="font-bold text-narvo-teal dark:text-narvo-mint hover:underline">
                        Full briefing
                      </Link>
                      <button type="button" onClick={dismissBriefingHandoff} aria-label="Dismiss" className="text-narvo-ink/35 dark:text-white/35">
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main row — news: title links to article; icon expands. Other: tap row to expand. */}
              <div className="flex items-center justify-between gap-3">
                {articleHref ? (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isBriefing
                          ? 'bg-narvo-vermilion/12 text-narvo-vermilion dark:bg-narvo-vermilion/20 dark:text-narvo-vermilion'
                          : 'bg-narvo-mist text-narvo-teal dark:bg-white/10 dark:text-narvo-mint'
                      }`}
                      aria-label={COPY.player_expand_a11y}
                    >
                      <Radio size={20} aria-hidden />
                    </button>
                    <Link
                      href={articleHref}
                      className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 rounded-lg"
                      aria-label={COPY.player_open_article_a11y}
                    >
                      <p className="truncate text-sm font-semibold text-narvo-ink dark:text-white leading-tight">
                        {currentTrack.title}
                      </p>
                      <p className="truncate text-xs text-narvo-ink/50 dark:text-white/45 mt-0.5 font-mono">
                        {currentTrack.source}
                        {speed !== 1 ? ` · ${speed}x` : ''}
                      </p>
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
                    aria-label={COPY.player_expand_a11y}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isBriefing
                          ? 'bg-narvo-vermilion/12 text-narvo-vermilion dark:bg-narvo-vermilion/20 dark:text-narvo-vermilion'
                          : 'bg-narvo-mist text-narvo-teal dark:bg-white/10 dark:text-narvo-mint'
                      }`}
                    >
                      <Radio size={20} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-narvo-ink dark:text-white leading-tight">
                        {currentTrack.title}
                      </p>
                      <p className="truncate text-xs text-narvo-ink/50 dark:text-white/45 mt-0.5 font-mono">
                        {currentTrack.source}
                        {speed !== 1 ? ` · ${speed}x` : ''}
                      </p>
                    </div>
                  </button>
                )}

                {/* Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={skipBackward}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-narvo-ink/50 dark:text-white/50 hover:bg-narvo-mist dark:hover:bg-white/10 transition-colors"
                    aria-label="Skip back"
                  >
                    <SkipBack size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${accentFill} text-white shadow-md transition-transform active:scale-[0.95]`}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <Pause size={18} fill="currentColor" aria-hidden />
                      : <Play size={18} fill="currentColor" aria-hidden />
                    }
                  </button>
                  <button
                    type="button"
                    onClick={skipForward}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-narvo-ink/50 dark:text-white/50 hover:bg-narvo-mist dark:hover:bg-white/10 transition-colors"
                    aria-label="Skip forward"
                  >
                    <SkipForward size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={closePlayer}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-narvo-ink/35 dark:text-white/35 hover:bg-narvo-mist dark:hover:bg-white/10 transition-colors"
                    aria-label="Close player"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <ProgressTrack progress={progress} accent={accentFill} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
