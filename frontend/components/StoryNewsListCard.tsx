'use client';

import React, { startTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Clock, Play, Pause, Bookmark, Radio, Mic2 } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { useToast } from '@/components/Toast';
import { COPY } from '@/lib/narvo-app-copy';
import { formatFeedTimeLabel, type ApiNewsListItem } from '@/lib/narvo-api';
import { truthTagFromListItem } from '@/lib/truth-map';
import { resolveStoryPlayback } from '@/lib/story-playback';

export type StoryNewsListCardProps = {
  item: ApiNewsListItem;
  index?: number;
  staggerDelay?: number;
  bookmarked?: boolean;
  onBookmarkToggle?: (item: ApiNewsListItem) => void;
  bookmarkBusy?: boolean;
};

function stationStreamUrl(item: ApiNewsListItem): string {
  const st = item.station as Record<string, unknown> | undefined;
  const u = st?.url_resolved || st?.url || item.source_url;
  return typeof u === 'string' ? u.trim() : '';
}

const thumbBox =
  'relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-[14px] bg-narvo-mist dark:bg-white/[0.06] sm:h-[4.5rem] sm:w-[4.5rem]';

/**
 * Compact row — thumb + headline + actions (discover / search). Matches dashboard card radius language.
 */
export function StoryNewsListCard({
  item,
  index = 0,
  staggerDelay = 0.04,
  bookmarked = false,
  onBookmarkToggle,
  bookmarkBusy = false,
}: StoryNewsListCardProps) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { info: toastInfo } = useToast();
  const truth = truthTagFromListItem(item);
  const timeLabel = formatFeedTimeLabel(item.published);
  const cat = (item.category || 'General').toUpperCase();

  const sourceType = String(item.source_type || '').toLowerCase();
  const isRadio = sourceType === 'radio' || String(item.id).startsWith('radio:');
  const isPodcast =
    sourceType === 'podcast' || String(item.category || '').toLowerCase() === 'podcast';
  const streamUrl = isRadio ? stationStreamUrl(item) : isPodcast ? String(item.source_url || '').trim() : '';

  const headline = item.title?.trim() || 'Untitled';
  const imageUrl =
    typeof item.image_url === 'string' && item.image_url.trim().length > 0 ? item.image_url.trim() : null;

  const articleHref = (() => {
    if (isRadio) {
      if (streamUrl) return streamUrl;
      return '/discover';
    }
    if (isPodcast) return '/discover';
    return `/news/${encodeURIComponent(item.id)}`;
  })();

  const isExternalArticle = /^https?:\/\//i.test(articleHref);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = item.id;
    const title = item.title?.trim() || 'Untitled';
    const source = item.source?.trim() || 'Narvo';
    const category = (item.category || 'General').toUpperCase();

    if (currentTrack?.id === id) {
      startTransition(() => {
        togglePlayPause();
      });
      return;
    }

    if (isRadio || isPodcast) {
      if (streamUrl) {
        startTransition(() => {
          playTrack({
            id,
            title,
            source,
            category: isRadio ? 'Radio' : category,
            audioUrl: streamUrl,
          });
        });
        return;
      }
      toastInfo(COPY.toast_story_no_audio);
      return;
    }

    void resolveStoryPlayback(id, { id, title, source, category }).then((track) => {
      startTransition(() => {
        playTrack(track);
        if (!track.audioUrl?.trim()) {
          toastInfo(COPY.toast_story_no_audio);
        }
      });
    });
  };

  const thumb = isRadio ? (
    <div className={`${thumbBox} flex items-center justify-center bg-narvo-teal/12 dark:bg-narvo-teal/18`}>
      <Radio className="h-6 w-6 text-narvo-teal dark:text-narvo-mint" aria-hidden />
    </div>
  ) : isPodcast ? (
    <div className={`${thumbBox} flex items-center justify-center bg-narvo-vermilion/10 dark:bg-narvo-vermilion/15`}>
      <Mic2 className="h-6 w-6 text-narvo-vermilion" aria-hidden />
    </div>
  ) : imageUrl ? (
    <div className={thumbBox}>
      <Image
        src={imageUrl}
        alt={headline ? `Image for: ${headline.slice(0, 80)}` : 'Story image'}
        fill
        className="object-cover"
        sizes="72px"
        unoptimized
      />
    </div>
  ) : (
    <div
      className={`${thumbBox} bg-gradient-to-br from-narvo-mist via-narvo-teal/10 to-narvo-vermilion/12 dark:from-narvo-ink dark:via-narvo-teal/15 dark:to-narvo-vermilion/15`}
      aria-hidden
    />
  );

  const cardClassName =
    'flex gap-3 p-3 sm:gap-3.5 sm:p-3.5 rounded-[16px] sm:rounded-[18px] bg-narvo-cloud dark:bg-narvo-ink border border-narvo-ink/[0.07] dark:border-white/[0.08] shadow-[0_6px_22px_-10px_rgba(23,50,74,0.12)] dark:shadow-[0_8px_28px_-10px_rgba(0,0,0,0.35)] hover:border-narvo-teal/22 dark:hover:border-narvo-teal/28 transition-all group';

  const inner = (
    <>
      {thumb}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-vermilion sm:text-[10px]">
            {cat}
          </span>
          <span className="text-narvo-ink/18 dark:text-white/18" aria-hidden>
            •
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] font-medium text-narvo-ink/42 dark:text-white/38 sm:text-[10px]">
            <Clock className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
            {timeLabel}
          </span>
        </div>
        <h3 className="line-clamp-3 break-words font-serif text-[0.9rem] font-medium leading-snug text-narvo-ink transition-colors group-hover:text-narvo-teal dark:text-white sm:text-[0.95rem]">
          {headline}
        </h3>
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 pt-0.5">
          <p className="min-w-0 flex-1 basis-[min(100%,12rem)] line-clamp-2 break-words text-[11px] font-medium text-narvo-ink/50 dark:text-white/45 sm:basis-auto sm:text-xs">
            {item.source || 'Narvo'}
          </p>
          <span className="shrink-0">
            <TruthTag
              status={truth.status}
              sources={truth.sources}
              details={truth.details}
              lastChecked={truth.lastChecked}
            />
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-stretch sm:flex-row sm:gap-1.5">
        {onBookmarkToggle ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmarkToggle(item);
            }}
            disabled={bookmarkBusy}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all active:scale-[0.96] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px] ${
              bookmarked
                ? 'bg-narvo-teal/14 text-narvo-teal dark:bg-narvo-mint/14 dark:text-narvo-mint'
                : 'bg-narvo-ink/[0.04] text-narvo-ink/50 hover:bg-narvo-teal/10 hover:text-narvo-teal dark:bg-white/[0.06] dark:text-white/50'
            } disabled:opacity-45`}
            aria-label={bookmarked ? COPY.news_bookmark_remove_a11y : COPY.news_bookmark_a11y}
            aria-pressed={bookmarked}
          >
            <Bookmark className="h-[18px] w-[18px]" fill={bookmarked ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={handlePlay}
          className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all active:scale-[0.96] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px] ${
            currentTrack?.id === item.id && isPlaying
              ? 'bg-narvo-vermilion text-white shadow-md shadow-narvo-vermilion/18'
              : 'bg-narvo-ink/[0.06] text-narvo-ink dark:bg-white/[0.08] dark:text-white group-hover:bg-narvo-teal group-hover:text-white'
          }`}
          aria-label={
            currentTrack?.id === item.id && isPlaying ? COPY.listen_pause_a11y : COPY.listen_play_a11y
          }
        >
          {currentTrack?.id === item.id && isPlaying ? (
            <Pause className="h-[18px] w-[18px]" fill="currentColor" aria-hidden />
          ) : (
            <Play className="ml-0.5 h-[18px] w-[18px]" fill="currentColor" aria-hidden />
          )}
        </button>
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * staggerDelay }}
    >
      {isExternalArticle ? (
        <a
          href={articleHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cardClassName}
          aria-label={`${COPY.story_card_open_a11y}: ${headline}`}
        >
          {inner}
        </a>
      ) : (
        <Link
          href={articleHref}
          className={cardClassName}
          aria-label={`${COPY.story_card_open_a11y}: ${headline}`}
        >
          {inner}
        </Link>
      )}
    </motion.div>
  );
}
