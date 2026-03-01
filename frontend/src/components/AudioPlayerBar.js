import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, SpeakerHigh, SpeakerSlash,
  Queue, X, Trash, Repeat, Broadcast, CaretUp, CaretDown, Waveform, DotsSixVertical
} from '@phosphor-icons/react';
import { useAudio } from '../contexts/AudioContext';

const fmt = (s) => {
  if (!s || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

/* ──────────────────────── DESKTOP PLAYER ──────────────────────── */
const DesktopPlayer = () => {
  const {
    currentTrack, isPlaying, isLoading, isTransitioning, currentTime, duration,
    togglePlay, seek, playNext, playPrev,
    queue, queueIndex, removeFromQueue, clearQueue, playFromQueue, reorderQueue,
    volume, isMuted, setVolume, toggleMute, autoPlay, setAutoPlay,
    playbackRate, setPlaybackRate,
  } = useAudio();
  const [showQueue, setShowQueue] = useState(false);
  const [showVol, setShowVol] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const volRef = useRef(null);
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    setPlaybackRate(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
  }, [playbackRate, setPlaybackRate]);

  useEffect(() => {
    const h = (e) => { if (volRef.current && !volRef.current.contains(e.target)) setShowVol(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  }, [duration, seek]);

  const progressBarStyle = useMemo(() => ({ width: `${progress}%` }), [progress]);

  return (
    <div role="region" aria-label="Audio player" className="hidden md:block bg-[rgb(var(--color-bg))] border-t border-[rgb(var(--color-border))] z-20 shrink-0 relative" data-testid="audio-player-bar">
      {/* Thin progress line at top of player */}
      <div className="h-[2px] bg-[rgb(var(--color-surface))]">
        <div className="h-full bg-[rgb(var(--color-primary))] transition-all duration-150" style={progressBarStyle} />
      </div>

      {/* Queue Panel */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            role="region"
            aria-label="Playback queue"
            className="absolute bottom-full right-0 w-80 max-h-72 bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] border-b-0 overflow-hidden flex flex-col z-50"
            data-testid="queue-panel"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10">
              <div className="flex items-center gap-2">
                <Queue weight="fill" className="w-3.5 h-3.5 text-[rgb(var(--color-primary))]" />
                <span className="font-mono text-[11px] text-[rgb(var(--color-text-primary))] font-bold uppercase">QUEUE // {queue.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setAutoPlay(!autoPlay)} aria-label={autoPlay ? 'Auto-play on' : 'Auto-play off'} className={`p-1.5 transition-colors ${autoPlay ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                  <Repeat weight={autoPlay ? 'fill' : 'regular'} className="w-4 h-4" />
                </button>
                {queue.length > 0 && (
                  <button type="button" onClick={clearQueue} aria-label="Clear queue" className="p-1.5 text-[rgb(var(--color-text-secondary))] hover:text-red-500 transition-colors"><Trash weight="bold" className="w-4 h-4" /></button>
                )}
                <button type="button" onClick={() => setShowQueue(false)} aria-label="Close queue" className="p-1.5 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]"><X weight="bold" className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll">
              {queue.length === 0 ? (
                <div className="p-6 text-center">
                  <Queue className="w-8 h-8 text-[rgb(var(--color-text-dim-accessible))] mx-auto mb-2" />
                  <p className="font-mono text-[12px] text-[rgb(var(--color-text-dim-accessible))]">QUEUE_EMPTY</p>
                </div>
              ) : queue.map((track, idx) => (
                <div
                  key={track.id}
                  draggable={idx !== queueIndex}
                  onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDragEnd={() => {
                    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                      reorderQueue(dragIdx, dragOverIdx);
                    }
                    setDragIdx(null);
                    setDragOverIdx(null);
                  }}
                  onClick={() => playFromQueue(idx)}
                  className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all border-b border-[rgb(var(--color-border))]/20 ${
                    idx === queueIndex ? 'bg-[rgb(var(--color-primary))]/8 border-l-2 border-l-[rgb(var(--color-primary))]' : 'hover:bg-[rgb(var(--color-surface))]/20'
                  } ${dragOverIdx === idx ? 'border-t-2 border-t-[rgb(var(--color-primary))]' : ''}`}
                  data-testid={`queue-item-${idx}`}
                >
                  <div className={`cursor-grab active:cursor-grabbing ${idx === queueIndex ? 'opacity-30' : 'text-[rgb(var(--color-text-dim-accessible))] hover:text-[rgb(var(--color-text-secondary))]'}`}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <DotsSixVertical weight="bold" className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-[11px] text-[rgb(var(--color-text-dim-accessible))] w-5">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs truncate block ${idx === queueIndex ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-primary))]'}`}>{track.title}</span>
                    <span className="font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))]">{track.source}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id); }} className="p-1 text-[rgb(var(--color-text-dim-accessible))] hover:text-red-500" data-testid={`queue-remove-${idx}`}><X weight="bold" className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main bar – compact 8pt grid (§4 Design System) */}
      <div className="flex items-center h-12 px-4 gap-4">
        {/* Track info — left */}
        <div className="flex items-center gap-2 w-52 min-w-0 shrink-0">
          {currentTrack ? (
            <>
              <div className="w-9 h-9 bg-[rgb(var(--color-primary))]/10 border border-[rgb(var(--color-border))] shrink-0 flex items-center justify-center relative overflow-hidden">
                {isLoading || isTransitioning ? (
                  <div className="w-3.5 h-3.5 border-2 border-[rgb(var(--color-primary))] border-t-transparent animate-spin rounded-full" aria-hidden />
                ) : isPlaying ? (
                  <div className="flex items-end gap-[2px] h-5">
                    {[1,2,3,4].map(i => (
                      <motion.div
                        key={i}
                        className="w-[3px] bg-[rgb(var(--color-primary))]"
                        animate={{ height: [4, 12 + i * 2, 6, 14, 4] }}
                        transition={{ repeat: Infinity, duration: 0.8 + i * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                ) : (
                  <Broadcast weight="bold" className="w-3.5 h-3.5 text-[rgb(var(--color-primary))]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[rgb(var(--color-text-primary))] truncate font-medium leading-tight">{currentTrack.title}</p>
                <p className="font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))] truncate uppercase mt-0.5">{currentTrack.source}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 border border-dashed border-[rgb(var(--color-border))] flex items-center justify-center shrink-0">
                <Waveform className="w-3.5 h-3.5 text-[rgb(var(--color-text-dim-accessible))]" />
              </div>
              <span className="font-mono text-[11px] text-[rgb(var(--color-text-dim-accessible))]">NO_SIGNAL</span>
            </div>
          )}
        </div>

        {/* Center — controls + scrubber */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <button type="button" onClick={playPrev} disabled={queueIndex <= 0} aria-label="Previous track" className="p-1 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-30 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-1" data-testid="player-prev">
              <SkipBack weight="fill" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading || !currentTrack}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-8 h-8 bg-[rgb(var(--color-primary))] flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-1"
              data-testid="player-play-pause"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-[rgb(var(--color-bg))] border-t-transparent animate-spin rounded-full" aria-hidden />
              ) : isPlaying ? (
                <Pause weight="fill" className="w-3.5 h-3.5 text-[rgb(var(--color-bg))]" />
              ) : (
                <Play weight="fill" className="w-3.5 h-3.5 text-[rgb(var(--color-bg))] ml-0.5" />
              )}
            </button>
            <button type="button" onClick={playNext} disabled={queueIndex >= queue.length - 1} aria-label="Next track" className="p-1 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-30 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-1" data-testid="player-next">
              <SkipForward weight="fill" className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))] w-8 text-right tabular-nums">{fmt(currentTime)}</span>
            <div className="flex-1 h-1 bg-[rgb(var(--color-surface))] cursor-pointer group relative" onClick={handleSeek} data-testid="player-progress" role="slider" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Playback position">
              <div className="h-full bg-[rgb(var(--color-primary))] relative" style={progressBarStyle}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(var(--color-primary))] border border-[rgb(var(--color-bg))] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))] w-8 tabular-nums">{fmt(duration)}</span>
          </div>
        </div>

        {/* Right — speed + volume + queue */}
        <div className="flex items-center gap-2 w-44 justify-end shrink-0">
          <button
            onClick={cycleSpeed}
            className={`px-1.5 py-0.5 font-mono text-[11px] font-bold border transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-1 ${
              playbackRate !== 1
                ? 'text-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]'
                : 'text-[rgb(var(--color-text-secondary))] border-[rgb(var(--color-border))] hover:text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-text-secondary))]'
            }`}
            data-testid="speed-control"
          >
            {playbackRate}x
          </button>
          <div className="relative flex items-center" ref={volRef}>
            <button type="button" onClick={toggleMute} onMouseEnter={() => setShowVol(true)} aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'} className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] p-1.5" data-testid="volume-btn">
              {isMuted || volume === 0 ? <SpeakerSlash weight="fill" className="w-4 h-4" /> : <SpeakerHigh weight="fill" className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showVol && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 80 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden ml-1"
                  onMouseLeave={() => setShowVol(false)}
                >
                  <div
                    className="w-20 h-1.5 bg-[rgb(var(--color-surface))] cursor-pointer"
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}
                    data-testid="volume-slider"
                  >
                    <div className="h-full bg-[rgb(var(--color-primary))]" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            aria-label={showQueue ? 'Hide queue' : 'Show queue'}
            aria-expanded={showQueue}
            className={`p-1 transition-colors relative ${showQueue ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
            data-testid="queue-toggle-btn"
          >
            <Queue weight={showQueue ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
            {queue.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] font-mono text-[9px] font-bold flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
          {autoPlay && <span className="font-mono text-[10px] text-[rgb(var(--color-primary))] hidden lg:block">AUTO</span>}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────── MOBILE PLAYER ──────────────────────── */
const MobilePlayer = () => {
  const {
    currentTrack, isPlaying, isLoading, currentTime, duration,
    togglePlay, seek, playNext, playPrev,
    queue, queueIndex, volume, isMuted, setVolume, toggleMute,
    playbackRate, setPlaybackRate,
  } = useAudio();
  const [expanded, setExpanded] = useState(false);
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const cycleSpeedMobile = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    setPlaybackRate(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
  }, [playbackRate, setPlaybackRate]);

  const handleSeekMobile = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  }, [duration, seek]);

  const progressStyleMobile = useMemo(() => ({ width: `${progress}%` }), [progress]);

  if (!currentTrack) return null;

  return (
    <>
      {/* Mini bar — sits above mobile bottom nav (bottom-14) */}
      <div
        role="region"
        aria-label="Audio player"
        className="md:hidden fixed bottom-14 left-0 right-0 z-40 bg-[rgb(var(--color-bg))] border-t border-[rgb(var(--color-border))]"
        data-testid="mobile-mini-player"
      >
        {/* Thin progress */}
        <div className="h-[2px] bg-[rgb(var(--color-surface))]">
          <div className="h-full bg-[rgb(var(--color-primary))] transition-all duration-300" style={progressStyleMobile} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2" onClick={() => setExpanded(true)}>
          <div className="w-8 h-8 bg-[rgb(var(--color-primary))]/10 border border-[rgb(var(--color-border))] shrink-0 flex items-center justify-center">
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-[rgb(var(--color-primary))] border-t-transparent animate-spin rounded-full" />
            ) : isPlaying ? (
              <div className="flex items-end gap-[2px] h-4">
                {[1,2,3].map(i => (
                  <motion.div key={i} className="w-[2px] bg-[rgb(var(--color-primary))]" animate={{ height: [3, 8 + i, 4, 10, 3] }} transition={{ repeat: Infinity, duration: 0.7 + i * 0.1 }} />
                ))}
              </div>
            ) : (
              <Broadcast weight="bold" className="w-3.5 h-3.5 text-[rgb(var(--color-primary))]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[rgb(var(--color-text-primary))] truncate font-medium">{currentTrack.title}</p>
            <p className="font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))] uppercase">{currentTrack.source}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 bg-[rgb(var(--color-primary))] flex items-center justify-center shrink-0"
            data-testid="mobile-mini-play"
          >
            {isPlaying ? <Pause weight="fill" className="w-4 h-4 text-[rgb(var(--color-bg))]" /> : <Play weight="fill" className="w-4 h-4 text-[rgb(var(--color-bg))] ml-0.5" />}
          </button>
          <CaretUp weight="bold" className="w-4 h-4 text-[rgb(var(--color-text-dim-accessible))] shrink-0" />
        </div>
      </div>

      {/* Expanded modal */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="md:hidden fixed inset-0 z-50 bg-[rgb(var(--color-bg))] flex flex-col"
            data-testid="mobile-player-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--color-border))]">
              <span className="font-mono text-[12px] text-[rgb(var(--color-primary))] font-bold tracking-[0.2em]">NOW_PLAYING</span>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Close player" className="p-2 text-[rgb(var(--color-text-secondary))]" data-testid="mobile-player-close">
                <CaretDown weight="bold" className="w-5 h-5" />
              </button>
            </div>

            {/* Art / Visualizer area */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
              <div className="w-48 h-48 bg-[rgb(var(--color-surface))]/10 border border-[rgb(var(--color-border))] flex items-center justify-center relative">
                {isPlaying ? (
                  <div className="flex items-end gap-1 h-20">
                    {[1,2,3,4,5,6,7].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 bg-[rgb(var(--color-primary))]"
                        animate={{ height: [8, 40 + Math.random() * 30, 12, 50 + Math.random() * 20, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6 + i * 0.12, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                ) : (
                  <Waveform weight="thin" className="w-20 h-20 text-[rgb(var(--color-text-dim-accessible))]" />
                )}
                <span className="absolute bottom-2 right-2 font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))]">
                  {currentTrack.category || 'BROADCAST'}
                </span>
              </div>

              {/* Track info */}
              <div className="text-center w-full max-w-xs">
                <h2 className="text-base text-[rgb(var(--color-text-primary))] font-bold leading-snug line-clamp-2">{currentTrack.title}</h2>
                <p className="font-mono text-[12px] text-[rgb(var(--color-text-dim-accessible))] uppercase mt-1.5">{currentTrack.source}</p>
              </div>
            </div>

            {/* Controls area */}
            <div className="px-6 pb-8 pt-4 border-t border-[rgb(var(--color-border))]/50 space-y-5">
              {/* Scrubber */}
              <div className="space-y-1.5">
                <div className="h-2 bg-[rgb(var(--color-surface))] cursor-pointer relative" onClick={handleSeekMobile} data-testid="mobile-progress">
                  <div className="h-full bg-[rgb(var(--color-primary))]" style={{ width: `${progress}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[rgb(var(--color-primary))] border-2 border-[rgb(var(--color-bg))]" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[11px] text-[rgb(var(--color-text-dim-accessible))] tabular-nums">{fmt(currentTime)}</span>
                  <span className="font-mono text-[11px] text-[rgb(var(--color-text-dim-accessible))] tabular-nums">{fmt(duration)}</span>
                </div>
              </div>

              {/* Main controls */}
              <div className="flex items-center justify-center gap-8">
                <button onClick={playPrev} disabled={queueIndex <= 0} className="p-2 text-[rgb(var(--color-text-secondary))] disabled:opacity-30" data-testid="mobile-prev">
                  <SkipBack weight="fill" className="w-6 h-6" />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={isLoading}
                  className="w-14 h-14 bg-[rgb(var(--color-primary))] flex items-center justify-center"
                  data-testid="mobile-play-pause"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-[rgb(var(--color-bg))] border-t-transparent animate-spin rounded-full" />
                  ) : isPlaying ? (
                    <Pause weight="fill" className="w-7 h-7 text-[rgb(var(--color-bg))]" />
                  ) : (
                    <Play weight="fill" className="w-7 h-7 text-[rgb(var(--color-bg))] ml-1" />
                  )}
                </button>
                <button onClick={playNext} disabled={queueIndex >= queue.length - 1} className="p-2 text-[rgb(var(--color-text-secondary))] disabled:opacity-30" data-testid="mobile-next">
                  <SkipForward weight="fill" className="w-6 h-6" />
                </button>
              </div>

              {/* Speed + Volume */}
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="text-[rgb(var(--color-text-secondary))] p-1">
                  {isMuted || volume === 0 ? <SpeakerSlash weight="fill" className="w-4 h-4" /> : <SpeakerHigh weight="fill" className="w-4 h-4" />}
                </button>
                <div
                  className="flex-1 h-1.5 bg-[rgb(var(--color-surface))] cursor-pointer"
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}
                  data-testid="mobile-volume"
                >
                  <div className="h-full bg-[rgb(var(--color-primary))]" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                </div>
                <button
                  type="button"
                  onClick={cycleSpeedMobile}
                  aria-label={`Playback speed ${playbackRate}x`}
                  className={`px-2 py-1 font-mono text-[12px] font-bold border shrink-0 ${
                    playbackRate !== 1
                      ? 'text-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]'
                      : 'text-[rgb(var(--color-text-secondary))] border-[rgb(var(--color-border))]'
                  }`}
                  data-testid="mobile-speed-control"
                >
                  {playbackRate}x
                </button>
              </div>

              {/* Queue info */}
              {queue.length > 0 && (
                <div className="text-center">
                  <span className="font-mono text-[10px] text-[rgb(var(--color-text-dim-accessible))]">
                    QUEUE: {queueIndex + 1} / {queue.length}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ──────────────────────── COMBINED EXPORT ──────────────────────── */
const AudioPlayerBar = () => (
  <>
    <DesktopPlayer />
    <MobilePlayer />
  </>
);

export default AudioPlayerBar;
