'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RefreshCw,
  Calendar,
  Trash2,
  ChevronRight,
  Radio,
  FileText,
  History,
  Sparkles,
} from 'lucide-react';
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
  triggerBriefingGeneratePost,
  postBriefingAudio,
  deleteBriefingByDate,
  briefingPlayerTrackId,
  type ApiBriefingHistoryRow,
  type ApiBriefingLatest,
} from '@/lib/narvo-api';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

function formatBriefingDisplayDate(isoDate: string | undefined): string {
  if (!isoDate?.trim()) return '';
  const d = new Date(`${isoDate.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

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
            className="w-full text-left rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/40 dark:bg-white/[0.04] px-4 py-3.5 sm:px-5 sm:py-4 transition-colors hover:border-narvo-teal/40 hover:bg-narvo-teal/[0.08] dark:hover:bg-narvo-teal/10 focus-visible:outline focus-visible:ring-2 focus-visible:ring-narvo-teal/30 disabled:opacity-55 disabled:pointer-events-none"
          >
            {block.title ? (
              <p className="font-semibold text-sm text-narvo-ink dark:text-white mb-2 leading-snug">{block.title}</p>
            ) : null}
            <p className="text-sm sm:text-base text-narvo-ink/85 dark:text-white/82 whitespace-pre-wrap leading-relaxed font-serif">
              {block.body}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TranscriptSurface({
  id,
  title,
  children,
  className = '',
  scrollBody = false,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** When true, body is flex-1 min-h-0 overflow-y-auto (use with max-h on aside for sticky column). */
  scrollBody?: boolean;
}) {
  const bodyClass = scrollBody
    ? 'flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 xl:p-8'
    : 'p-5 sm:p-6 xl:p-8';
  return (
    <aside
      id={id}
      aria-label={title}
      className={`flex flex-col rounded-[24px] lg:rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-[var(--bg-card)]/90 dark:bg-narvo-ink/45 shadow-[0_12px_40px_-20px_rgba(23,50,74,0.18)] dark:shadow-black/30 ${className}`}
    >
      <div className="shrink-0 border-b border-narvo-ink/8 dark:border-white/10 px-5 py-4 sm:px-6 sm:py-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-narvo-teal/15 text-narvo-teal dark:bg-narvo-mint/15 dark:text-narvo-mint">
          <FileText size={20} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint">
            {COPY.briefing_transcript}
          </p>
          <p className="text-xs text-narvo-ink/50 dark:text-white/45 truncate">{COPY.brand_subtitle}</p>
        </div>
      </div>
      <div className={bodyClass}>{children}</div>
    </aside>
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
  /** Prevents duplicate auto audio requests for the same briefing id (incl. Strict Mode remounts). */
  const autoAudioForIdRef = useRef<string | null>(null);

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
          return [...prev, ...add.filter((r) => !seen.has(r.date))];
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

  const displayDateLine = formatBriefingDisplayDate(briefing?.date);
  const headlineTitle =
    loading || selectedLoading
      ? COPY.briefing_page_checking
      : error && !selectedBriefing
        ? COPY.briefing_page_unavailable_title
        : briefing?.title?.trim() || COPY.briefing_ready;

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
      await triggerBriefingGeneratePost({ forceRegenerate: true });
      setSelectedBriefing(null);
      autoAudioForIdRef.current = null;
      await refetch();
      setHistoryTick((n) => n + 1);
      setGenerateMessage(COPY.briefing_page_regenerate_ok);
    } catch (e: unknown) {
      setGenerateMessage(e instanceof Error ? e.message : COPY.briefing_page_generate_failed);
    } finally {
      setGenerateBusy(false);
    }
  };

  const generateBriefingAudio = useCallback(
    async (opts?: { fromAuto?: boolean }) => {
      const fromAuto = Boolean(opts?.fromAuto);
      const b = selectedBriefing ?? latestBriefing;
      if (!b?.script?.trim() || !b.id) return;

      setAudioBusy(true);
      if (fromAuto) {
        setGenerateMessage(COPY.briefing_page_generate_audio_busy);
      } else {
        setGenerateMessage(null);
      }
      try {
        await postBriefingAudio({
          script: b.script,
          voiceId: (b.voice_id as string | undefined) || 'emma',
          briefingId: b.id,
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
        if (fromAuto) {
          autoAudioForIdRef.current = null;
        }
      } finally {
        setAudioBusy(false);
      }
    },
    [selectedBriefing, latestBriefing, refetch]
  );

  const handleGenerateAudio = () => {
    void generateBriefingAudio({ fromAuto: false });
  };

  useEffect(() => {
    if (loading || selectedLoading) return;
    const b = briefing;
    if (!b?.id || !b.script?.trim() || b.audio_url?.trim()) return;

    const id = b.id;
    if (autoAudioForIdRef.current === id) return;
    autoAudioForIdRef.current = id;

    void generateBriefingAudio({ fromAuto: true });
  }, [
    loading,
    selectedLoading,
    briefing?.id,
    briefing?.script,
    briefing?.audio_url,
    generateBriefingAudio,
  ]);

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

  const transcriptBodyInner = hasScript ? (
    <>
      {briefing?.story_segments && briefing.story_segments.length > 0 ? (
        <p className="text-xs text-narvo-ink/50 dark:text-white/45 mb-4 leading-relaxed">{COPY.briefing_transcript_seek_hint}</p>
      ) : null}
      <TranscriptBlockList blocks={transcriptBlocks} seekEnabled={hasAudio} onSeek={handleTranscriptSegmentSeek} />
    </>
  ) : (
    <p className="text-sm text-narvo-ink/50 dark:text-white/45 leading-relaxed">{COPY.briefing_page_transcript_empty}</p>
  );

  const storyRundown =
    briefing?.stories && briefing.stories.length > 0 ? (
      <section
        aria-labelledby="briefing-rundown-heading"
        className="rounded-[24px] lg:rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/35 dark:bg-white/[0.04] p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
          <h2 id="briefing-rundown-heading" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint">
            {COPY.briefing_page_story_rundown}
          </h2>
        </div>
        <ul className="space-y-2">
          {briefing.stories.map((s, idx) => {
            const sid = s.id?.trim();
            const title = s.title?.trim() || `Story ${idx + 1}`;
            const inner = (
              <>
                <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/35 w-6 shrink-0 pt-0.5">{idx + 1}</span>
                <span className="text-sm font-medium text-narvo-ink dark:text-white line-clamp-2 flex-1 min-w-0 leading-snug">{title}</span>
                {sid ? <ChevronRight className="shrink-0 text-narvo-ink/30 dark:text-white/30" size={18} aria-hidden /> : null}
              </>
            );
            return (
              <li key={sid || `story-${idx}`}>
                {sid ? (
                  <Link
                    href={`/news/${encodeURIComponent(sid)}`}
                    className="flex items-start gap-2 rounded-2xl border border-narvo-ink/8 dark:border-white/10 px-3 py-3 sm:px-4 transition-colors hover:border-narvo-teal/35 hover:bg-white/60 dark:hover:bg-narvo-teal/10"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2 rounded-2xl border border-narvo-ink/8 dark:border-white/10 px-3 py-3 opacity-75">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  const historySection = (
    <section aria-labelledby="briefing-history-heading" className="rounded-[24px] lg:rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-[var(--bg-card)]/70 dark:bg-narvo-ink/35 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 sm:px-6 border-b border-narvo-ink/8 dark:border-white/10 bg-narvo-mist/25 dark:bg-white/[0.03]">
        <History size={18} className="text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
        <h2 id="briefing-history-heading" className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">
          {COPY.briefing_page_history_title}
        </h2>
      </div>
      <div className="p-4 sm:p-5 max-h-[min(360px,42vh)] lg:max-h-[320px] overflow-y-auto">
        {historyLoading ? (
          <p className="text-sm text-narvo-ink/45 dark:text-white/40 py-4 text-center">{COPY.briefing_page_history_loading}</p>
        ) : historyRows.length === 0 ? (
          <p className="text-sm text-narvo-ink/45 dark:text-white/40 py-4 text-center">{COPY.briefing_page_history_empty}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {historyRows.map((row) => (
                <li key={row.id} className="flex gap-2 items-stretch">
                  <button
                    type="button"
                    onClick={() => void loadDate(row.date)}
                    className={`flex-1 min-w-0 text-left rounded-2xl border px-3.5 py-3 transition-colors ${
                      row.date === (selectedBriefing?.date ?? latestBriefing?.date)
                        ? 'border-narvo-teal/45 bg-narvo-teal/12 shadow-sm'
                        : 'border-narvo-ink/10 dark:border-white/10 hover:bg-narvo-mist/60 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-narvo-teal dark:text-narvo-mint">
                      <Calendar size={12} className="opacity-70" aria-hidden />
                      {row.date}
                    </span>
                    <span className="block text-sm font-medium text-narvo-ink dark:text-white mt-1 line-clamp-2 leading-snug">
                      {row.title || COPY.briefing_page_history_fallback_title}
                    </span>
                  </button>
                  {hasMeAuth() ? (
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteBriefing(row.date, e)}
                      className="shrink-0 flex h-[52px] w-11 items-center justify-center rounded-2xl border border-narvo-ink/10 dark:border-white/10 text-narvo-ink/45 hover:text-narvo-vermilion hover:border-narvo-vermilion/35 hover:bg-narvo-vermilion/5 transition-colors"
                      aria-label={COPY.briefing_page_delete_briefing_a11y}
                    >
                      <Trash2 size={17} aria-hidden />
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
                className="mt-4 w-full min-h-[44px] rounded-xl border border-narvo-teal/25 text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:bg-narvo-teal/10 transition-colors disabled:opacity-50"
              >
                {historyLoadingMore ? COPY.status_loading : COPY.briefing_page_history_load_more}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.briefing_title,
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="max-w-[1680px] mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(400px,36%)] xl:grid-cols-[minmax(0,1fr)_min(440px,34%)] lg:gap-8 xl:gap-12 lg:items-start">
          {/* —— Left column: hero, rundown, history —— */}
          <div className="min-w-0 space-y-6 sm:space-y-8 lg:space-y-10">
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              aria-labelledby="briefing-hero-title"
              className="relative overflow-hidden rounded-[24px] lg:rounded-[28px] border border-narvo-teal/25 dark:border-narvo-mint/20 bg-gradient-to-br from-narvo-teal/[0.12] via-narvo-mist/50 to-narvo-cloud/80 dark:from-narvo-teal/20 dark:via-narvo-ink/55 dark:to-[#0a1520] shadow-[0_16px_48px_-24px_rgba(15,95,115,0.35)]"
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-narvo-teal/10 dark:bg-narvo-mint/10 blur-3xl pointer-events-none" aria-hidden />
              <div className="relative p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-2 gap-y-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-narvo-ink/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint border border-narvo-teal/15 dark:border-white/10">
                    <Radio size={12} aria-hidden />
                    {COPY.brand_name}
                  </span>
                  {displayDateLine ? (
                    <span className="font-mono text-[11px] text-narvo-ink/55 dark:text-white/50">{displayDateLine}</span>
                  ) : null}
                </div>

                <h1 id="briefing-hero-title" className="font-serif text-[1.75rem] sm:text-4xl lg:text-[2.35rem] font-bold text-narvo-ink dark:text-white tracking-tight leading-[1.15]">
                  {headlineTitle}
                </h1>

                <p className="mt-3 text-base sm:text-lg text-narvo-ink/65 dark:text-white/60 leading-relaxed max-w-2xl">
                  {loading && !selectedBriefing
                    ? COPY.briefing_page_hang_tight
                    : error && !selectedBriefing
                      ? error
                      : homeBriefingMeta(metaCount, metaMinutes)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/80 dark:bg-white/10 px-3 py-1.5 font-mono text-[11px] font-bold text-narvo-ink dark:text-white border border-narvo-ink/10 dark:border-white/10">
                    {metaCount} stories
                  </span>
                  <span className="rounded-full bg-narvo-vermilion/10 dark:bg-narvo-vermilion/15 px-3 py-1.5 font-mono text-[11px] font-bold text-narvo-vermilion border border-narvo-vermilion/20">
                    ~{metaMinutes} min
                  </span>
                  {briefing?.voice_id ? (
                    <span className="rounded-full px-3 py-1.5 font-mono text-[11px] text-narvo-ink/55 dark:text-white/45 border border-narvo-ink/10 dark:border-white/10">
                      Voice · {String(briefing.voice_id)}
                    </span>
                  ) : null}
                </div>

                {selectedBriefing ? (
                  <p className="mt-4 text-sm font-medium text-narvo-teal dark:text-narvo-mint">
                    {COPY.briefing_page_viewing_for}{' '}
                    <span className="font-mono">{selectedBriefing.date}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedBriefing(null)}
                      className="ml-3 underline underline-offset-2 text-narvo-ink/60 dark:text-white/50 hover:text-narvo-teal dark:hover:text-narvo-mint font-sans font-normal"
                    >
                      {COPY.briefing_page_show_latest}
                    </button>
                  </p>
                ) : null}

                <div
                  role="toolbar"
                  aria-label={COPY.briefing_title}
                  className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3"
                >
                  <button
                    type="button"
                    onClick={handlePlay}
                    disabled={loading || selectedLoading || !briefing || !hasAudio}
                    className="inline-flex flex-1 sm:flex-none min-w-[min(100%,220px)] items-center justify-center gap-2.5 min-h-[56px] rounded-full bg-narvo-vermilion px-10 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-narvo-vermilion/25 hover:bg-[#e0441f] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
                    title={!hasAudio && briefing ? COPY.briefing_page_play_requires_audio : undefined}
                  >
                    {briefingIsActive ? (
                      <Pause size={22} fill="currentColor" aria-hidden />
                    ) : (
                      <Play size={22} fill="currentColor" aria-hidden />
                    )}
                    {primaryCtaLabel}
                  </button>
                  <div className="flex flex-wrap gap-2 sm:ml-1">
                    <button
                      type="button"
                      onClick={() => void handleGenerate()}
                      disabled={generateBusy}
                      className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full border-2 border-narvo-teal/40 bg-white/50 dark:bg-narvo-ink/40 px-5 py-2.5 text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:bg-narvo-teal/10 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={17} className={generateBusy ? 'animate-spin' : ''} aria-hidden />
                      {COPY.briefing_page_regenerate}
                    </button>
                    {hasScript && !hasAudio && briefing?.id ? (
                      <button
                        type="button"
                        onClick={handleGenerateAudio}
                        disabled={audioBusy || loading || selectedLoading}
                        className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 bg-white/40 dark:bg-narvo-ink/30 px-5 py-2.5 text-sm font-bold text-narvo-ink dark:text-white hover:bg-white/70 dark:hover:bg-narvo-ink/50 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={17} className={audioBusy ? 'animate-spin' : ''} aria-hidden />
                        {audioBusy ? COPY.briefing_page_generate_audio_busy : COPY.briefing_page_generate_audio}
                      </button>
                    ) : null}
                  </div>
                </div>

                {generateMessage ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-2xl border border-narvo-teal/20 bg-narvo-teal/5 dark:bg-narvo-mint/10 px-4 py-3 text-sm text-narvo-ink/75 dark:text-white/70"
                    role="status"
                  >
                    {generateMessage}
                  </motion.p>
                ) : null}

                {!hasAudio && !loading && !selectedLoading && !error && briefing ? (
                  <p className="mt-4 text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.briefing_page_no_audio_hint}</p>
                ) : null}

                <p className="mt-6 text-xs text-narvo-ink/40 dark:text-white/35 leading-relaxed font-mono">
                  {COPY.briefing_page_regenerate_footer_before}{' '}
                  <span className="text-narvo-teal/80 dark:text-narvo-mint/80">{COPY.briefing_api_generate_path}</span>{' '}
                  {COPY.briefing_page_regenerate_footer_after}
                </p>
              </div>
            </motion.article>

            {/* Mobile + tablet: transcript before rundown so “follow along” sits under hero */}
            <div className="lg:hidden space-y-6 sm:space-y-8">
              <TranscriptSurface id="briefing-transcript-mobile" title={COPY.briefing_transcript} className="shadow-md">
                {transcriptBodyInner}
              </TranscriptSurface>
              {storyRundown}
              {historySection}
            </div>

            {/* Desktop only: rundown + history in left column */}
            <div className="hidden lg:block space-y-8">
              {storyRundown}
              {historySection}
            </div>
          </div>

          {/* —— Right column (desktop): transcript —— */}
          <div className="hidden lg:block min-w-0 pt-2">
            <TranscriptSurface
              id="briefing-transcript-desktop"
              title={COPY.briefing_transcript}
              scrollBody
              className="lg:sticky lg:top-4 max-h-[calc(100dvh-6.5rem)]"
            >
              {transcriptBodyInner}
            </TranscriptSurface>
          </div>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
