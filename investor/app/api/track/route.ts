import { createTrackEvent, getTrackSummary, listTrackEvents } from '@/lib/investor-db';
import type { TrackEventPayload } from '@/lib/investor-types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: TrackEventPayload | null = null;

  try {
    body = (await request.json()) as TrackEventPayload;
  } catch {
    return new Response(null, { status: 204 });
  }

  const persisted = createTrackEvent(body ?? {}, request.headers.get('user-agent'));

  if (process.env.NODE_ENV === 'development') {
    console.info(JSON.stringify({ source: 'narvo-investor', ...persisted }));
  }

  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('summary') === '1') {
    const limit = Number(searchParams.get('limit') ?? 12);
    return Response.json(getTrackSummary(Number.isFinite(limit) ? limit : 12), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const limit = Number(searchParams.get('limit') ?? 50);
  return Response.json(listTrackEvents(Number.isFinite(limit) ? limit : 50), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
