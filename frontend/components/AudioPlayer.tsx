'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, X, Radio } from 'lucide-react';
import { useAudioPlayer } from './AudioPlayerContext';
import { COPY } from '@/lib/narvo-app-copy';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

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

/** Dock routes: clear MobileNavDock. Public routes: standard safe bottom. */
function playerBottomClass(pathname: string | null): string {
  if (pathname && isAuthenticatedShellPath(pathname)) {
    return 'max-lg:bottom-[calc(5.65rem+env(safe-area-inset-bottom,0px))] lg:bottom-8';
  }
  return 'bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] lg:bottom-8';
}

export function AudioPlayer() {
  const pathname = usePathname();
  const bottomPosition = useMemo(() => playerBottomClass(pathname), [pathname]);
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

  return (
    <AnimatePresence>
      {currentTrack && (
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    isBriefing
                      ? 'bg-narvo-vermilion/12 text-narvo-vermilion dark:bg-narvo-vermilion/20 dark:text-narvo-vermilion'
                      : 'bg-narvo-mist text-narvo-teal dark:bg-white/10 dark:text-narvo-mint'
                  }`}
                >
                  <Radio size={20} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 truncate text-left">
                  <h4
                    className="truncate font-serif text-[15px] font-semibold leading-tight text-narvo-ink dark:text-white"
                    aria-live="polite"
                  >
                    {currentTrack.title}
                  </h4>
                  <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-narvo-ink/45 dark:text-white/45">
                    {currentTrack.source}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={skipBackward}
                  className="rounded-full p-2 text-narvo-ink/50 transition-colors hover:bg-narvo-mist/80 hover:text-narvo-teal dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-narvo-mint"
                  aria-label="Skip backward 10 seconds"
                >
                  <SkipBack size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/30 transition-transform active:scale-[0.96] ${
                    isPlaying ? 'shadow-[0_0_20px_rgba(240,75,36,0.35)]' : ''
                  }`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={20} fill="currentColor" aria-hidden />
                  ) : (
                    <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={skipForward}
                  className="rounded-full p-2 text-narvo-ink/50 transition-colors hover:bg-narvo-mist/80 hover:text-narvo-teal dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-narvo-mint"
                  aria-label="Skip forward 10 seconds"
                >
                  <SkipForward size={20} aria-hidden />
                </button>
                <div className="mx-0.5 hidden h-6 w-px bg-narvo-ink/12 sm:block dark:bg-white/15" />
                <button
                  type="button"
                  onClick={closePlayer}
                  className="rounded-full p-2 text-narvo-ink/45 transition-colors hover:bg-narvo-ink/5 hover:text-narvo-vermilion dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-narvo-vermilion"
                  aria-label="Close audio player"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
            </div>

            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-narvo-ink/[0.08] dark:bg-white/10"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className={`h-full rounded-full ${isBriefing ? 'bg-narvo-vermilion/90' : 'bg-narvo-teal dark:bg-narvo-mint'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'linear', duration: 0.45 }}
              />
            </div>

            <AnimatePresence>
              {briefingHandoff ? (
                <motion.div
                  key="briefing-handoff"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex flex-col gap-3 border-t border-narvo-ink/10 pt-3 text-left dark:border-white/12 sm:flex-row sm:items-center sm:justify-between">
                    <p className="pr-2 text-xs leading-snug text-narvo-ink/75 dark:text-white/80">
                      {COPY.briefing_handoff_line}
                      <span className="sr-only"> {briefingHandoff.title}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        href="/discover"
                        onClick={dismissBriefingHandoff}
                        className="rounded-full bg-narvo-mist px-3 py-1.5 text-[11px] font-bold text-narvo-ink transition-colors hover:bg-narvo-mist/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        {COPY.briefing_handoff_discover}
                      </Link>
                      <Link
                        href="/listen"
                        onClick={dismissBriefingHandoff}
                        className="rounded-full bg-narvo-teal px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-narvo-teal/20 transition-colors hover:opacity-95 dark:bg-narvo-teal"
                      >
                        {COPY.briefing_handoff_listen}
                      </Link>
                      <button
                        type="button"
                        onClick={dismissBriefingHandoff}
                        className="rounded-full px-2 py-1 text-[11px] font-bold text-narvo-ink/50 transition-colors hover:bg-narvo-ink/5 hover:text-narvo-ink dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        {COPY.briefing_handoff_dismiss}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
