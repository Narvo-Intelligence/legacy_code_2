// Memoized story card component (#20) — prevents re-renders when parent state changes
// but story data hasn't changed. Used in DashboardPage recommendation grid.
import React from 'react';

interface StoryCardProps {
  id: string;
  title: string;
  source?: string;
  category?: string;
  recommendation_score?: number;
  onClick?: () => void;
}

const shellClass =
  'narvo-border bg-surface/30 group cursor-pointer hover:bg-surface/50 hover:border-primary/30 transition-all overflow-hidden narvo-reco-card';

const StoryCard = React.memo(function StoryCard({ id, title, source, category, recommendation_score, onClick }: StoryCardProps) {
  const body = (
    <div className="p-2 md:p-2.5 narvo-reco-card-inner" style={{ padding: 'var(--density-card-padding, 12px)' }}>
      <span className="mono-ui text-[9px] text-primary font-bold uppercase mb-0.5 block">{category || 'General'}</span>
      <h3 className="font-display text-xs font-bold text-content uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <div className="flex items-center justify-between mt-0.5 md:mt-1">
        <span className="mono-ui text-[8px] md:text-[9px] text-forest truncate">{source}</span>
        {recommendation_score != null && recommendation_score > 0 && (
          <span className="mono-ui text-[8px] text-primary/60 font-bold shrink-0 ml-1">{Math.round(recommendation_score)}%</span>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${shellClass} w-full text-left font-inherit p-0 [color:inherit]`}
        onClick={onClick}
        data-testid={`reco-card-${id}`}
      >
        {body}
      </button>
    );
  }

  return (
    <article className={shellClass} data-testid={`reco-card-${id}`}>
      {body}
    </article>
  );
});

export default StoryCard;
