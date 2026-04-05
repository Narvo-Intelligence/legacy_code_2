'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Clock, Play, Pause } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { formatFeedTimeLabel, type ApiNewsListItem } from '@/lib/narvo-api';
import { truthTagFromListItem } from '@/lib/truth-map';
import { resolveStoryPlayback } from '@/lib/story-playback';

export type StoryNewsListCardProps = {
  item: ApiNewsListItem;
  index?: number;
  staggerDelay?: number;
};

/**
 * Compact list row for discover / search (Component DS StoryCardCompact contract).
 */
export function StoryNewsListCard({ item, index = 0, staggerDelay = 0.04 }: StoryNewsListCardProps) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const truth = truthTagFromListItem(item);
  const timeLabel = formatFeedTimeLabel(item.published);
  const cat = (item.category || 'General').toUpperCase();

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = item.id;
    const title = item.title?.trim() || 'Untitled';
    const source = item.source?.trim() || 'Narvo';
    const category = (item.category || 'General').toUpperCase();
    if (currentTrack?.id === id) {
      togglePlayPause();
    } else {
      void resolveStoryPlayback(id, { id, title, source, category }).then((track) => playTrack(track));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * staggerDelay }}
    >
      <Link
        href={`/news/${item.id}`}
        className="block p-5 sm:p-6 rounded-[28px] bg-white dark:bg-narvo-ink border border-narvo-ink/6 dark:border-white/8 hover:border-narvo-teal/25 dark:hover:border-narvo-teal/30 transition-all shadow-sm hover:shadow-md group"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase">
                {cat}
              </span>
              <span className="text-narvo-ink/20 dark:text-white/20" aria-hidden>
                •
              </span>
              <span className="text-[10px] font-medium font-mono text-narvo-ink/45 dark:text-white/40 flex items-center gap-1">
                <Clock size={10} aria-hidden /> {timeLabel}
              </span>
            </div>
            <h3 className="font-serif font-medium text-lg sm:text-xl group-hover:text-narvo-teal transition-colors line-clamp-2 leading-snug">
              {item.title || 'Untitled'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handlePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all min-h-[48px] min-w-[48px] active:scale-[0.96] ${
              currentTrack?.id === item.id && isPlaying
                ? 'bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/20'
                : 'bg-narvo-mist dark:bg-white/10 text-narvo-ink dark:text-white group-hover:bg-narvo-teal group-hover:text-white'
            }`}
            aria-label={currentTrack?.id === item.id && isPlaying ? 'Pause' : 'Play'}
          >
            {currentTrack?.id === item.id && isPlaying ? (
              <Pause size={20} fill="currentColor" aria-hidden />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-medium text-narvo-ink/55 dark:text-white/50">{item.source || 'Narvo'}</p>
          <TruthTag
            status={truth.status}
            sources={truth.sources}
            details={truth.details}
            lastChecked={truth.lastChecked}
          />
        </div>
      </Link>
    </motion.div>
  );
}
