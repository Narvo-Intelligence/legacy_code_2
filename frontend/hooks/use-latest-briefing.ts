'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchBriefingLatest, NarvoApiError, type ApiBriefingLatest } from '@/lib/narvo-api';

export function useLatestBriefing() {
  const [briefing, setBriefing] = useState<ApiBriefingLatest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchBriefingLatest()
      .then((b) => {
        if (!cancelled) {
          setBriefing(b);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setBriefing(null);
          // 404 = no row yet — calm empty state, not an error surface (see /api/briefing/latest).
          if (e instanceof NarvoApiError && e.status === 404) {
            setError(null);
          } else {
            setError(e instanceof Error ? e.message : 'Briefing unavailable');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const onAuth = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        refetch();
      }, 350);
    };
    window.addEventListener('narvo-auth-changed', onAuth);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener('narvo-auth-changed', onAuth);
    };
  }, [refetch]);

  return { briefing, error, loading, refetch };
}
