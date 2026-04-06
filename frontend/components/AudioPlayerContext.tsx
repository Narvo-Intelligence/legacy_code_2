'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

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
  closePlayer: () => void;
  dismissBriefingHandoff: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const SKIP_SEC = 10;

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
      if (audio.duration && Number.isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      fireBriefingHandoffIfNeeded();
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [fireBriefingHandoffIfNeeded]);

  const dismissBriefingHandoff = useCallback(() => setBriefingHandoff(null), []);

  const playTrack = useCallback(
    (track: Track) => {
      setBriefingHandoff(null);
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

  const closePlayer = useCallback(() => {
    setBriefingHandoff(null);
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
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          const t = currentTrackRef.current;
          if (isBriefingTrack(t)) {
            setBriefingHandoff({ title: (t?.title || 'Morning Briefing').trim() });
          }
          return 0;
        }
        return p + 1;
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
