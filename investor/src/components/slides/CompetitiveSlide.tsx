import React from 'react';
import { SlideLayout } from '../SlideLayout';

export function CompetitiveSlide({ id }: { id: string }) {
  const rows = [
    {
      feature: 'AI Synthesis',
      narvo: 'Verified Narrative',
      generic: 'Static Summary',
      radio: 'Manual/Fragmented'
    },
    {
      feature: 'Precision UI',
      narvo: 'Swiss Grid',
      generic: 'Cluttered',
      radio: 'N/A'
    },
    {
      feature: 'Native Dialect',
      narvo: 'Authentic (5+)',
      generic: 'Robotic / None',
      radio: 'Limited'
    },
    {
      feature: 'Offline Mode',
      narvo: 'Blob Caching',
      generic: 'Requires Data',
      radio: 'One-way only'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="08">
      <div className="container flex flex-col justify-center h-full max-w-6xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-10 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          Competitive <span className="text-narvo-primary">Edge</span>
        </h2>

        <div className="narvo-border bg-narvo-surface/10 overflow-x-auto custom-scroll slide-fade-up delay-2">
          <div className="min-w-[600px] md:min-w-full">
            {/* Header Row */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-narvo-structural/40 bg-narvo-bg/60">
              <div className="font-mono text-[10px] text-narvo-secondary tracking-widest uppercase">
                Capability
              </div>
              <div className="font-mono text-[10px] text-narvo-primary tracking-widest uppercase">
                Narvo Engine
              </div>
              <div className="font-mono text-[10px] text-narvo-secondary tracking-widest uppercase">
                Aggregators
              </div>
              <div className="font-mono text-[10px] text-narvo-secondary tracking-widest uppercase">
                Legacy Media
              </div>
            </div>

            {/* Data Rows */}
            <div className="flex flex-col">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-4 gap-4 p-6 border-b border-narvo-structural/20 last:border-0 ${index % 2 === 0 ? 'bg-narvo-bg/20' : ''}`}
                >
                  <div className="font-header text-sm md:text-base text-narvo-text uppercase tracking-wide flex items-center">
                    {row.feature}
                  </div>
                  <div className="font-body text-xs md:text-sm text-narvo-primary bg-narvo-primary/5 px-3 py-2 border border-narvo-primary/20 flex items-center font-bold">
                    {row.narvo}
                  </div>
                  <div className="font-body text-xs md:text-sm text-narvo-dimAccessible flex items-center">
                    {row.generic}
                  </div>
                  <div className="font-body text-xs md:text-sm text-narvo-dimAccessible flex items-center">
                    {row.radio}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center md:text-left slide-fade-up delay-4">
          <p className="font-body text-[11px] text-narvo-secondary uppercase tracking-[0.3em] italic opacity-60">
            *Narvo leverages multi-model LLM synthesis (§4.3) to maintain authority.
          </p>
        </div>
      </div>
    </SlideLayout>
  );
}