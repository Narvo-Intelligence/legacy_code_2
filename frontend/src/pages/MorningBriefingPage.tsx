import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play } from '@phosphor-icons/react/Play';
import { Pause } from '@phosphor-icons/react/Pause';
import { Calendar } from '@phosphor-icons/react/Calendar';
import { ArrowClockwise } from '@phosphor-icons/react/ArrowClockwise';
import { Clock } from '@phosphor-icons/react/Clock';
import { Radio } from '@phosphor-icons/react/Radio';
import { CaretRight } from '@phosphor-icons/react/CaretRight';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { TextAlignLeft } from '@phosphor-icons/react/TextAlignLeft';
import { CaretDown } from '@phosphor-icons/react/CaretDown';
import { CaretUp } from '@phosphor-icons/react/CaretUp';
import { SkipForward } from '@phosphor-icons/react/SkipForward';
import { useAudio } from '../contexts/AudioContext';
import Skeleton, { ListSkeleton } from '../components/Skeleton';
import { playBriefingIntro, playBriefingOutro, playSectionDivider } from '../lib/cinematicAudio';
import * as api from '../lib/api';
import logger from '../lib/logger';

interface StorySegment {
  start_char: number;
  length: number;
}

interface BriefingStory {
  id?: string;
  title?: string;
  source?: string;
  category?: string;
  [key: string]: unknown;
}

interface BriefingData {
  id: string;
  title?: string;
  date?: string;
  script?: string;
  audio_url?: string;
  duration_estimate?: string;
  voice_id?: string;
  stories?: BriefingStory[];
  story_segments?: StorySegment[];
}

interface BriefingHistoryItem {
  date: string;
  stories?: BriefingStory[];
  duration_estimate?: string;
}

const splitToSentences = (text: string | undefined): string[] => {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
};

const MorningBriefingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [history, setHistory] = useState<BriefingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { voiceModel, playTrack, forcePlayTrack, seek, currentTrack, isPlaying, isLoading: audioLoading, currentTime: audioCurrentTime, duration: audioDuration } = useAudio();
  const [selectedVoice] = useState(voiceModel || 'emma');
  const [showArchive, setShowArchive] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const audioEndedRef = useRef<{ el: HTMLAudioElement; handler: () => void } | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => briefing?.story_segments ?? [], [briefing?.story_segments]);
  const script = briefing?.script ?? '';
  const totalChars = script.length;
  const [activeStoryIdx, setActiveStoryIdx] = useState(-1);
  const sentences = splitToSentences(script);
  const isCurrentBriefingPlaying = currentTrack?.id === briefing?.id && isPlaying;

  // Segment-based sync: which story is playing (from character-offset ratio × duration)
  useEffect(() => {
    if (!isCurrentBriefingPlaying || !audioDuration || audioDuration <= 0 || !totalChars || segments.length === 0) {
      if (!isCurrentBriefingPlaying) setActiveStoryIdx(-1);
      return;
    }
    const progress = audioCurrentTime / audioDuration;
    const estChar = progress * totalChars;
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      const start = segments[i].start_char;
      const end = start + segments[i].length;
      if (estChar >= start && estChar < end) {
        idx = i;
        break;
      }
    }
    if (idx < 0 && segments.length > 0 && estChar >= segments[segments.length - 1].start_char + segments[segments.length - 1].length) idx = segments.length - 1;
    setActiveStoryIdx(idx);
  }, [audioCurrentTime, audioDuration, isCurrentBriefingPlaying, totalChars, segments]);

  // Fallback: sentence-level highlight when no segments (old briefings)
  const activeSentenceIdx = segments.length > 0 && activeStoryIdx >= 0
    ? -1
    : (isCurrentBriefingPlaying && audioDuration
        ? Math.min(Math.floor((audioCurrentTime / audioDuration) * sentences.length), sentences.length - 1)
        : -1);

  useEffect(() => {
    if (activeStoryIdx < 0 || !transcriptRef.current) return;
    const el = transcriptRef.current.querySelector(`[data-story="${activeStoryIdx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeStoryIdx]);

  useEffect(() => {
    const handler = () => {
      if (sfxEnabled && currentTrack?.source === 'NARVO_BRIEFING') {
        playBriefingOutro().catch((err) => {
          logger.debug('[MorningBriefingPage] Failed to play outro', err);
        });
      }
    };
    const audioEl = document.querySelector('audio');
    if (audioEl) {
      audioEl.addEventListener('ended', handler);
      audioEndedRef.current = { el: audioEl as HTMLAudioElement, handler };
    }
    return () => {
      if (audioEndedRef.current) {
        audioEndedRef.current.el.removeEventListener('ended', audioEndedRef.current.handler);
      }
    };
  }, [sfxEnabled, currentTrack]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Load latest + history only (no auto-generate; cron pre-computes at 5am)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [latestRes, historyRes] = await Promise.all([
        api.get('api/briefing/latest').then(r => (r.ok ? r.json() : null)).catch(() => null),
        api.get('api/briefing/history?limit=10').then(r => r.json()).catch(() => ({ briefings: [] })),
      ]);
      if (cancelled) return;
      const latest = latestRes as BriefingData | null;
      const histData = historyRes as { briefings?: BriefingHistoryItem[] };
      setBriefing(latest ?? null);
      setHistory(histData.briefings ?? []);
      setLoading(false);
      setHistoryLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // Refetch latest on visibility in case cron ran or user generated elsewhere
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      api.get('api/briefing/latest').then(r => (r.ok ? r.json() : null)).then((b: BriefingData | null) => {
        if (b) setBriefing(b);
      }).catch((err) => {
        logger.debug('[MorningBriefingPage] Failed to refresh briefing on visibility', err);
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Push deep-link: ?autoplay=1 → open briefing and start playing
  const autoplayRequested = searchParams.get('autoplay') === '1';
  const autoplayDoneRef = useRef(false);
  useEffect(() => {
    if (!autoplayRequested || autoplayDoneRef.current || !briefing?.audio_url || loading) return;
    autoplayDoneRef.current = true;
    if (sfxEnabled) {
      playBriefingIntro().catch((err) => {
        logger.debug('[MorningBriefingPage] Failed to play intro', err);
      });
    }
    const delay = sfxEnabled ? 1400 : 100;
    const t = setTimeout(() => {
      forcePlayTrack({ id: briefing.id, title: briefing.title, url: briefing.audio_url, source: 'NARVO_BRIEFING' });
    }, delay);
    return () => clearTimeout(t);
  }, [autoplayRequested, briefing?.id, briefing?.title, briefing?.audio_url, loading, sfxEnabled, forcePlayTrack]);

  const generateBriefingData = async (autoPlay: boolean = false) => {
    setBriefingError(null);
    setGenerating(true);
    try {
      const res = await api.get(`api/briefing/generate?voice_id=${selectedVoice}&force_regenerate=true`);
      if (res.ok) {
        const data = await res.json() as BriefingData;
        setBriefing(data);
        const histRes = await api.get('api/briefing/history?limit=10');
        if (histRes.ok) {
          const histData = await histRes.json() as { briefings?: BriefingHistoryItem[] };
          setHistory(histData.briefings || []);
        }
        if (autoPlay === true && data.audio_url) {
          const isSameTrack = currentTrack?.id === data.id;
          if (sfxEnabled && !isSameTrack) {
            try {
              await playBriefingIntro();
            } catch (err) {
              logger.debug('[MorningBriefingPage] Failed to play intro', err);
            }
            await new Promise(r => setTimeout(r, 1400));
          }
          playTrack({ id: data.id, title: data.title, url: data.audio_url, source: 'NARVO_BRIEFING' }, true);
        }
      } else {
        setBriefingError(res.status === 404 ? 'No stories available. Try again later.' : 'Failed to generate briefing. Please try again.');
      }
    } catch (e) {
      console.error('Error generating briefing:', e);
      setBriefingError('Network or server error. Please try again.');
    }
    setGenerating(false);
  };

  const generateAudioOnly = async (autoPlay: boolean = false) => {
    if (!briefing?.script) return;
    setBriefingError(null);
    setGeneratingAudio(true);
    try {
      const res = await api.post('api/briefing/audio', {
        script: briefing.script,
        voice_id: selectedVoice,
        briefing_id: briefing.id ?? undefined,
      });
      if (res.ok) {
        const data = await res.json() as { audio_url: string };
        setBriefing((prev) => (prev ? { ...prev, audio_url: data.audio_url } : null));
        if (autoPlay && data.audio_url) {
          if (sfxEnabled) {
            try {
              await playBriefingIntro();
            } catch (err) {
              logger.debug('[MorningBriefingPage] Failed to play intro', err);
            }
            await new Promise(r => setTimeout(r, 1400));
          }
          playTrack({ id: briefing.id, title: briefing.title, url: data.audio_url, source: 'NARVO_BRIEFING' }, true);
        }
      } else {
        setBriefingError('Failed to generate audio. Try again.');
      }
    } catch (e) {
      console.error('Error generating briefing audio:', e);
      setBriefingError('Failed to generate audio. Please try again.');
    }
    setGeneratingAudio(false);
  };

  const loadHistoricalBriefing = async (date: string) => {
    setLoading(true);
    try {
      const res = await api.get(`api/briefing/${date}`);
      if (res.ok) {
        const data = await res.json() as BriefingData;
        setBriefing(data);
      }
    } catch (e) { console.error('Error loading briefing:', e); }
    setLoading(false);
  };

  const handlePlay = async () => {
    if (!briefing) return;
    if (!briefing.audio_url) {
      if (briefing.script) {
        await generateAudioOnly(true);
      } else {
        await generateBriefingData(true);
      }
      return;
    }
    const isSameTrack = currentTrack?.id === briefing.id;
    if (sfxEnabled && !isSameTrack) {
      try {
        await playBriefingIntro();
      } catch (err) {
        logger.debug('[MorningBriefingPage] Failed to play intro', err);
      }
      await new Promise(r => setTimeout(r, 1400));
    }
    playTrack({ id: briefing.id, title: briefing.title, url: briefing.audio_url, source: 'NARVO_BRIEFING' }, true);
  };

  const handleSectionDivider = useCallback(async () => {
    if (sfxEnabled) {
      try {
        await playSectionDivider();
      } catch (err) {
        logger.debug('[MorningBriefingPage] Failed to play section divider', err);
      }
    }
  }, [sfxEnabled]);

  const handleSkipToStory = useCallback((storyIndex: number) => {
    if (segments.length === 0 || storyIndex < 0 || storyIndex >= segments.length || !audioDuration || totalChars <= 0) return;
    if (currentTrack?.id !== briefing?.id) {
      if (briefing?.audio_url) playTrack({ id: briefing.id, title: briefing.title, url: briefing.audio_url, source: 'NARVO_BRIEFING' }, true);
      return;
    }
    const seg = segments[storyIndex];
    const startTime = (seg.start_char / totalChars) * audioDuration;
    seek(startTime);
  }, [segments, audioDuration, totalChars, currentTrack?.id, briefing?.id, briefing?.audio_url, briefing?.title, playTrack, seek]);

  return (
    <main className="flex-1 flex flex-col bg-background-dark min-w-0 min-h-0 overflow-hidden" data-testid="briefing-page">
      <Helmet>
        <title>Morning Briefing — NARVO</title>
        <meta property="og:title" content="Morning Briefing — NARVO" />
        <meta property="og:description" content="Your personalized daily news briefing, delivered in broadcast format." />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <header className="min-h-[48px] md:h-14 flex items-center justify-between px-4 md:px-8 bg-surface/30 narvo-border-b shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Radio className="w-4 h-4 text-primary shrink-0" />
          <span className="mono-ui text-[11px] md:text-xs text-forest truncate">MODULE: <span className="text-primary">MORNING_BRIEFING</span></span>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => generateBriefingData(false)}
            disabled={generating}
            className="min-h-[48px] min-w-[48px] md:min-h-[48px] md:min-w-0 h-10 md:h-12 px-3 md:px-4 bg-primary text-background-dark mono-ui text-[10px] md:text-[11px] font-bold hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            data-testid="generate-btn"
          >
            <ArrowClockwise className={`w-3.5 h-3.5 shrink-0 ${generating ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{generating ? 'GEN...' : 'NEW'}</span>
          </button>
          <button
            onClick={() => setSfxEnabled(v => !v)}
            className={`min-h-[48px] min-w-[48px] md:min-w-0 h-10 md:h-12 px-3 narvo-border mono-ui text-[10px] md:text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${sfxEnabled ? 'bg-primary/10 border-primary text-primary' : 'text-forest hover:text-content'}`}
            data-testid="sfx-toggle"
          >
            <SpeakerHigh weight={sfxEnabled ? 'fill' : 'regular'} className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">SFX</span>
          </button>
        </div>
      </header>

      <button
        onClick={() => setShowArchive(v => !v)}
        className="lg:hidden min-h-[48px] flex items-center justify-between px-4 bg-surface/20 narvo-border-b"
        data-testid="archive-toggle"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="mono-ui text-[11px] text-forest font-bold">ARCHIVE_LOG</span>
          <span className="mono-ui text-[9px] text-forest/50">{history.length} ENTRIES</span>
        </div>
        {showArchive ? <CaretUp className="w-3 h-3 text-forest" /> : <CaretDown className="w-3 h-3 text-forest" />}
      </button>

      {showArchive && (
        <div className="lg:hidden max-h-48 overflow-y-auto bg-surface/10 narvo-border-b px-2 py-1 space-y-1">
          {history.map((item) => (
            <button
              key={item.date}
              onClick={() => { loadHistoricalBriefing(item.date); setShowArchive(false); }}
              className={`w-full p-2.5 text-left narvo-border transition-all text-[11px] ${briefing?.date === item.date ? 'border-primary bg-primary/5' : 'hover:bg-surface/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`mono-ui font-bold ${briefing?.date === item.date ? 'text-primary' : 'text-forest'}`}>
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                {item.date === todayStr && <span className="mono-ui text-[9px] text-primary bg-primary/10 px-1 py-0.5">TODAY</span>}
              </div>
              <span className="mono-ui text-[10px] text-forest/60">{item.stories?.length || 0} STORIES</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <section className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll p-4 md:p-8 pb-32 md:pb-8 min-w-0">
          <div className="max-w-3xl mx-auto lg:mx-0">
            {loading ? (
              <div className="space-y-6">
                <div className="narvo-border bg-surface/30 p-6 md:p-8">
                  <Skeleton variant="text" className="w-32 h-3 mb-4" />
                  <Skeleton variant="text" className="w-3/4 h-8 mb-3" />
                  <Skeleton variant="text" className="w-24 h-5 mb-6" />
                  <Skeleton className="w-48 h-12" />
                </div>
                <ListSkeleton count={4} />
              </div>
            ) : briefing ? (
              <>
                <div className="narvo-border bg-surface/50 p-4 md:p-8 mb-4 md:mb-6">
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <span className="w-2 h-2 bg-primary animate-pulse shrink-0" />
                    <span className="mono-ui text-[11px] md:text-[12px] text-primary font-bold tracking-widest">
                      {briefing.date === todayStr ? 'TODAY' : 'ARCHIVE'}
                    </span>
                  </div>
                  <h2 className="font-display text-lg md:text-2xl text-content mb-2 md:mb-3 uppercase tracking-tight break-words">{briefing.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
                    <span className="mono-ui text-[10px] md:text-[12px] text-forest narvo-border px-2 py-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />{briefing.duration_estimate}
                    </span>
                    <span className="mono-ui text-[10px] md:text-[12px] text-forest">{briefing.stories?.length || 0} STORIES</span>
                    <span className="mono-ui text-[10px] md:text-[12px] text-forest uppercase">VOICE: {briefing.voice_id || 'NOVA'}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {briefingError && (
                      <p className="mono-ui text-[11px] text-red-400 mb-2" role="alert">{briefingError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handlePlay}
                      disabled={audioLoading || generating || generatingAudio}
                      title={!briefing.audio_url ? 'Generate briefing audio' : isCurrentBriefingPlaying ? 'Pause briefing' : 'Play briefing'}
                      aria-label={isCurrentBriefingPlaying ? 'Pause briefing' : 'Play briefing'}
                      className={`min-h-[48px] w-full sm:w-auto ${isCurrentBriefingPlaying ? 'bg-white' : 'bg-primary hover:bg-white'} text-background-dark font-display font-bold px-4 md:px-6 py-3 text-sm md:text-base transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))]`}
                      data-testid="play-briefing-btn"
                    >
                      {audioLoading || generating || generatingAudio ? (
                        <div className="w-5 h-5 border-2 border-background-dark border-t-transparent animate-spin rounded-full" aria-hidden />
                      ) : isCurrentBriefingPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}

                      <span>
                        {audioLoading || generating || generatingAudio
                          ? (generating ? 'GENERATING...' : generatingAudio ? 'GENERATING AUDIO...' : 'LOADING...')
                          : !briefing.audio_url
                            ? (briefing.script ? 'GENERATE AUDIO' : 'GENERATE BRIEFING')
                            : isCurrentBriefingPlaying
                              ? 'PAUSE'
                              : 'PLAY BRIEFING'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="narvo-border bg-surface/20 divide-y divide-forest/10">
                  <div className="p-3 md:p-4 flex items-center justify-between">
                    <span className="mono-ui text-[11px] md:text-[12px] text-forest font-bold tracking-widest">STORIES</span>
                    <span className="mono-ui text-[9px] md:text-[10px] text-forest/60">{briefing.stories?.length || 0} / 5</span>
                  </div>
                  {briefing.stories?.map((story: BriefingStory, i: number) => (
                    <div
                      key={story.id || i}
                      className="w-full min-h-[48px] p-3 md:p-4 flex gap-2 md:gap-3 hover:bg-surface/40 transition-colors group"
                      data-testid={`story-${i}`}
                    >
                      <span className="mono-ui text-[11px] md:text-[12px] text-primary font-bold shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <button
                        type="button"
                        onClick={() => { handleSectionDivider(); navigate(`/news/${story.id}`); }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="mono-ui text-[9px] md:text-[10px] text-forest/60 uppercase">{story.category || 'GENERAL'}</span>
                          <span className="text-forest/30">•</span>
                          <span className="mono-ui text-[9px] md:text-[10px] text-forest/60 truncate">{story.source}</span>
                        </div>
                        <span className="text-content-dim-accessible text-xs md:text-sm group-hover:text-primary transition-colors line-clamp-2 break-words">{story.title}</span>
                      </button>
                      {segments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSkipToStory(i)}
                          className="shrink-0 p-1.5 narvo-border rounded hover:bg-primary/10 hover:border-primary transition-colors"
                          title="Skip to story"
                          aria-label={`Skip to story ${i + 1}`}
                        >
                          <SkipForward className="w-4 h-4 text-forest group-hover:text-primary" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { handleSectionDivider(); navigate(`/news/${story.id}`); }}
                        className="shrink-0 mt-0.5"
                        aria-label="Open story"
                      >
                        <CaretRight className="w-4 h-4 text-forest/30 group-hover:text-primary transition-colors" />
                      </button>
                    </div>
                  ))}
                </div>

                {briefing.script && (
                  <div className="lg:hidden narvo-border bg-surface/10 mt-4">
                    <div className="p-3 narvo-border-b flex items-center gap-2">
                      <TextAlignLeft className="w-3.5 h-3.5 text-primary" />
                      <span className="mono-ui text-[11px] text-forest font-bold tracking-widest">TRANSCRIPT</span>
                      {isCurrentBriefingPlaying && <span className="mono-ui text-[9px] text-primary animate-pulse">LIVE</span>}
                    </div>
                    <div className="p-3 max-h-64 overflow-y-auto custom-scroll" ref={transcriptRef}>
                      {segments.length > 0
                        ? segments.map((seg, idx) => (
                            <p
                              key={idx}
                              data-story={idx}
                              className={`mono-ui text-[12px] leading-relaxed mb-2 transition-colors duration-300 ${
                                idx === activeStoryIdx ? 'text-primary font-bold bg-primary/5' : idx < activeStoryIdx ? 'text-forest/50' : 'text-forest/80'
                              }`}
                            >
                              {script.slice(seg.start_char, seg.start_char + seg.length).trim()}
                            </p>
                          ))
                        : sentences.map((sentence, idx) => (
                            <span
                              key={idx}
                              data-sentence={idx}
                              className={`mono-ui text-[12px] leading-relaxed inline transition-colors duration-300 ${
                                idx === activeSentenceIdx ? 'text-primary font-bold bg-primary/5' : idx < activeSentenceIdx ? 'text-forest/50' : 'text-forest/80'
                              }`}
                            >
                              {sentence}{' '}
                            </span>
                          ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 md:py-20">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 narvo-border flex items-center justify-center">
                  <Radio className="w-8 h-8 md:w-10 md:h-10 text-forest/30" />
                </div>
                <h3 className="font-display text-lg text-content uppercase mb-3">NO_BRIEFING_LOADED</h3>
                <p className="mono-ui text-[12px] text-forest mb-6">Generate your first morning briefing</p>
                <button
                  onClick={() => generateBriefingData(false)}
                  disabled={generating}
                  className="min-h-[48px] bg-primary text-background-dark font-display font-bold px-6 py-3 text-sm hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 mx-auto focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                  data-testid="generate-briefing-btn"
                >
                  <ArrowClockwise className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'GENERATING...' : '[ GENERATE BRIEFING ]'}
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden lg:flex lg:w-80 xl:w-96 narvo-border-l bg-surface/5 flex-col shrink-0">
          {briefing?.script ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-12 flex items-center justify-between px-4 narvo-border-b bg-surface/20 shrink-0">
                <div className="flex items-center gap-2">
                  <TextAlignLeft className="w-4 h-4 text-primary" />
                  <span className="mono-ui text-[12px] text-forest font-bold tracking-widest">TRANSCRIPT</span>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrentBriefingPlaying && (
                    <span className="mono-ui text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 animate-pulse font-bold">LIVE</span>
                  )}
                  <span className="mono-ui text-[10px] text-forest/50">{sentences.length} LINES</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-4 xl:p-6" ref={transcriptRef} data-testid="transcript-panel">
                <div className="space-y-2">
                  {segments.length > 0
                    ? segments.map((seg, idx) => (
                        <p
                          key={idx}
                          data-story={idx}
                          className={`mono-ui text-[12px] xl:text-[13px] leading-[1.8] transition-all duration-300 ${
                            idx === activeStoryIdx ? 'text-primary font-bold bg-primary/5 px-0.5' : idx < activeStoryIdx ? 'text-forest/40' : 'text-forest/80'
                          }`}
                        >
                          {script.slice(seg.start_char, seg.start_char + seg.length).trim()}
                        </p>
                      ))
                    : sentences.map((sentence, idx) => (
                        <span
                          key={idx}
                          data-sentence={idx}
                          className={`mono-ui text-[12px] xl:text-[13px] leading-[1.8] inline transition-all duration-300 ${
                            idx === activeSentenceIdx ? 'text-primary font-bold bg-primary/5 px-0.5' : idx < activeSentenceIdx ? 'text-forest/40' : 'text-forest/80'
                          }`}
                        >
                          {sentence}{' '}
                        </span>
                      ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-3">
                <TextAlignLeft className="w-10 h-10 text-forest/20 mx-auto" />
                <p className="mono-ui text-[11px] text-forest/40">TRANSCRIPT WILL APPEAR HERE</p>
              </div>
            </div>
          )}

          <div className="narvo-border-t shrink-0">
            <div className="h-10 flex items-center justify-between px-4 bg-surface/20">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="mono-ui text-[11px] text-forest font-bold tracking-widest">ARCHIVE_LOG</span>
              </div>
              <span className="mono-ui text-[9px] text-forest/50">{history.length} ENTRIES</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scroll p-2 space-y-1">
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)
              ) : history.length === 0 ? (
                <div className="p-3 text-center">
                  <p className="mono-ui text-[10px] text-forest/50">NO_HISTORY</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.date}
                    onClick={() => loadHistoricalBriefing(item.date)}
                    className={`w-full p-2.5 text-left narvo-border transition-all ${
                      briefing?.date === item.date ? 'border-primary bg-primary/5' : 'hover:border-forest hover:bg-surface/30'
                    }`}
                    data-testid={`history-${item.date}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`mono-ui text-[10px] font-bold ${briefing?.date === item.date ? 'text-primary' : 'text-forest'}`}>
                        {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      {item.date === todayStr && <span className="mono-ui text-[9px] text-primary bg-primary/10 px-1 py-0.5">TODAY</span>}
                    </div>
                    <span className={`mono-ui text-[9px] ${briefing?.date === item.date ? 'text-content' : 'text-forest/60'}`}>
                      {item.stories?.length || 0} STORIES • {item.duration_estimate || '~3 MIN'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default MorningBriefingPage;
