import type { Metadata } from 'next';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { PageHero } from '@/components/investor/page-hero';
import { TrackLink } from '@/components/investor/track-link';
import { pitchChapters } from '@/lib/investor-content';

export const metadata: Metadata = {
  title: 'Pitch',
};

export default function PitchPage() {
  return (
    <div className="space-y-12 pb-24">
      <PageHero
        actions={
          <>
            <TrackLink className="cta-primary" href="/analytics" label="pitch hero open analytics">
              <>
                View live analytics
                <BarChart3 className="h-4 w-4" />
              </>
            </TrackLink>
            <TrackLink className="cta-secondary" href="/roadmap" label="pitch hero open roadmap">
              <>
                Open roadmap
                <ArrowRight className="h-4 w-4" />
              </>
            </TrackLink>
          </>
        }
        eyebrow="Investor pitch"
        summary="This is the narrative version of the investor deck: the market gap, the product loop, the platform logic, the business model, and the immediate ask without forcing a slide-by-slide format."
        title="A pitch structure built for conviction, not just presentation."
      />

      <div className="shell grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="frame-panel h-fit p-5 lg:sticky lg:top-24">
          <p className="section-kicker">Pitch map</p>
          <div className="mt-4 space-y-2">
            {pitchChapters.map((chapter, index) => (
              <a
                key={chapter.id}
                className="block rounded-3xl px-4 py-3 text-sm text-quiet transition hover:bg-indigo/5 hover:text-ink"
                href={`#${chapter.id}`}
              >
                <span className="mr-3 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-indigo">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {chapter.title}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-8">
          {pitchChapters.map((chapter, index) => (
            <section
              key={chapter.id}
              className="frame-panel overflow-hidden px-6 py-8 md:px-8 md:py-9"
              data-track-event="pitch_chapter_view"
              data-track-section={chapter.id}
              id={chapter.id}
            >
              <div className="content-grid items-start">
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <span className="metric-chip">{String(index + 1).padStart(2, '0')}</span>
                    <p className="section-kicker">{chapter.kicker}</p>
                  </div>
                  <h2 className="font-display text-4xl leading-[0.98] text-ink md:text-5xl">
                    {chapter.title}
                  </h2>
                  <p className="max-w-3xl text-base leading-7 text-quiet md:text-lg">
                    {chapter.summary}
                  </p>
                  <div className="space-y-3">
                    {chapter.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="rounded-3xl border border-line/10 bg-indigo/5 px-5 py-4 text-sm leading-7 text-ink"
                      >
                        {bullet}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="deep-panel px-6 py-7">
                  <p className="section-kicker text-white/65">Key signal</p>
                  <div className="mt-4 font-display text-5xl text-white">{chapter.stat}</div>
                  <p className="mt-3 text-sm leading-7 text-white/75">{chapter.statLabel}</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
