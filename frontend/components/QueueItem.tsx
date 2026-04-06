'use client';

import React from 'react';
import { X, GripVertical } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';

/* ─────────────────────────────────────────────────────────────
   QueueItem — single row in the audio queue panel.
   Component DS §8.3 QueueItem.
   Anatomy: order index | title + source | active mini-bars | remove.
───────────────────────────────────────────────────────────── */

export type QueueItemProps = {
  index: number;
  title: string;
  source?: string;
  duration?: string;
  /** Semantic status alias — 'playing' maps to isActive=true */
  status?: 'playing' | 'queued' | 'paused';
  isActive?: boolean;
  onRemove?: () => void;
  /** Exposed for drag-and-drop parent libraries */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
};

/** Tiny animated waveform — signals now-playing state */
function MiniBars() {
  return (
    <span
      className="flex items-end gap-[3px] h-4 shrink-0"
      aria-label={COPY.queue_item_now_playing}
    >
      {[10, 16, 12, 18, 10].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-narvo-teal dark:bg-narvo-mint animate-[narvoWave_0.9s_ease-in-out_infinite]"
          style={{
            height: h,
            animationDelay: `${i * 0.12}s`,
          }}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function QueueItem({
  index,
  title,
  source,
  duration,
  status,
  isActive: isActiveProp = false,
  onRemove,
  dragHandleProps,
  className = '',
}: QueueItemProps) {
  const isActive = isActiveProp || status === 'playing';
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
        isActive
          ? 'bg-narvo-teal/[0.08] dark:bg-narvo-teal/[0.15]'
          : 'hover:bg-narvo-ink/[0.03] dark:hover:bg-white/[0.04]'
      } ${className}`}
    >
      {/* Drag handle */}
      {dragHandleProps ? (
        <div
          {...dragHandleProps}
          className="shrink-0 cursor-grab active:cursor-grabbing text-narvo-ink/25 dark:text-white/25 touch-none"
          aria-label={COPY.queue_item_drag_a11y}
        >
          <GripVertical size={16} aria-hidden />
        </div>
      ) : (
        <span className="shrink-0 font-mono text-[10px] font-bold text-narvo-ink/30 dark:text-white/30 w-5 text-center tabular-nums">
          {String(index).padStart(2, '0')}
        </span>
      )}

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-snug truncate ${
            isActive ? 'text-narvo-teal dark:text-narvo-mint' : 'text-narvo-ink dark:text-white'
          }`}
        >
          {title}
        </p>
        {source || duration ? (
          <p className="text-[11px] font-mono text-narvo-ink/40 dark:text-white/40 mt-0.5 truncate">
            {[source, duration].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>

      {/* Active bars or duration */}
      <div className="shrink-0">
        {isActive ? (
          <MiniBars />
        ) : duration ? (
          <span className="font-mono text-[10px] text-narvo-ink/35 dark:text-white/35">{duration}</span>
        ) : null}
      </div>

      {/* Remove */}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-narvo-ink/35 dark:text-white/35 hover:bg-narvo-ink/[0.06] dark:hover:bg-white/[0.08] hover:text-narvo-ink dark:hover:text-white transition-colors"
          aria-label={COPY.queue_item_remove_a11y}
        >
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
