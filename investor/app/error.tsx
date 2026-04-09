'use client';

import { useEffect } from 'react';
import { TrackLink } from '@/components/investor/track-link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="shell flex min-h-[70vh] items-center py-16">
      <div className="frame-panel w-full px-6 py-10 md:px-10 md:py-14">
        <p className="section-kicker">Application error</p>
        <h1 className="mt-4 font-display text-5xl text-ink md:text-6xl">
          The investor platform hit an unexpected state.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-quiet md:text-lg">
          Reset the route and continue. If the issue persists, the live metric feed is likely unavailable and the
          fallback state should still render after a retry.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="cta-primary" onClick={() => reset()} type="button">
            Retry
          </button>
          <TrackLink className="cta-secondary" href="/" label="error fallback home">
            Back to overview
          </TrackLink>
        </div>
      </div>
    </section>
  );
}
