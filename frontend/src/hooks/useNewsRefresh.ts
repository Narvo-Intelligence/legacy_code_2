/**
 * useNewsRefresh — background news polling with new-story detection.
 *
 * Wraps SWR's refreshInterval to silently poll the news feed in the background.
 * When new story IDs arrive that aren't in the currently rendered list, it surfaces
 * a count so the UI can prompt the user to apply the update.
 *
 * Usage:
 *   const { newCount, applyRefresh, clearNew } = useNewsRefresh({ currentIds, onRefresh });
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseNewsRefreshOptions {
  /** IDs of stories currently rendered in the feed. */
  currentIds: string[];
  /** Called when the user (or auto-apply timer) wants to apply the latest data. */
  onRefresh: () => Promise<void>;
  /** Polling interval in ms. Default: 2 minutes. */
  intervalMs?: number;
  /** After this many ms with unseen stories, auto-apply without user action. Default: 5 min. */
  autoApplyMs?: number;
  /** When false, no polling runs. Default: true. */
  enabled?: boolean;
}

export interface UseNewsRefreshResult {
  /** Number of new stories detected that aren't yet in the feed. */
  newCount: number;
  /** Apply the latest data immediately (e.g. user taps the banner). */
  applyRefresh: () => Promise<void>;
  /** Dismiss the banner without applying (user ignores it). */
  clearNew: () => void;
}

export function useNewsRefresh({
  currentIds,
  onRefresh,
  intervalMs = 2 * 60 * 1000,
  autoApplyMs = 5 * 60 * 1000,
  enabled = true,
}: UseNewsRefreshOptions): UseNewsRefreshResult {
  const [newCount, setNewCount] = useState(0);
  const pendingSinceRef = useRef<number | null>(null);
  const currentIdsRef = useRef<Set<string>>(new Set(currentIds));
  const autoApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Keep currentIdsRef in sync without triggering re-renders
  useEffect(() => {
    currentIdsRef.current = new Set(currentIds);
  }, [currentIds]);

  const clearAutoApply = useCallback(() => {
    if (autoApplyTimerRef.current) {
      clearTimeout(autoApplyTimerRef.current);
      autoApplyTimerRef.current = null;
    }
  }, []);

  const applyRefresh = useCallback(async () => {
    clearAutoApply();
    setNewCount(0);
    pendingSinceRef.current = null;
    await onRefresh();
  }, [onRefresh, clearAutoApply]);

  const clearNew = useCallback(() => {
    clearAutoApply();
    setNewCount(0);
    pendingSinceRef.current = null;
  }, [clearAutoApply]);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    const poll = async () => {
      // Only poll when tab is visible — same pattern as useBackendPing
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/news?limit=50', {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok || !mountedRef.current) return;
        const items: Array<{ id?: string }> = await res.json();
        if (!Array.isArray(items)) return;

        const unseen = items.filter(
          (item) => item.id && !currentIdsRef.current.has(item.id),
        ).length;

        if (!mountedRef.current) return;

        if (unseen > 0) {
          setNewCount(unseen);
          // Start auto-apply countdown only once per "new batch"
          if (pendingSinceRef.current === null) {
            pendingSinceRef.current = Date.now();
            autoApplyTimerRef.current = setTimeout(() => {
              if (mountedRef.current) {
                applyRefresh().catch(() => {});
              }
            }, autoApplyMs);
          }
        } else {
          // No new stories — clear any stale banner
          setNewCount(0);
          pendingSinceRef.current = null;
          clearAutoApply();
        }
      } catch (err) {
        // Network errors are silently ignored
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') poll().catch(() => {});
    };

    // Initial poll + schedule
    poll().catch(() => {});
    intervalRef.current = setInterval(poll, intervalMs);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearAutoApply();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, autoApplyMs, applyRefresh, clearAutoApply]);

  return { newCount, applyRefresh, clearNew };
}
