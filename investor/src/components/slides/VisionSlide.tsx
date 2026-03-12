import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { QuoteIcon } from 'lucide-react';

export function VisionSlide({ id }: { id: string }) {
  return (
    <SlideLayout id={id} slideNumber="01">
      <div className="container flex flex-col justify-center items-center h-full text-center max-w-5xl mx-auto">
        <div className="bg-narvo-primary/10 border border-narvo-primary p-8 md:p-16 slide-fade-up delay-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-narvo-primary/10 -mr-16 -mt-16 rotate-45 group-hover:bg-narvo-primary/20 transition-colors duration-500" />
          
          <QuoteIcon className="w-12 h-12 md:w-16 md:h-16 text-narvo-primary mb-12 opacity-80 mx-auto" />
          
          <h2
            className="font-header text-narvo-text leading-[1.1] mb-12 uppercase tracking-tighter"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 3.5rem)' }}
          >
            The Local Pulse, <span className="text-narvo-primary">Refined.</span>
          </h2>
          
          <p className="font-body text-narvo-dimAccessible max-w-3xl mx-auto text-lg md:text-xl leading-relaxed">
            Narvo is the bridge between the raw energy of African news and the precision of global engineering. 
            We modernize the narrative by providing a tool that treats local stories with the 
            <span className="text-narvo-primary font-bold"> technical respect</span> they deserve.
          </p>

          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-narvo-primary/40" />
            <span className="font-mono text-narvo-secondary text-[12px] tracking-[0.4em] uppercase">
              Broadcast Fidelity §11
            </span>
            <div className="h-px w-8 bg-narvo-primary/40" />
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}