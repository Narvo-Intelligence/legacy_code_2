import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArticleNyTimes,
  Broadcast,
  CaretDown,
  CaretUp,
  DotsSixVertical,
  Pause,
  Play,
  Queue,
  Repeat,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
  Trash,
  X,
} from '@phosphor-icons/react';

import { StatusPill } from './primitives/Pills';
import { useAudio } from '../contexts/AudioContext';
import type { AudioTrack } from '../types/audio';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const fmt = (seconds: number | null | undefined): string => {
  if (seconds == null || Number.isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const getTranscriptSentences = (track: (AudioTrack & { url?: string }) | null) => {
  const text = typeof track?.narrative === 'string' ? track.narrative : typeof track?.summary === 'string' ? track.summary : '';
  if (!text) return [];
  return text.match(/[^.!?]+[.!?]+/g) ?? [text];
};

type QueueRowProps = {
  track: AudioTrack;
  index: number;
  isActive: boolean;
  isDragOver: boolean;
  compact?: boolean;
  onDragStart: (index: number, event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (index: number, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onPlay: (index: number) => void;
  onRemove: (id: string) => void;
};

const QueueRow = ({
  track,
  index,
  isActive,
  isDragOver,
  compact = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onPlay,
  onRemove,
}: QueueRowProps) => (
  <div
    role="button"
    tabIndex={0}
    draggable={!isActive}
    onDragStart={(event) => onDragStart(index, event)}
    onDragOver={(event) => onDragOver(index, event)}
    onDragEnd={onDragEnd}
    onClick={() => onPlay(index)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPlay(index);
      }
    }}
    className={`flex items-center gap-3 rounded-[20px] border px-3 py-3 transition-colors ${
      isActive
        ? 'border-alert/20 bg-alert/10'
        : isDragOver
          ? 'border-alert/20 bg-alert/5'
          : 'border-border bg-white hover:border-primary/20'
    }`}
    data-testid={`queue-item-${index}`}
    aria-label={`Play ${track.title}`}
  >
    <button
      type="button"
      aria-label="Drag to reorder"
      className={`inline-flex items-center justify-center ${compact ? 'h-9 w-9' : 'h-8 w-8'} rounded-full text-content-secondary`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <DotsSixVertical size={compact ? 16 : 14} weight="bold" />
    </button>
    <span className="min-w-[18px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
      {String(index + 1).padStart(2, '0')}
    </span>
    <div className="min-w-0 flex-1">
      <div className={`truncate ${compact ? 'text-sm' : 'text-[13px]'} font-semibold text-content`}>
        {track.title}
      </div>
      <div className="mt-1 truncate text-[11px] text-content-secondary">
        {track.source || 'Narvo'}
      </div>
    </div>
    {isActive ? <StatusPill status="live">Live</StatusPill> : null}
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onRemove(track.id);
      }}
      className={`inline-flex items-center justify-center rounded-full text-content-secondary transition-colors hover:text-alert ${compact ? 'h-9 w-9' : 'h-8 w-8'}`}
      data-testid={`queue-remove-${index}`}
      aria-label={`Remove ${track.title} from queue`}
    >
      <X size={compact ? 16 : 14} weight="bold" />
    </button>
  </div>
);

const NowPlayingArtwork = ({
  isPlaying,
  isLoading,
  small = false,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  small?: boolean;
}) => {
  const size = small ? 'h-10 w-10 rounded-[14px]' : 'h-14 w-14 rounded-[18px]';
  const barHeight = small ? 'h-4' : 'h-6';

  return (
    <div className={`relative flex items-center justify-center bg-primary/10 ${size}`}>
      {isLoading ? (
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      ) : isPlaying ? (
        <div className={`flex items-end gap-[3px] ${barHeight}`}>
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className="w-[3px] rounded-full bg-alert"
              animate={{ height: [4, 10 + index * 2, 6, 14, 4] }}
              transition={{ repeat: Infinity, duration: 0.8 + index * 0.12, ease: 'easeInOut' }}
            />
          ))}
        </div>
      ) : (
        <Broadcast size={small ? 16 : 20} weight="bold" className="text-primary" />
      )}
    </div>
  );
};

const DesktopPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    isTransitioning,
    currentTime,
    duration,
    togglePlay,
    seek,
    playNext,
    playPrev,
    queue,
    queueIndex,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    reorderQueue,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    autoPlay,
    setAutoPlay,
    playbackRate,
    setPlaybackRate,
    stopTrack,
  } = useAudio();

  const [showQueue, setShowQueue] = useState(false);
  const [showVol, setShowVol] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const transcript = getTranscriptSentences(currentTrack);
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const activeSentenceIndex = duration && transcript.length > 0 ? Math.min(Math.floor((currentTime / duration) * transcript.length), transcript.length - 1) : -1;

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (volRef.current && !volRef.current.contains(event.target as Node)) {
        setShowVol(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const handleSeek = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!duration || !Number.isFinite(duration) || duration <= 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      seek(((event.clientX - rect.left) / rect.width) * duration);
    },
    [duration, seek]
  );

  const cycleSpeed = useCallback(() => {
    const index = SPEED_OPTIONS.indexOf(playbackRate);
    setPlaybackRate(SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length]);
  }, [playbackRate, setPlaybackRate]);

  const handleQueueDragStart = useCallback((index: number, event: React.DragEvent<HTMLDivElement>) => {
    setDragIdx(index);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleQueueDragOver = useCallback((index: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverIdx(index);
  }, []);

  const handleQueueDragEnd = useCallback(() => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      reorderQueue(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx, reorderQueue]);

  if (!currentTrack && queue.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Audio player"
      className="relative hidden shrink-0 border-t border-border bg-[rgba(255,255,255,0.92)] backdrop-blur-md md:block"
      data-testid="audio-player-bar"
    >
      <div className="absolute left-0 right-0 top-0 h-[3px] bg-primary/8">
        <div className="h-full bg-alert transition-all duration-150" style={{ width: `${progress}%` }} />
      </div>

      <AnimatePresence>
        {showQueue ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full right-6 z-50 mb-3 flex h-[420px] w-[360px] flex-col overflow-hidden rounded-[28px] border border-border bg-white shadow-[var(--shadow-3)]"
            role="region"
            aria-label="Playback queue"
            data-testid="queue-panel"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <div className="meta-eyebrow">Queue</div>
                <div className="mt-1 text-sm font-semibold text-content">{queue.length} tracks lined up</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
                    autoPlay ? 'border-alert/20 bg-alert/10 text-alert' : 'border-border bg-white text-content-secondary'
                  }`}
                  aria-label={autoPlay ? 'Auto-play on' : 'Auto-play off'}
                >
                  <Repeat size={16} weight={autoPlay ? 'fill' : 'regular'} />
                </button>
                {queue.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearQueue}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary transition-colors hover:text-alert"
                    aria-label="Clear queue"
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowQueue(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary"
                  aria-label="Close queue"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar">
              {queue.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-content-secondary">
                  <Queue size={28} weight="duotone" className="text-primary/40" />
                  <p className="text-sm">Queue is empty.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queue.map((track, index) => (
                    <QueueRow
                      key={track.id}
                      track={track}
                      index={index}
                      isActive={index === queueIndex}
                      isDragOver={dragOverIdx === index}
                      onDragStart={handleQueueDragStart}
                      onDragOver={handleQueueDragOver}
                      onDragEnd={handleQueueDragEnd}
                      onPlay={playFromQueue}
                      onRemove={removeFromQueue}
                    />
                  ))}
                </div>
              )}
            </div>
            {transcript.length > 0 ? (
              <div className="border-t border-border bg-surface-alt px-4 py-4">
                <div className="meta-eyebrow">Current transcript</div>
                <p className="mt-2 line-clamp-3 text-sm leading-7 text-content-secondary">
                  {transcript[Math.max(activeSentenceIndex, 0)] || transcript[0]}
                </p>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid h-[92px] grid-cols-[minmax(0,1fr)_minmax(360px,560px)_minmax(0,1fr)] items-center gap-5 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <NowPlayingArtwork isPlaying={isPlaying} isLoading={isLoading || isTransitioning} />
          <div className="min-w-0">
            <div className="meta-eyebrow">Now playing</div>
            <div className="mt-2 truncate font-display text-[20px] font-semibold tracking-tight text-content">
              {currentTrack?.title || 'No active track'}
            </div>
            <div className="mt-1 truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-content-secondary">
              {currentTrack?.source || 'Narvo'}
            </div>
          </div>
          {currentTrack ? (
            <button
              type="button"
              onClick={stopTrack}
              className="ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary transition-colors hover:text-alert"
              aria-label="Close player"
            >
              <X size={16} weight="bold" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={playPrev}
              disabled={queueIndex <= 0}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary disabled:opacity-30"
              aria-label="Previous track"
              data-testid="player-prev"
            >
              <SkipBack size={16} weight="fill" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading || !currentTrack}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-alert text-white shadow-[0_0_0_1px_rgba(240,75,36,0.18),0_0_22px_rgba(240,75,36,0.18)] disabled:opacity-50"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              data-testid="player-play-pause"
            >
              {isLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} weight="fill" />
              ) : (
                <Play size={18} weight="fill" className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={playNext}
              disabled={queueIndex >= queue.length - 1 || queue.length === 0}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary disabled:opacity-30"
              aria-label="Next track"
              data-testid="player-next"
            >
              <SkipForward size={16} weight="fill" />
            </button>
          </div>
          <div className="flex w-full items-center gap-3">
            <span className="min-w-[38px] text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
              {fmt(currentTime)}
            </span>
            <div
              className="group relative h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-primary/8"
              onClick={handleSeek}
              onKeyDown={(event) => {
                if (!duration) return;
                const step = event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0;
                if (step) {
                  event.preventDefault();
                  seek(Math.max(0, Math.min(duration, currentTime + step)));
                }
              }}
              role="slider"
              tabIndex={0}
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Playback position"
              data-testid="player-progress"
            >
              <div className="h-full rounded-full bg-alert transition-all duration-150" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-alert bg-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
            <span className="min-w-[38px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
              {fmt(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cycleSpeed}
            className={`rounded-full border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${
              playbackRate !== 1
                ? 'border-alert/20 bg-alert/10 text-alert'
                : 'border-border bg-white text-content-secondary'
            }`}
            data-testid="speed-control"
          >
            {playbackRate}x
          </button>
          <div className="relative" ref={volRef}>
            <button
              type="button"
              onClick={toggleMute}
              onMouseEnter={() => setShowVol(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary"
              aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
              data-testid="volume-btn"
            >
              {isMuted || volume === 0 ? <SpeakerSlash size={16} weight="fill" /> : <SpeakerHigh size={16} weight="fill" />}
            </button>
            <AnimatePresence>
              {showVol ? (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 100 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="absolute right-full top-1/2 mr-2 -translate-y-1/2 overflow-hidden rounded-full border border-border bg-white px-3 py-3 shadow-[var(--shadow-2)]"
                >
                  <div
                    role="slider"
                    tabIndex={0}
                    aria-valuenow={Math.round(volume * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Volume"
                    className="h-2 w-20 cursor-pointer overflow-hidden rounded-full bg-primary/8"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setVolume(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
                    }}
                    onKeyDown={(event) => {
                      const step = event.key === 'ArrowLeft' ? -0.05 : event.key === 'ArrowRight' ? 0.05 : 0;
                      if (step) {
                        event.preventDefault();
                        setVolume(Math.max(0, Math.min(1, volume + step)));
                      }
                    }}
                    data-testid="volume-slider"
                  >
                    <div className="h-full rounded-full bg-alert" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border ${
              showQueue ? 'border-alert/20 bg-alert/10 text-alert' : 'border-border bg-white text-content-secondary'
            }`}
            aria-label={showQueue ? 'Hide queue' : 'Show queue'}
            aria-expanded={showQueue}
            data-testid="queue-toggle-btn"
          >
            <Queue size={16} weight={showQueue ? 'fill' : 'regular'} />
            {queue.length > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-alert px-1 font-mono text-[9px] font-bold text-white">
                {queue.length}
              </span>
            ) : null}
          </button>
          {autoPlay ? <StatusPill status="live">Auto</StatusPill> : null}
        </div>
      </div>
    </div>
  );
};

const MobilePlayer = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    togglePlay,
    seek,
    queue,
    queueIndex,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    reorderQueue,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    playbackRate,
    setPlaybackRate,
    autoPlay,
    setAutoPlay,
    stopTrack,
  } = useAudio();

  const [expanded, setExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<'player' | 'queue' | 'transcript'>('player');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const transcript = getTranscriptSentences(currentTrack);
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const activeSentenceIndex = duration && transcript.length > 0 ? Math.min(Math.floor((currentTime / duration) * transcript.length), transcript.length - 1) : -1;

  useEffect(() => {
    setActivePanel('player');
  }, [currentTrack?.id]);

  const cycleSpeed = useCallback(() => {
    const index = SPEED_OPTIONS.indexOf(playbackRate);
    setPlaybackRate(SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length]);
  }, [playbackRate, setPlaybackRate]);

  const handleSeek = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!duration || !Number.isFinite(duration) || duration <= 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      seek(((event.clientX - rect.left) / rect.width) * duration);
    },
    [duration, seek]
  );

  const handleQueueDragStart = useCallback((index: number, event: React.DragEvent<HTMLDivElement>) => {
    setDragIdx(index);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleQueueDragOver = useCallback((index: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverIdx(index);
  }, []);

  const handleQueueDragEnd = useCallback(() => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      reorderQueue(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx, reorderQueue]);

  if (!currentTrack) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Audio player dock"
        className="fixed left-0 right-0 z-40 border-t border-border bg-[rgba(255,255,255,0.94)] backdrop-blur-md md:hidden"
        style={{ bottom: 'calc(var(--mobile-nav-h) + env(safe-area-inset-bottom, 0px))' }}
        data-testid="mobile-player-dock"
      >
        <div className="h-[3px] bg-primary/8">
          <div className="h-full bg-alert transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setExpanded(true);
            }
          }}
          className="flex items-center gap-3 px-3 py-3"
          aria-label="Expand player from dock"
        >
          <NowPlayingArtwork isPlaying={isPlaying} isLoading={isLoading} small />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[16px] font-semibold text-content">{currentTrack.title}</div>
            <div className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-content-secondary">
              {currentTrack.source || 'Narvo'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(true);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-content-secondary"
              aria-label="Expand player"
              data-testid="mobile-player-dock-expand"
            >
              <CaretUp size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                stopTrack();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-content-secondary"
              aria-label="Close player"
              data-testid="mobile-player-dock-close"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-alert text-white shadow-[0_0_0_1px_rgba(240,75,36,0.18),0_0_18px_rgba(240,75,36,0.18)]"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            data-testid="mobile-mini-play"
          >
            {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-bg md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
            data-testid="mobile-player-modal"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="meta-eyebrow">Player</div>
                <div className="mt-1 text-sm font-semibold text-content">Large controls, clear queue, readable transcript.</div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary"
                aria-label="Minimize to dock"
                data-testid="mobile-player-minimize"
              >
                <CaretDown size={16} weight="bold" />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto px-5 py-4 no-scrollbar">
              {[
                { id: 'player', label: 'Player' },
                { id: 'queue', label: `Queue (${queue.length})` },
                { id: 'transcript', label: 'Transcript' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePanel(tab.id as 'player' | 'queue' | 'transcript')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activePanel === tab.id
                      ? 'bg-primary-deep text-white'
                      : 'border border-border bg-white text-content-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {activePanel === 'player' ? (
                <div className="flex h-full flex-col justify-between px-6 pb-6 pt-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="mt-6">
                      <NowPlayingArtwork isPlaying={isPlaying} isLoading={isLoading} />
                    </div>
                    <div className="mt-6 max-w-[320px]">
                      <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-content">
                        {currentTrack.title}
                      </h2>
                      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-content-secondary">
                        {currentTrack.source || 'Narvo'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="min-w-[38px] text-right font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
                        {fmt(currentTime)}
                      </span>
                      <div
                        role="slider"
                        tabIndex={0}
                        aria-valuenow={Math.round(progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Playback position"
                        className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-primary/8"
                        onClick={handleSeek}
                      >
                        <div className="h-full rounded-full bg-alert" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="min-w-[38px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
                        {fmt(duration)}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                      <button
                        type="button"
                        onClick={() => playFromQueue(Math.max(queueIndex - 1, 0))}
                        disabled={queueIndex <= 0}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-content-secondary disabled:opacity-30"
                      >
                        <SkipBack size={18} weight="fill" />
                      </button>
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-alert text-white shadow-[0_0_0_1px_rgba(240,75,36,0.18),0_0_22px_rgba(240,75,36,0.18)]"
                      >
                        {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" className="ml-0.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => playFromQueue(Math.min(queueIndex + 1, queue.length - 1))}
                        disabled={queueIndex < 0 || queueIndex >= queue.length - 1}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-content-secondary disabled:opacity-30"
                      >
                        <SkipForward size={18} weight="fill" />
                      </button>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary"
                      >
                        {isMuted || volume === 0 ? <SpeakerSlash size={16} weight="fill" /> : <SpeakerHigh size={16} weight="fill" />}
                      </button>
                      <div
                        role="slider"
                        tabIndex={0}
                        aria-valuenow={Math.round(volume * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Volume"
                        className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-primary/8"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setVolume(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
                        }}
                        data-testid="mobile-volume"
                      >
                        <div className="h-full rounded-full bg-alert" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                      </div>
                      <button
                        type="button"
                        onClick={cycleSpeed}
                        className={`rounded-full border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${
                          playbackRate !== 1
                            ? 'border-alert/20 bg-alert/10 text-alert'
                            : 'border-border bg-white text-content-secondary'
                        }`}
                        data-testid="mobile-speed-control"
                      >
                        {playbackRate}x
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {activePanel === 'queue' ? (
                <div className="flex h-full flex-col px-5 pb-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="meta-eyebrow">Queue</div>
                      <div className="mt-1 text-sm font-semibold text-content">{queue.length} tracks available</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
                          autoPlay ? 'border-alert/20 bg-alert/10 text-alert' : 'border-border bg-white text-content-secondary'
                        }`}
                        aria-label={autoPlay ? 'Auto-play on' : 'Auto-play off'}
                      >
                        <Repeat size={16} weight={autoPlay ? 'fill' : 'regular'} />
                      </button>
                      {queue.length > 0 ? (
                        <button
                          type="button"
                          onClick={clearQueue}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-content-secondary"
                          aria-label="Clear queue"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
                    {queue.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-content-secondary">
                        <Queue size={28} weight="duotone" className="text-primary/40" />
                        <p className="text-sm">Queue is empty.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {queue.map((track, index) => (
                          <QueueRow
                            key={track.id}
                            track={track}
                            index={index}
                            isActive={index === queueIndex}
                            isDragOver={dragOverIdx === index}
                            compact
                            onDragStart={handleQueueDragStart}
                            onDragOver={handleQueueDragOver}
                            onDragEnd={handleQueueDragEnd}
                            onPlay={playFromQueue}
                            onRemove={removeFromQueue}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activePanel === 'transcript' ? (
                <div className="h-full overflow-y-auto px-5 pb-6 no-scrollbar">
                  <div className="mb-4">
                    <div className="meta-eyebrow">Transcript</div>
                    <div className="mt-1 text-sm font-semibold text-content">The current sentence stays highlighted as playback moves.</div>
                  </div>
                  {transcript.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-content-secondary">
                      <ArticleNyTimes size={28} weight="duotone" className="text-primary/40" />
                      <p className="text-sm">No transcript available for this track.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transcript.map((sentence, index) => (
                        <p
                          key={index}
                          className={`rounded-[18px] px-3 py-3 text-sm leading-7 transition-colors ${
                            index === activeSentenceIndex
                              ? 'bg-primary/10 text-primary'
                              : index < activeSentenceIndex
                                ? 'text-content-secondary/60'
                                : 'text-content-secondary'
                          }`}
                        >
                          {sentence.trim()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

const AudioPlayerBar = () => (
  <>
    <DesktopPlayer />
    <MobilePlayer />
  </>
);

export default AudioPlayerBar;
