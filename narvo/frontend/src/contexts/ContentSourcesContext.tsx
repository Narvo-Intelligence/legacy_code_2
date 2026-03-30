import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

interface SourcesData {
  total_sources?: number;
  local_sources?: number;
  international_sources?: number;
  continental_sources?: number;
  categories?: Record<string, unknown>;
  sources?: Array<{ category?: string; region?: string; [key: string]: unknown }>;
  broadcast_sources?: unknown[];
  verification_apis?: unknown[];
}

interface HealthData {
  sources?: Array<{ name?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface ContentSourcesContextValue {
  sources: SourcesData | null;
  health: HealthData | null;
  loading: boolean;
  error: string | null;
  refreshSources: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  getTotalSources: () => number;
  getLocalSources: () => number;
  getInternationalSources: () => number;
  getContinentalSources: () => number;
  getBroadcastSources: () => unknown[];
  getVerificationAPIs: () => unknown[];
  getCategories: () => Record<string, unknown>;
  getSourcesByCategory: (category: string) => unknown[];
  getSourcesByRegion: (region: string) => unknown[];
  getHealthForSource: (name: string) => unknown;
  getHealthSummary: () => HealthData | null;
}

const fallbackSources: SourcesData = {
  total_sources: 23,
  local_sources: 17,
  international_sources: 6,
  categories: {},
  sources: [],
  broadcast_sources: [],
  verification_apis: [],
};

const ContentSourcesContext = createContext<ContentSourcesContextValue>(null as unknown as ContentSourcesContextValue);

export const useContentSources = (): ContentSourcesContextValue => useContext(ContentSourcesContext);

export const ContentSourcesProvider = ({ children }: { children: React.ReactNode }) => {
  const [sources, setSources] = useState<SourcesData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('api/sources');
      if (response.ok) {
        const data = (await response.json()) as SourcesData;
        setSources(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch sources');
      }
    } catch (err) {
      console.error('[ContentSources] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSources(fallbackSources);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const r = await api.get('api/sources/health');
      if (r.ok) setHealth((await r.json()) as HealthData);
    } catch (err) {
      console.error('[ContentSources] Health fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchSources();
    fetchHealth();
    const interval = setInterval(fetchHealth, 300000);
    return () => clearInterval(interval);
  }, [fetchSources, fetchHealth]);

  const getTotalSources = useCallback(() => sources?.total_sources ?? 0, [sources]);
  const getLocalSources = useCallback(() => sources?.local_sources ?? 0, [sources]);
  const getInternationalSources = useCallback(() => sources?.international_sources ?? 0, [sources]);
  const getContinentalSources = useCallback(() => sources?.continental_sources ?? 0, [sources]);
  const getBroadcastSources = useCallback(() => sources?.broadcast_sources ?? [], [sources]);
  const getVerificationAPIs = useCallback(() => sources?.verification_apis ?? [], [sources]);
  const getCategories = useCallback(() => sources?.categories ?? {}, [sources]);
  const getSourcesByCategory = useCallback(
    (category: string) => (sources?.sources ?? []).filter((s) => s.category === category),
    [sources]
  );
  const getSourcesByRegion = useCallback(
    (region: string) => (sources?.sources ?? []).filter((s) => s.region === region),
    [sources]
  );
  const getHealthForSource = useCallback(
    (name: string) => health?.sources?.find((s) => s.name === name) ?? null,
    [health]
  );
  const getHealthSummary = useCallback(() => health, [health]);

  return (
    <ContentSourcesContext.Provider
      value={{
        sources,
        health,
        loading,
        error,
        refreshSources: fetchSources,
        refreshHealth: fetchHealth,
        getTotalSources,
        getLocalSources,
        getInternationalSources,
        getContinentalSources,
        getBroadcastSources,
        getVerificationAPIs,
        getCategories,
        getSourcesByCategory,
        getSourcesByRegion,
        getHealthForSource,
        getHealthSummary,
      }}
    >
      {children}
    </ContentSourcesContext.Provider>
  );
};

export default ContentSourcesContext;
