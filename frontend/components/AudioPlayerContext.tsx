'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

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

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  /** After a briefing track finishes (real audio or mock progress) — subtle next-step handoff. */
  briefingHandoff: BriefingHandoff | null;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  /**
   * Seek to a fraction of the current item (0–1). Real audio uses HTMLMediaElement duration;
   * mock briefing (no URL) maps to the synthetic progress bar (~12 min span).
   */
  seekToRatio: (ratio: number) => void;
  closePlayer: () => void;
  dismissBriefingHandoff: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const SKIP_SEC = 10;
/** Mock briefing timeline length when no audio URL (matches dashboard meta fallback). */
const MOCK_BRIEFING_DURATION_SEC = 12 * 60;

function isBriefingTrack(t: Track | null): boolean {
  return Boolean(t && t.category?.toUpperCase() === 'BRIEFING');
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [briefingHandoff, setBriefingHandoff] = useState<BriefingHandoff | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const pendingSeekRatioRef = useRef<number | null>(null);
  const usingRealAudio = Boolean(currentTrack?.audioUrl);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const fireBriefingHandoffIfNeeded = useCallback(() => {
    const t = currentTrackRef.current;
    if (isBriefingTrack(t)) {
      setBriefingHandoff({ title: (t?.title || 'Morning Briefing').trim() });
    }
  }, []);

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
      queueMicrotask(() => notifyPlaybackEnded());
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
    const onPause = () => setIsPlaying(false);

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
  }, [fireBriefingHandoffIfNeeded]);

  const dismissBriefingHandoff = useCallback(() => setBriefingHandoff(null), []);

  const playTrack = useCallback(
    (track: Track) => {
      setBriefingHandoff(null);
      pendingSeekRatioRef.current = null;
      setCurrentTrack(track);
      setProgress(0);
      const audio = audioRef.current;
      if (track.audioUrl && audio) {
        audio.src = track.audioUrl;
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
    []
  );

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

  const seekToRatio = useCallback(
    (ratio: number) => {
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
    },
    []
  );

  const closePlayer = useCallback(() => {
    setBriefingHandoff(null);
    pendingSeekRatioRef.current = null;
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }, []);

  useEffect(() => {
    if (usingRealAudio || !isPlaying || !currentTrack) return;
    const stepPct = 100 / MOCK_BRIEFING_DURATION_SEC;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          const t = currentTrackRef.current;
          if (isBriefingTrack(t)) {
            setBriefingHandoff({ title: (t?.title || 'Morning Briefing').trim() });
          }
          queueMicrotask(() => notifyPlaybackEnded());
          return 0;
        }
        return p + stepPct;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, usingRealAudio]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        briefingHandoff,
        playTrack,
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
