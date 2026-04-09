import { fetchInvestorMetrics } from '@/lib/investor-metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await fetchInvestorMetrics();

  return Response.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
