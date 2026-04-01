import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowClockwise,
  Calendar,
  CaretDown,
  CaretRight,
  CaretUp,
  Clock,
  Pause,
  Play,
  Radio,
  SkipForward,
  SpeakerHigh,
  Sparkle,
  TextAlignLeft,
} from '@phosphor-icons/react';

import Skeleton, { ListSkeleton } from '../components/Skeleton';
import { ButtonPrimary, ButtonSecondary } from '../components/primitives/Buttons';
import { StatusPill, TruthPill } from '../components/primitives/Pills';
import { useAudio } from '../contexts/AudioContext';
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
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
};

const formatArchiveDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

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
  const {
    voiceModel,
    playTrack,
    forcePlayTrack,
    togglePlay,
    seek,
    currentTrack,
    isPlaying,
    isLoading: audioLoading,
    currentTime: audioCurrentTime,
    duration: audioDuration,
  } = useAudio();
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

  useEffect(() => {
    if (!isCurrentBriefingPlaying || !audioDuration || audioDuration <= 0 || !totalChars || segments.length === 0) {
      if (!isCurrentBriefingPlaying) setActiveStoryIdx(-1);
      return;
    }

    const progress = audioCurrentTime / audioDuration;
    const estChar = progress * totalChars;
    let idx = -1;

    for (let i = 0; i < segments.length; i += 1) {
      const start = segments[i].start_char;
      const end = start + segments[i].length;
      if (estChar >= start && estChar < end) {
        idx = i;
        break;
      }
    }

    if (idx < 0 && segments.length > 0) {
      const last = segments[segments.length - 1];
      if (estChar >= last.start_char + last.length) idx = segments.length - 1;
    }

    setActiveStoryIdx(idx);
  }, [audioCurrentTime, audioDuration, isCurrentBriefingPlaying, totalChars, segments]);

  const activeSentenceIdx =
    segments.length > 0 && activeStoryIdx >= 0
      ? -1
      : isCurrentBriefingPlaying && audioDuration
        ? Math.min(Math.floor((audioCurrentTime / audioDuration) * sentences.length), sentences.length - 1)
        : -1;

  useEffect(() => {
    if (activeStoryIdx < 0 || !transcriptRef.current) return;
    const node = transcriptRef.current.querySelector(`[data-story="${activeStoryIdx}"]`);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeStoryIdx]);

  useEffect(() => {
    const handler = () => {
      if (sfxEnabled && currentTrack?.source === 'NARVO_BRIEFING') {
        playBriefingOutro().catch((error) => {
          logger.debug('[MorningBriefingPage] Failed to play outro', error);
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
  }, [currentTrack, sfxEnabled]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [latestRes, historyRes] = await Promise.all([
        api.get('api/briefing/latest').then((res) => (res.ok ? res.json() : null)).catch(() => null),
        api.get('api/briefing/history?limit=10').then((res) => res.json()).catch(() => ({ briefings: [] })),
      ]);

      if (cancelled) return;
      const latest = latestRes as BriefingData | null;
      const historyData = historyRes as { briefings?: BriefingHistoryItem[] };
      setBriefing(latest ?? null);
      setHistory(historyData.briefings ?? []);
      setLoading(false);
      setHistoryLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      api.get('api/briefing/latest')
        .then((res) => (res.ok ? res.json() : null))
        .then((value: BriefingData | null) => {
          if (!cancelled && value) setBriefing(value);
        })
        .catch((error) => {
          logger.debug('[MorningBriefingPage] Failed to refresh briefing on visibility', error);
        });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const autoplayRequested = searchParams.get('autoplay') === '1';
  const autoplayDoneRef = useRef(false);
  useEffect(() => {
    if (!autoplayRequested || autoplayDoneRef.current || !briefing?.audio_url || loading) return;
    autoplayDoneRef.current = true;

    if (sfxEnabled) {
      playBriefingIntro().catch((error) => {
        logger.debug('[MorningBriefingPage] Failed to play intro', error);
      });
    }

    const timeout = window.setTimeout(() => {
      forcePlayTrack({
        id: briefing.id,
        title: briefing.title,
        url: briefing.audio_url,
        source: 'NARVO_BRIEFING',
      });
    }, sfxEnabled ? 1400 : 100);

    return () => window.clearTimeout(timeout);
  }, [autoplayRequested, briefing?.audio_url, briefing?.id, briefing?.title, forcePlayTrack, loading, sfxEnabled]);

  const generateBriefingData = async (autoPlay = false) => {
    setBriefingError(null);
    setGenerating(true);
    try {
      const res = await api.get(`api/briefing/generate?voice_id=${selectedVoice}&force_regenerate=true`);
      if (res.ok) {
        const data = (await res.json()) as BriefingData;
        setBriefing(data);
        const histRes = await api.get('api/briefing/history?limit=10');
        if (histRes.ok) {
          const histData = (await histRes.json()) as { briefings?: BriefingHistoryItem[] };
          setHistory(histData.briefings || []);
        }
        if (autoPlay && data.audio_url) {
          const isSameTrack = currentTrack?.id === data.id;
          if (sfxEnabled && !isSameTrack) {
            try {
              await playBriefingIntro();
            } catch (error) {
              logger.debug('[MorningBriefingPage] Failed to play intro', error);
            }
            await new Promise((resolve) => setTimeout(resolve, 1400));
          }
          await playTrack({ id: data.id, title: data.title, url: data.audio_url, source: 'NARVO_BRIEFING' }, true);
        }
      } else {
        setBriefingError(res.status === 404 ? 'No stories available. Try again later.' : 'Failed to generate briefing. Please try again.');
      }
    } catch (error) {
      console.error('Error generating briefing:', error);
      setBriefingError('Network or server error. Please try again.');
    }
    setGenerating(false);
  };

  const generateAudioOnly = async (autoPlay = false) => {
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
        const data = (await res.json()) as { audio_url: string };
        setBriefing((prev) => (prev ? { ...prev, audio_url: data.audio_url } : null));
        if (autoPlay && data.audio_url) {
          if (sfxEnabled) {
            try {
              await playBriefingIntro();
            } catch (error) {
              logger.debug('[MorningBriefingPage] Failed to play intro', error);
            }
            await new Promise((resolve) => setTimeout(resolve, 1400));
          }
          await playTrack({ id: briefing.id, title: briefing.title, url: data.audio_url, source: 'NARVO_BRIEFING' }, true);
        }
      } else {
        setBriefingError('Failed to generate audio. Try again.');
      }
    } catch (error) {
      console.error('Error generating briefing audio:', error);
      setBriefingError('Failed to generate audio. Please try again.');
    }
    setGeneratingAudio(false);
  };

  const loadHistoricalBriefing = async (date: string) => {
    setLoading(true);
    try {
      const res = await api.get(`api/briefing/${date}`);
      if (res.ok) {
        const data = (await res.json()) as BriefingData;
        setBriefing(data);
      }
    } catch (error) {
      console.error('Error loading briefing:', error);
    }
    setLoading(false);
  };

  const handlePlay = async () => {
    if (!briefing) return;

    if (!briefing.audio_url) {
      if (briefing.script) await generateAudioOnly(true);
      else await generateBriefingData(true);
      return;
    }

    const isSameTrack = currentTrack?.id === briefing.id;
    if (isSameTrack) {
      togglePlay();
      return;
    }

    if (sfxEnabled) {
      try {
        await playBriefingIntro();
      } catch (error) {
        logger.debug('[MorningBriefingPage] Failed to play intro', error);
      }
      await new Promise((resolve) => setTimeout(resolve, 1400));
    }

    await playTrack({ id: briefing.id, title: briefing.title, url: briefing.audio_url, source: 'NARVO_BRIEFING' }, true);
  };

  const handleSectionDivider = useCallback(async () => {
    if (!sfxEnabled) return;
    try {
      await playSectionDivider();
    } catch (error) {
      logger.debug('[MorningBriefingPage] Failed to play section divider', error);
    }
  }, [sfxEnabled]);

  const handleSkipToStory = useCallback(
    (storyIndex: number) => {
      if (segments.length === 0 || storyIndex < 0 || storyIndex >= segments.length || !audioDuration || totalChars <= 0) return;
      if (currentTrack?.id !== briefing?.id) {
        if (briefing?.audio_url) {
          playTrack({ id: briefing.id, title: briefing.title, url: briefing.audio_url, source: 'NARVO_BRIEFING' }, true);
        }
        return;
      }
      const segment = segments[storyIndex];
      const startTime = (segment.start_char / totalChars) * audioDuration;
      seek(startTime);
    },
    [audioDuration, briefing?.audio_url, briefing?.id, briefing?.title, currentTrack?.id, playTrack, seek, segments, totalChars]
  );

  const actionLabel =
    audioLoading || generating || generatingAudio
      ? generating
        ? 'Generating briefing...'
        : generatingAudio
          ? 'Generating audio...'
          : 'Loading...'
      : !briefing?.audio_url
        ? briefing?.script
          ? 'Generate audio'
          : 'Generate briefing'
        : isCurrentBriefingPlaying
          ? 'Pause briefing'
          : currentTrack?.id === briefing?.id
            ? 'Resume briefing'
            : 'Play briefing';

  return (
    <main className="flex min-h-0 min-w-0 flex-1 bg-bg" data-testid="briefing-page">
      <Helmet>
        <title>Morning Briefing — NARVO</title>
        <meta property="og:title" content="Morning Briefing — NARVO" />
        <meta property="og:description" content="Your personalized daily news briefing, delivered in broadcast format." />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-28 pt-4 md:px-6 lg:flex-row lg:px-8 lg:pb-10">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto no-scrollbar">
          <div className="shell-panel overflow-hidden p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={briefing?.date === todayStr ? 'live' : 'queued'}>
                    {briefing?.date === todayStr ? 'Today' : 'Archive'}
                  </StatusPill>
                  <TruthPill status="verified">Morning ritual</TruthPill>
                </div>
                <div className="mt-4 flex items-center gap-2 text-primary">
                  <Radio size={16} weight="fill" />
                  <span className="meta-eyebrow">Morning briefing</span>
                </div>
                <h1 className="section-heading mt-3 text-[40px] text-content md:text-[56px]">
                  {briefing?.title || 'One strong briefing for the day ahead.'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-content-secondary md:text-base">
                  Large playback controls, clearer story ranking, and a transcript surface that stays readable while audio is live.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-content-secondary">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-[var(--shadow-1)]">
                    <Clock size={14} weight="bold" className="text-primary" />
                    {briefing?.duration_estimate || '~8 min'}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-[var(--shadow-1)]">
                    <Sparkle size={14} weight="fill" className="text-primary" />
                    {(briefing?.stories?.length || 0)} stories ranked
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-[var(--shadow-1)]">
                    <SpeakerHigh size={14} weight="fill" className="text-primary" />
                    Voice: {(briefing?.voice_id || selectedVoice).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ButtonPrimary
                  icon={
                    audioLoading || generating || generatingAudio ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : isCurrentBriefingPlaying ? (
                      <Pause size={14} weight="fill" />
                    ) : (
                      <Play size={14} weight="fill" />
                    )
                  }
                  onClick={handlePlay}
                  disabled={audioLoading || generating || generatingAudio}
                  data-testid="play-briefing-btn"
                  aria-label={actionLabel}
                  title={actionLabel}
                >
                  {actionLabel}
                </ButtonPrimary>
                <ButtonSecondary
                  size="lg"
                  icon={<ArrowClockwise size={14} weight="bold" className={generating ? 'animate-spin' : ''} />}
                  onClick={() => generateBriefingData(false)}
                  disabled={generating}
                  data-testid="generate-btn"
                >
                  Refresh briefing
                </ButtonSecondary>
                <button
                  type="button"
                  onClick={() => setSfxEnabled((value) => !value)}
                  className={`inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors ${
                    sfxEnabled
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-border bg-white text-content-secondary hover:text-content'
                  }`}
                  data-testid="sfx-toggle"
                >
                  <SpeakerHigh size={16} weight={sfxEnabled ? 'fill' : 'regular'} />
                  SFX {sfxEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {briefingError ? (
              <div className="mt-5 rounded-[20px] border border-alert/20 bg-alert/10 px-4 py-3 text-sm text-alert" role="alert">
                {briefingError}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowArchive((value) => !value)}
            className="lg:hidden shell-card-soft flex items-center justify-between px-4 py-4"
            data-testid="archive-toggle"
          >
            <div className="flex items-center gap-3">
              <Calendar size={16} weight="bold" className="text-primary" />
              <div>
                <div className="meta-eyebrow">Archive</div>
                <div className="mt-1 text-sm font-semibold text-content">{history.length} saved briefings</div>
              </div>
            </div>
            {showArchive ? <CaretUp size={16} weight="bold" className="text-content-secondary" /> : <CaretDown size={16} weight="bold" className="text-content-secondary" />}
          </button>

          {showArchive ? (
            <div className="lg:hidden shell-card p-4">
              <div className="space-y-3">
                {historyLoading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
                ) : history.length === 0 ? (
                  <p className="text-sm text-content-secondary">No archived briefings yet.</p>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => {
                        loadHistoricalBriefing(item.date);
                        setShowArchive(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left shadow-[var(--shadow-1)] transition-colors ${
                        briefing?.date === item.date
                          ? 'border-primary/20 bg-primary/10'
                          : 'border-border bg-white hover:border-primary/20'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-content">{formatArchiveDate(item.date)}</div>
                        <div className="mt-1 text-xs text-content-secondary">
                          {item.stories?.length || 0} stories · {item.duration_estimate || '~3 min'}
                        </div>
                      </div>
                      {item.date === todayStr ? <StatusPill status="live">Today</StatusPill> : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-5">
              <div className="shell-card p-6">
                <Skeleton variant="text" className="mb-4 h-3 w-28" />
                <Skeleton variant="text" className="mb-3 h-8 w-3/4" />
                <Skeleton variant="text" className="mb-5 h-5 w-24" />
                <Skeleton className="h-12 w-48" />
              </div>
              <ListSkeleton count={4} />
            </div>
          ) : briefing ? (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <section className="shell-card-soft p-5 md:p-6">
                  <div className="meta-eyebrow">Story ranking</div>
                  <h2 className="section-heading mt-3 text-[32px] text-content md:text-[40px]">
                    The first stories should already be prioritized.
                  </h2>
                  <div className="mt-5 space-y-3">
                    {briefing.stories?.map((story, index) => (
                      <div
                        key={story.id || index}
                        className={`rounded-[24px] border px-4 py-4 shadow-[var(--shadow-1)] transition-colors ${
                          index === activeStoryIdx
                            ? 'border-primary/20 bg-primary/10'
                            : 'border-border bg-white'
                        }`}
                        data-testid={`story-${index}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-[11px] font-bold text-primary">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {story.category ? <StatusPill status="queued">{story.category}</StatusPill> : null}
                              {story.source ? <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-secondary">{story.source}</span> : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void handleSectionDivider();
                                navigate(`/news/${story.id}`);
                              }}
                              className="mt-3 text-left text-base font-semibold leading-7 text-content transition-colors hover:text-primary"
                            >
                              {story.title}
                            </button>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {segments.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleSkipToStory(index)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-content-secondary transition-colors hover:border-primary/20 hover:text-primary"
                                title="Skip to story"
                                aria-label={`Skip to story ${index + 1}`}
                              >
                                <SkipForward size={16} weight="bold" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                void handleSectionDivider();
                                navigate(`/news/${story.id}`);
                              }}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-content-secondary transition-colors hover:border-primary/20 hover:text-primary"
                              aria-label="Open story"
                            >
                              <CaretRight size={16} weight="bold" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="surface-rail overflow-hidden p-5 md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="meta-eyebrow !text-white/54">PlayerCluster</div>
                      <h2 className="mt-3 font-display text-[30px] font-bold leading-[0.95] tracking-[-0.04em] text-white md:text-[38px]">
                        {isCurrentBriefingPlaying ? 'Briefing is live.' : 'Briefing is ready.'}
                      </h2>
                    </div>
                    <StatusPill status={isCurrentBriefingPlaying ? 'live' : 'queued'} className={isCurrentBriefingPlaying ? '!bg-white/14 !border-white/10 !text-white' : ''}>
                      {isCurrentBriefingPlaying ? 'Listening' : 'Queued'}
                    </StatusPill>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/72">
                    The persistent player should feel premium and obvious, but the reading surfaces stay calmer than the transport surface.
                  </p>
                  <div className="mt-6 rounded-[28px] border border-white/10 bg-white/8 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{briefing.title || 'Today’s briefing'}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/54">
                          {briefing.duration_estimate || '~8 min'} · {briefing.stories?.length || 0} stories
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handlePlay}
                        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-alert text-white shadow-[0_0_0_1px_rgba(240,75,36,0.18),0_0_24px_rgba(240,75,36,0.18)]"
                        aria-label={actionLabel}
                      >
                        {isCurrentBriefingPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
                      </button>
                    </div>
                    <div className="mt-5 grid gap-2">
                      {(briefing.stories || []).slice(0, 3).map((story, index) => (
                        <div key={story.id || index} className="flex items-center gap-3 rounded-[18px] bg-white/10 px-3 py-3">
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/54">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm text-white/80">{story.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {briefing.script ? (
                <section className="lg:hidden shell-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TextAlignLeft size={16} weight="bold" className="text-primary" />
                      <div>
                        <div className="meta-eyebrow">Transcript</div>
                        <div className="mt-1 text-sm font-semibold text-content">Readable while the player is live.</div>
                      </div>
                    </div>
                    {isCurrentBriefingPlaying ? <StatusPill status="live">Live</StatusPill> : null}
                  </div>
                  <div ref={transcriptRef} className="mt-5 max-h-[320px] space-y-3 overflow-y-auto no-scrollbar">
                    {segments.length > 0
                      ? segments.map((segment, index) => (
                          <p
                            key={index}
                            data-story={index}
                            className={`rounded-[18px] px-3 py-3 text-sm leading-7 transition-colors ${
                              index === activeStoryIdx
                                ? 'bg-primary/10 text-primary'
                                : index < activeStoryIdx
                                  ? 'text-content-secondary/60'
                                  : 'text-content-secondary'
                            }`}
                          >
                            {script.slice(segment.start_char, segment.start_char + segment.length).trim()}
                          </p>
                        ))
                      : sentences.map((sentence, index) => (
                          <span
                            key={index}
                            data-sentence={index}
                            className={`inline text-sm leading-8 transition-colors ${
                              index === activeSentenceIdx
                                ? 'font-semibold text-primary'
                                : index < activeSentenceIdx
                                  ? 'text-content-secondary/60'
                                  : 'text-content-secondary'
                            }`}
                          >
                            {sentence}{' '}
                          </span>
                        ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <div className="shell-card p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-border bg-surface-alt">
                <Radio size={28} weight="duotone" className="text-primary" />
              </div>
              <h2 className="section-heading mt-6 text-[36px] text-content">No briefing loaded yet.</h2>
              <p className="mt-3 text-sm leading-7 text-content-secondary">
                Generate the first morning briefing, then use the same player and transcript surfaces every day.
              </p>
              <div className="mt-6 flex justify-center">
                <ButtonPrimary
                  icon={<ArrowClockwise size={14} weight="bold" className={generating ? 'animate-spin' : ''} />}
                  onClick={() => generateBriefingData(false)}
                  disabled={generating}
                  data-testid="generate-briefing-btn"
                >
                  {generating ? 'Generating...' : 'Generate briefing'}
                </ButtonPrimary>
              </div>
            </div>
          )}
        </section>

        <aside className="hidden w-full max-w-[380px] shrink-0 lg:flex lg:flex-col lg:gap-5">
          <section className="shell-card min-h-0 flex-1 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <TextAlignLeft size={16} weight="bold" className="text-primary" />
                <div>
                  <div className="meta-eyebrow">Transcript</div>
                  <div className="mt-1 text-sm font-semibold text-content">Calm reading alongside playback.</div>
                </div>
              </div>
              {isCurrentBriefingPlaying ? <StatusPill status="live">Live</StatusPill> : null}
            </div>
            {briefing?.script ? (
              <div ref={transcriptRef} className="h-full overflow-y-auto px-5 py-5 no-scrollbar" data-testid="transcript-panel">
                <div className="space-y-3">
                  {segments.length > 0
                    ? segments.map((segment, index) => (
                        <p
                          key={index}
                          data-story={index}
                          className={`rounded-[18px] px-3 py-3 text-sm leading-7 transition-colors ${
                            index === activeStoryIdx
                              ? 'bg-primary/10 text-primary'
                              : index < activeStoryIdx
                                ? 'text-content-secondary/60'
                                : 'text-content-secondary'
                          }`}
                        >
                          {script.slice(segment.start_char, segment.start_char + segment.length).trim()}
                        </p>
                      ))
                    : sentences.map((sentence, index) => (
                        <span
                          key={index}
                          data-sentence={index}
                          className={`inline text-sm leading-8 transition-colors ${
                            index === activeSentenceIdx
                              ? 'font-semibold text-primary'
                              : index < activeSentenceIdx
                                ? 'text-content-secondary/60'
                                : 'text-content-secondary'
                          }`}
                        >
                          {sentence}{' '}
                        </span>
                      ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-6 py-10 text-center text-sm text-content-secondary">
                Transcript appears once the briefing script is ready.
              </div>
            )}
          </section>

          <section className="shell-card-soft p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} weight="bold" className="text-primary" />
                <div>
                  <div className="meta-eyebrow">Archive</div>
                  <div className="mt-1 text-sm font-semibold text-content">{history.length} saved briefings</div>
                </div>
              </div>
              {historyLoading ? <StatusPill status="syncing">Syncing</StatusPill> : null}
            </div>
            <div className="mt-5 max-h-[320px] space-y-3 overflow-y-auto no-scrollbar">
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
              ) : history.length === 0 ? (
                <p className="text-sm text-content-secondary">No archived briefings yet.</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => loadHistoricalBriefing(item.date)}
                    className={`flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left shadow-[var(--shadow-1)] transition-colors ${
                      briefing?.date === item.date
                        ? 'border-primary/20 bg-primary/10'
                        : 'border-border bg-white hover:border-primary/20'
                    }`}
                    data-testid={`history-${item.date}`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-content">{formatArchiveDate(item.date)}</div>
                      <div className="mt-1 text-xs text-content-secondary">
                        {item.stories?.length || 0} stories · {item.duration_estimate || '~3 min'}
                      </div>
                    </div>
                    {item.date === todayStr ? <StatusPill status="live">Today</StatusPill> : null}
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default MorningBriefingPage;
