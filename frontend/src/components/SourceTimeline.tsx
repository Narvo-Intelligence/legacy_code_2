/**
 * Chronological consensus log: shows velocity of a story (who broke it, who confirmed, who expanded).
 * Used on News Detail as Proof-of-Source (PoS) visualization.
 */
export interface SourceTimelineEntry {
  name: string;
  url?: string;
  time?: string;
  role?: string;
}

const SourceTimeline = ({ sources }: { sources: SourceTimelineEntry[] }) => {
  const sortedSources = [...sources].sort((a, b) => {
    const tA = a.time ? new Date(a.time).getTime() : 0;
    const tB = b.time ? new Date(b.time).getTime() : 0;
    return tA - tB;
  });

  if (sortedSources.length === 0) return null;

  return (
    <div className="mt-8 space-y-6" data-testid="source-timeline">
      <h3 className="font-mono text-[9px] text-narvo-ink/60 tracking-[0.15em] mb-4 uppercase">
        CHRONOLOGICAL_CONSENSUS_LOG
      </h3>
      <div className="relative border-l-2 border-narvo-mist ml-3 pl-8 space-y-10">
        {sortedSources.map((src, index) => (
          <div key={`${src.name}-${index}`} className="relative">
            <div
              className={`absolute -left-[37px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${index === 0 ? 'bg-narvo-teal' : 'bg-narvo-ink/30'
                }`}
              aria-hidden
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {src.time && (
                  <span className="font-mono text-[9px] font-bold text-narvo-teal bg-narvo-teal/10 px-1.5 py-0.5 rounded">
                    {new Date(src.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className="font-bold text-xs uppercase tracking-tight text-narvo-ink">
                  {src.name}
                </span>
                {src.role && (
                  <span className="font-mono text-[8px] text-narvo-ink/50 border border-narvo-ink/10 px-1.5 py-0.5 rounded uppercase">
                    {src.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-narvo-ink/60 font-medium">
                  {index === 0 ? 'SOURCE_INITIATED_REPORT' : `FOLLOW_UP_BY_${src.name}`}
                </span>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-narvo-teal hover:text-narvo-teal/80 transition-colors font-medium border-b border-narvo-teal/30"
                  >
                    VIEW_ORIGINAL
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourceTimeline;
