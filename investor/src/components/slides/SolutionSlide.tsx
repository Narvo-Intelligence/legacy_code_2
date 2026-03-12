import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { RadioIcon } from 'lucide-react';
export function SolutionSlide({ id }: {id: string;}) {
  return (
    <SlideLayout id={id} slideNumber="02">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-8 md:mb-12 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          The Broadcast Paradigm
        </h2>

        <div className="bg-narvo-primary p-8 md:p-16 slide-fade-up delay-2 relative overflow-hidden">
          <RadioIcon className="w-12 h-12 md:w-16 md:h-16 text-narvo-bg mb-8 opacity-80" />

          <p
            className="font-header text-narvo-bg leading-tight"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 3rem)'
            }}>

            Narvo transforms fragmented data into a cohesive, professional
            Broadcast. We paraphrase complex news into narrative stories,
            delivered via state-of-the-art AI audio.
          </p>
        </div>
      </div>
    </SlideLayout>);

}