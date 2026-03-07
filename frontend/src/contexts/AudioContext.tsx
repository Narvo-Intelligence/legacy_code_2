import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import type { AudioTrack } from '../types/audio';

interface RadioStation {
  id: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  country?: string;
  [key: string]: unknown;
}

interface AudioContextValue {
  currentTrack: (AudioTrack & { url?: string }) | null;
  playbackMode: 'tts' | 'radio';
  radioStation: RadioStation | null;
  isPlaying: boolean;
  isLoading: boolean;
  isTransitioning: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  volume: number;
  isMuted: boolean;
  autoPlay: boolean;
  broadcastLanguage: string;
  voiceModel: string;
  playbackRate: number;
  settingsLoaded: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setAutoPlay: (v: boolean) => void;
  setBroadcastLanguage: (v: string) => void;
  setVoiceModel: (v: string) => void;
  setPlaybackRate: (rate: number) => void;
  refreshLanguagePreference: () => Promise<string>;
  playTrack: (
    track: AudioTrack,
    forcePlay?: boolean,
    options?: { fromQueue?: boolean }
  ) => Promise<{ queued?: boolean } | void>;
  forcePlayTrack: (track: AudioTrack) => Promise<{ queued?: boolean } | void>;
  playTrackAndQueue: (track: AudioTrack, trackList?: AudioTrack[]) => Promise<void>;
  playRadioStation: (station: RadioStation) => Promise<void>;
  togglePlay: () => void;
  seek: (time: number) => void;
  stopTrack: () => void;
  queue: AudioTrack[];
  queueIndex: number;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export const useAudio = (): AudioContextValue => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
};

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener?: (type: string, cb: () => void) => void;
}
let wakeLockSentinel: WakeLockSentinel | null = null;
async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLockSentinel = (await navigator.wakeLock.request('screen')) as WakeLockSentinel;
    wakeLockSentinel?.addEventListener?.('release', () => {
      wakeLockSentinel = null;
    });
  } catch {
    /* denied */
  }
}
async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    await wakeLockSentinel.release();
    wakeLockSentinel = null;
  }
}

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackRef = useRef<(AudioTrack & { url?: string }) | null>(null);
  const savedPlaybackRateRef = useRef<number>(1);
  const [currentTrack, setCurrentTrack] = useState<(AudioTrack & { url?: string }) | null>(null);
  const [playbackMode, setPlaybackMode] = useState<'tts' | 'radio'>('tts');
  const [radioStation, setRadioStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [broadcastLanguage, setBroadcastLanguage] = useState('en');
  const [voiceModel, setVoiceModel] = useState('emma');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const fetchLanguagePreference = useCallback(async (): Promise<string> => {
    const userId = user?.id ?? 'guest';
    try {
      try {
        const cached = JSON.parse(localStorage.getItem('narvo_settings_cache') ?? '{}') as Record<string, string>;
        if (cached.voice_model) setVoiceModel(cached.voice_model);
        if (cached.broadcast_language) setBroadcastLanguage(cached.broadcast_language);
      } catch {
        /* ignore */
      }
      const response = await api.get(`api/settings/${userId}`);
      if (response.ok) {
        const data = (await response.json()) as { broadcast_language?: string; voice_model?: string };
        if (data.broadcast_language) setBroadcastLanguage(data.broadcast_language);
        if (data.voice_model) setVoiceModel(data.voice_model);
        try {
          const existing = JSON.parse(localStorage.getItem('narvo_settings_cache') ?? '{}') as Record<string, string>;
          localStorage.setItem(
            'narvo_settings_cache',
            JSON.stringify({
              ...existing,
              voice_model: data.voice_model ?? existing.voice_model,
              broadcast_language: data.broadcast_language ?? existing.broadcast_language,
            })
          );
        } catch {
          /* ignore */
        }
        setSettingsLoaded(true);
        return data.broadcast_language ?? 'en';
      }
    } catch {
      console.log('[AudioContext] Using default voice/language');
    }
    setSettingsLoaded(true);
    return 'en';
  }, [user?.id]);

  useEffect(() => {
    fetchLanguagePreference();
  }, [fetchLanguagePreference]);

  const updateMediaSession = useCallback((track: (AudioTrack & { url?: string }) | null) => {
    if (!('mediaSession' in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title ?? 'Narvo News',
      artist: track.source ?? 'Narvo',
      album: 'Narvo Broadcast',
      artwork: [
        { src: track.image_url ?? '/narvo-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: track.image_url ?? '/narvo-icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }, []);

  const setupMediaSessionHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('stop', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = (details as { seekOffset?: number }).seekOffset ?? 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = (details as { seekOffset?: number }).seekOffset ?? 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || 0,
          audioRef.current.currentTime + skipTime
        );
      }
    });
  }, []);

  const queueRef = useRef<AudioTrack[]>([]);
  const queueIndexRef = useRef(-1);
  const autoPlayRef = useRef(true);
  const playTrackRef = useRef<AudioContextValue['playTrack'] | null>(null);

  useEffect(() => {
    const fadeIntervalId = fadeIntervalRef.current;
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;
    setupMediaSessionHandlers();

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      if ('mediaSession' in navigator && audio.duration && isFinite(audio.duration)) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime,
        });
      }
    });
    const updateDuration = () => {
      const d = audio.duration;
      if (typeof d === 'number' && isFinite(d) && d > 0) setDuration(d);
    };
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadeddata', updateDuration);
    audio.addEventListener('ended', () => {
      if (currentTrackRef.current?.source === 'VOICE_PREVIEW' && audioRef.current) {
        const restore = savedPlaybackRateRef.current ?? 1;
        audioRef.current.playbackRate = restore;
        setPlaybackRateState(restore);
      }
      currentTrackRef.current = null;
      setIsPlaying(false);
      if (autoPlayRef.current && queueRef.current.length > 0) {
        const nextIdx = queueIndexRef.current + 1;
        if (nextIdx < queueRef.current.length) {
          const nextTrack = queueRef.current[nextIdx];
          setQueueIndex(nextIdx);
          queueIndexRef.current = nextIdx;
          setTimeout(() => playTrackRef.current?.(nextTrack, true, { fromQueue: true }), 300);
        }
      }
    });
    audio.addEventListener('play', () => {
      setIsPlaying(true);
      requestWakeLock();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    audio.addEventListener('pause', () => {
      setIsPlaying(false);
      releaseWakeLock();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    audio.addEventListener('error', (e) => {
      if (audio.src && audio.src !== window.location.href) {
        console.error('[AudioContext] Audio error:', (e.target as HTMLAudioElement)?.error?.message ?? 'Unknown error');
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
    // volume only used for initial audio.volume; updates go through setVolume/audioRef.current.volume
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupMediaSessionHandlers]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  const setVolume = useCallback(
    (newVolume: number) => {
      const vol = Math.max(0, Math.min(1, newVolume));
      setVolumeState(vol);
      if (audioRef.current) audioRef.current.volume = isMuted ? 0 : vol;
    },
    [isMuted]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (audioRef.current) audioRef.current.volume = newMuted ? 0 : volume;
      return newMuted;
    });
  }, [volume]);

  const generateTTS = useCallback(
    async (track: AudioTrack): Promise<string | null> => {
      const textToSpeak = track.narrative ?? track.summary ?? track.title;
      if (!textToSpeak) return null;
      try {
        const response = await api.post('api/tts/generate', {
          text: String(textToSpeak).slice(0, 4000),
          voice_id: voiceModel,
          language: broadcastLanguage,
        });
        if (!response.ok) throw new Error('TTS generation failed');
        const data = (await response.json()) as { audio_url?: string };
        return data.audio_url ?? null;
      } catch (err) {
        console.error('TTS error:', err);
        return null;
      }
    },
    [broadcastLanguage, voiceModel]
  );

  const addToQueue = useCallback((track: AudioTrack) => {
    setQueue((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      const newQueue = [...prev, track];
      if (prev.length === 0 && !audioRef.current?.src) {
        setQueueIndex(0);
        queueIndexRef.current = 0;
        setTimeout(() => playTrackRef.current?.(track, true), 50);
      }
      return newQueue;
    });
  }, []);

  const playRadioStation = useCallback(
    async (station: RadioStation) => {
      if (!station) return;
      const audio = audioRef.current;
      if (!audio) return;
      setError(null);
      setIsLoading(false);
      const streamUrl = (station.url_resolved ?? station.url) ?? '';
      const track: AudioTrack & { url?: string } = {
        id: `radio:${station.id}`,
        type: 'radio',
        title: station.name ?? 'Live Radio',
        source: station.country ? `Radio · ${station.country}` : 'Narvo Radio',
        image_url: '/narvo-icon-512.png',
        station,
        url: streamUrl,
        is_live: true,
      };
      if (
        currentTrack?.type === 'radio' &&
        (currentTrack as AudioTrack & { station?: RadioStation }).station?.id === station.id &&
        audio.src
      ) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
      audio.src = streamUrl;
      audio.preload = 'auto';
      audio.playbackRate = 1;
      try {
        await audio.play();
      } catch (err) {
        setIsPlaying(false);
        if ((err as Error)?.name === 'NotAllowedError') {
          console.log('[AudioContext] Autoplay blocked - waiting for user interaction');
        } else {
          console.error('[AudioContext] Radio play error:', err);
          setError('Failed to play radio');
        }
        return;
      }
      setPlaybackMode('radio');
      setRadioStation(station);
      setCurrentTrack(track);
      setDuration(0);
      setCurrentTime(0);
      updateMediaSession(track);
      setupMediaSessionHandlers();
      try {
        await api.post('api/listening-history', {
          user_id: user?.id ?? 'guest',
          track_id: track.id ?? '',
          title: track.title ?? 'Unknown',
          source: track.source ?? '',
          category: 'Radio',
        });
      } catch {
        /* ignore */
      }
    },
    [currentTrack, setupMediaSessionHandlers, updateMediaSession, user?.id]
  );

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === queueIndex) return;
    setQueue((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      if (fromIndex < queueIndex && toIndex >= queueIndex) setQueueIndex((qi) => qi - 1);
      else if (fromIndex > queueIndex && toIndex <= queueIndex) setQueueIndex((qi) => qi + 1);
      return updated;
    });
  }, [queueIndex]);

  const playTrack = useCallback(
    async (
      track: AudioTrack,
      forcePlay = false,
      options: { fromQueue?: boolean } = {}
    ): Promise<{ queued?: boolean } | void> => {
      if (!track) return;
      setError(null);
      setPlaybackMode('tts');
      setRadioStation(null);
      const audio = audioRef.current;
      const fromQueue = options.fromQueue === true;

      let trackUrl: string | undefined = track.url ?? track.audio_url;
      if (!trackUrl && track.id) {
        const cached = await getCachedAudio(track.id);
        if (cached?.audio_url) trackUrl = cached.audio_url;
      }

      if (currentTrack?.id === track.id && trackUrl) {
        if (audio?.paused) audio.play().catch(() => {});
        else audio?.pause();
        return;
      }

      if (isPlaying && !forcePlay && currentTrack) {
        addToQueue(track);
        return { queued: true };
      }

      setIsTransitioning(true);

      if (!trackUrl) {
        setIsLoading(true);
        setCurrentTrack({ ...track, title: track.title, source: track.source });
        trackUrl = (await generateTTS(track)) ?? undefined;
        if (!trackUrl) {
          setError('Failed to generate audio');
          setIsLoading(false);
          setIsTransitioning(false);
          return;
        }
        if (track.id && trackUrl) {
          cacheAudio(track.id, trackUrl, {
            title: track.title ?? '',
            source: track.source ?? '',
          }).catch(() => {});
        }
      }

      if (!audio) {
        setIsTransitioning(false);
        return;
      }
      audio.src = trackUrl;

      if (fromQueue) audio.volume = 0;

      try {
        await audio.play();
      } catch (err) {
        setIsPlaying(false);
        if ((err as Error)?.name === 'NotAllowedError') {
          console.log('[AudioContext] Autoplay blocked - waiting for user interaction');
        } else {
          console.error('[AudioContext] Play error:', err);
          setError('Failed to play audio');
        }
        setIsLoading(false);
        setIsTransitioning(false);
        return;
      }

      if (fromQueue) {
        const targetVol = volume;
        const steps = 10;
        const stepMs = 30;
        let i = 0;
        const fadeId = setInterval(() => {
          i += 1;
          if (audioRef.current) {
            audioRef.current.volume = Math.min(targetVol, (targetVol * i) / steps);
          }
          if (i >= steps) clearInterval(fadeId);
        }, stepMs);
      }

      const finalTrack = { ...track, url: trackUrl };
      if (finalTrack.source === 'VOICE_PREVIEW' && audioRef.current) {
        savedPlaybackRateRef.current = audioRef.current.playbackRate || 1;
        audioRef.current.playbackRate = 1.1;
        setPlaybackRateState(1.1);
      } else if (currentTrackRef.current?.source === 'VOICE_PREVIEW' && audioRef.current) {
        const restore = savedPlaybackRateRef.current ?? 1;
        audioRef.current.playbackRate = restore;
        setPlaybackRateState(restore);
      }
      currentTrackRef.current = finalTrack;
      setCurrentTrack(finalTrack);
      setDuration(0);
      setCurrentTime(0);
      setIsLoading(false);
      setIsTransitioning(false);

      try {
        await api.post('api/listening-history', {
          user_id: user?.id ?? 'guest',
          track_id: track.id ?? '',
          title: track.title ?? 'Unknown',
          source: track.source ?? '',
          category: track.category ?? '',
        });
      } catch {
        /* ignore */
      }

      updateMediaSession(finalTrack);
      setupMediaSessionHandlers();
    },
    [
      currentTrack,
      isPlaying,
      generateTTS,
      addToQueue,
      updateMediaSession,
      setupMediaSessionHandlers,
      user?.id,
      volume,
    ]
  );

  const forcePlayTrack = useCallback(
    async (track: AudioTrack) => playTrack(track, true),
    [playTrack]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const stopTrack = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.src = '';
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
      await playTrack(next, true);
    }
  }, [queue, queueIndex, playTrack]);

  const playPrev = useCallback(async () => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      const prev = queue[prevIdx];
      setQueueIndex(prevIdx);
      await playTrack(prev, true);
    }
  }, [queue, queueIndex, playTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler(
      'previoustrack',
      queue.length > 0 && queueIndex > 0 ? () => playPrev() : null
    );
    navigator.mediaSession.setActionHandler(
      'nexttrack',
      queue.length > 0 && queueIndex < queue.length - 1 ? () => playNext() : null
    );
  }, [queue, queueIndex, playNext, playPrev]);

  const playFromQueue = useCallback(
    async (index: number) => {
      if (index >= 0 && index < queue.length) {
        const track = queue[index];
        setQueueIndex(index);
        await playTrack(track, true);
      }
    },
    [queue, playTrack]
  );

  const playTrackAndQueue = useCallback(
    async (track: AudioTrack, trackList?: AudioTrack[]) => {
      if (trackList && trackList.length > 0) {
        setQueue(trackList);
        const idx = trackList.findIndex((t) => t.id === track.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      }
      await playTrack(track, true);
    },
    [playTrack]
  );

  const value: AudioContextValue = {
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
    queue,
    queueIndex,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playNext,
    playPrev,
    playFromQueue,
    reorderQueue,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};
