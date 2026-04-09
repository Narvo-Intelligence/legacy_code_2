import { ArrowRight } from 'lucide-react';
import { TrackLink } from '@/components/investor/track-link';

export default function NotFound() {
  return (
    <section className="shell flex min-h-[70vh] items-center py-16">
      <div className="frame-panel w-full px-6 py-10 md:px-10 md:py-14">
        <p className="section-kicker">Not found</p>
        <h1 className="mt-4 font-display text-5xl text-ink md:text-6xl">
          This route is not part of the investor platform.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-quiet md:text-lg">
          Use the overview, pitch, analytics, or roadmap routes to return to the current operating story.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <TrackLink className="cta-primary" href="/" label="not-found go home">
            Back to overview
          </TrackLink>
          <TrackLink className="cta-secondary" href="/pitch" label="not-found go pitch">
            <>
              Read the pitch
              <ArrowRight className="h-4 w-4" />
            </>
          </TrackLink>
        </div>
      </div>
    </section>
  );
}
