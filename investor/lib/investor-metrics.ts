export interface PlatformMetrics {
  listeners_today?: string | null;
  total_listeners?: string | null;
  sources_online?: number | null;
  total_sources?: number | null;
  local_sources?: number | null;
  international_sources?: number | null;
  continental_sources?: number | null;
  stories_processed?: number | null;
  broadcast_hours?: number | null;
  signal_strength?: string | null;
  network_load?: string | null;
  broadcast_ready?: boolean | null;
  last_sync?: string | null;
  aggregators?: Record<string, { configured?: boolean | null; cached_count?: number | null }>;
}

export interface MetricsSnapshot {
  live: boolean;
  fetchedAt: string;
  message: string;
  metrics: PlatformMetrics;
}

const FALLBACK_METRICS: PlatformMetrics = {
  aggregators: {},
};

function investorBackendOrigin(): string {
  const raw =
    process.env.NARVO_BACKEND_URL?.trim() ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ??
    'https://api.narvo.news';

  return raw.replace(/\/$/, '');
}

export async function fetchInvestorMetrics(): Promise<MetricsSnapshot> {
  try {
    const response = await fetch(`${investorBackendOrigin()}/api/metrics`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`metrics endpoint returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('metrics endpoint returned a non-JSON payload');
    }

    const payload = (await response.json()) as PlatformMetrics;

    return {
      live: true,
      fetchedAt: new Date().toISOString(),
      message: 'Live platform signal from the Narvo backend.',
      metrics: payload,
    };
  } catch (error) {
    return {
      live: false,
      fetchedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? `Live metrics are currently unavailable: ${error.message}.`
          : 'Live metrics are currently unavailable.',
      metrics: FALLBACK_METRICS,
    };
  }
}
