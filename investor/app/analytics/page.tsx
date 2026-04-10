import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getTrackSummary } from '@/lib/investor-db';
import { AnalyticsBoard } from '@/components/investor/analytics-board';
import { PageHero } from '@/components/investor/page-hero';
import { TrackLink } from '@/components/investor/track-link';
import { fetchInvestorMetrics } from '@/lib/investor-metrics';

export const metadata: Metadata = {
  title: 'Analytics',
};

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [snapshot, trackingSummary] = await Promise.all([
    fetchInvestorMetrics(),
    Promise.resolve(getTrackSummary()),
  ]);

  return (
    <div className="space-y-4">
      <PageHero
        actions={
          <TrackLink className="cta-secondary" href="/roadmap" label="analytics hero open roadmap">
            <>
              See execution roadmap
              <ArrowRight className="h-4 w-4" />
            </>
          </TrackLink>
        }
        eyebrow="Analytics"
        summary="The analytics layer now does two jobs: it reads live operating signals from the Narvo backend when available, and it tracks how investors move through this site so the narrative itself becomes measurable."
        title="Operational telemetry plus investor-intent tracking in one board."
      />
      <AnalyticsBoard initialSnapshot={snapshot} initialTrackingSummary={trackingSummary} />
    </div>
  );
}
