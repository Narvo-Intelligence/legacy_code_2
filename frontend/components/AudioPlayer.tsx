'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, X, Volume2 } from 'lucide-react';
import { useAudioPlayer } from './AudioPlayerContext';

export function AudioPlayer() {
  const { currentTrack, isPlaying, progress, togglePlayPause, skipForward, skipBackward, closePlayer } = useAudioPlayer();

  const getBackgroundColor = (category?: string) => {
    switch (category?.toUpperCase()) {
      case 'POLITICS': return 'bg-narvo-ink dark:bg-slate-800';
      case 'TECH': return 'bg-slate-900 dark:bg-slate-800';
      case 'BUSINESS': return 'bg-emerald-950 dark:bg-emerald-900';
      case 'SPORTS': return 'bg-orange-950 dark:bg-orange-900';
      default: return 'bg-narvo-ink dark:bg-zinc-800';
    }
  };

  const bgColor = useMemo(() => getBackgroundColor(currentTrack?.category), [currentTrack?.category]);

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl text-white rounded-3xl p-4 shadow-2xl z-50 flex flex-col gap-2 transition-colors duration-500 ${bgColor}`}
          role="region"
          aria-label="Audio Player"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <Volume2 size={20} />
              </div>
              <div className="truncate">
                <h4 className="font-bold text-sm truncate" aria-live="polite">{currentTrack.title}</h4>
                <p className="text-xs opacity-60 truncate">{currentTrack.source}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button 
                onClick={skipBackward} 
                className="hover:text-narvo-teal transition-colors"
                aria-label="Skip backward 10 seconds"
              >
                <SkipBack size={20} />
              </button>
              <button 
                onClick={togglePlayPause}
                className={`w-12 h-12 rounded-full bg-narvo-vermilion text-white flex items-center justify-center transition-transform active:scale-[0.96] ${isPlaying ? 'shadow-[0_0_15px_rgba(255,87,34,0.5)]' : ''}`}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              <button 
                onClick={skipForward} 
                className="hover:text-narvo-teal transition-colors"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward size={20} />
              </button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <button 
                onClick={closePlayer} 
                className="hover:text-narvo-vermilion transition-colors"
                aria-label="Close audio player"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div 
            className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div 
              className="h-full bg-narvo-teal"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
