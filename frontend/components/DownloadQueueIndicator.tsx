'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { useOptionalOfflineDownload } from '@/components/OfflineDownloadContext';
import { COPY } from '@/lib/narvo-app-copy';

/**
 * Visible offline save status — Page Surface Map §5.2 download queue affordance.
 */
export function DownloadQueueIndicator() {
  const ctx = useOptionalOfflineDownload();
  if (!ctx) return null;

  const entries = Object.entries(ctx.progressById);
  if (entries.length === 0) return null;

  const active = entries.filter(([, pct]) => pct < 100);
  if (active.length === 0) return null;

  const [id, pct] = active[0] ?? ['', 0];

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-narvo-teal/25 bg-narvo-teal/10 dark:bg-narvo-teal/15 px-3 py-1.5 text-[11px] font-mono font-bold text-narvo-teal dark:text-narvo-mint max-w-[200px]"
      role="status"
      aria-live="polite"
      title={COPY.download_indicator_title}
    >
      <Download size={14} className="shrink-0 animate-pulse" aria-hidden />
      <span className="truncate">
        {COPY.download_indicator_saving} {Math.round(pct)}%
      </span>
      <span className="sr-only">Story id {id}</span>
    </div>
  );
}
