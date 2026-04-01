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
    <div className="mt-6 space-y-5" data-testid="source-timeline">
      <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-secondary">
        Chronological consensus log
      </h3>
      <div className="relative ml-3 space-y-5 border-l-2 border-primary/10 pl-6">
        {sortedSources.map((src, index) => (
          <div key={`${src.name}-${index}`} className="relative rounded-[18px] bg-white/72 px-4 py-4">
            <div
              className={`absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                index === 0 ? 'bg-primary' : 'bg-content-secondary/40'
              }`}
              aria-hidden
            />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                {src.time && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                    {new Date(src.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className="text-sm font-semibold uppercase tracking-tight text-content">
                  {src.name}
                </span>
                {src.role && (
                  <span className="rounded-full border border-border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-content-secondary">
                    {src.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] text-content-secondary">
                  {index === 0 ? 'Source initiated the report' : `Follow-up by ${src.name}`}
                </span>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-colors hover:text-primary-deep"
                  >
                    View original
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
