'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, FileText, RefreshCw, Calendar } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY, homeBriefingMeta } from '@/lib/narvo-app-copy';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';
import {
  fetchBriefingByDate,
  fetchBriefingHistory,
  triggerBriefingGenerate,
  briefingPlayerTrackId,
  type ApiBriefingHistoryRow,
  type ApiBriefingLatest,
} from '@/lib/narvo-api';

const BRIEFING_MINUTES_FALLBACK = 12;

export default function BriefingPage() {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { briefing: latestBriefing, error, loading, refetch } = useLatestBriefing();
  const [showTranscript, setShowTranscript] = useState(false);
  const [historyRows, setHistoryRows] = useState<ApiBriefingHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedBriefing, setSelectedBriefing] = useState<ApiBriefingLatest | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const briefing = selectedBriefing ?? latestBriefing;

  const [historyTick, setHistoryTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void fetchBriefingHistory(20, 0)
      .then((res) => {
        if (!cancelled) setHistoryRows(res.briefings ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryRows([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyTick]);

  const storyCount =
    briefing?.stories?.length && briefing.stories.length > 0
      ? briefing.stories.length
      : 0;
  const metaCount = storyCount > 0 ? storyCount : 8;
  const hasScript = Boolean(briefing?.script?.trim());
  const hasAudio = Boolean(briefing?.audio_url);
  const briefingTrackId = briefing ? briefingPlayerTrackId(briefing) : 'briefing-pending';
  const briefingIsActive = hasAudio
    ? currentTrack?.id === briefingTrackId && isPlaying
    : currentTrack?.id === 'briefing-pending' && isPlaying;

  const handlePlay = () => {
    if (!briefing) return;
    if (briefing.audio_url) {
      if (currentTrack?.id === briefingTrackId && isPlaying) {
        togglePlayPause();
        return;
      }
      playTrack({
        id: briefingTrackId,
        title: briefing.title || COPY.briefing_title,
        source: COPY.brand_name,
        category: 'BRIEFING',
        audioUrl: briefing.audio_url,
      });
      return;
    }
    if (currentTrack?.id === 'briefing-pending' && isPlaying) {
      togglePlayPause();
      return;
    }
    playTrack({
      id: 'briefing-pending',
      title: COPY.briefing_title,
      source: COPY.brand_name,
      category: 'BRIEFING',
    });
  };

  const primaryCtaLabel = briefingIsActive
    ? COPY.briefing_pause
    : hasAudio
      ? COPY.briefing_listen_now
      : COPY.briefing_preview_sample;

  const loadDate = async (date: string) => {
    setSelectedLoading(true);
    setGenerateMessage(null);
    try {
      const b = await fetchBriefingByDate(date);
      setSelectedBriefing(b);
      setShowTranscript(false);
    } catch {
      setGenerateMessage(COPY.briefing_page_load_date_failed);
    } finally {
      setSelectedLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerateBusy(true);
    setGenerateMessage(null);
    try {
      await triggerBriefingGenerate({ forceRegenerate: true });
      setSelectedBriefing(null);
      refetch();
      setHistoryTick((n) => n + 1);
      setGenerateMessage(COPY.briefing_page_regenerate_ok);
    } catch (e: unknown) {
      setGenerateMessage(e instanceof Error ? e.message : COPY.briefing_page_generate_failed);
    } finally {
      setGenerateBusy(false);
    }
  };

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.briefing_title,
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8 sm:py-10 max-w-3xl mx-auto w-full">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint">
          {COPY.brand_name}
        </p>
        <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-narvo-ink dark:text-white tracking-tight">
          {loading || selectedLoading
            ? COPY.briefing_page_checking
            : error && !selectedBriefing
              ? COPY.briefing_page_unavailable_title
              : COPY.briefing_ready}
        </h2>
        <p className="mt-3 text-lg text-narvo-ink/60 dark:text-white/55">
          {loading && !selectedBriefing
            ? COPY.briefing_page_hang_tight
            : error && !selectedBriefing
              ? error
              : homeBriefingMeta(metaCount, BRIEFING_MINUTES_FALLBACK)}
        </p>

        {selectedBriefing ? (
          <p className="mt-2 text-sm text-narvo-teal dark:text-narvo-mint font-medium">
            {COPY.briefing_page_viewing_for}{' '}
            <span className="font-mono">{selectedBriefing.date}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedBriefing(null);
                setShowTranscript(false);
              }}
              className="ml-3 underline underline-offset-2 font-sans text-narvo-ink/60 dark:text-white/50 hover:text-narvo-teal"
            >
              {COPY.briefing_page_show_latest}
            </button>
          </p>
        ) : null}

        <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePlay}
            disabled={loading || selectedLoading || !briefing}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-narvo-vermilion px-8 py-3.5 font-bold text-white shadow-lg shadow-narvo-vermilion/25 hover:bg-[#e0441f] transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {briefingIsActive ? (
              <Pause size={20} fill="currentColor" aria-hidden />
            ) : (
              <Play size={20} fill="currentColor" aria-hidden />
            )}
            {primaryCtaLabel}
          </button>
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            disabled={!hasScript}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-8 py-3.5 font-bold text-narvo-ink dark:text-white hover:bg-narvo-ink/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasScript ? COPY.briefing_transcript_disabled_hint : undefined}
          >
            <FileText size={20} aria-hidden />
            {COPY.briefing_transcript}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generateBusy}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full border-2 border-narvo-teal/35 bg-narvo-teal/10 px-6 py-3.5 font-bold text-narvo-teal dark:text-narvo-mint hover:bg-narvo-teal/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={generateBusy ? 'animate-spin' : ''} aria-hidden />
            {COPY.briefing_page_regenerate}
          </button>
        </div>

        {generateMessage ? (
          <p className="mt-4 text-sm text-narvo-ink/55 dark:text-white/50">{generateMessage}</p>
        ) : null}

        {!hasAudio && !loading && !selectedLoading && !error ? (
          <p className="mt-6 text-sm text-narvo-ink/50 dark:text-white/45">
            {COPY.briefing_page_no_audio_hint}
          </p>
        ) : null}

        {showTranscript && hasScript ? (
          <div className="mt-10 rounded-[24px] border border-narvo-ink/10 dark:border-white/10 bg-white/80 dark:bg-narvo-ink/40 p-6 sm:p-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint mb-4">
              {COPY.briefing_transcript}
            </p>
            <div className="text-sm sm:text-base text-narvo-ink/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed font-serif">
              {briefing!.script}
            </div>
          </div>
        ) : null}

        <div className="mt-14 border-t border-narvo-ink/10 dark:border-white/10 pt-10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-narvo-teal dark:text-narvo-mint" aria-hidden />
            <h3 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">
              {COPY.briefing_page_history_title}
            </h3>
          </div>
          {historyLoading ? (
            <p className="text-sm text-narvo-ink/45 dark:text-white/40">{COPY.briefing_page_history_loading}</p>
          ) : historyRows.length === 0 ? (
            <p className="text-sm text-narvo-ink/45 dark:text-white/40">{COPY.briefing_page_history_empty}</p>
          ) : (
            <ul className="space-y-2">
              {historyRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => void loadDate(row.date)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                      row.date === (selectedBriefing?.date ?? latestBriefing?.date)
                        ? 'border-narvo-teal/40 bg-narvo-teal/10'
                        : 'border-narvo-ink/10 dark:border-white/10 hover:bg-narvo-mist/50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="font-mono text-xs text-narvo-teal dark:text-narvo-mint">{row.date}</span>
                    <span className="block text-sm font-medium text-narvo-ink dark:text-white mt-0.5 line-clamp-2">
                      {row.title || COPY.briefing_page_history_fallback_title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-10 text-sm text-narvo-ink/45 dark:text-white/40 leading-relaxed">
          {COPY.briefing_page_regenerate_footer_before}{' '}
          <span className="font-mono text-xs">{COPY.briefing_api_generate_path}</span>{' '}
          {COPY.briefing_page_regenerate_footer_after}
        </p>
      </div>
    </AuthenticatedAppShell>
  );
}
