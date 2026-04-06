'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { postMyListeningPlay } from '@/lib/me-api';
import {
  clearPersistedPlayback,
  readPersistedPlayback,
  writePersistedPlayback,
  type PersistedPlayback,
} from '@/lib/playback-continuity';
import { resolveStoryPlayback } from '@/lib/story-playback';

/** Broadcast mode claims "play next" so manual queue does not race with auto-advance. */
let nextPlaybackClaimed = false;

export function claimNextPlayback(): void {
  nextPlaybackClaimed = true;
}

/** Broadcast / queue: run when a track finishes (real audio ended or mock progress completed). */
const playbackEndedListeners = new Set<() => void>();

export function subscribePlaybackEnded(fn: () => void): () => void {
  playbackEndedListeners.add(fn);
  return () => playbackEndedListeners.delete(fn);
}

function notifyPlaybackEnded(): void {
  playbackEndedListeners.forEach((f) => {
    try {
      f();
    } catch {
      /* ignore listener errors */
    }
  });
}

export interface Track {
  id: string;
  title: string;
  source: string;
  audioUrl?: string;
  category?: string;
}

export type BriefingHandoff = {
  title: string;
};

export type PlayTrackOptions = {
  resumeRatio?: number;
};

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  /** After a briefing track finishes (real audio or mock progress) — subtle next-step handoff. */
  briefingHandoff: BriefingHandoff | null;
  /** Ordered tracks waiting after the current item (each should have `audioUrl` when possible). */
  playQueue: Track[];
  /** Last saved mid-playback snapshot for “Continue listening” (local). */
  persistedResume: PersistedPlayback | null;
  playTrack: (track: Track, opts?: PlayTrackOptions) => void;
  enqueueTrack: (track: Track) => void;
  removeFromQueueAt: (index: number) => void;
  clearPlayQueue: () => void;
  resumeFromPersisted: () => Promise<void>;
  togglePlayPause: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  /**
   * Seek to a fraction of the current item (0–1). Real audio uses HTMLMediaElement duration;
   * mock briefing (no URL) maps to the synthetic progress bar (~8 min midpoint for 3–12 min range).
   */
  seekToRatio: (ratio: number) => void;
  closePlayer: () => void;
  dismissBriefingHandoff: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const SKIP_SEC = 10;
/** Mock briefing timeline when no audio URL — ~8 min midpoint for backend 3–12 min range. */
const MOCK_BRIEFING_DURATION_SEC = 8 * 60;
const PERSIST_THROTTLE_MS = 4000;
const MIN_PERSIST_RATIO = 0.02;
const MAX_PERSIST_RATIO = 0.96;

function isBriefingTrack(t: Track | null): boolean {
  return Boolean(t && t.category?.toUpperCase() === 'BRIEFING');
}

function trackToPersisted(track: Track): PersistedPlayback['track'] {
  return {
    id: track.id,
    title: track.title,
    source: track.source,
    audioUrl: track.audioUrl,
    category: track.category,
  };
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [briefingHandoff, setBriefingHandoff] = useState<BriefingHandoff | null>(null);
  const [playQueue, setPlayQueue] = useState<Track[]>([]);
  const [persistedResume, setPersistedResume] = useState<PersistedPlayback | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const pendingSeekRatioRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const lastPersistAtRef = useRef(0);
  const playTrackRef = useRef<(track: Track, opts?: PlayTrackOptions) => void>(() => {});
  /** Revoke prior `blob:` object URLs when switching tracks (e.g. Library offline audio). */
  const managedBlobUrlRef = useRef<string | null>(null);

  const usingRealAudio = Boolean(currentTrack?.audioUrl);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    setPersistedResume(readPersistedPlayback());
  }, []);

  const tryPersistProgress = useCallback((force: boolean) => {
    const t = currentTrackRef.current;
    if (!t?.id) return;
    const ratio = progressRef.current / 100;
    if (ratio < MIN_PERSIST_RATIO || ratio > MAX_PERSIST_RATIO) return;
    const now = Date.now();
    if (!force && now - lastPersistAtRef.current < PERSIST_THROTTLE_MS) return;
    lastPersistAtRef.current = now;
    const payload: PersistedPlayback = {
      track: trackToPersisted(t),
      progressRatio: ratio,
      updatedAt: now,
    };
    writePersistedPlayback(payload);
    setPersistedResume(payload);
  }, []);

  useEffect(() => {
    const onHide = () => tryPersistProgress(true);
    const onVis = () => {
      if (document.visibilityState === 'hidden') tryPersistProgress(true);
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [tryPersistProgress]);

  const fireBriefingHandoffIfNeeded = useCallback(() => {
    const t = currentTrackRef.current;
    if (isBriefingTrack(t)) {
      setBriefingHandoff({ title: (t?.title || 'Morning Briefing').trim() });
    }
  }, []);

  const playNextFromQueue = useCallback(() => {
    setPlayQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      queueMicrotask(() => playTrackRef.current(next));
      return rest;
    });
  }, []);

  const runEndedSideEffects = useCallback(() => {
    clearPersistedPlayback();
    setPersistedResume(null);
    nextPlaybackClaimed = false;
    notifyPlaybackEnded();
    if (!nextPlaybackClaimed) {
      playNextFromQueue();
    }
    nextPlaybackClaimed = false;
  }, [playNextFromQueue]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      fireBriefingHandoffIfNeeded();
      const t = currentTrackRef.current;
      if (t?.id) {
        const dur =
          audio.duration && Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.round(audio.duration)
            : 0;
        void postMyListeningPlay({
          track_id: t.id,
          title: t.title,
          source: t.source,
          category: t.category,
          duration: dur,
        });
      }
      queueMicrotask(runEndedSideEffects);
    };

    const applyPendingSeekRatio = () => {
      const pending = pendingSeekRatioRef.current;
      if (pending == null) return;
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        pendingSeekRatioRef.current = null;
        audio.currentTime = pending * audio.duration;
        setProgress(pending * 100);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      tryPersistProgress(true);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', applyPendingSeekRatio);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', applyPendingSeekRatio);
    };
  }, [fireBriefingHandoffIfNeeded, runEndedSideEffects, tryPersistProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!usingRealAudio || !audio) return;
    const tick = () => tryPersistProgress(false);
    const id = window.setInterval(tick, PERSIST_THROTTLE_MS);
    return () => window.clearInterval(id);
  }, [usingRealAudio, tryPersistProgress]);

  useEffect(() => {
    if (usingRealAudio || !isPlaying || !currentTrack) return;
    let lastPersist = 0;
    const stepPct = 100 / MOCK_BRIEFING_DURATION_SEC;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          const t = currentTrackRef.current;
          if (t?.id) {
            void postMyListeningPlay({
              track_id: t.id,
              title: t.title,
              source: t.source,
              category: t.category,
              duration: MOCK_BRIEFING_DURATION_SEC,
            });
          }
          if (isBriefingTrack(t)) {
            setBriefingHandoff({ title: (t?.title || 'Morning Briefing').trim() });
          }
          queueMicrotask(runEndedSideEffects);
          return 0;
        }
        const now = Date.now();
        if (now - lastPersist >= PERSIST_THROTTLE_MS) {
          lastPersist = now;
          const ratio = p / 100;
          const tr = currentTrackRef.current;
          if (ratio >= MIN_PERSIST_RATIO && ratio <= MAX_PERSIST_RATIO && tr?.id) {
            writePersistedPlayback({
              track: trackToPersisted(tr),
              progressRatio: ratio,
              updatedAt: now,
            });
            setPersistedResume({
              track: trackToPersisted(tr),
              progressRatio: ratio,
              updatedAt: now,
            });
          }
        }
        return p + stepPct;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, usingRealAudio, runEndedSideEffects]);

  const dismissBriefingHandoff = useCallback(() => setBriefingHandoff(null), []);

  const revokeManagedBlobUrl = useCallback(() => {
    const u = managedBlobUrlRef.current;
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* ignore */
      }
      managedBlobUrlRef.current = null;
    }
  }, []);

  const playTrack = useCallback(
    (track: Track, opts?: PlayTrackOptions) => {
      setBriefingHandoff(null);
      const resumeRatio =
        opts?.resumeRatio != null && Number.isFinite(opts.resumeRatio)
          ? Math.min(1, Math.max(0, opts.resumeRatio))
          : null;
      pendingSeekRatioRef.current = resumeRatio;
      const nextUrl = track.audioUrl?.trim() || '';
      if (managedBlobUrlRef.current && managedBlobUrlRef.current !== nextUrl) {
        revokeManagedBlobUrl();
      }
      if (nextUrl.startsWith('blob:')) {
        managedBlobUrlRef.current = nextUrl;
      } else {
        managedBlobUrlRef.current = null;
      }
      setCurrentTrack(track);
      setProgress(resumeRatio != null ? resumeRatio * 100 : 0);
      const audio = audioRef.current;
      if (nextUrl && audio) {
        audio.src = nextUrl;
        void audio.play().catch(() => setIsPlaying(false));
      } else {
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setIsPlaying(true);
      }
    },
    [revokeManagedBlobUrl]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const enqueueTrack = useCallback((track: Track) => {
    setPlayQueue((q) => {
      const cur = currentTrackRef.current;
      if (cur?.id === track.id) return q;
      if (q.some((t) => t.id === track.id)) return q;
      return [...q, track];
    });
  }, []);

  const removeFromQueueAt = useCallback((index: number) => {
    setPlayQueue((q) => q.filter((_, i) => i !== index));
  }, []);

  const clearPlayQueue = useCallback(() => setPlayQueue([]), []);

  const resumeFromPersisted = useCallback(async () => {
    const p = readPersistedPlayback();
    if (!p) return;
    const { track, progressRatio } = p;
    const isBriefing =
      track.category?.toUpperCase() === 'BRIEFING' ||
      track.id === 'briefing-pending' ||
      track.id.startsWith('briefing-');
    if (isBriefing) {
      playTrack(
        {
          id: track.id,
          title: track.title,
          source: track.source,
          category: track.category ?? 'BRIEFING',
          audioUrl: track.audioUrl,
        },
        { resumeRatio: progressRatio }
      );
      return;
    }
    if (track.audioUrl) {
      playTrack(
        {
          id: track.id,
          title: track.title,
          source: track.source,
          category: track.category,
          audioUrl: track.audioUrl,
        },
        { resumeRatio: progressRatio }
      );
      return;
    }
    const resolved = await resolveStoryPlayback(track.id, {
      id: track.id,
      title: track.title,
      source: track.source,
      category: track.category || 'General',
    });
    playTrack(resolved, { resumeRatio: progressRatio });
  }, [playTrack]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (currentTrack?.audioUrl && audio?.src) {
      if (audio.paused) {
        void audio.play().catch(() => setIsPlaying(false));
      } else {
        audio.pause();
      }
      return;
    }
    setIsPlaying((p) => !p);
  }, [currentTrack?.audioUrl]);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (currentTrack?.audioUrl && audio?.duration && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(audio.currentTime + SKIP_SEC, audio.duration);
      return;
    }
    setProgress((p) => Math.min(p + 10, 100));
  }, [currentTrack?.audioUrl]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (currentTrack?.audioUrl && audio) {
      audio.currentTime = Math.max(audio.currentTime - SKIP_SEC, 0);
      return;
    }
    setProgress((p) => Math.max(p - 10, 0));
  }, [currentTrack?.audioUrl]);

  const seekToRatio = useCallback((ratio: number) => {
    const r = Math.min(1, Math.max(0, ratio));
    const audio = audioRef.current;
    const track = currentTrackRef.current;
    if (track?.audioUrl && audio) {
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        pendingSeekRatioRef.current = null;
        audio.currentTime = r * audio.duration;
        setProgress(r * 100);
      } else {
        pendingSeekRatioRef.current = r;
      }
      if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
      return;
    }
    if (isBriefingTrack(track) && !track?.audioUrl) {
      setProgress(r * 100);
      return;
    }
  }, []);

  const closePlayer = useCallback(() => {
    tryPersistProgress(true);
    setBriefingHandoff(null);
    pendingSeekRatioRef.current = null;
    revokeManagedBlobUrl();
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }, [tryPersistProgress, revokeManagedBlobUrl]);

  useEffect(() => () => revokeManagedBlobUrl(), [revokeManagedBlobUrl]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        briefingHandoff,
        playQueue,
        persistedResume,
        playTrack,
        enqueueTrack,
        removeFromQueueAt,
        clearPlayQueue,
        resumeFromPersisted,
        togglePlayPause,
        skipForward,
        skipBackward,
        seekToRatio,
        closePlayer,
        dismissBriefingHandoff,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}
