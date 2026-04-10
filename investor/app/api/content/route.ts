import {
  createContentEntry,
  getInvestorContentBundle,
  listContentEntries,
} from '@/lib/investor-db';
import {
  INVESTOR_CONTENT_COLLECTIONS,
  type ContentEntryInput,
  type InvestorContentCollection,
} from '@/lib/investor-types';

export const dynamic = 'force-dynamic';

function isContentCollection(value: string | null): value is InvestorContentCollection {
  return Boolean(value && INVESTOR_CONTENT_COLLECTIONS.includes(value as InvestorContentCollection));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');

  if (isContentCollection(collection)) {
    return Response.json(listContentEntries(collection), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  return Response.json(getInvestorContentBundle(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  let body: ContentEntryInput | null = null;

  try {
    body = (await request.json()) as ContentEntryInput;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || !isContentCollection(body.collection) || body.payload === undefined) {
    return Response.json(
      { error: 'collection and payload are required to create a content entry.' },
      { status: 400 }
    );
  }

  try {
    const entry = createContentEntry(body);
    return Response.json(entry, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create content entry.' },
      { status: 400 }
    );
  }
}
