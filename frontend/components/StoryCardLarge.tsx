'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Play, Share2, Download, Clock } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { useOfflineDownload } from '@/components/OfflineDownloadContext';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel, getSharePageUrlForStory, type ApiNewsListItem } from '@/lib/narvo-api';
import { truthTagFromListItem } from '@/lib/truth-map';
import { resolveStoryPlayback } from '@/lib/story-playback';

export type StoryCardLargeProps = {
  item: ApiNewsListItem;
  /** First slot on dashboard — teal emphasis ring (habit surface). */
  featured?: boolean;
};

/**
 * Large story surface — dashboard feed hero rows (Component DS StoryCardLarge).
 */
export function StoryCardLarge({ item, featured = false }: StoryCardLargeProps) {
  const id = item.id;
  const title = item.title?.trim() || 'Untitled';
  const source = item.source?.trim() || 'Narvo';
  const category = (item.category || 'General').toUpperCase();
  const time = formatFeedTimeLabel(item.published);
  const truth = truthTagFromListItem(item);

  const { playTrack } = useAudioPlayer();
  const { downloadStory, progressById, errorById, clearError, retryStory } = useOfflineDownload();
  const dlProgress = progressById[id];
  const dlError = errorById[id];

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void resolveStoryPlayback(id, { id, title, source, category }).then((track) => playTrack(track));
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator
        .share({
          title,
          text: `Check out this story on Narvo: ${title}`,
          url: getSharePageUrlForStory(id),
        })
        .catch(() => {});
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

  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-narvo-ink border border-narvo-ink/6 dark:border-white/8 shadow-sm transition-all duration-300 hover:shadow-lg group rounded-[20px] p-4 max-lg:max-w-full lg:rounded-[28px] lg:p-6 xl:rounded-[32px] xl:p-8 ${
        featured
          ? 'border-narvo-teal/18 dark:border-narvo-teal/22 ring-1 ring-narvo-teal/8 lg:border-narvo-teal/20 lg:ring-narvo-teal/10 lg:shadow-md'
          : ''
      }`}
    >
      {featured ? (
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 lg:-right-20 lg:-top-20 lg:h-56 lg:w-56 rounded-full bg-narvo-teal/[0.07] dark:bg-narvo-mint/[0.06] blur-2xl"
          aria-hidden
        />
      ) : null}
      <div className="relative flex justify-between items-start gap-2 mb-3 lg:mb-5">
        <span className="font-mono text-[9px] lg:text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase shrink-0">
          {category}
        </span>
        <TruthTag
          status={truth.status}
          sources={truth.sources}
          details={truth.details}
          lastChecked={truth.lastChecked}
        />
      </div>
      <Link
        href={`/news/${id}`}
        className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 rounded-lg"
      >
        <h3
          className={`font-serif font-medium text-narvo-ink dark:text-white group-hover:text-narvo-teal transition-colors leading-snug line-clamp-2 max-lg:mb-3 lg:line-clamp-none lg:mb-5 ${
            featured
              ? 'text-[1.05rem] lg:text-xl xl:text-2xl xl:leading-tight'
              : 'text-[0.95rem] lg:text-lg xl:text-[1.35rem]'
          }`}
        >
          {title}
        </h3>
      </Link>
      <div className="relative flex flex-col gap-2">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="text-[10px] lg:text-xs text-narvo-ink/40 dark:text-white/40 font-medium font-mono tracking-wide min-w-0">
            {source} · {time}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 min-h-[40px] min-w-[40px] lg:p-3 lg:min-h-[44px] lg:min-w-[44px] rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
              aria-label="Share story"
            >
              <Share2 className="w-4 h-4 lg:w-[18px] lg:h-[18px]" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={dlProgress != null && dlProgress < 100}
              className="relative p-2.5 min-h-[40px] min-w-[40px] lg:p-3 lg:min-h-[44px] lg:min-w-[44px] rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-70"
              aria-label={dlProgress != null && dlProgress < 100 ? COPY.offline_downloading : 'Save offline'}
            >
              {dlProgress != null && dlProgress < 100 ? (
                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24" aria-hidden>
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
                <Download className="w-4 h-4 lg:w-[18px] lg:h-[18px]" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={handlePlay}
              className="p-2.5 min-h-[42px] min-w-[42px] lg:p-3.5 lg:min-h-[48px] lg:min-w-[48px] rounded-full bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/25 transition-transform active:scale-[0.96] flex items-center justify-center"
              aria-label={`Play: ${title}`}
            >
              <Play className="w-4 h-4 lg:w-[18px] lg:h-[18px]" fill="currentColor" aria-hidden />
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
  const { downloadStory, progressById, errorById, clearError, retryStory } = useOfflineDownload();
  const dlProgress = progressById[item.id];
  const dlError = errorById[item.id];
  const circumference = 2 * Math.PI * 9;
  const strokeDash = dlProgress != null ? circumference * (1 - dlProgress / 100) : circumference;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = item.id;
    void resolveStoryPlayback(id, { id, title, source, category }).then((track) => playTrack(track));
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getSharePageUrlForStory(item.id);
    if (navigator.share) {
      navigator
        .share({
          title,
          text: `Check out this story on Narvo: ${title}`,
          url,
        })
        .catch(console.error);
    } else {
      void navigator.clipboard.writeText(url).catch(() => {
        alert('Sharing is not supported on this browser.');
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
      className="w-full min-w-0 h-full p-5 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[32px] md:rounded-[40px] bg-white dark:bg-narvo-ink border border-narvo-ink/5 dark:border-white/5 shadow-xl shadow-narvo-ink/5 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 group relative"
    >
      <div>
        <div className="flex justify-between items-center gap-2 mb-6">
          <span className="font-mono text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase shrink-0">{cat}</span>
          <TruthTag
            status={truth.status}
            sources={truth.sources}
            details={truth.details}
            lastChecked={truth.lastChecked}
          />
        </div>
        <h3 className="text-xl sm:text-2xl font-serif font-medium text-narvo-ink dark:text-white leading-tight mb-6 sm:mb-8 group-hover:text-narvo-teal transition-colors">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-narvo-ink/40 dark:text-white/40 font-medium min-w-0">
            <div className="w-6 h-6 shrink-0 rounded-full bg-narvo-mist dark:bg-white/10 flex items-center justify-center text-narvo-ink/60 dark:text-white/60">
              <Icon size={14} aria-hidden />
            </div>
            <span className="flex items-center gap-1 truncate">
              {source}
              <span className="w-1 h-1 shrink-0 rounded-full bg-narvo-mint" title="Source on file" />
            </span>
            <span className="shrink-0">·</span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock size={12} className="inline" aria-hidden /> {timeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="p-3 rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Share story"
            >
              <Share2 size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={dlProgress != null && dlProgress < 100}
              className="relative p-3 rounded-full bg-narvo-ink/5 dark:bg-white/5 text-narvo-ink/60 dark:text-white/60 hover:bg-narvo-ink/10 dark:hover:bg-white/10 transition-colors disabled:opacity-70"
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
              className="p-3 rounded-full bg-narvo-vermilion text-white transition-transform active:scale-[0.96]"
              aria-label="Listen now"
            >
              <Play size={16} fill="currentColor" aria-hidden />
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
