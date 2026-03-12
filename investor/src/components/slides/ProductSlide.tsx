import React from 'react';
import { SlideLayout } from '../SlideLayout';
import {
  LayoutGridIcon,
  BookOpenIcon,
  PlayCircleIcon,
  MicIcon } from
'lucide-react';
export function ProductSlide({ id }: {id: string;}) {
  const features = [
  {
    icon: <LayoutGridIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'The Swiss Grid',
    desc: 'Precision layout with 1px borders and 10% primary color rule.'
  },
  {
    icon: <BookOpenIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'Paraphrased Stories',
    desc: 'Narrative-driven news arcs (Headline → Story → Signalling).'
  },
  {
    icon: <PlayCircleIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'The Broadcast Loop',
    desc: 'Continuous, radio-style audio stream.'
  },
  {
    icon: <MicIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'Voice Preference',
    desc: 'Localized accents (Pidgin, Yoruba, Hausa, Igbo).'
  }];

  return (
    <SlideLayout id={id} slideNumber="03">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-10 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          The Technical Instrument
        </h2>

        <div className="grid-auto">
          {features.map((feature, index) =>
          <div
            key={index}
            className={`bg-narvo-surface border border-narvo-structural border-t-4 border-t-narvo-primary p-6 md:p-8 slide-fade-up delay-${index + 2}`}>

              {feature.icon}
              <h3
              className="font-header text-narvo-text mb-3"
              style={{
                fontSize: 'var(--h3-size)'
              }}>

                {feature.title}
              </h3>
              <p
              className="font-body text-narvo-dimAccessible"
              style={{
                fontSize: 'var(--body-size)'
              }}>

                {feature.desc}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideLayout>);

}