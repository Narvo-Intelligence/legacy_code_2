'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, RefreshCw, Calendar, Trash2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY, homeBriefingMeta } from '@/lib/narvo-app-copy';
import {
  BRIEFING_PLACEHOLDER_STORY_MID,
  briefingMinutesFromEstimate,
} from '@/lib/briefing-defaults';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';
import { hasMeAuth } from '@/lib/me-api';
import {
  fetchBriefingByDate,
  fetchBriefingHistory,
  triggerBriefingGenerate,
  postBriefingAudio,
  deleteBriefingByDate,
  briefingPlayerTrackId,
  type ApiBriefingHistoryRow,
  type ApiBriefingLatest,
} from '@/lib/narvo-api';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function buildBriefingTranscriptBlocks(
  script: string,
  segments: ApiBriefingLatest['story_segments'] | undefined,
  stories: ApiBriefingLatest['stories'] | undefined
): { key: string; title: string; body: string; startChar: number }[] {
  if (!script.trim()) return [];
  const scriptLen = script.length;
  if (!segments?.length) {
    return [{ key: 'full', title: '', body: script, startChar: 0 }];
  }
  const blocks: { key: string; title: string; body: string; startChar: number }[] = [];
  segments.forEach((seg, i) => {
    const start = Math.max(0, Math.min(seg.start_char, scriptLen));
    const end = Math.min(scriptLen, start + Math.max(0, seg.length));
    const body = script.slice(start, end).trim();
    if (!body) return;
    const title = stories?.[i]?.title?.trim() || `Story ${i + 1}`;
    blocks.push({ key: `seg-${i}-${start}`, title, body, startChar: seg.start_char });
  });
  return blocks.length > 0 ? blocks : [{ key: 'full', title: '', body: script, startChar: 0 }];
}

function TranscriptBlockList({
  blocks,
  seekEnabled,
  onSeek,
}: {
  blocks: { key: string; title: string; body: string; startChar: number }[];
  seekEnabled: boolean;
  onSeek: (startChar: number) => void;
}) {
  return (
    <ul className="space-y-3">
      {blocks.map((block) => (
        <li key={block.key}>
          <button
            type="button"
            disabled={!seekEnabled}
            onClick={() => seekEnabled && onSeek(block.startChar)}
            className="w-full text-left rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/30 dark:bg-white/[0.03] px-4 py-3.5 sm:px-5 sm:py-4 transition-colors hover:border-narvo-teal/35 hover:bg-narvo-teal/[0.06] dark:hover:bg-narvo-teal/10 focus-visible:outline focus-visible:ring-2 focus-visible:ring-narvo-teal/30 disabled:opacity-60 disabled:pointer-events-none disabled:hover:border-narvo-ink/10 dark:disabled:hover:border-white/10"
          >
            {block.title ? (
              <p className="font-semibold text-sm text-narvo-ink dark:text-white mb-2 leading-snug">{block.title}</p>
            ) : null}
            <p className="text-sm sm:text-base text-narvo-ink/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed font-serif">
              {block.body}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function BriefingPage() {
  const { playTrack, currentTrack, isPlaying, togglePlayPause, seekToRatio } = useAudioPlayer();
  const { briefing: latestBriefing, error, loading, refetch } = useLatestBriefing();
  const [historyRows, setHistoryRows] = useState<ApiBriefingHistoryRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<ApiBriefingLatest | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const briefing = selectedBriefing ?? latestBriefing;

  const [historyTick, setHistoryTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void fetchBriefingHistory(20, 0)
      .then((res) => {
        if (!cancelled) {
          setHistoryRows(res.briefings ?? []);
          setHistoryTotal(typeof res.total === 'number' ? res.total : (res.briefings ?? []).length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRows([]);
          setHistoryTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyTick]);

  const loadMoreHistory = useCallback(() => {
    if (historyLoadingMore || historyRows.length >= historyTotal) return;
    setHistoryLoadingMore(true);
    const skip = historyRows.length;
    void fetchBriefingHistory(20, skip)
      .then((res) => {
        const add = res.briefings ?? [];
        setHistoryRows((prev) => {
          const seen = new Set(prev.map((r) => r.date));
          const merged = [...prev, ...add.filter((r) => !seen.has(r.date))];
          return merged;
        });
        if (typeof res.total === 'number') setHistoryTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setHistoryLoadingMore(false));
  }, [historyLoadingMore, historyRows.length, historyTotal]);

  const storyCount =
    briefing?.stories?.length && briefing.stories.length > 0 ? briefing.stories.length : 0;
  const metaCount = storyCount > 0 ? storyCount : BRIEFING_PLACEHOLDER_STORY_MID;
  const metaMinutes = briefing
    ? briefingMinutesFromEstimate(briefing.duration_estimate)
    : briefingMinutesFromEstimate(null);
  const hasScript = Boolean(briefing?.script?.trim());
  const hasAudio = Boolean(briefing?.audio_url?.trim());
  const briefingTrackId = briefing ? briefingPlayerTrackId(briefing) : 'briefing-pending';
  const briefingIsActive = hasAudio && currentTrack?.id === briefingTrackId && isPlaying;

  const transcriptBlocks = useMemo(
    () =>
      briefing?.script
        ? buildBriefingTranscriptBlocks(briefing.script, briefing.story_segments, briefing.stories)
        : [],
    [briefing?.script, briefing?.story_segments, briefing?.stories]
  );

  const handlePlay = () => {
    if (!briefing?.audio_url?.trim()) return;
    const id = briefingPlayerTrackId(briefing);
    if (currentTrack?.id === id && isPlaying) {
      togglePlayPause();
      return;
    }
    playTrack({
      id,
      title: briefing.title || COPY.briefing_title,
      source: COPY.brand_name,
      category: 'BRIEFING',
      audioUrl: briefing.audio_url,
    });
  };

  const handleTranscriptSegmentSeek = useCallback(
    (startChar: number) => {
      if (!briefing?.script || !briefing.audio_url?.trim()) return;
      const scriptLen = briefing.script.length;
      if (scriptLen <= 0) return;
      const ratio = Math.min(1, Math.max(0, startChar / scriptLen));
      const id = briefingPlayerTrackId(briefing);
      if (currentTrack?.id !== id) {
        playTrack({
          id,
          title: briefing.title || COPY.briefing_title,
          source: COPY.brand_name,
          category: 'BRIEFING',
          audioUrl: briefing.audio_url,
        });
        requestAnimationFrame(() => {
          seekToRatio(ratio);
        });
        return;
      }
      seekToRatio(ratio);
      if (!isPlaying) togglePlayPause();
    },
    [briefing, currentTrack?.id, isPlaying, playTrack, seekToRatio, togglePlayPause]
  );

  const loadDate = async (date: string) => {
    setSelectedLoading(true);
    setGenerateMessage(null);
    try {
      const b = await fetchBriefingByDate(date);
      setSelectedBriefing(b);
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
      await refetch();
      setHistoryTick((n) => n + 1);
      setGenerateMessage(COPY.briefing_page_regenerate_ok);
    } catch (e: unknown) {
      setGenerateMessage(e instanceof Error ? e.message : COPY.briefing_page_generate_failed);
    } finally {
      setGenerateBusy(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!briefing?.script?.trim() || !briefing.id) return;
    setAudioBusy(true);
    setGenerateMessage(null);
    try {
      await postBriefingAudio({
        script: briefing.script,
        voiceId: (briefing.voice_id as string | undefined) || 'emma',
        briefingId: briefing.id,
      });
      if (selectedBriefing?.date) {
        const refreshed = await fetchBriefingByDate(selectedBriefing.date);
        setSelectedBriefing(refreshed);
      } else {
        await refetch();
      }
      setGenerateMessage(COPY.briefing_page_generate_audio_ok);
    } catch (e: unknown) {
      setGenerateMessage(e instanceof Error ? e.message : COPY.briefing_page_generate_audio_failed);
    } finally {
      setAudioBusy(false);
    }
  };

  const handleDeleteBriefing = async (date: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMeAuth()) return;
    if (!window.confirm(COPY.briefing_page_delete_confirm)) return;
    setGenerateMessage(null);
    try {
      await deleteBriefingByDate(date);
      setHistoryRows((rows) => rows.filter((r) => r.date !== date));
      setHistoryTotal((t) => Math.max(0, t - 1));
      if (selectedBriefing?.date === date) {
        setSelectedBriefing(null);
      }
      await refetch();
    } catch {
      setGenerateMessage(COPY.briefing_page_delete_failed);
    }
  };

  const primaryCtaLabel = briefingIsActive ? COPY.briefing_pause : COPY.briefing_listen_now;

  const transcriptBody = hasScript ? (
    <>
      {briefing?.story_segments && briefing.story_segments.length > 0 ? (
        <p className="text-xs text-narvo-ink/50 dark:text-white/45 mb-4">{COPY.briefing_transcript_seek_hint}</p>
      ) : null}
      <TranscriptBlockList blocks={transcriptBlocks} seekEnabled={hasAudio} onSeek={handleTranscriptSegmentSeek} />
    </>
  ) : (
    <p className="text-sm text-narvo-ink/50 dark:text-white/45 leading-relaxed">{COPY.briefing_page_transcript_empty}</p>
  );

  const transcriptPanelDesktop = (
    <>
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint mb-2">
        {COPY.briefing_transcript}
      </p>
      {transcriptBody}
    </>
  );

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.briefing_title,
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="max-w-[1680px] mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(380px,34vw)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_min(420px,32%)] xl:gap-12 lg:items-start">
          {/* Left: controls, rundown, history */}
          <div className="min-w-0 space-y-8 lg:space-y-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
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
                    : homeBriefingMeta(metaCount, metaMinutes)}
              </p>

              {selectedBriefing ? (
                <p className="mt-2 text-sm text-narvo-teal dark:text-narvo-mint font-medium">
                  {COPY.briefing_page_viewing_for}{' '}
                  <span className="font-mono">{selectedBriefing.date}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBriefing(null);
                    }}
                    className="ml-3 underline underline-offset-2 font-sans text-narvo-ink/60 dark:text-white/50 hover:text-narvo-teal"
                  >
                    {COPY.briefing_page_show_latest}
                  </button>
                </p>
              ) : null}
            </motion.div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePlay}
                disabled={loading || selectedLoading || !briefing || !hasAudio}
                className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-narvo-vermilion px-8 py-3.5 font-bold text-white shadow-lg shadow-narvo-vermilion/25 hover:bg-[#e0441f] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                title={!hasAudio && briefing ? COPY.briefing_page_play_requires_audio : undefined}
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
                onClick={() => void handleGenerate()}
                disabled={generateBusy}
                className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full border-2 border-narvo-teal/35 bg-narvo-teal/10 px-6 py-3.5 font-bold text-narvo-teal dark:text-narvo-mint hover:bg-narvo-teal/15 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={generateBusy ? 'animate-spin' : ''} aria-hidden />
                {COPY.briefing_page_regenerate}
              </button>
              {hasScript && !hasAudio && briefing?.id ? (
                <button
                  type="button"
                  onClick={() => void handleGenerateAudio()}
                  disabled={audioBusy || loading || selectedLoading}
                  className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 py-3.5 font-bold text-narvo-ink dark:text-white hover:bg-narvo-ink/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={audioBusy ? 'animate-spin' : ''} aria-hidden />
                  {audioBusy ? COPY.briefing_page_generate_audio_busy : COPY.briefing_page_generate_audio}
                </button>
              ) : null}
            </div>

            {generateMessage ? (
              <p className="text-sm text-narvo-ink/55 dark:text-white/50">{generateMessage}</p>
            ) : null}

            {!hasAudio && !loading && !selectedLoading && !error && briefing ? (
              <p className="text-sm text-narvo-ink/50 dark:text-white/45">{COPY.briefing_page_no_audio_hint}</p>
            ) : null}

            {briefing?.stories && briefing.stories.length > 0 ? (
              <section className="rounded-[24px] border border-narvo-ink/10 dark:border-white/10 bg-[var(--bg-card)]/60 dark:bg-narvo-ink/30 p-5 sm:p-6">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint mb-4">
                  {COPY.briefing_page_story_rundown}
                </h3>
                <ul className="space-y-2">
                  {briefing.stories.map((s, idx) => {
                    const sid = s.id?.trim();
                    const title = s.title?.trim() || `Story ${idx + 1}`;
                    const inner = (
                      <>
                        <span className="text-sm font-medium text-narvo-ink dark:text-white line-clamp-2 flex-1 min-w-0">
                          {title}
                        </span>
                        {sid ? (
                          <ChevronRight className="shrink-0 text-narvo-ink/35 dark:text-white/35" size={18} aria-hidden />
                        ) : null}
                      </>
                    );
                    return (
                      <li key={sid || `story-${idx}`}>
                        {sid ? (
                          <Link
                            href={`/news/${encodeURIComponent(sid)}`}
                            className="flex items-center gap-3 rounded-2xl border border-narvo-ink/8 dark:border-white/10 px-4 py-3 transition-colors hover:border-narvo-teal/30 hover:bg-narvo-teal/[0.06] dark:hover:bg-narvo-teal/10"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 rounded-2xl border border-narvo-ink/8 dark:border-white/10 px-4 py-3 opacity-80">
                            {inner}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <div className="border-t border-narvo-ink/10 dark:border-white/10 pt-8 lg:pt-10">
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
                <>
                  <ul className="space-y-2">
                    {historyRows.map((row) => (
                      <li key={row.id} className="flex gap-2 items-stretch">
                        <button
                          type="button"
                          onClick={() => void loadDate(row.date)}
                          className={`flex-1 min-w-0 text-left rounded-2xl border px-4 py-3 transition-colors ${
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
                        {hasMeAuth() ? (
                          <button
                            type="button"
                            onClick={(e) => void handleDeleteBriefing(row.date, e)}
                            className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-narvo-ink/10 dark:border-white/10 text-narvo-ink/50 hover:text-narvo-vermilion hover:border-narvo-vermilion/30 transition-colors"
                            aria-label={COPY.briefing_page_delete_briefing_a11y}
                          >
                            <Trash2 size={18} aria-hidden />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {historyRows.length < historyTotal ? (
                    <button
                      type="button"
                      onClick={() => loadMoreHistory()}
                      disabled={historyLoadingMore}
                      className="mt-4 text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline disabled:opacity-50"
                    >
                      {historyLoadingMore ? COPY.status_loading : COPY.briefing_page_history_load_more}
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <p className="text-sm text-narvo-ink/45 dark:text-white/40 leading-relaxed">
              {COPY.briefing_page_regenerate_footer_before}{' '}
              <span className="font-mono text-xs">{COPY.briefing_api_generate_path}</span>{' '}
              {COPY.briefing_page_regenerate_footer_after}
            </p>
          </div>

          {/* Right (desktop): transcript — sticky; mobile: collapsible block below via DOM order */}
          <aside className="hidden lg:block min-w-0 self-start lg:sticky lg:top-4 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[24px] border border-narvo-ink/10 dark:border-white/10 bg-white/80 dark:bg-narvo-ink/40 p-6 xl:p-8 shadow-sm">
            {transcriptPanelDesktop}
          </aside>
        </div>

        {/* Mobile transcript — same content, stacked */}
        <div className="lg:hidden mt-10 rounded-[24px] border border-narvo-ink/10 dark:border-white/10 bg-white/80 dark:bg-narvo-ink/40 p-5 sm:p-6">
          <details open className="group">
            <summary className="cursor-pointer font-serif text-lg font-semibold text-narvo-ink dark:text-white list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <span>{COPY.briefing_transcript}</span>
              <span className="font-mono text-[10px] text-narvo-teal dark:text-narvo-mint uppercase tracking-widest group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="mt-4 pt-4 border-t border-narvo-ink/10 dark:border-white/10">{transcriptBody}</div>
          </details>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
