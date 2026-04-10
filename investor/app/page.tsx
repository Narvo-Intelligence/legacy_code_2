import { ArrowRight, AudioLines, Layers2, Radar, Sparkles } from 'lucide-react';
import { TrackLink } from '@/components/investor/track-link';

export default function HomePage() {
  const convictionPoints: any[] = [];
  const operatingModel: any[] = [];
  const overviewStats: { value: string; label: string; detail: string }[] = [];
  const whyNowSignals: any[] = [];

  return (
    <div className="space-y-24 pb-10 pt-10 md:space-y-28 md:pt-14">
      <section className="shell" data-track-section="landing-hero">
        <div className="deep-panel overflow-hidden px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14">
          <div className="content-grid items-end">
            <div className="space-y-6">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-white/70">
                Investor overview
              </p>
              <h1 className="font-display text-5xl leading-[0.9] text-white md:text-7xl">
                The intelligence layer turning African news into a daily briefing.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-white/80 md:text-lg">
                Narvo Intelligence is building a multilingual, audio-first news platform for Africa,
                then extending the same pipeline into partner-facing infrastructure. This site is the
                concise operating story: why the company exists, what ships next, what the current
                signal looks like, and what the capital unlocks.
              </p>

              <div className="flex flex-wrap gap-3">
                <TrackLink className="cta-primary" href="/pitch" label="landing hero view pitch">
                  <>
                    Open investor pitch
                    <ArrowRight className="h-4 w-4" />
                  </>
                </TrackLink>
                <TrackLink className="cta-secondary" href="/analytics" label="landing hero view analytics">
                  <>
                    Review live analytics
                    <Radar className="h-4 w-4" />
                  </>
                </TrackLink>
                <TrackLink className="cta-secondary" href="/roadmap" label="landing hero view roadmap">
                  <>
                    Inspect roadmap
                    <Layers2 className="h-4 w-4" />
                  </>
                </TrackLink>
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-none backdrop-blur-sm">
              <div className="space-y-5">
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.26em] text-white/60">
                    Current positioning
                  </p>
                  <p className="mt-3 text-2xl font-semibold">
                    Consumer proof first. Platform leverage second.
                  </p>
                </div>

                <div className="grid gap-4 text-sm text-white/75">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    Narvo is the B2C audio companion: briefings, playback, trust, offline utility.
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    Narvo NaaS is the B2B layer: narrative, translation, TTS, trust, and briefing APIs.
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    Narvo Intelligence is the parent operating system that holds the IP, the product line, and the investor story.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="soft-rule mt-10 grid gap-5 pt-8 md:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="font-display text-4xl text-white md:text-5xl">{item.value}</div>
                <p className="text-sm leading-6 text-white/85">{item.label}</p>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-white/55">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell" data-track-section="operating-model">
        <div className="mb-8 space-y-4">
          <p className="section-kicker">Operating model</p>
          <h2 className="section-title max-w-4xl">
            One intelligence layer, three outward faces, one tightly linked story.
          </h2>
          <p className="section-copy">
            The parent entity, the consumer product, and the platform layer do different jobs,
            but they all compound the same pipeline. That is why this investor site is organized
            around clarity instead of theatrics.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {operatingModel.map((item, index) => (
            <div
              key={item.name}
              className={`${index === 0 ? 'deep-panel' : 'frame-panel'} p-6 md:p-8`}
            >
              <div className="section-kicker text-inherit">{item.audience}</div>
              <h3 className={`mt-4 font-display text-3xl ${index === 0 ? 'text-white' : 'text-ink'}`}>
                {item.name}
              </h3>
              <p className={`mt-4 text-sm leading-7 ${index === 0 ? 'text-white/75' : 'text-quiet'}`}>
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell" data-track-section="market-window">
        <div className="mb-8 space-y-4">
          <p className="section-kicker">Why this window is open</p>
          <h2 className="section-title max-w-5xl">
            Narvo enters a market where the user need is obvious but the region-specific product is still missing.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {whyNowSignals.map((item) => (
            <div key={item.title} className="frame-panel p-6 md:p-8">
              <p className="section-kicker">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-quiet">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell" data-track-section="convictions">
        <div className="frame-panel overflow-hidden px-6 py-8 md:px-10 md:py-10">
          <div className="content-grid items-start">
            <div className="space-y-4">
              <p className="section-kicker">Execution convictions</p>
              <h2 className="section-title max-w-3xl">
                The company only works if product trust and operational discipline feel inseparable.
              </h2>
              <p className="section-copy">
                These are the lines that keep the investor story coherent with the product and
                technical roadmap underneath it.
              </p>
            </div>

            <div className="space-y-4">
              {convictionPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-line/10 bg-indigo/5 px-5 py-4 text-sm leading-7 text-ink"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell" data-track-section="next-actions">
        <div className="frame-panel px-6 py-8 md:px-10 md:py-10">
          <div className="content-grid items-center">
            <div className="space-y-5">
              <p className="section-kicker">Next actions</p>
              <h2 className="font-display text-4xl text-ink md:text-5xl">
                Move from narrative to proof.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-quiet">
                The next step is not another abstract overview. It is a tighter pitch, a live signal board,
                and a roadmap that cleanly separates what is shipping now from what capital accelerates next.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <TrackLink className="cta-primary" href="/pitch" label="prefooter open pitch">
                <>
                  <AudioLines className="h-4 w-4" />
                  Read the pitch
                </>
              </TrackLink>
              <TrackLink className="cta-secondary" href="/analytics" label="prefooter open analytics">
                <>
                  <Sparkles className="h-4 w-4" />
                  See the board
                </>
              </TrackLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
