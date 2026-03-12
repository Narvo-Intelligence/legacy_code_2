import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { TrendingUpIcon, ZapIcon } from 'lucide-react';
export function AskSlide({ id }: {id: string;}) {
  return (
    <SlideLayout id={id} slideNumber="09">
      <div className="container flex flex-col justify-center h-full items-center text-center">
        <h2
          className="font-header text-narvo-text mb-6 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          The Next Tier
        </h2>

        <div className="flex flex-col items-center mb-12 slide-fade-up delay-2">
          <span className="font-mono text-narvo-secondary text-sm tracking-widest uppercase mb-2">
            [SEEKING]
          </span>
          <div
            className="font-header text-narvo-primary"
            style={{
              fontSize: 'clamp(4rem, 12vw, 8rem)',
              lineHeight: 1
            }}>

            £80,000
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full text-left mb-8">
          <div className="bg-narvo-surface border border-narvo-structural p-8 slide-fade-up delay-3">
            <TrendingUpIcon className="w-8 h-8 text-narvo-primary mb-4" />
            <p
              className="font-body text-narvo-text"
              style={{
                fontSize: 'var(--body-size)'
              }}>

              Launch V2 production build, secure regional media feeds, and
              refine high-fidelity voice models for authentic local delivery.
            </p>
          </div>

          <div className="bg-narvo-surface border border-narvo-structural p-8 slide-fade-up delay-4">
            <ZapIcon className="w-8 h-8 text-narvo-primary mb-4" />
            <p
              className="font-body text-narvo-text"
              style={{
                fontSize: 'var(--body-size)'
              }}>

              Establish strategic partnerships in Pan-African media and telecom
              to reach 1.2 billion people across the continent.
            </p>
          </div>
        </div>

        <p className="font-body text-narvo-dimAccessible text-sm max-w-2xl slide-fade-up delay-5">
          Empowering mobile-first communities through verified, culturally
          resonant audio broadcasts.
        </p>
      </div>
    </SlideLayout>);

}