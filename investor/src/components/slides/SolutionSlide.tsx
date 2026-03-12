import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { Radio, Layers, MessageSquareQuote } from 'lucide-react';

export function SolutionSlide({ id }: { id: string }) {
  const pillars = [
    {
      icon: <Layers className="w-5 h-5" />,
      title: 'Multi-Source Synthesis',
      text: 'Eliminating noise by clustering related reports into a single, verified "Consensus Narrative".'
    },
    {
      icon: <Radio className="w-5 h-5" />,
      title: 'The Broadcast Paradigm',
      text: 'Recasting raw data into professional, high-fidelity narrative bulletins designed for audio.'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="02">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-8 md:mb-12 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          The <span className="text-narvo-primary">Consensus</span> Narrative
        </h2>

        <div className="space-y-8">
          <div className="bg-narvo-primary p-8 md:p-12 slide-fade-up delay-2 relative overflow-hidden group">
            <MessageSquareQuote className="absolute right-[-20px] top-[-20px] w-48 h-48 text-narvo-bg opacity-10 group-hover:rotate-12 transition-transform duration-700" />
            
            <p
              className="font-header text-narvo-bg leading-tight relative z-10"
              style={{ fontSize: 'clamp(1.25rem, 4vw, 2.5rem)' }}
            >
              Narvo transforms fragmented data into a cohesive, professional 
              <span className="font-bold"> Broadcast Entity.</span> We paraphrase complex 
              global events into audible stories delivered with absolute clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 slide-fade-up delay-3">
            {pillars.map((pillar, i) => (
              <div key={i} className="narvo-border bg-narvo-surface/10 p-6 space-y-3">
                <div className="flex items-center gap-3 text-narvo-primary">
                  {pillar.icon}
                  <h3 className="font-header text-sm uppercase tracking-[0.2em]">{pillar.title}</h3>
                </div>
                <p className="font-body text-narvo-dimAccessible text-sm leading-relaxed">
                  {pillar.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}