'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface Track {
  id: string;
  title: string;
  source: string;
  audioUrl?: string;
  category?: string;
}

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    // Mock playback logic for now
    if (audioRef.current) {
      // In a real app, set src and play
      // audioRef.current.src = track.audioUrl || '';
      // audioRef.current.play();
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // audioRef.current.play();
      }
    }
  };

  const skipForward = () => {
    // Mock skip
    setProgress(Math.min(progress + 10, 100));
  };

  const skipBackward = () => {
    // Mock skip
    setProgress(Math.max(progress - 10, 0));
  };

  const closePlayer = () => {
    setCurrentTrack(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Mock progress simulation since we don't have real audio files
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return p + 1; // 1% per second for mock
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  return (
    <AudioPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      progress,
      playTrack,
      togglePlayPause,
      skipForward,
      skipBackward,
      closePlayer
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
