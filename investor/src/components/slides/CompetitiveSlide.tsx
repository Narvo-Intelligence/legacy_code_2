import React from 'react';
import { SlideLayout } from '../SlideLayout';
export function CompetitiveSlide({ id }: {id: string;}) {
  const rows = [
  {
    feature: 'AI Paraphrasing',
    narvo: '✅ Narrative',
    generic: '❌ Static Summary',
    radio: '❌ Manual'
  },
  {
    feature: 'Swiss Grid UI',
    narvo: '✅ Precision',
    generic: '❌ Cluttered',
    radio: '❌ N/A'
  },
  {
    feature: 'Local Dialect TTS',
    narvo: '✅ Natural',
    generic: '❌ Robotic / None',
    radio: '✅ Limited'
  },
  {
    feature: 'Contextual RAG',
    narvo: '🔜 Roadmap',
    generic: '❌ None',
    radio: '❌ N/A'
  }];

  return (
    <SlideLayout id={id} slideNumber="08">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-10 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          Competitive Edge
        </h2>

        <div className="bg-narvo-surface border border-narvo-structural overflow-hidden slide-fade-up delay-2">
          {/* Header Row */}
          <div className="grid grid-cols-4 gap-4 p-4 md:p-6 border-b border-narvo-structural bg-narvo-bg">
            <div className="font-header text-narvo-dimAccessible text-sm md:text-base">
              Feature
            </div>
            <div className="font-header text-narvo-primary text-sm md:text-base">
              Narvo V2
            </div>
            <div className="font-header text-narvo-dimAccessible text-sm md:text-base">
              Generic Aggregators
            </div>
            <div className="font-header text-narvo-dimAccessible text-sm md:text-base">
              Radio / TV
            </div>
          </div>

          {/* Data Rows */}
          <div className="flex flex-col">
            {rows.map((row, index) =>
            <div
              key={index}
              className={`grid grid-cols-4 gap-4 p-4 md:p-6 border-b border-narvo-structural last:border-0 ${index % 2 === 0 ? 'bg-narvo-bg/30' : ''}`}>

                <div className="font-header text-narvo-text text-sm md:text-lg flex items-center">
                  {row.feature}
                </div>
                <div className="font-body text-narvo-text text-sm md:text-base flex items-center bg-narvo-primary/10 px-3 py-2 border border-narvo-primary/20">
                  {row.narvo}
                </div>
                <div className="font-body text-narvo-dimAccessible text-sm md:text-base flex items-center">
                  {row.generic}
                </div>
                <div className="font-body text-narvo-dimAccessible text-sm md:text-base flex items-center">
                  {row.radio}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideLayout>);

}