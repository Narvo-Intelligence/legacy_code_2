import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { ArrowDownIcon } from 'lucide-react';
export function TitleSlide({ id }: {id: string;}) {
  return (
    <SlideLayout id={id}>
      <div className="container flex flex-col justify-center h-full relative">
        {/* Structural geometric accent */}
        <div className="decorative absolute left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-narvo-structural slide-fade-up delay-1" />

        <div className="pl-8 md:pl-12">
          <h1
            className="font-header text-narvo-primary uppercase tracking-tighter slide-fade-up delay-1"
            style={{
              fontSize: 'var(--title-size)',
              lineHeight: 0.9
            }}>

            Narvo
          </h1>

          <h2
            className="font-header text-narvo-text mt-6 mb-8 slide-fade-up delay-2"
            style={{
              fontSize: 'var(--h2-size)',
              lineHeight: 1.1
            }}>

            The News Broadcast,
            <br />
            Reimagined
          </h2>

          <p
            className="font-body text-narvo-dimAccessible max-w-2xl slide-fade-up delay-3"
            style={{
              fontSize: 'var(--body-size)'
            }}>

            A next-generation audio utility delivering verified, culturally
            resonant stories in authentic local dialects.
          </p>
        </div>

        <div className="keyboard-hint absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-narvo-dimAccessible font-body text-sm slide-fade-up delay-5 opacity-80">
          <ArrowDownIcon className="w-5 h-5 animate-bounce" />
          <span>Scroll or use arrow keys</span>
        </div>
      </div>
    </SlideLayout>);

}