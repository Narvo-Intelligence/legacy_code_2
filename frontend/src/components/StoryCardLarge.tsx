import { forwardRef } from 'react';
import { Play, BookmarkSimple, Clock } from '@phosphor-icons/react';
import { CategoryPill, StatusPill } from './primitives/Pills';

type StoryCardLargeProps = {
  id?: string;
  category: string;
  status?: 'live' | 'breaking';
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  imageUrl?: string;
  onPlay?: () => void;
  onSave?: () => void;
};

/**
 * StoryCardLarge — Principal narrative unit for headlines.
 * v5.1: 24px radius, Newsreader Display, Geist Mono metadata.
 */
export const StoryCardLarge = forwardRef<HTMLElement, StoryCardLargeProps>(({
  id,
  category,
  status,
  headline,
  summary,
  source,
  timestamp,
  imageUrl,
  onPlay,
  onSave,
}, ref) => {
  return (
    <article 
      ref={ref}
      id={id}
      className="flex flex-col bg-surface rounded-[var(--card-radius-lg)] p-6 shadow-md border border-border-subtle hover:shadow-lg transition-all duration-300 group max-w-2xl w-full"
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {status && <StatusPill status={status}>{status}</StatusPill>}
          <CategoryPill>{category}</CategoryPill>
        </div>
        <button 
          onClick={onSave}
          type="button"
          className="text-content-dim hover:text-content transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1"
          aria-label="Save story"
        >
          <BookmarkSimple size={24} weight="bold" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1 flex flex-col justify-center text-left">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-content tracking-tight leading-[1.1] mb-4 group-hover:text-primary transition-colors">
            {headline}
          </h2>
          <p className="font-body text-content-dim/90 text-base md:text-lg leading-relaxed line-clamp-3">
            {summary}
          </p>
        </div>
        {imageUrl && (
          <div className="w-full md:w-[200px] h-[200px] shrink-0 rounded-[var(--card-radius-md)] overflow-hidden bg-surface-alt border border-border-subtle">
            <img 
              src={imageUrl} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
            />
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-4 text-content-dim font-mono text-[11px] uppercase tracking-widest">
          <span className="font-bold text-content opacity-80">{source}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1.5">
            <Clock size={14} weight="bold" />
            {timestamp}
          </span>
        </div>
        <button 
          onClick={onPlay}
          type="button"
          className="flex items-center justify-center w-[56px] h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-alert text-white hover:scale-105 active:scale-95 focus:ring-4 focus:ring-alert/20 transition-all duration-300 shadow-md"
          aria-label="Play story"
        >
          <Play size={28} weight="fill" className="ml-1" />
        </button>
      </div>
    </article>
  );
});

StoryCardLarge.displayName = 'StoryCardLarge';
