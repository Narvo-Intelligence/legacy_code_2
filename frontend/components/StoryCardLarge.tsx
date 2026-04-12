'use client';

import React, { useEffect, useRef, useState, useCallback, startTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Play, Share2, Download, Clock, Loader2 } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { useOfflineDownload } from '@/components/OfflineDownloadContext';
import { useToast } from '@/components/Toast';
import { narvoTrack } from '@/lib/narvo-analytics';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel, type ApiNewsListItem } from '@/lib/narvo-api';
import { shareStory } from '@/lib/story-share';
import { truthTagFromListItem } from '@/lib/truth-map';
import { resolveStoryPlayback } from '@/lib/story-playback';

export type StoryCardFeedVariant = 'trending' | 'latest';

export type StoryCardLargeProps = {
  item: ApiNewsListItem;
  /** First slot on dashboard — teal emphasis ring (habit surface). */
  featured?: boolean;
  /** Dashboard rows: distinct trending vs latest chrome and fixed card geometry. */
  feedVariant?: StoryCardFeedVariant;
};

function estimateReadMinutes(text: string): number {
  if (!text.trim()) return 1;
  return Math.max(1, Math.min(12, Math.ceil(text.length / 900)));
}

/**
 * Large story surface — dashboard feed rows (editorial card, compact height on feed variants).
 */
export function StoryCardLarge({ item, featured = false, feedVariant }: StoryCardLargeProps) {
  const id = item.id;
  const title = item.title?.trim() || 'Untitled';
  const source = item.source?.trim() || 'Narvo';
  const category = (item.category || 'General').toUpperCase();
  const time = formatFeedTimeLabel(item.published);
  const truth = truthTagFromListItem(item);
  const imageUrl =
    typeof item.image_url === 'string' && item.image_url.trim().length > 0 ? item.image_url.trim() : null;
  const summaryRaw = (item.short_summary ?? item.summary) as string | undefined;
  const summary = typeof summaryRaw === 'string' ? summaryRaw.trim() : '';
  const trustPct =
    typeof item.trust_score === 'number' && !Number.isNaN(item.trust_score)
      ? Math.max(0, Math.min(100, Math.round(item.trust_score)))
      : null;

  const { playTrack } = useAudioPlayer();
  const { downloadStory, progressById, errorById, clearError, retryStory, savedFlashId } = useOfflineDownload();
  const { success: toastSuccess, info: toastInfo } = useToast();
  const [playBusy, setPlayBusy] = useState(false);
  const dlProgress = progressById[id];
  const dlError = errorById[id];
  const savedToastFired = useRef(false);
  const readMin = estimateReadMinutes(summary);

  useEffect(() => {
    if (savedFlashId === id) {
      if (savedToastFired.current) return;
      savedToastFired.current = true;
      toastSuccess(COPY.toast_saved_offline);
    }
    if (savedFlashId == null || savedFlashId !== id) {
      savedToastFired.current = false;
    }
  }, [savedFlashId, id, toastSuccess]);

  const handlePlay = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (playBusy) return;
      setPlayBusy(true);
      try {
        const track = await resolveStoryPlayback(id, { id, title, source, category });
        setPlayBusy(false);
        startTransition(() => {
          playTrack(track);
          if (!track.audioUrl?.trim()) {
            toastInfo(COPY.toast_story_no_audio);
          }
        });
      } catch {
        setPlayBusy(false);
      }
    },
    [playBusy, id, title, source, category, playTrack, toastInfo]
  );

  const shareLocation = feedVariant ? `feed_${feedVariant}` : featured ? 'feed_featured' : 'feed_card';

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await shareStory({
      storyId: id,
      title,
      summary,
      source,
    });
    if (result === 'native') {
      toastInfo(COPY.toast_share_opened);
    } else if (result === 'clipboard') {
      toastInfo(COPY.toast_share_copied);
    } else if (result === 'unsupported') {
      toastInfo(COPY.toast_share_failed);
    }
    if (result !== 'cancelled') {
      narvoTrack('story_share', {
        story_id: id,
        category: item.category || null,
        location: shareLocation,
        channel: result,
      });
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearError(id);
    void downloadStory({ id, title, source, category, time });
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    retryStory({ id, title, source, category, time });
  };

  const circumference = 2 * Math.PI * 9;
  const strokeDash = dlProgress != null ? circumference * (1 - dlProgress / 100) : circumference;

  const isTrending = feedVariant === 'trending';
  const isLatest = feedVariant === 'latest';
  const feedCompact = isTrending || isLatest;

  /** Feed cards grow with content — no fixed height (avoids clipping titles/summaries). */
  const uniformFeedH = 'min-h-[132px] h-auto w-full max-w-full';

  const shellBase =
    'relative overflow-hidden bg-narvo-cloud dark:bg-narvo-ink border border-narvo-ink/[0.08] dark:border-white/[0.09] shadow-[0_8px_28px_-12px_rgba(23,50,74,0.12)] dark:shadow-[0_12px_36px_-10px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-[0_14px_36px_-14px_rgba(23,50,74,0.16)] dark:hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.48)] group rounded-[16px] max-lg:max-w-full lg:rounded-[20px]';

  const metaRow = (
    <div
      className={`flex flex-wrap justify-between items-start gap-x-2 gap-y-1.5 shrink-0 ${
        feedCompact ? 'mb-1' : 'mb-2'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {isTrending ? (
          <span className="rounded-full bg-narvo-vermilion/12 dark:bg-narvo-vermilion/20 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-narvo-vermilion shrink-0">
            {COPY.feed_card_trending_kicker}
          </span>
        ) : null}
        {isLatest ? (
          <span className="rounded-full bg-narvo-teal/12 dark:bg-narvo-teal/20 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-narvo-teal dark:text-narvo-mint shrink-0">
            {COPY.feed_card_latest_kicker}
          </span>
        ) : null}
        <span className="font-mono text-[9px] lg:text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase shrink-0">
          {category}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 max-w-[min(100%,240px)] sm:max-w-none">
        {trustPct != null ? (
          <span className="rounded-full bg-narvo-mist/90 dark:bg-white/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-narvo-teal dark:text-narvo-mint tabular-nums">
            {COPY.truth_confidence_chip.replace('{pct}', String(trustPct))}
          </span>
        ) : null}
        <TruthTag
          status={truth.status}
          sources={truth.sources}
          details={truth.details}
          lastChecked={truth.lastChecked}
        />
      </div>
    </div>
  );

  const footerRow = (
    <div
      className={`flex flex-col mt-auto shrink-0 ${feedCompact ? 'gap-1 pt-1' : 'gap-2 pt-2'}`}
    >
      <div
        className={`flex flex-wrap sm:flex-nowrap items-center justify-between ${
          feedCompact ? 'gap-2' : 'gap-3'
        }`}
      >
        <div
          className={`${
            feedCompact ? 'text-[9px] sm:text-[10px]' : 'text-[10px] lg:text-xs'
          } text-narvo-ink/40 dark:text-white/40 font-medium font-mono tracking-wide min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5`}
        >
          <span className={`min-w-0 break-words ${feedCompact ? 'line-clamp-2' : 'line-clamp-2 sm:line-clamp-3'}`}>
            {source}
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{time}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <Clock className={`${feedCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} opacity-70`} aria-hidden />
            {COPY.feed_card_read_time.replace('{n}', String(readMin))}
          </span>
        </div>
        <div className={`flex items-center shrink-0 ${feedCompact ? 'gap-1' : 'gap-1.5 sm:gap-2'}`}>
          <button
            type="button"
            onClick={(e) => void handleShare(e)}
            className={`rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center ${
              feedCompact ? 'p-1.5 min-h-[32px] min-w-[32px]' : 'p-2.5 min-h-[40px] min-w-[40px]'
            }`}
            aria-label="Share story"
          >
            <Share2 className={feedCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={dlProgress != null && dlProgress < 100}
            className={`relative rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-70 ${
              feedCompact ? 'p-1.5 min-h-[32px] min-w-[32px]' : 'p-2.5 min-h-[40px] min-w-[40px]'
            }`}
            aria-label={dlProgress != null && dlProgress < 100 ? COPY.offline_downloading : 'Save offline'}
          >
            {dlProgress != null && dlProgress < 100 ? (
              <svg
                className={`${feedCompact ? 'w-4 h-4' : 'w-5 h-5'} -rotate-90`}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" fill="none" className="stroke-narvo-ink/15 dark:stroke-white/15" strokeWidth="2" />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  className="stroke-narvo-teal transition-[stroke-dashoffset]"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                />
              </svg>
            ) : (
              <Download className={feedCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => void handlePlay(e)}
            disabled={playBusy}
            className={`rounded-full bg-narvo-vermilion text-white shadow-md shadow-narvo-vermilion/22 transition-transform active:scale-[0.96] flex items-center justify-center disabled:opacity-60 ${
              feedCompact ? 'p-1.5 min-h-[32px] min-w-[32px]' : 'p-2.5 min-h-[42px] min-w-[42px]'
            }`}
            aria-label={`Play: ${title}`}
          >
            {playBusy ? (
              <Loader2
                className={`${feedCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin`}
                aria-hidden
              />
            ) : (
              <Play className={feedCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="currentColor" aria-hidden />
            )}
          </button>
        </div>
      </div>
      {dlError ? (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-narvo-vermilion dark:text-narvo-vermilion/90">
          <span>{dlError}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="font-bold underline underline-offset-2 hover:opacity-90"
          >
            {COPY.offline_retry}
          </button>
        </div>
      ) : null}
    </div>
  );

  const trendingImageCol = (
    <div className="relative w-[min(30vw,96px)] sm:w-[34%] sm:max-w-[160px] lg:max-w-[172px] shrink-0 self-stretch min-h-0 overflow-hidden rounded-l-[16px] rounded-r-none sm:rounded-l-[18px] lg:rounded-l-[20px]">
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={title ? `Image for: ${title.slice(0, 100)}` : 'Story image'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 96px, 172px"
            unoptimized
            priority={featured}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-narvo-ink/35 via-transparent to-transparent dark:from-black/40 sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-narvo-ink/20 dark:sm:to-black/30"
            aria-hidden
          />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-narvo-mist/90 via-narvo-teal/12 to-narvo-vermilion/15 dark:from-narvo-ink/90 dark:via-narvo-teal/20 dark:to-narvo-vermilion/20"
          aria-hidden
        />
      )}
    </div>
  );

  if (isTrending) {
    return (
      <div
        className={`${shellBase} flex flex-row items-stretch ${uniformFeedH} h-full border-l-4 border-l-narvo-vermilion pl-0 ${
          featured
            ? 'ring-1 ring-narvo-teal/12 lg:shadow-[0_16px_48px_-14px_rgba(15,95,115,0.2)]'
            : ''
        }`}
      >
        {featured ? (
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-narvo-teal/[0.08] dark:bg-narvo-mint/[0.06] blur-2xl"
            aria-hidden
          />
        ) : null}
        {trendingImageCol}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden p-2.5 sm:p-3">
          {metaRow}
          <Link
            href={`/news/${id}`}
            className="block min-w-0 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40"
          >
            <h3
              className={`line-clamp-3 break-words font-serif font-medium leading-snug text-narvo-ink transition-colors group-hover:text-narvo-teal dark:text-white ${
                featured ? 'text-[0.9rem] sm:text-base lg:text-lg' : 'text-[0.875rem] sm:text-[0.95rem] lg:text-base'
              }`}
            >
              {title}
            </h3>
          </Link>
          {summary ? (
            <p className="mt-1 line-clamp-3 shrink-0 break-words text-[12px] leading-relaxed text-narvo-ink/58 dark:text-white/48 sm:text-[13px]">
              {summary}
            </p>
          ) : null}
          {footerRow}
        </div>
      </div>
    );
  }

  if (isLatest) {
    return (
      <div
        className={`${shellBase} flex flex-col ${uniformFeedH} h-full border-dashed border-narvo-ink/16 dark:border-white/12 bg-narvo-mist/30 dark:bg-white/[0.025] p-2.5 sm:p-3`}
      >
        {metaRow}
        <Link
          href={`/news/${id}`}
          className="block min-w-0 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40"
        >
          <h3 className="line-clamp-3 break-words font-serif text-[0.875rem] font-medium leading-snug text-narvo-ink transition-colors group-hover:text-narvo-teal dark:text-white sm:text-[0.95rem] lg:text-base">
            {title}
          </h3>
        </Link>
        {summary ? (
          <p className="mt-1 line-clamp-3 shrink-0 break-words text-[12px] leading-relaxed text-narvo-ink/58 dark:text-white/48 sm:text-[13px]">
            {summary}
          </p>
        ) : null}
        {footerRow}
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${shellBase} p-3.5 lg:p-5 xl:p-6 ${
        featured
          ? 'border-narvo-teal/22 dark:border-narvo-teal/25 ring-1 ring-narvo-teal/10 lg:border-narvo-teal/24 lg:ring-narvo-teal/12 lg:shadow-[0_14px_40px_-14px_rgba(15,95,115,0.18)]'
          : ''
      }`}
    >
      {featured ? (
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 lg:-right-20 lg:-top-20 lg:h-56 lg:w-56 rounded-full bg-narvo-teal/[0.07] dark:bg-narvo-mint/[0.06] blur-2xl"
          aria-hidden
        />
      ) : null}
      {imageUrl ? (
        <div
          className={`relative -mx-3.5 -mt-3.5 mb-2.5 overflow-hidden lg:-mx-5 lg:-mt-5 lg:mb-4 xl:-mx-6 xl:-mt-6 xl:mb-4 ${
            featured ? 'aspect-[21/9] max-h-[150px] lg:max-h-[170px]' : 'aspect-[2/1] max-h-[120px] lg:max-h-[140px]'
          } w-full rounded-t-[16px] lg:rounded-t-[20px] xl:rounded-t-[22px]`}
        >
          <Image
            src={imageUrl}
            alt={title ? `Image for: ${title.slice(0, 100)}` : 'Story image'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 896px"
            unoptimized
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-narvo-ink/55 via-narvo-ink/10 to-transparent dark:from-black/60"
            aria-hidden
          />
        </div>
      ) : null}
      {metaRow}
      <Link
        href={`/news/${id}`}
        className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 rounded-lg"
      >
        <h3
          className={`line-clamp-3 break-words font-serif font-medium leading-snug text-narvo-ink transition-colors group-hover:text-narvo-teal dark:text-white max-lg:mb-2 lg:mb-3 ${
            featured
              ? 'text-[1rem] lg:text-lg xl:text-xl xl:leading-tight'
              : 'text-[0.9rem] lg:text-base xl:text-[1.15rem]'
          }`}
        >
          {title}
        </h3>
      </Link>
      {summary ? (
        <p className="relative mb-2 mt-1.5 line-clamp-3 break-words text-[13px] leading-relaxed text-narvo-ink/58 dark:text-white/48 lg:mb-3 lg:mt-2 lg:text-sm">
          {summary}
        </p>
      ) : null}
      {footerRow}
    </div>
  );
}

export type StoryCardLargeLandingProps = {
  item: ApiNewsListItem;
  icon: LucideIcon;
  /** Passed from landing for motion preferences */
  reduceMotion?: boolean;
};

/**
 * Landing grid variant — taller typography, icon strip (live marketing section).
 */
export function StoryCardLargeLanding({ item, icon: Icon, reduceMotion = false }: StoryCardLargeLandingProps) {
  const truth = truthTagFromListItem(item);
  const cat = (item.category || 'General').toUpperCase();
  const timeLabel = formatFeedTimeLabel(item.published);
  const title = item.title?.trim() || 'Untitled';
  const source = item.source?.trim() || 'Narvo';
  const category = (item.category || 'General').toUpperCase();

  const { playTrack } = useAudioPlayer();
  const { info: toastInfo } = useToast();
  const { downloadStory, progressById, errorById, clearError, retryStory } = useOfflineDownload();
  const dlProgress = progressById[item.id];
  const dlError = errorById[item.id];
  const circumference = 2 * Math.PI * 9;
  const strokeDash = dlProgress != null ? circumference * (1 - dlProgress / 100) : circumference;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = item.id;
    void resolveStoryPlayback(id, { id, title, source, category }).then((track) => {
      startTransition(() => {
        playTrack(track);
        if (!track.audioUrl?.trim()) {
          toastInfo(COPY.toast_story_no_audio);
        }
      });
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await shareStory({
      storyId: item.id,
      title,
      source,
    });
    if (result === 'native') {
      toastInfo(COPY.toast_share_opened);
    } else if (result === 'clipboard') {
      toastInfo(COPY.toast_share_copied);
    } else if (result === 'unsupported') {
      toastInfo(COPY.toast_share_failed);
    }
    if (result !== 'cancelled') {
      narvoTrack('story_share', {
        story_id: item.id,
        category: item.category || null,
        location: 'landing_story_card',
        channel: result,
      });
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearError(item.id);
    void downloadStory({
      id: item.id,
      title,
      source,
      category,
      time: timeLabel,
    });
  };

  const handleRetryDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    retryStory({
      id: item.id,
      title,
      source,
      category,
      time: timeLabel,
    });
  };

  return (
    <Link
      href={`/news/${item.id}`}
      className="group relative flex h-full min-w-0 w-full flex-col justify-between rounded-[20px] border border-narvo-ink/5 bg-white p-4 shadow-lg shadow-narvo-ink/5 transition-all duration-300 hover:shadow-xl dark:border-white/5 dark:bg-narvo-ink sm:rounded-[26px] sm:p-5 md:rounded-[32px] md:p-6"
    >
      <div>
        <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5">
          <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-vermilion sm:text-[10px]">
            {cat}
          </span>
          <TruthTag
            status={truth.status}
            sources={truth.sources}
            details={truth.details}
            lastChecked={truth.lastChecked}
          />
        </div>
        <h3 className="mb-4 line-clamp-4 break-words font-serif text-lg font-medium leading-tight text-narvo-ink transition-colors group-hover:text-narvo-teal dark:text-white sm:mb-5 sm:text-xl md:text-2xl">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-narvo-ink/40 dark:text-white/40">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="h-6 w-6 shrink-0 rounded-full bg-narvo-mist dark:bg-white/10 flex items-center justify-center text-narvo-ink/60 dark:text-white/60">
                <Icon size={14} aria-hidden />
              </div>
              <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                <span className="line-clamp-2 break-words">{source}</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-narvo-mint" title="Source on file" />
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1">
              <span aria-hidden>·</span>
              <Clock size={12} className="inline" aria-hidden /> {timeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <button
              type="button"
              onClick={(e) => void handleShare(e)}
              className="rounded-full bg-narvo-ink/5 p-2.5 text-narvo-ink/60 transition-colors hover:bg-narvo-ink/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
              aria-label="Share story"
            >
              <Share2 size={15} aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={dlProgress != null && dlProgress < 100}
              className="relative rounded-full bg-narvo-ink/5 p-2.5 text-narvo-ink/60 transition-colors hover:bg-narvo-ink/10 disabled:opacity-70 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
              aria-label={dlProgress != null && dlProgress < 100 ? COPY.offline_downloading : 'Save for offline'}
            >
              {dlProgress != null && dlProgress < 100 ? (
                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" className="stroke-narvo-ink/15 dark:stroke-white/15" strokeWidth="2" />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    className="stroke-narvo-teal"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDash}
                  />
                </svg>
              ) : (
                <Download size={16} aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={handlePlay}
              className="rounded-full bg-narvo-vermilion p-2.5 text-white transition-transform active:scale-[0.96]"
              aria-label="Listen now"
            >
              <Play size={15} fill="currentColor" aria-hidden />
            </button>
          </div>
        </div>
        {dlError ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-narvo-vermilion">
            <span>{dlError}</span>
            <button type="button" onClick={handleRetryDownload} className="font-bold underline underline-offset-2">
              {COPY.offline_retry}
            </button>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
