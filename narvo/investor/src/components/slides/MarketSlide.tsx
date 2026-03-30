import { SlideLayout } from '../SlideLayout';

export function MarketSlide({ id }: { id: string }) {
  const stats = [
    {
      value: '500M+',
      label: 'POTENTIAL USERS',
      desc: 'Mobile-first communities across Africa transitioning to audio-first information consumption.'
    },
    {
      value: '150+',
      label: 'SOURCE COVERAGE',
      desc: 'Local, Continental, and International feeds integrated via Mediastack + NewsData.io.'
    },
    {
      value: '10 min',
      label: 'SYNC FREQUENCY',
      desc: 'Continuous aggregator refresh via QStash cron schedules ensuring peak news velocity (§4.6).'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="05">
      <div className="container flex flex-col justify-center h-full max-w-6xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-12">
            <h2
              className="font-header text-narvo-text slide-fade-up delay-1 uppercase tracking-tighter"
              style={{ fontSize: 'var(--h2-size)' }}
            >
              The <span className="text-narvo-primary">Signal</span> Economy
            </h2>

            <div className="space-y-8 md:space-y-10">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row gap-4 md:gap-6 slide-fade-up delay-${index + 2}`}
                >
                  <div className="w-full sm:w-1/3">
                    <div
                      className="font-header text-narvo-primary"
                      style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', lineHeight: 1 }}
                    >
                      {stat.value}
                    </div>
                    <div className="font-mono text-[9px] md:text-[10px] text-narvo-secondary tracking-widest mt-1 uppercase">
                      {stat.label}
                    </div>
                  </div>
                  <div className="flex-1 border-l-0 sm:border-l border-narvo-structural sm:pl-6 py-1">
                    <p
                      className="font-body text-narvo-dimAccessible leading-relaxed"
                      style={{ fontSize: 'var(--body-size)' }}
                    >
                      {stat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-1/3 slide-fade-up delay-5 narvo-border p-6 bg-narvo-surface/20 hidden md:block">
            <p className="font-mono text-[10px] text-narvo-secondary tracking-[0.3em] mb-6 uppercase text-center">Regional Distribution</p>
            <div className="h-64 flex items-end gap-4 px-4">
              <div className="flex-1 bg-narvo-primary/20 border border-narvo-primary h-[85%] relative group">
                <div className="absolute -top-8 left-0 w-full text-center font-mono text-[9px] tracking-widest uppercase">LOCAL</div>
              </div>
              <div className="flex-1 bg-narvo-primary/40 border border-narvo-primary h-[50%] relative group">
                <div className="absolute -top-8 left-0 w-full text-center font-mono text-[9px] tracking-widest uppercase">CONT.</div>
              </div>
              <div className="flex-1 bg-narvo-primary/60 border border-narvo-primary h-[30%] relative group">
                <div className="absolute -top-8 left-0 w-full text-center font-mono text-[9px] tracking-widest uppercase">INTL.</div>
              </div>
            </div>
            <p className="mt-10 font-body text-[11px] text-narvo-secondary leading-relaxed italic text-center opacity-60">
              *Local coverage prioritized for high-fidelity TTS accent matching (§11).
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}