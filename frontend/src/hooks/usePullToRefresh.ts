import { useState, useRef, useCallback, useEffect } from 'react';

export interface UsePullToRefreshOptions {
  threshold?: number;
  disabled?: boolean;
}

export interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
  progress: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

const usePullToRefresh = (
  onRefresh: () => Promise<void>,
  options: UsePullToRefreshOptions = {}
): UsePullToRefreshReturn => {
  const { threshold = 80, disabled = false } = options;
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return;
      const el = containerRef.current;
      if (el && el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        setPulling(true);
      }
    },
    [disabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || disabled) return;
      const delta = Math.max(0, e.touches[0].clientY - startY.current);
      const dampened = Math.min(delta * 0.5, threshold * 1.5);
      setPullDistance(dampened);
    },
    [pulling, disabled, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling || disabled) return;
    setPulling(false);
    if (pullDistance >= threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch {
        /* ignore */
      }
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, onRefresh, disabled]);

  useEffect(() => {
    return () => {
      setPulling(false);
      setPullDistance(0);
    };
  }, []);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    containerRef,
    pulling: pulling && pullDistance > 10,
    refreshing,
    pullDistance,
    progress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

export default usePullToRefresh;
