'use client';

import React from 'react';
import Image from 'next/image';
import { Download, ListPlus, Play } from 'lucide-react';

export type PodcastCardProps = {
  title: string;
  description: string;
  /** Legacy “show” row; omit when using `metaLine` for a single episode. */
  episodeCount?: number;
  /** Replaces the “N episodes” line (e.g. published · duration). */
  metaLine?: string;
  coverUrl?: string | null;
  onPlay: () => void;
  onQueue?: () => void;
  onDownload?: () => void;
};

function noop() {}

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '•';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/**
 * Podcast show row: cover + title + actions (side-by-side spec).
 */
export function PodcastCard({
  title,
  description,
  episodeCount,
  metaLine,
  coverUrl,
  onPlay,
  onQueue = noop,
  onDownload = noop,
}: PodcastCardProps) {
  const initials = initialsFromTitle(title);

  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-narvo-ink/8 dark:border-white/8 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-4 sm:p-5 min-h-[88px]">
      <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-narvo-teal/25 to-narvo-vermilion/15 ring-1 ring-narvo-ink/5 dark:ring-white/10">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 64px, 72px"
            unoptimized
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-serif text-lg font-bold text-narvo-ink/70 dark:text-white/80">
            {initials}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-base font-semibold text-narvo-ink dark:text-white leading-snug line-clamp-2">{title}</p>
        <p className="text-xs text-narvo-ink/55 dark:text-white/50 mt-1 leading-snug line-clamp-2">{description}</p>
        {metaLine != null && metaLine !== '' ? (
          <p className="font-mono text-[9px] text-narvo-ink/35 dark:text-white/30 mt-1.5 uppercase tracking-wider">
            {metaLine}
          </p>
        ) : episodeCount != null ? (
          <p className="font-mono text-[9px] text-narvo-ink/35 dark:text-white/30 mt-1.5 uppercase tracking-wider">
            {episodeCount} episodes
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          type="button"
          onClick={onPlay}
          className="flex h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-full bg-narvo-teal px-3 text-[11px] font-bold text-white"
          aria-label={`Play ${title}`}
        >
          <Play size={12} fill="currentColor" aria-hidden /> Play
        </button>
        <button
          type="button"
          onClick={onQueue}
          className="flex h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-full border border-narvo-ink/12 dark:border-white/12 px-3 text-[11px] font-bold text-narvo-ink/75 dark:text-white/65"
          aria-label={`Queue ${title}`}
        >
          <ListPlus size={12} aria-hidden /> Queue
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-full border border-narvo-ink/12 dark:border-white/12 px-3 text-[11px] font-bold text-narvo-ink/75 dark:text-white/65"
          aria-label={`Download ${title}`}
        >
          <Download size={12} aria-hidden /> Save
        </button>
      </div>
    </div>
  );
}
