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
    <div className="mt-6 space-y-6" data-testid="source-timeline">
      <h3 className="mono-ui text-[10px] text-forest tracking-[0.2em] mb-4 uppercase">
        CHRONOLOGICAL_CONSENSUS_LOG
      </h3>
      <div className="relative border-l border-forest/20 ml-3 pl-6 space-y-8">
        {sortedSources.map((src, index) => (
          <div key={`${src.name}-${index}`} className="relative">
            <div
              className="absolute -left-[31px] top-1 w-2 h-2 rounded-full bg-forest border border-background-dark"
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                {src.time && (
                  <span className="mono-ui text-[9px] text-primary bg-primary/10 px-1">
                    {new Date(src.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className="font-bold text-xs uppercase tracking-tighter text-content">
                  {src.name}
                </span>
                {src.role && (
                  <span className="mono-ui text-[8px] text-forest/60 border border-forest/30 px-1">
                    {src.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-forest/60 italic">
                  {index === 0 ? 'SOURCE_INITIATED_REPORT' : `FOLLOW_UP_BY_${src.name}`}
                </span>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline"
                  >
                    [VIEW_ORIGINAL]
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
