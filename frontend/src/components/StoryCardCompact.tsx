import { forwardRef } from 'react';
import { Play, DotsThreeVertical } from '@phosphor-icons/react';
import { CategoryPill, TruthPill, TruthType } from './primitives/Pills';

type StoryCardCompactProps = {
  id?: string;
  category: string;
  headline: string;
  summary?: string;
  source: string;
  timestamp: string;
  truthStatus?: TruthType;
  imageUrl?: string;
  onPlay?: () => void;
};

/**
 * StoryCardCompact — Context-rich unit for feed density.
 * v5.1: 16px radius, Newsreader Display, Instrument Sans body, Geist Mono metadata.
 */
export const StoryCardCompact = forwardRef<HTMLElement, StoryCardCompactProps>(({
  id,
  category,
  headline,
  summary,
  source,
  timestamp,
  truthStatus,
  imageUrl,
  onPlay,
}, ref) => {
  return (
    <article 
      ref={ref}
      id={id}
      className="flex flex-col bg-surface rounded-[var(--card-radius-md)] p-5 shadow-sm border border-border-subtle hover:shadow-md transition-all duration-300 group w-full text-left"
    >
      <div className="flex flex-col sm:flex-row gap-5">
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <CategoryPill className="bg-transparent pl-0 border-none font-bold text-primary opacity-80">{category}</CategoryPill>
            {truthStatus && <TruthPill status={truthStatus}>{truthStatus}</TruthPill>}
          </div>
          
          <h3 className="font-display font-semibold text-xl text-content tracking-tight leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {headline}
          </h3>
          
          {summary && (
            <p className="font-body text-content-dim/90 text-sm leading-relaxed line-clamp-2 mb-4">
              {summary}
            </p>
          )}

          {/* Metadata Row */}
          <div className="flex items-center gap-3 text-content-dim font-mono text-[10px] uppercase tracking-wider mt-auto pt-3 border-t border-border-subtle opacity-80">
            <span className="font-bold text-content truncate">{source}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="shrink-0">{timestamp}</span>
          </div>
        </div>

        {/* Optional Image & Action */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 gap-4">
          {imageUrl ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--card-radius-sm)] overflow-hidden bg-surface-alt border border-border-subtle order-2 sm:order-1 relative">
              <img 
                src={imageUrl} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="hidden sm:block w-24 h-0" /> /* Spacer */
          )}
          
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button 
              onClick={onPlay}
              type="button"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-alert text-white shadow-sm hover:scale-110 active:scale-95 transition-all duration-300"
              aria-label="Play story"
            >
              <Play size={18} weight="fill" />
            </button>
            <button 
              className="sm:hidden text-content-dim p-2"
              aria-label="More options"
            >
              <DotsThreeVertical size={20} weight="bold" />
            </button>
          </div>
        </div>

      </div>
    </article>
  );
});

StoryCardCompact.displayName = 'StoryCardCompact';
