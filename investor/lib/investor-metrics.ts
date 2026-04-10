import {
  createMetricsSnapshot,
  deleteMetricsSnapshot,
  getLatestMetricsSnapshot,
  getMetricsSnapshotById,
  listMetricsSnapshots,
  updateMetricsSnapshot,
} from '@/lib/investor-db';
import type {
  MetricsSnapshot,
  MetricsSnapshotInput,
  MetricsSnapshotUpdate,
  PlatformMetrics,
  StoredMetricsSnapshot,
} from '@/lib/investor-types';

export type {
  MetricsSnapshot,
  MetricsSnapshotInput,
  MetricsSnapshotUpdate,
  PlatformMetrics,
  StoredMetricsSnapshot,
} from '@/lib/investor-types';

function investorBackendOrigin(): string {
  const raw =
    process.env.NARVO_BACKEND_URL?.trim() ??
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ??
    'https://api.narvo.news';

  return raw.replace(/\/$/, '');
}

function emptyMetricsSnapshot(message: string): MetricsSnapshot {
  return {
    live: false,
    fetchedAt: new Date().toISOString(),
    message,
    metrics: {},
  };
}

export async function syncInvestorMetricsFromBackend(): Promise<StoredMetricsSnapshot | null> {
  try {
    const response = await fetch(`${investorBackendOrigin()}/api/metrics`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      throw new Error(`metrics endpoint returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('metrics endpoint returned a non-JSON payload');
    }

    const payload = (await response.json()) as PlatformMetrics;

    return createMetricsSnapshot({
      source: 'narvo-backend',
      live: true,
      fetchedAt: new Date().toISOString(),
      message: 'Live platform signal from the Narvo backend.',
      metrics: payload,
    });
  } catch {
    return null;
  }
}

export async function fetchInvestorMetrics(options?: {
  sync?: boolean;
}): Promise<MetricsSnapshot> {
  if (options?.sync !== false) {
    const liveSnapshot = await syncInvestorMetricsFromBackend();
    if (liveSnapshot) return liveSnapshot;
  }

  const storedSnapshot = getLatestMetricsSnapshot();
  if (storedSnapshot) {
    return {
      ...storedSnapshot,
      live: false,
      message: `Showing the latest stored metrics snapshot from ${new Date(
        storedSnapshot.fetchedAt
      ).toLocaleString()}.`,
    };
  }

  return emptyMetricsSnapshot('No metrics snapshot has been stored yet.');
}

export function listInvestorMetricsSnapshots(limit = 25): StoredMetricsSnapshot[] {
  return listMetricsSnapshots(limit);
}

export function getInvestorMetricsSnapshotById(id: number): StoredMetricsSnapshot | null {
  return getMetricsSnapshotById(id);
}

export function createInvestorMetricsSnapshot(input: MetricsSnapshotInput): StoredMetricsSnapshot {
  return createMetricsSnapshot(input);
}

export function updateInvestorMetricsSnapshot(
  id: number,
  input: MetricsSnapshotUpdate
): StoredMetricsSnapshot | null {
  return updateMetricsSnapshot(id, input);
}

export function deleteInvestorMetricsSnapshot(id: number): boolean {
  return deleteMetricsSnapshot(id);
}
