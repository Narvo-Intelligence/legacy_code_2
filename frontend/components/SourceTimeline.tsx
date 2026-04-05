'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export type SourceTimelineProps = {
  sources: string[];
  loading?: boolean;
  className?: string;
};

/**
 * Lightweight source trail — confidence without forensic density (Emotional Guidelines §3.2).
 */
export function SourceTimeline({ sources, loading, className = '' }: SourceTimelineProps) {
  const list = sources.map((s) => s.trim()).filter(Boolean);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        <p className="text-[10px] font-mono text-white/45 uppercase tracking-widest">Sources checked</p>
        <p className="text-sm text-white/55">Loading source list…</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className={className}>
        <p className="text-[10px] font-mono text-white/45 uppercase tracking-widest mb-2">Sources checked</p>
        <p className="text-sm text-white/55">No separate source list for this story yet.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[10px] font-mono text-white/45 uppercase tracking-widest mb-3">Sources checked</p>
      <ul className="space-y-2">
        {list.slice(0, 8).map((name, i) => (
          <li key={`${name}-${i}`} className="flex items-center gap-2 text-sm text-white/85">
            <CheckCircle2 size={16} className="text-narvo-mint shrink-0" aria-hidden />
            <span className="truncate">{name}</span>
          </li>
        ))}
      </ul>
      {list.length > 8 ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-white/45 font-mono">
          <Circle size={12} aria-hidden /> +{list.length - 8} more
        </p>
      ) : null}
    </div>
  );
}
