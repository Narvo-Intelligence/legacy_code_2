import {
  deleteContentEntry,
  getContentEntryById,
  updateContentEntry,
} from '@/lib/investor-db';
import type { ContentEntryUpdate } from '@/lib/investor-types';

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
    return Response.json({ error: 'Invalid content entry id.' }, { status: 400 });
  }

  const entry = getContentEntryById(numericId);
  if (!entry) {
    return Response.json({ error: 'Content entry not found.' }, { status: 404 });
  }

  return Response.json(entry, {
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
    return Response.json({ error: 'Invalid content entry id.' }, { status: 400 });
  }

  let body: ContentEntryUpdate | null = null;

  try {
    body = (await request.json()) as ContentEntryUpdate;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const entry = updateContentEntry(numericId, body ?? {});
  if (!entry) {
    return Response.json({ error: 'Content entry not found.' }, { status: 404 });
  }

  return Response.json(entry);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = parseId(id);

  if (!numericId) {
    return Response.json({ error: 'Invalid content entry id.' }, { status: 400 });
  }

  const deleted = deleteContentEntry(numericId);
  if (!deleted) {
    return Response.json({ error: 'Content entry not found.' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
