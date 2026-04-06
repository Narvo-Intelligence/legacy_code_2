'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Radio,
  ChevronDown,
  ListMusic,
  Gauge,
  Maximize2,
  Minimize2,
  Volume2,
  StepForward,
} from 'lucide-react';
import { useAudioPlayer } from './AudioPlayerContext';
import { QueueItem } from '@/components/QueueItem';
import { COPY } from '@/lib/narvo-app-copy';
import { getNewsArticleHrefFromTrack } from '@/lib/player-routes';

/* ─────────────────────────────────────────────────────────────
   AudioPlayer — persistent bottom bar + full-screen expanded sheet.
   Component DS §8.1 PlayerCluster + PlayerBarPersistent.
───────────────────────────────────────────────────────────── */

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };
const SHEET_SPRING = { type: 'spring' as const, stiffness: 280, damping: 26 };

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const mm = h > 0 ? m % 60 : m;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(mm)}:${pad(s)}` : `${mm}:${pad(s)}`;
}

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
    <div className="flex items-end gap-[3px] h-7 lg:h-8" aria-hidden>
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

/** Progress bar track (non-interactive) */
function ProgressTrack({ progress, accent }: { progress: number; accent: string }) {
  return (
    <div
      className="h-1 w-full rounded-full bg-narvo-ink/10 dark:bg-white/10 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${accent}`} style={{ width: `${progress}%` }} />
    </div>
  );
}

/** Draggable / tappable progress (expanded player). */
function TimeScrubber({
  progress,
  onSeek,
  accentFill,
  accentKnob,
}: {
  progress: number;
  onSeek: (ratio: number) => void;
  accentFill: string;
  accentKnob: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const ratioFromClientX = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - r.left, 0), r.width);
      onSeek(r.width > 0 ? x / r.width : 0);
    },
    [onSeek]
  );

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={COPY.player_time_position}
      className="relative flex h-10 w-full cursor-pointer touch-none items-center select-none"
      onPointerDown={(e) => {
        dragging.current = true;
        ref.current?.setPointerCapture(e.pointerId);
        ratioFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) ratioFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        ref.current?.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 10 : 5;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onSeek(Math.min(1, progress / 100 + step / 100));
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onSeek(Math.max(0, progress / 100 - step / 100));
        }
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-narvo-ink/12 dark:bg-white/12">
        <div className={`h-full rounded-full ${accentFill}`} style={{ width: `${progress}%` }} />
      </div>
      <div
        className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--bg-card)] shadow-md dark:border-narvo-ink ${accentKnob}`}
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}

/* ── Full-screen expanded sheet ───────────────────────────── */

function ExpandedSheet({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const {
    currentTrack,
    isPlaying,
    progress,
    playQueue,
    togglePlayPause,
    skipForward,
    skipBackward,
    skipToNext,
    removeFromQueueAt,
    seekToRatio,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    currentTimeSec,
    durationSec,
  } = useAudioPlayer();

  const usingRealAudio = Boolean(currentTrack?.audioUrl);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const exitFullscreenIfNeeded = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleClose = () => {
    exitFullscreenIfNeeded();
    onClose();
  };

  const toggleBrowserFullscreen = async () => {
    const el = sheetRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      /* Safari / denied — sheet already fills viewport */
    }
  };

  const isBriefing = currentTrack?.category?.toUpperCase() === 'BRIEFING';
  const articleHref = getNewsArticleHrefFromTrack(currentTrack);

  if (!currentTrack) return null;

  const accentFill = isBriefing ? 'bg-narvo-vermilion' : 'bg-narvo-teal';
  const accentText = isBriefing ? 'text-narvo-vermilion' : 'text-narvo-teal dark:text-narvo-mint';
  const scrubFill = isBriefing ? 'bg-narvo-vermilion' : 'bg-narvo-teal dark:bg-narvo-mint';
  const scrubKnob = isBriefing
    ? 'ring-2 ring-narvo-vermilion/45'
    : 'ring-2 ring-narvo-teal/35 dark:ring-narvo-mint/40';

  const durationLabel =
    durationSec > 0 && Number.isFinite(durationSec) ? formatTime(durationSec) : COPY.player_duration_unknown;
  const remainingSec = Math.max(0, durationSec - currentTimeSec);
  const hasQueueNext = playQueue.length > 0;

  return (
    <motion.div
      ref={sheetRef}
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={SHEET_SPRING}
      className={`fixed inset-0 z-[60] flex flex-col bg-[var(--bg-primary)] overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] ${
        fullscreen ? 'overscroll-none' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={COPY.player_sheet_title}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0 lg:pt-4 lg:pb-2">
        <div className="h-1 w-10 rounded-full bg-narvo-ink/15 dark:bg-white/15" />
      </div>

      {/* Header */}
      <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4 pb-2 shrink-0 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-narvo-mist/60 dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60 active:scale-[0.96] transition-transform justify-self-start"
          aria-label={COPY.player_collapse_a11y}
        >
          <ChevronDown size={22} aria-hidden />
        </button>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 text-center truncate">
          {COPY.player_sheet_title}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void toggleBrowserFullscreen()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-narvo-mist/60 dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60 lg:hidden active:scale-[0.96] transition-transform"
            aria-label={fullscreen ? COPY.player_exit_fullscreen_a11y : COPY.player_fullscreen_a11y}
          >
            {fullscreen ? <Minimize2 size={20} aria-hidden /> : <Maximize2 size={20} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Track info */}
      <div className="px-5 pt-2 pb-5 text-center shrink-0 sm:px-6 lg:pt-4 lg:pb-8">
        <div
          className={`mx-auto mb-5 h-44 w-44 rounded-[24px] flex items-center justify-center sm:h-52 sm:w-52 sm:rounded-[28px] lg:mb-8 lg:h-56 lg:w-56 ${
            isBriefing ? 'bg-narvo-vermilion/10 dark:bg-narvo-vermilion/15' : 'bg-narvo-teal/10 dark:bg-narvo-teal/15'
          }`}
        >
          {isBriefing ? (
            <Radio size={56} className="text-narvo-vermilion opacity-50 sm:w-16 sm:h-16" aria-hidden />
          ) : (
            <Radio size={56} className="text-narvo-teal dark:text-narvo-mint opacity-40 sm:w-16 sm:h-16" aria-hidden />
          )}
        </div>

        <p className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-2 ${accentText}`}>
          {currentTrack.category ?? 'Story'}
        </p>
        <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-narvo-ink dark:text-white leading-tight mb-1.5 line-clamp-3 px-1">
          {currentTrack.title}
        </h2>
        <p className="text-sm text-narvo-ink/50 dark:text-white/45">{currentTrack.source}</p>
        {articleHref ? (
          <Link
            href={articleHref}
            className="mt-4 inline-flex items-center justify-center rounded-full border-2 border-narvo-teal/35 bg-narvo-teal/8 px-5 py-2.5 text-sm font-bold text-narvo-teal dark:border-narvo-mint/40 dark:bg-narvo-mint/10 dark:text-narvo-mint"
          >
            {COPY.player_open_article}
          </Link>
        ) : null}
      </div>

      {/* Details strip — stronger on mobile / fullscreen */}
      <div className="mx-5 mb-4 rounded-[18px] border border-narvo-ink/8 bg-narvo-mist/40 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:mx-6 lg:mx-8 lg:max-w-2xl lg:self-center lg:w-full">
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/35 dark:text-white/35 mb-2">
          {COPY.player_details_kicker}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left sm:grid-cols-4">
          <div>
            <p className="font-mono text-[9px] text-narvo-ink/40 dark:text-white/35">{COPY.player_meta_elapsed}</p>
            <p className="font-mono text-sm font-semibold text-narvo-ink dark:text-white">{formatTime(currentTimeSec)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] text-narvo-ink/40 dark:text-white/35">{COPY.player_meta_remaining}</p>
            <p className="font-mono text-sm font-semibold text-narvo-ink dark:text-white">{formatTime(remainingSec)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] text-narvo-ink/40 dark:text-white/35">{COPY.player_meta_duration}</p>
            <p className="font-mono text-sm font-semibold text-narvo-ink dark:text-white">{durationLabel}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] text-narvo-ink/40 dark:text-white/35">{COPY.player_meta_queue}</p>
            <p className="font-mono text-sm font-semibold text-narvo-ink dark:text-white">
              {playQueue.length} {COPY.player_queue_waiting_suffix}
            </p>
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] text-narvo-ink/45 dark:text-white/40">
          {usingRealAudio ? COPY.player_playback_streaming : COPY.player_playback_timed} · {playbackRate}x ·{' '}
          {COPY.player_skip_seconds_hint}
        </p>
      </div>

      {/* Waveform */}
      <div className="flex justify-center px-6 mb-2 shrink-0">
        <WaveformBars isPlaying={isPlaying} />
      </div>

      {/* Time + scrubber */}
      <div className="px-5 mb-2 sm:px-6 lg:px-10 lg:max-w-2xl lg:self-center lg:w-full">
        <div className="flex justify-between font-mono text-[11px] text-narvo-ink/50 dark:text-white/45 mb-1">
          <span>{formatTime(currentTimeSec)}</span>
          <span>{durationLabel}</span>
        </div>
        <TimeScrubber
          progress={progress}
          onSeek={seekToRatio}
          accentFill={scrubFill}
          accentKnob={scrubKnob}
        />
      </div>

      {/* Legacy % readout (compact) */}
      <div className="px-6 mb-5 shrink-0 lg:max-w-2xl lg:self-center lg:w-full">
        <ProgressTrack progress={progress} accent={accentFill} />
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/35">{Math.round(progress)}% complete</span>
          <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/35">
            {progress < 100 ? `${Math.round(100 - progress)}% left` : 'Done'}
          </span>
        </div>
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center justify-center gap-3 px-4 mb-6 sm:gap-5 sm:px-6 lg:gap-6">
        <button
          type="button"
          onClick={skipBackward}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-narvo-ink/[0.05] dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors active:scale-[0.96]"
          aria-label="Skip back 10s"
        >
          <SkipBack size={22} aria-hidden />
        </button>

        <button
          type="button"
          onClick={togglePlayPause}
          className={`flex items-center justify-center rounded-full ${accentFill} text-white shadow-2xl transition-transform active:scale-[0.96]`}
          style={{ height: 76, width: 76 }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={30} fill="currentColor" aria-hidden /> : <Play size={30} fill="currentColor" aria-hidden />}
        </button>

        <button
          type="button"
          onClick={skipForward}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-narvo-ink/[0.05] dark:bg-white/[0.07] text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors active:scale-[0.96]"
          aria-label="Skip forward 10s"
        >
          <SkipForward size={22} aria-hidden />
        </button>

        <button
          type="button"
          onClick={skipToNext}
          disabled={!hasQueueNext}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-narvo-ink/10 bg-narvo-cloud/80 text-narvo-teal dark:border-white/12 dark:bg-narvo-ink/40 dark:text-narvo-mint disabled:opacity-35 disabled:pointer-events-none transition-colors active:scale-[0.96]"
          aria-label={COPY.player_skip_next_a11y}
          title={COPY.player_skip_next}
        >
          <StepForward size={22} aria-hidden />
        </button>
      </div>

      {/* Volume */}
      <div className="px-5 mb-6 sm:px-6 lg:px-10 lg:max-w-2xl lg:self-center lg:w-full">
        <div className="flex items-center gap-3">
          <Volume2 size={18} className="shrink-0 text-narvo-ink/40 dark:text-white/40" aria-hidden />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40 w-16 shrink-0">
            {COPY.player_volume_label}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 min-w-0 h-2 accent-narvo-teal dark:accent-narvo-mint"
            aria-label={COPY.player_volume_label}
          />
          <span className="font-mono text-[10px] text-narvo-ink/45 dark:text-white/40 w-8 text-right">{Math.round(volume * 100)}%</span>
        </div>
        <p className="mt-1.5 font-mono text-[9px] text-narvo-ink/35 dark:text-white/30">{COPY.player_volume_streaming_hint}</p>
      </div>

      {/* Speed */}
      <div className="px-5 mb-6 sm:px-6 lg:px-10 lg:max-w-2xl lg:self-center lg:w-full">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={14} className="text-narvo-ink/40 dark:text-white/40" aria-hidden />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
            {COPY.player_speed_label}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPlaybackRate(s)}
              className={`min-h-[40px] min-w-[3.5rem] flex-1 rounded-full text-xs font-bold border transition-colors sm:min-h-[36px] ${
                playbackRate === s
                  ? 'bg-narvo-teal text-white border-narvo-teal dark:bg-narvo-mint dark:text-narvo-ink dark:border-narvo-mint'
                  : 'border-narvo-ink/10 dark:border-white/10 text-narvo-ink/60 dark:text-white/55 hover:border-narvo-teal/30'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="px-5 mb-2 flex items-center gap-2 shrink-0 sm:px-6 lg:px-10">
        <ListMusic size={14} className="text-narvo-ink/35 dark:text-white/35" aria-hidden />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/35 dark:text-white/35">
          {COPY.player_queue_label}
        </span>
      </div>

      <div className="px-5 pb-10 space-y-1 sm:px-6 sm:pb-12 lg:px-10">
        {playQueue.length === 0 ? (
          <p className="text-sm text-narvo-ink/40 dark:text-white/40 italic">{COPY.queue_empty_title}</p>
        ) : (
          <ul className="space-y-1">
            {playQueue.map((t, i) => (
              <li key={`${t.id}-sheet-${i}`}>
                <QueueItem
                  index={i + 1}
                  title={t.title}
                  source={t.source}
                  status="queued"
                  onRemove={() => removeFromQueueAt(i)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

/* ── Compact persistent bar ───────────────────────────────── */

export function AudioPlayer() {
  const pathname = usePathname();
  const bottomPosition = useMemo(() => playerBottomClass(pathname), [pathname]);
  const [expanded, setExpanded] = useState(false);

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
    playbackRate,
    currentTimeSec,
    durationSec,
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

  const durationLabel =
    durationSec > 0 && Number.isFinite(durationSec) ? formatTime(durationSec) : COPY.player_duration_unknown;

  return (
    <>
      <AnimatePresence>
        {expanded && currentTrack && <ExpandedSheet onClose={() => setExpanded(false)} />}
      </AnimatePresence>

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
                        {playbackRate !== 1 ? ` · ${playbackRate}x` : ''}
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
                        {playbackRate !== 1 ? ` · ${playbackRate}x` : ''}
                      </p>
                    </div>
                  </button>
                )}

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
                    {isPlaying ? <Pause size={18} fill="currentColor" aria-hidden /> : <Play size={18} fill="currentColor" aria-hidden />}
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

              <div>
                <ProgressTrack progress={progress} accent={accentFill} />
                <div className="flex justify-between mt-1 font-mono text-[9px] text-narvo-ink/40 dark:text-white/35 sm:text-[10px]">
                  <span>{formatTime(currentTimeSec)}</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
