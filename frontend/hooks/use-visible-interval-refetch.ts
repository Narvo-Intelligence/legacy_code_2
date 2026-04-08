'use client';

import { useEffect, useRef } from 'react';

type RefetchReason = 'visible' | 'interval';

type Options = {
  intervalMs: number;
  enabled?: boolean;
};

/**
 * Refetch when the document becomes visible and on a fixed interval while visible.
 * Matches the landing “live news” pattern: background tabs skip work until the user returns.
 */
export function useVisibleIntervalRefetch(
  onRefetch: (reason: RefetchReason) => void,
  options: Options
): void {
  const { intervalMs, enabled = true } = options;
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const run = (reason: RefetchReason) => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      onRefetchRef.current(reason);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run('visible');
    };

    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(() => run('interval'), intervalMs);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [enabled, intervalMs]);
}
