import {
  deleteInvestorMetricsSnapshot,
  getInvestorMetricsSnapshotById,
  updateInvestorMetricsSnapshot,
} from '@/lib/investor-metrics';
import type { MetricsSnapshotUpdate } from '@/lib/investor-types';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = parseId(id);

  if (!numericId) {
    return Response.json({ error: 'Invalid metrics snapshot id.' }, { status: 400 });
  }

  const snapshot = getInvestorMetricsSnapshotById(numericId);
  if (!snapshot) {
    return Response.json({ error: 'Metrics snapshot not found.' }, { status: 404 });
  }

  return Response.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = parseId(id);

  if (!numericId) {
    return Response.json({ error: 'Invalid metrics snapshot id.' }, { status: 400 });
  }

  let body: MetricsSnapshotUpdate | null = null;

  try {
    body = (await request.json()) as MetricsSnapshotUpdate;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const snapshot = updateInvestorMetricsSnapshot(numericId, body ?? {});
  if (!snapshot) {
    return Response.json({ error: 'Metrics snapshot not found.' }, { status: 404 });
  }

  return Response.json(snapshot);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = parseId(id);

  if (!numericId) {
    return Response.json({ error: 'Invalid metrics snapshot id.' }, { status: 400 });
  }

  const deleted = deleteInvestorMetricsSnapshot(numericId);
  if (!deleted) {
    return Response.json({ error: 'Metrics snapshot not found.' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
