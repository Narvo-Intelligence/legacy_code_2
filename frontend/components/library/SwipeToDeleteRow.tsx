'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

const OPEN_PX = 88;

type SwipeToDeleteRowProps = {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  className?: string;
};

/**
 * Mobile-style swipe to reveal delete; desktop users rely on the explicit Trash control on the card.
 */
export function SwipeToDeleteRow({
  children,
  onDelete,
  deleteLabel = 'Remove',
  className = '',
}: SwipeToDeleteRowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);

  const clamp = useCallback((v: number) => Math.min(0, Math.max(-OPEN_PX, v)), []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    dragging.current = true;
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffset(clamp(startOffset.current + dx));
  };

  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setOffset((o) => (o < -OPEN_PX / 2 ? -OPEN_PX : 0));
  };

  const confirmDelete = () => {
    setOffset(0);
    onDelete();
  };

  return (
    <div className={`relative overflow-hidden rounded-[32px] ${className}`}>
      <div
        className="absolute inset-y-0 right-0 w-[100px] flex items-stretch justify-end bg-narvo-vermilion/90 dark:bg-narvo-vermilion/85"
        aria-hidden
      >
        <button
          type="button"
          onClick={confirmDelete}
          className="w-full flex flex-col items-center justify-center gap-1 px-3 text-white text-[10px] font-bold uppercase tracking-wide"
        >
          <Trash2 size={20} aria-hidden />
          {deleteLabel}
        </button>
      </div>
      <div
        role="presentation"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{ transform: `translateX(${offset}px)` }}
        className="relative touch-pan-y transition-transform duration-200 ease-out will-change-transform rounded-[32px]"
      >
        {children}
      </div>
    </div>
  );
}
