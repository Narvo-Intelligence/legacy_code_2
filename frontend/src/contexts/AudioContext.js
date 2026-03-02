import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';

const AudioContext = createContext({});

export const useAudio = () => useContext(AudioContext);

// Wake Lock helpers (keep screen on during playback)
let wakeLockSentinel = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
  } catch (e) { /* denied */ }
}
async function releaseWakeLock() {
  if (wakeLockSentinel) { await wakeLockSentinel.release(); wakeLockSentinel = null; }
}

export const AudioProvider = ({ children }) => {
  const { user } = useAuth();
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playbackMode, setPlaybackMode] = useState('tts'); // 'tts' | 'radio'
  const [radioStation, setRadioStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [broadcastLanguage, setBroadcastLanguage] = useState('en');
  const [voiceModel, setVoiceModel] = useState('emma');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Fetch user's voice + language preference
  const fetchLanguagePreference = useCallback(async () => {
    const userId = user?.id || 'guest';
    try {
      // Check localStorage cache first for instant load
      try {
        const cached = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}');
        if (cached.voice_model) setVoiceModel(cached.voice_model);
        if (cached.broadcast_language) setBroadcastLanguage(cached.broadcast_language);
      } catch { /* ignore */ }

      const response = await api.get(`api/settings/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.broadcast_language) {
          setBroadcastLanguage(data.broadcast_language);
        }
        if (data.voice_model) {
          setVoiceModel(data.voice_model);
        }
        // Cache for next load
        try {
          const existing = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}');
          localStorage.setItem('narvo_settings_cache', JSON.stringify({
            ...existing,
            voice_model: data.voice_model || existing.voice_model,
            broadcast_language: data.broadcast_language || existing.broadcast_language,
          }));
        } catch { /* ignore */ }
        setSettingsLoaded(true);
        return data.broadcast_language || 'en';
      }
    } catch (err) {
      console.log('[AudioContext] Using default voice/language');
    }
    setSettingsLoaded(true);
    return 'en';
  }, [user?.id]);

  // Re-fetch when user changes (login/logout/guest switch)
  useEffect(() => {
    fetchLanguagePreference();
  }, [fetchLanguagePreference]);

  // Update Media Session metadata for lock screen/background playback
  const updateMediaSession = useCallback((track) => {
    if (!('mediaSession' in navigator) || !track) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Narvo News',
      artist: track.source || 'Narvo',
      album: 'Narvo Broadcast',
      artwork: [
        { src: track.image_url || '/narvo-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: track.image_url || '/narvo-icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });
  }, []);

  // Setup Media Session action handlers for background control
  const setupMediaSessionHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    
    navigator.mediaSession.setActionHandler('stop', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime);
      }
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || 0,
          audioRef.current.currentTime + skipTime
        );
      }
    });
    // previoustrack/nexttrack are set by the useEffect that depends on queue/queueIndex
  }, []);

  useEffect(() => {
    const fadeIntervalId = fadeIntervalRef.current;
    const audio = new Audio();
    audio.volume = volume;
    // Enable background playback
    audio.preload = 'auto';
    audioRef.current = audio;
    
    // Setup Media Session handlers for background control
    setupMediaSessionHandlers();
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      // Update Media Session position state
      if ('mediaSession' in navigator && audio.duration) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      }
    });
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      // Auto-play next with smooth transition using refs for fresh state
      if (autoPlayRef.current && queueRef.current.length > 0) {
        const nextIdx = queueIndexRef.current + 1;
        if (nextIdx < queueRef.current.length) {
          const nextTrack = queueRef.current[nextIdx];
          setQueueIndex(nextIdx);
          queueIndexRef.current = nextIdx;
          // Small delay for smooth transition
          setTimeout(() => {
            playTrack(nextTrack, true);
          }, 300);
        }
      }
    });
    audio.addEventListener('play', () => {
      setIsPlaying(true);
      requestWakeLock(); // Keep screen on during playback
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });
    audio.addEventListener('pause', () => {
      setIsPlaying(false);
      releaseWakeLock(); // Release screen lock
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });
    audio.addEventListener('error', (e) => {
      // Only log errors when there's actually a source loaded
      if (audio.src && audio.src !== window.location.href) {
        console.error('[AudioContext] Audio error:', e.target?.error?.message || 'Unknown error');
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsLoading(false);
      }
    });

    return () => {
      if (fadeIntervalId) clearInterval(fadeIntervalId);
      audio.pause();
      audio.src = '';
      releaseWakeLock();
    };
    // eslint-disable-next-line
  }, []);

  // Refs for queue state (used in event handlers to avoid stale closures)
  const queueRef = useRef([]);
  const queueIndexRef = useRef(-1);
  const autoPlayRef = useRef(true);
  const playTrackRef = useRef(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // Volume control
  const setVolume = useCallback((newVolume) => {
    const vol = Math.max(0, Math.min(1, newVolume));
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : vol;
    }
  }, [isMuted]);

  // Playback speed control
  const setPlaybackRate = useCallback((rate) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : volume;
      }
      return newMuted;
    });
  }, [volume]);

  // Generate TTS audio for a track (with translation if needed)
  const generateTTS = useCallback(async (track) => {
    const textToSpeak = track.narrative || track.summary || track.title;
    if (!textToSpeak) return null;
    
    try {
      const response = await api.post('api/tts/generate', {
        text: textToSpeak.slice(0, 4000),
        voice_id: voiceModel,
        language: broadcastLanguage
      });
      
      if (!response.ok) throw new Error('TTS generation failed');
      
      const data = await response.json();
      return data.audio_url;
    } catch (err) {
      console.error('TTS error:', err);
      return null;
    }
  }, [broadcastLanguage, voiceModel]);

  // Queue management
  const addToQueue = useCallback((track) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      const newQueue = [...prev, track];

      // Auto-play first item if nothing is currently playing
      if (prev.length === 0 && !audioRef.current?.src) {
        setQueueIndex(0);
        queueIndexRef.current = 0;
        setTimeout(() => playTrackRef.current?.(track, true), 50);
      }

      return newQueue;
    });
  }, []);

  const playRadioStation = useCallback(async (station) => {
    if (!station) return;
    const audio = audioRef.current;
    if (!audio) return;

    setError(null);
    setIsLoading(false);

    const streamUrl = station.url_resolved || station.url;
    const track = {
      id: `radio:${station.id}`,
      type: 'radio',
      title: station.name || 'Live Radio',
      source: station.country ? `Radio · ${station.country}` : 'Narvo Radio',
      image_url: '/narvo-icon-512.png',
      station,
      url: streamUrl,
      is_live: true,
    };

    // Same station toggles play/pause
    if (currentTrack?.type === 'radio' && currentTrack?.station?.id === station.id && audio.src) {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch { /* ignore */ }

    audio.src = streamUrl;
    audio.preload = 'auto';
    audio.playbackRate = 1;

    try {
      await audio.play();
    } catch (err) {
      setIsPlaying(false);
      if (err?.name === 'NotAllowedError') {
        console.log('[AudioContext] Autoplay blocked - waiting for user interaction');
      } else {
        console.error('[AudioContext] Radio play error:', err);
        setError('Failed to play radio');
      }
      return;
    }

    // Commit state only after successful play (consistent with playTrack)
    setPlaybackMode('radio');
    setRadioStation(station);
    setCurrentTrack(track);
    setDuration(0);
    setCurrentTime(0);
    updateMediaSession(track);
    setupMediaSessionHandlers();

    // Record to listening history (same as playTrack for analytics/recommendations)
    try {
      const userId = user?.id || 'guest';
      api.post('api/listening-history', {
        user_id: userId,
        track_id: track.id || '',
        title: track.title || 'Unknown',
        source: track.source || '',
        category: 'Radio',
      }).catch(() => {});
    } catch { /* ignore */ }
  }, [currentTrack?.type, currentTrack?.station?.id, setupMediaSessionHandlers, updateMediaSession, user?.id]);

  const removeFromQueue = useCallback((trackId) => {
    setQueue(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  // Reorder queue items (drag-and-drop support)
  const reorderQueue = useCallback((fromIndex, toIndex) => {
    // Don't allow reordering the currently playing item
    if (fromIndex === queueIndex) return;
    
    setQueue(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      
      // Update queueIndex if needed
      if (fromIndex < queueIndex && toIndex >= queueIndex) {
        setQueueIndex(qi => qi - 1);
      } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
        setQueueIndex(qi => qi + 1);
      }
      
      return updated;
    });
  }, [queueIndex]);

  const playTrack = useCallback(async (track, forcePlay = false) => {
    if (!track) return;
    
    setError(null);
    setPlaybackMode('tts');
    setRadioStation(null);
    const audio = audioRef.current;
    
    // Get existing URL or generate TTS
    let trackUrl = track.url || track.audio_url;
    
    // If same track, toggle play/pause
    if (currentTrack?.id === track.id && trackUrl) {
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      return;
    }
    
    // If something is playing and not forcing, add to queue instead
    if (isPlaying && !forcePlay && currentTrack) {
      addToQueue(track);
      return { queued: true };
    }
    
    // If no audio URL, generate TTS
    if (!trackUrl) {
      setIsLoading(true);
      setCurrentTrack({ ...track, title: track.title, source: track.source });
      
      trackUrl = await generateTTS(track);
      
      if (!trackUrl) {
        setError('Failed to generate audio');
        setIsLoading(false);
        return;
      }
    }
    
    // Play the audio
    audio.src = trackUrl;
    
    // Attempt to play - may fail due to autoplay policy or other errors
    try {
      await audio.play();
    } catch (err) {
      setIsPlaying(false);
      if (err?.name === 'NotAllowedError') {
        console.log('[AudioContext] Autoplay blocked - waiting for user interaction');
      } else {
        console.error('[AudioContext] Play error:', err);
        setError('Failed to play audio');
      }
      setIsLoading(false);
      return;
    }
    
    const finalTrack = { ...track, url: trackUrl };
    setCurrentTrack(finalTrack);
    setDuration(0);
    setCurrentTime(0);
    setIsLoading(false);
    
    // Record to listening history
    try {
      const userId = user?.id || 'guest';
      api.post('api/listening-history', {
        user_id: userId,
        track_id: track.id || '',
        title: track.title || 'Unknown',
        source: track.source || '',
        category: track.category || '',
      }).catch(() => {});
    } catch { /* ignore */ }
    
    // Update Media Session for background/lock screen controls; reclaim when switching from radio to TTS
    updateMediaSession(finalTrack);
    setupMediaSessionHandlers();
  }, [currentTrack, isPlaying, generateTTS, addToQueue, updateMediaSession, setupMediaSessionHandlers, user?.id]);

  // Force play - always plays immediately
  const forcePlayTrack = useCallback(async (track) => {
    return playTrack(track, true);
  }, [playTrack]);

  // Keep playTrack ref current for queue auto-play
  useEffect(() => { playTrackRef.current = playTrack; }, [playTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((time) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const stopTrack = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = '';
    setCurrentTrack(null);
    setPlaybackMode('tts');
    setRadioStation(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  const playNext = useCallback(async () => {
    if (queue.length === 0) return;
    const nextIdx = queueIndex + 1;
    if (nextIdx < queue.length) {
      const next = queue[nextIdx];
      setQueueIndex(nextIdx);
      await playTrack(next, true); // Force play
    }
  }, [queue, queueIndex, playTrack]);

  const playPrev = useCallback(async () => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      const prev = queue[prevIdx];
      setQueueIndex(prevIdx);
      await playTrack(prev, true); // Force play
    }
  }, [queue, queueIndex, playTrack]);

  // Update Media Session handlers when queue changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('previoustrack', queue.length > 0 && queueIndex > 0 
      ? () => playPrev() 
      : null
    );
    
    navigator.mediaSession.setActionHandler('nexttrack', queue.length > 0 && queueIndex < queue.length - 1 
      ? () => playNext() 
      : null
    );
  }, [queue, queueIndex, playNext, playPrev]);

  const playFromQueue = useCallback(async (index) => {
    if (index >= 0 && index < queue.length) {
      const track = queue[index];
      setQueueIndex(index);
      await playTrack(track, true); // Force play
    }
  }, [queue, playTrack]);

  // Play a track and set it as the current in queue context
  const playTrackAndQueue = useCallback(async (track, trackList) => {
    if (trackList && trackList.length > 0) {
      setQueue(trackList);
      const idx = trackList.findIndex(t => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }
    await playTrack(track, true); // Force play
  }, [playTrack]);

  return (
    <AudioContext.Provider value={{
      currentTrack,
      playbackMode,
      radioStation,
      isPlaying,
      isLoading,
      isTransitioning,
      currentTime,
      duration,
      error,
      volume,
      isMuted,
      autoPlay,
      broadcastLanguage,
      voiceModel,
      playbackRate,
      settingsLoaded,
      setVolume,
      toggleMute,
      setAutoPlay,
      setBroadcastLanguage,
      setVoiceModel,
      setPlaybackRate,
      refreshLanguagePreference: fetchLanguagePreference,
      playTrack,
      forcePlayTrack,
      playTrackAndQueue,
      playRadioStation,
      togglePlay,
      seek,
      stopTrack,
      // Queue
      queue,
      queueIndex,
      addToQueue,
      removeFromQueue,
      clearQueue,
      playNext,
      playPrev,
      playFromQueue,
      reorderQueue,
    }}>
      {children}
    </AudioContext.Provider>
  );
};
