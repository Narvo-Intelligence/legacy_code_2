import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { QuoteIcon } from 'lucide-react';
export function VisionSlide({ id }: {id: string;}) {
  return (
    <SlideLayout id={id}>
      <div className="container flex flex-col justify-center items-center h-full text-center">
        <div className="bg-narvo-primary p-8 md:p-16 slide-fade-up delay-1 relative overflow-hidden max-w-5xl w-full">
          <QuoteIcon className="w-12 h-12 md:w-16 md:h-16 text-narvo-bg mb-8 opacity-80 mx-auto" />

          <p
            className="font-header text-narvo-bg leading-tight"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 3rem)'
            }}>

            "Narvo will transform fragmented global information into seamless,
            verified audio stories delivered across dozens of local dialects,
            dismantling linguistic barriers while ensuring absolute transparency
            and effortless consumption for over a billion people."
          </p>
        </div>

        <div className="mt-8 slide-fade-up delay-3">
          <span className="font-mono text-narvo-secondary text-sm tracking-widest uppercase">
            [THE MASTER PITCH]
          </span>
        </div>
      </div>
    </SlideLayout>);

}