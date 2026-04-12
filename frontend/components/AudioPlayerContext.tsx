'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { postMyListeningPlay } from '@/lib/me-api';
import { narvoTrack } from '@/lib/narvo-analytics';
import {
  clearPersistedPlayback,
  readPersistedPlayback,
  writePersistedPlayback,
  type PersistedPlayback,
} from '@/lib/playback-continuity';
import { resolveStoryPlayback } from '@/lib/story-playback';
import { prefetchAudioPlayerChunk } from '@/lib/prefetch-audio-player';

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

function tryUpdateMediaSessionPosition(audio: HTMLAudioElement) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  if (!('setPositionState' in ms)) return;
  try {
    const d = audio.duration;
    if (d > 0 && Number.isFinite(d)) {
      ms.setPositionState({
        duration: d,
        playbackRate: audio.playbackRate,
        position: Math.min(Math.max(0, audio.currentTime), d),
      });
    }
  } catch {
    /* Invalid state throws in some browsers */
  }
}

function clearMediaSessionPosition() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  if (!('setPositionState' in ms)) return;
  try {
    // Runtime: clearing lock-screen scrubber; DOM typings omit `null` but engines accept it.
    (ms as MediaSession & { setPositionState: (state: MediaPositionState | null) => void }).setPositionState(
      null
    );
  } catch {
    /* ignore */
  }
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
  /** HTMLMediaElement playback rate (also scales mock briefing progress). */
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  /** 0–1, applied to real audio only. */
  volume: number;
  setVolume: (v: number) => void;
  /** Elapsed seconds for display / scrubber (mock tracks use synthetic timeline). */
  currentTimeSec: number;
  durationSec: number;
  playTrack: (track: Track, opts?: PlayTrackOptions) => void;
  enqueueTrack: (track: Track) => void;
  removeFromQueueAt: (index: number) => void;
  clearPlayQueue: () => void;
  resumeFromPersisted: () => Promise<void>;
  togglePlayPause: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  /** Start the first queued track immediately (no-op if queue empty). */
  skipToNext: () => void;
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
/** Seconds before track end to start loading the next queued URL (HTTP only; avoids duplicate blob ownership). */
const NEXT_PREFETCH_LEAD_SEC = 2.5;
/** Fade-in duration when starting real audio (broadcast-style handoff). */
const PLAY_FADE_IN_MS = 320;

function isBriefingTrack(t: Track | null): boolean {
  return Boolean(t && t.category?.toUpperCase() === 'BRIEFING');
}

function playbackEventName(phase: 'start' | 'complete', track: Track): string {
  return isBriefingTrack(track) ? `briefing_play_${phase}` : `story_play_${phase}`;
}

function playbackEventProps(track: Track, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    track_id: track.id,
    category: track.category ?? null,
    source: track.source || null,
    has_audio: Boolean(track.audioUrl?.trim()),
    ...extra,
  };
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
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [audioTimes, setAudioTimes] = useState({ cur: 0, dur: 0 });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Preloads the head of `playQueue` so the next item can start with less decode gap. */
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const playQueueRef = useRef<Track[]>([]);
  /** When true, skip syncing `volume` state onto the main element (fade-in owns `audio.volume`). */
  const fadingInRef = useRef(false);
  /** Bumps on each `playTrack` so an older fade-in rAF cannot overwrite volume after a new track starts. */
  const playTrackGenerationRef = useRef(0);
  const pendingSeekRatioRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const lastPersistAtRef = useRef(0);
  const playTrackRef = useRef<(track: Track, opts?: PlayTrackOptions) => void>(() => {});
  /** Revoke prior `blob:` object URLs when switching tracks (e.g. Library offline audio). */
  const managedBlobUrlRef = useRef<string | null>(null);

  const usingRealAudio = Boolean(currentTrack?.audioUrl);

  const durationSec = usingRealAudio
    ? audioTimes.dur > 0 && Number.isFinite(audioTimes.dur)
      ? audioTimes.dur
      : 0
    : MOCK_BRIEFING_DURATION_SEC;
  const currentTimeSec = usingRealAudio
    ? audioTimes.cur
    : (progress / 100) * MOCK_BRIEFING_DURATION_SEC;

  const setPlaybackRate = useCallback((rate: number) => {
    const r = Math.min(2, Math.max(0.5, rate));
    setPlaybackRateState(r);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = r;
  }, []);

  const setVolume = useCallback((v: number) => {
    const x = Math.min(1, Math.max(0, v));
    setVolumeState(x);
    const audio = audioRef.current;
    if (audio) audio.volume = x;
  }, []);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    playQueueRef.current = playQueue;
  }, [playQueue]);

  /** Start loading the next queued HTTP URL as soon as the current track is known (not only near track end). */
  useEffect(() => {
    if (!currentTrack?.id) return;
    const head = playQueue[0];
    const nextUrl = head?.audioUrl?.trim() || '';
    if (!head?.id || !nextUrl || nextUrl.startsWith('blob:')) return;
    const na = nextAudioRef.current;
    if (!na || na.dataset.prefetchFor === head.id) return;
    na.dataset.prefetchFor = head.id;
    na.preload = 'auto';
    na.src = nextUrl;
    try {
      na.load();
    } catch {
      /* ignore */
    }
  }, [currentTrack?.id, playQueue]);

  useEffect(() => {
    setAudioTimes({ cur: 0, dur: 0 });
  }, [currentTrack?.id, currentTrack?.audioUrl]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const t = currentTrack;
    if (!t) {
      ms.metadata = null;
      ms.playbackState = 'none';
      clearMediaSessionPosition();
      return;
    }
    const origin = window.location.origin;
    ms.metadata = new MediaMetadata({
      title: t.title || 'Narvo',
      artist: t.source || 'Narvo',
      album: t.category || 'News',
      artwork: [
        { src: `${origin}/narvo-icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${origin}/narvo-icon-512.png`, sizes: '512x512', type: 'image/png' },
      ],
    });
    if (!t.audioUrl) {
      clearMediaSessionPosition();
    }
  }, [currentTrack]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying, currentTrack]);

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

  const skipToNext = useCallback(() => {
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
    const audio = audioRef.current;
    if (!audio) return;

    let lastMsPosSync = 0;

    const updateProgress = () => {
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setAudioTimes({ cur: audio.currentTime, dur: audio.duration });
        const now = Date.now();
        if (now - lastMsPosSync >= 750) {
          lastMsPosSync = now;
          tryUpdateMediaSessionPosition(audio);
        }
        const head = playQueueRef.current[0];
        const nextUrl = head?.audioUrl?.trim() || '';
        if (
          head?.id &&
          nextUrl &&
          !nextUrl.startsWith('blob:') &&
          !fadingInRef.current
        ) {
          const rem = audio.duration - audio.currentTime;
          if (rem > 0.08 && rem < NEXT_PREFETCH_LEAD_SEC) {
            const na = nextAudioRef.current;
            if (na && na.dataset.prefetchFor !== head.id) {
              na.dataset.prefetchFor = head.id;
              na.preload = 'auto';
              na.src = nextUrl;
              try {
                na.load();
              } catch {
                /* ignore */
              }
            }
          }
        }
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
        narvoTrack(
          playbackEventName('complete', t),
          playbackEventProps(t, { duration_sec: dur })
        );
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
        setAudioTimes({ cur: pending * audio.duration, dur: audio.duration });
        tryUpdateMediaSessionPosition(audio);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      tryUpdateMediaSessionPosition(audio);
    };
    const onPause = () => {
      setIsPlaying(false);
      tryPersistProgress(true);
    };

    const onSeeked = () => {
      lastMsPosSync = 0;
      tryUpdateMediaSessionPosition(audio);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', applyPendingSeekRatio);
    audio.addEventListener('seeked', onSeeked);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', applyPendingSeekRatio);
      audio.removeEventListener('seeked', onSeeked);
    };
  }, [fireBriefingHandoffIfNeeded, runEndedSideEffects, tryPersistProgress]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const a = audioRef.current;
    if (a && !fadingInRef.current) a.volume = volume;
  }, [volume]);

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
    const stepPct = (100 / MOCK_BRIEFING_DURATION_SEC) * playbackRate;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          const t = currentTrackRef.current;
          if (t?.id) {
            narvoTrack(
              playbackEventName('complete', t),
              playbackEventProps(t, { duration_sec: MOCK_BRIEFING_DURATION_SEC })
            );
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
  }, [isPlaying, currentTrack, usingRealAudio, runEndedSideEffects, playbackRate]);

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
      prefetchAudioPlayerChunk();
      setBriefingHandoff(null);
      const resumeRatio =
        opts?.resumeRatio != null && Number.isFinite(opts.resumeRatio)
          ? Math.min(1, Math.max(0, opts.resumeRatio))
          : null;
      pendingSeekRatioRef.current = resumeRatio;
      const nextUrl = track.audioUrl?.trim() || '';
      narvoTrack(
        playbackEventName('start', track),
        playbackEventProps(track, { resumed: Boolean(resumeRatio && resumeRatio > 0) })
      );
      if (managedBlobUrlRef.current && managedBlobUrlRef.current !== nextUrl) {
        revokeManagedBlobUrl();
      }
      if (nextUrl.startsWith('blob:')) {
        managedBlobUrlRef.current = nextUrl;
      } else {
        managedBlobUrlRef.current = null;
      }
      const na = nextAudioRef.current;
      if (na) {
        delete na.dataset.prefetchFor;
        na.pause();
        na.removeAttribute('src');
        try {
          na.load();
        } catch {
          /* ignore */
        }
      }
      setCurrentTrack(track);
      setProgress(resumeRatio != null ? resumeRatio * 100 : 0);
      const audio = audioRef.current;
      if (nextUrl && audio) {
        const gen = ++playTrackGenerationRef.current;
        audio.playbackRate = playbackRate;
        const targetVol = volume;
        const skipFadeIn = resumeRatio != null && resumeRatio > 0;
        if (skipFadeIn) {
          fadingInRef.current = false;
          audio.volume = targetVol;
        } else {
          fadingInRef.current = true;
          audio.volume = 0;
        }
        audio.src = nextUrl;
        void audio.play().catch(() => {
          fadingInRef.current = false;
          setIsPlaying(false);
        });
        if (!skipFadeIn) {
          const start = performance.now();
          const step = () => {
            if (playTrackGenerationRef.current !== gen || audioRef.current !== audio) {
              return;
            }
            const t = (performance.now() - start) / PLAY_FADE_IN_MS;
            if (t >= 1) {
              if (playTrackGenerationRef.current === gen && audioRef.current === audio) {
                audio.volume = targetVol;
              }
              fadingInRef.current = false;
              return;
            }
            audio.volume = targetVol * t;
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      } else {
        fadingInRef.current = false;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setIsPlaying(true);
      }
    },
    [revokeManagedBlobUrl, playbackRate, volume]
  );

  const requestMediaPlay = useCallback(() => {
    prefetchAudioPlayerChunk();
    const tr = currentTrackRef.current;
    if (!tr) return;
    const audio = audioRef.current;
    if (tr.audioUrl && audio?.src) {
      if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
      return;
    }
    setIsPlaying(true);
  }, []);

  const requestMediaPause = useCallback(() => {
    const tr = currentTrackRef.current;
    if (!tr) return;
    const audio = audioRef.current;
    if (tr.audioUrl && audio) {
      audio.pause();
      return;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const enqueueTrack = useCallback((track: Track) => {
    setPlayQueue((q) => {
      const cur = currentTrackRef.current;
      if (cur?.id === track.id) return q;
      if (q.some((t) => t.id === track.id)) return q;
      if (!cur) {
        queueMicrotask(() => {
          if (!currentTrackRef.current) {
            playTrackRef.current(track);
          } else {
            setPlayQueue((inner) => {
              if (inner.some((t) => t.id === track.id)) return inner;
              return [...inner, track];
            });
          }
        });
        return q;
      }
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
    prefetchAudioPlayerChunk();
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
        const t = r * audio.duration;
        audio.currentTime = t;
        setProgress(r * 100);
        setAudioTimes({ cur: t, dur: audio.duration });
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
    if (track && !track.audioUrl) {
      setProgress(r * 100);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => requestMediaPlay());
    ms.setActionHandler('pause', () => requestMediaPause());
    ms.setActionHandler('seekbackward', () => skipBackward());
    ms.setActionHandler('seekforward', () => skipForward());
    ms.setActionHandler('nexttrack', () => skipToNext());
    ms.setActionHandler('seekto', (detail) => {
      const el = audioRef.current;
      const tr = currentTrackRef.current;
      if (!tr?.audioUrl || !el) return;
      const d = el.duration;
      if (!d || !Number.isFinite(d) || d <= 0) return;
      const t = detail.seekTime ?? 0;
      el.currentTime = Math.min(Math.max(0, t), d);
    });
    return () => {
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'seekbackward',
        'seekforward',
        'nexttrack',
        'seekto',
      ];
      for (const a of actions) {
        try {
          ms.setActionHandler(a, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [requestMediaPlay, requestMediaPause, skipBackward, skipForward, skipToNext]);

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
    const na = nextAudioRef.current;
    if (na) {
      delete na.dataset.prefetchFor;
      na.pause();
      na.removeAttribute('src');
      try {
        na.load();
      } catch {
        /* ignore */
      }
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
        playbackRate,
        setPlaybackRate,
        volume,
        setVolume,
        currentTimeSec,
        durationSec,
        playTrack,
        enqueueTrack,
        removeFromQueueAt,
        clearPlayQueue,
        resumeFromPersisted,
        togglePlayPause,
        skipForward,
        skipBackward,
        skipToNext,
        seekToRatio,
        closePlayer,
        dismissBriefingHandoff,
      }}
    >
      {/* In-document media element: playsInline helps iOS/PWA keep audio alive when the tab is backgrounded. */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        className="sr-only"
        aria-hidden
      />
      <audio
        ref={nextAudioRef}
        playsInline
        preload="none"
        className="sr-only"
        aria-hidden
      />
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
