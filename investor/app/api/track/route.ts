interface TrackBody {
  event?: string;
  path?: string;
  label?: string;
  href?: string;
  props?: Record<string, unknown>;
  ts?: string;
}

export async function POST(request: Request) {
  let body: TrackBody | null = null;

  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return new Response(null, { status: 204 });
  }

  const logPayload = {
    source: 'narvo-investor',
    event: body?.event ?? 'unknown',
    path: body?.path ?? 'unknown',
    label: body?.label ?? null,
    href: body?.href ?? null,
    props: body?.props ?? {},
    ts: body?.ts ?? new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
  };

  console.info(JSON.stringify(logPayload));

  return new Response(null, { status: 204 });
}
