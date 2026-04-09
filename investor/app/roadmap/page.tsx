import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/investor/page-hero';
import { TrackLink } from '@/components/investor/track-link';
import { roadmapPhases, roadmapTracks } from '@/lib/investor-content';

export const metadata: Metadata = {
  title: 'Roadmap',
};

export default function RoadmapPage() {
  return (
    <div className="space-y-12 pb-24">
      <PageHero
        actions={
          <>
            <TrackLink className="cta-primary" href="/pitch" label="roadmap hero open pitch">
              Read the pitch
            </TrackLink>
            <TrackLink className="cta-secondary" href="/analytics" label="roadmap hero open analytics">
              Open analytics
            </TrackLink>
          </>
        }
        eyebrow="Roadmap"
        summary="This roadmap is split on purpose: what the audience experiences, what the product and engineering teams ship, and what each phase unlocks commercially. It is meant to make scope and sequencing legible."
        title="A roadmap that covers the visible product, the technical backbone, and the business unlocks."
      />

      <section className="shell" data-track-section="roadmap-timeline">
        <div className="frame-panel overflow-x-auto px-6 py-6 md:px-8">
          <div className="grid min-w-[62rem] grid-cols-4 gap-4">
            {roadmapPhases.map((phase) => (
              <a
                key={phase.id}
                className="rounded-4xl bg-mist/65 p-5 transition hover:bg-surface/90"
                href={`#${phase.id}`}
              >
                <p className="section-kicker">{phase.window}</p>
                <h2 className="mt-3 font-display text-3xl text-ink">{phase.title}</h2>
                <p className="mt-3 text-sm leading-7 text-quiet">{phase.summary}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="shell space-y-8">
        {roadmapPhases.map((phase) => (
          <section
            key={phase.id}
            className="frame-panel overflow-hidden px-6 py-8 md:px-8 md:py-9"
            data-track-event="roadmap_phase_view"
            data-track-section={phase.id}
            id={phase.id}
          >
            <div className="space-y-4">
              <p className="section-kicker">{phase.window}</p>
              <h2 className="font-display text-4xl leading-[0.95] text-ink md:text-5xl">
                {phase.title}
              </h2>
              <p className="section-copy max-w-4xl">{phase.summary}</p>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="rounded-4xl bg-mist/65 p-5">
                <p className="section-kicker">What users and investors feel</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-ink">
                  {phase.casual.map((item) => (
                    <div key={item} className="stat-stack">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="deep-panel px-6 py-6">
                <p className="section-kicker text-white/65">What the team ships</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  {phase.technical.map((item) => (
                    <div key={item} className="stat-stack border-white/10">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-4xl border border-line/10 bg-surface/75 p-5">
                <p className="section-kicker">Commercial unlock</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-ink">
                  {phase.commercial.map((item) => (
                    <div key={item} className="stat-stack">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </section>

      <section className="shell" data-track-section="roadmap-tracks">
        <div className="frame-panel px-6 py-8 md:px-8 md:py-9">
          <div className="mb-8 space-y-4">
            <p className="section-kicker">Cross-cutting workstreams</p>
            <h2 className="font-display text-4xl text-ink md:text-5xl">
              The roadmap is phase-based, but execution still runs on continuous tracks.
            </h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {roadmapTracks.map((track) => (
              <div key={track.title} className="rounded-4xl border border-line/10 bg-mist/50 p-5">
                <h3 className="font-display text-3xl text-ink">{track.title}</h3>
                <div className="mt-5 space-y-4 text-sm leading-7 text-quiet">
                  <div>
                    <span className="section-kicker">Now</span>
                    <p className="mt-2 text-ink">{track.now}</p>
                  </div>
                  <div>
                    <span className="section-kicker">Next</span>
                    <p className="mt-2 text-ink">{track.next}</p>
                  </div>
                  <div>
                    <span className="section-kicker">Later</span>
                    <p className="mt-2 text-ink">{track.later}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell" data-track-section="roadmap-next-step">
        <div className="frame-panel px-6 py-8 md:px-10 md:py-10">
          <div className="content-grid items-center">
            <div className="space-y-4">
              <p className="section-kicker">Next step</p>
              <h2 className="font-display text-4xl text-ink md:text-5xl">
                Use the roadmap to judge sequencing, then use the pitch to judge conviction.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <TrackLink className="cta-primary" href="/pitch" label="roadmap prefooter open pitch">
                Investor pitch
              </TrackLink>
              <TrackLink className="cta-secondary" href="/analytics" label="roadmap prefooter open analytics">
                <>
                  Live analytics
                  <ArrowRight className="h-4 w-4" />
                </>
              </TrackLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
