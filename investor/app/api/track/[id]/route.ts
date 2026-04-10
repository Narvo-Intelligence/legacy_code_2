import { deleteTrackEvent, getTrackEventById } from '@/lib/investor-db';

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
    return Response.json({ error: 'Invalid tracked event id.' }, { status: 400 });
  }

  const event = getTrackEventById(numericId);
  if (!event) {
    return Response.json({ error: 'Tracked event not found.' }, { status: 404 });
  }

  return Response.json(event, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = parseId(id);

  if (!numericId) {
    return Response.json({ error: 'Invalid tracked event id.' }, { status: 400 });
  }

  const deleted = deleteTrackEvent(numericId);
  if (!deleted) {
    return Response.json({ error: 'Tracked event not found.' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
