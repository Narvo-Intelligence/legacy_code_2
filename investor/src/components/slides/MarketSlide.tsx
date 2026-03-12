import React from 'react';
import { SlideLayout } from '../SlideLayout';
export function MarketSlide({ id }: {id: string;}) {
  const stats = [
  {
    value: '1.2B',
    desc: 'individuals across Africa. Mobile-first communities transitioning to audio-first information consumption.'
  },
  {
    value: 'Hands-Free',
    desc: 'Rising demand during commutes and multitasking.'
  },
  {
    value: 'TTS Ready',
    desc: 'High-fidelity TTS (YarnGPT for Nigerian languages + OpenAI fallback) is commercially viable.'
  }];

  const delayClasses = ['delay-2', 'delay-3', 'delay-4'] as const;

  return (
    <SlideLayout id={id} slideNumber="04">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-16 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          The Audio Boom
        </h2>

        <div className="grid-auto">
          {stats.map((stat, index) =>
          <div
            key={index}
            className={`flex flex-col gap-4 slide-fade-up ${delayClasses[index] ?? 'delay-2'}`}>

              <div
              className="font-header text-narvo-primary"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                lineHeight: 1
              }}>

                {stat.value}
              </div>
              <div className="h-px w-12 bg-narvo-structural" />
              <p
              className="font-body text-narvo-text"
              style={{
                fontSize: 'var(--body-size)'
              }}>

                {stat.desc}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideLayout>);

}