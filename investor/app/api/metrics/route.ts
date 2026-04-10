import {
  createInvestorMetricsSnapshot,
  fetchInvestorMetrics,
  listInvestorMetricsSnapshots,
} from '@/lib/investor-metrics';
import type { MetricsSnapshotInput } from '@/lib/investor-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const history = searchParams.get('history');

  if (history === '1') {
    const limit = Number(searchParams.get('limit') ?? 25);
    return Response.json(listInvestorMetricsSnapshots(Number.isFinite(limit) ? limit : 25), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const snapshot = await fetchInvestorMetrics({
    sync: searchParams.get('sync') !== '0',
  });

  return Response.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  let body: MetricsSnapshotInput | null = null;

  try {
    body = (await request.json()) as MetricsSnapshotInput;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body.message !== 'string' || typeof body.metrics !== 'object' || !body.metrics) {
    return Response.json({ error: 'A message and metrics payload are required.' }, { status: 400 });
  }

  const snapshot = createInvestorMetricsSnapshot(body);
  return Response.json(snapshot, { status: 201 });
}
