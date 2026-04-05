'use client';

import { useEffect, useState } from 'react';
import { fetchBriefingLatest, type ApiBriefingLatest } from '@/lib/narvo-api';

export function useLatestBriefing() {
  const [briefing, setBriefing] = useState<ApiBriefingLatest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          setError(e instanceof Error ? e.message : 'Briefing unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { briefing, error, loading };
}
