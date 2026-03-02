import React from 'react';
import { useAudio } from '../contexts/AudioContext';

const AudioPlayer = () => {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, seek, isLoading } = useAudio();
  if (!currentTrack) return null;

  const formatTime = (s) => (s == null || isNaN(s)) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const safeDuration = typeof duration === 'number' && isFinite(duration) && duration > 0 ? duration : 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-forest bg-background-dark z-50" data-testid="audio-player">
      <div className="flex items-center gap-4 px-6 py-3">
        <div className="flex-1 min-w-0">
          <span className="mono-ui text-[12px] text-forest block truncate">{currentTrack.source || 'NARVO'}</span>
          <span className="font-display text-sm text-content block truncate">{currentTrack.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => seek(Math.max(0, currentTime - 10))} className="text-forest hover:text-primary" data-testid="audio-rewind-btn">
            <svg className="w-5 h-5" viewBox="0 0 256 256" fill="currentColor">
              <path d="M199.81,34a16,16,0,0,0-16.24.43L64,109.23V40a8,8,0,0,0-16,0V216a8,8,0,0,0,16,0V146.77l119.57,74.78A15.95,15.95,0,0,0,208,208.12V47.88A15.86,15.86,0,0,0,199.81,34Z"/>
            </svg>
          </button>
          <button onClick={togglePlay} className="w-10 h-10 bg-primary flex items-center justify-center" disabled={isLoading} data-testid="audio-play-toggle">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-background-dark border-t-transparent animate-spin" />
            ) : isPlaying ? (
              <svg className="w-5 h-5 text-background-dark" viewBox="0 0 256 256" fill="currentColor">
                <path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-background-dark" viewBox="0 0 256 256" fill="currentColor">
                <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"/>
              </svg>
            )}
          </button>
          <button onClick={() => seek(Math.min(safeDuration, currentTime + 10))} className="text-forest hover:text-primary" data-testid="audio-forward-btn">
            <svg className="w-5 h-5" viewBox="0 0 256 256" fill="currentColor">
              <path d="M208,40V216a8,8,0,0,1-16,0V146.77L72.43,221.55A15.95,15.95,0,0,1,48,208.12V47.88A15.86,15.86,0,0,1,56.19,34a16,16,0,0,1,16.24.43L192,109.23V40a8,8,0,0,1,16,0Z"/>
            </svg>
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 w-48">
          <span className="mono-ui text-[12px] text-forest">{formatTime(currentTime)}</span>
          <input type="range" min={0} max={safeDuration} value={Math.min(currentTime, safeDuration)} onChange={(e) => seek(Number(e.target.value))} className="flex-1" data-testid="audio-seek" aria-label="Playback position" />
          <span className="mono-ui text-[12px] text-forest">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
