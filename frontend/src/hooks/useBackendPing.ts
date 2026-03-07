/**
 * Periodic backend ping (keep-alive). Runs when the app is loaded and the tab is visible.
 * Helps keep serverless backends warm and can be extended to surface "backend unreachable" state.
 */

import { useEffect, useRef } from 'react';
import * as api from '../lib/api';

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const PING_TIMEOUT_MS = 8000;

export interface UseBackendPingOptions {
  /** When false, the ping job does not run. Default true. */
  enabled?: boolean;
  /** Interval between pings in ms. Default 2 minutes. */
  intervalMs?: number;
}

/**
 * Starts a repeating job that pings the backend (GET api/ping) on an interval.
 * Pauses when the document is hidden and resumes when visible.
 */
export function useBackendPing(options: UseBackendPingOptions = {}): void {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    const ping = (): void => {
      if (!mountedRef.current || document.visibilityState === 'hidden') return;
      api
        .get('api/ping', { timeout: PING_TIMEOUT_MS, retries: 0 })
        .then(() => {})
        .catch(() => {});
    };

    const schedule = (): void => {
      if (document.visibilityState !== 'visible') return;
      ping();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(ping, intervalMs);
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        schedule();
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs]);
}
