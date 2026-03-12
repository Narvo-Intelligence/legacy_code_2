import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { SignalChart } from '../SignalChart';

export function MarketSlide({ id }: { id: string }) {
  const stats = [
    {
      value: '150+',
      label: 'SOURCE COVERAGE',
      desc: 'Local, Continental, and International feeds (Mediastack + NewsData.io integration).'
    },
    {
      value: '5',
      label: 'LOCAL LANGUAGES',
      desc: 'Full pre-generation for English, Pidgin, Yoruba, Hausa, and Igbo before user opens a story.'
    },
    {
      value: '10 min',
      label: 'SYNC FREQUENCY',
      desc: 'Continuous aggregator refresh via QStash cron schedules (§4.6).'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="04">
      <div className="container flex flex-col justify-center h-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 space-y-12">
            <h2
              className="font-header text-narvo-text slide-fade-up delay-1 uppercase tracking-tighter"
              style={{
                fontSize: 'var(--h2-size)'
              }}
            >
              The Signal Economy
            </h2>

            <div className="space-y-10">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`flex gap-6 slide-fade-up delay-${index + 2}`}
                >
                  <div className="w-1/3">
                    <div
                      className="font-header text-narvo-primary"
                      style={{ fontSize: '3rem', lineHeight: 1 }}
                    >
                      {stat.value}
                    </div>
                    <div className="font-mono text-[10px] text-narvo-secondary tracking-widest mt-1">
                      {stat.label}
                    </div>
                  </div>
                  <div className="flex-1 border-l border-narvo-structural pl-6 py-1">
                    <p
                      className="font-body text-narvo-text opacity-80"
                      style={{ fontSize: '1.1rem' }}
                    >
                      {stat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/3 slide-fade-up delay-5 narvo-border p-6 bg-narvo-surface/20">
            <p className="font-mono text-[10px] text-narvo-secondary tracking-[0.3em] mb-4 uppercase">Regional Distribution</p>
            <div className="h-64 flex items-end gap-3">
              <div className="flex-1 bg-narvo-primary/20 border border-narvo-primary h-[80%] relative group">
                <div className="absolute -top-6 left-0 w-full text-center font-mono text-[10px]">LOCAL</div>
              </div>
              <div className="flex-1 bg-narvo-primary/40 border border-narvo-primary h-[45%] relative group">
                <div className="absolute -top-6 left-0 w-full text-center font-mono text-[10px]">CONT.</div>
              </div>
              <div className="flex-1 bg-narvo-primary/60 border border-narvo-primary h-[25%] relative group">
                <div className="absolute -top-6 left-0 w-full text-center font-mono text-[10px]">INTL.</div>
              </div>
            </div>
            <p className="mt-8 font-body text-[12px] text-narvo-dimAccessible leading-relaxed italic">
              *Local coverage prioritized for high-fidelity TTS accent matching (§11).
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}