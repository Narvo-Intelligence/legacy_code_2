import React, { Fragment } from 'react';
import { SlideLayout } from '../SlideLayout';
import { XCircleIcon, EyeOffIcon, GlobeIcon } from 'lucide-react';
export function ProblemSlide({ id }: {id: string;}) {
  const problems = [
  {
    icon:
    <XCircleIcon className="w-6 h-6 md:w-8 md:h-8 text-narvo-primary shrink-0" />,

    text: 'The language barrier excludes millions from the global conversation. Vital information fails to reach communities in their most authentic linguistic form.'
  },
  {
    icon:
    <EyeOffIcon className="w-6 h-6 md:w-8 md:h-8 text-narvo-primary shrink-0" />,

    text: 'Digital information faces a trust crisis. Fragmented sources and opaque synthesis erode confidence in the stories people consume daily.'
  },
  {
    icon:
    <GlobeIcon className="w-6 h-6 md:w-8 md:h-8 text-narvo-primary shrink-0" />,

    text: 'Modern information overload creates friction. Dense, fragmented data demands screen time that busy, mobile-first audiences cannot afford.'
  }];

  return (
    <SlideLayout id={id} slideNumber="01">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-12 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          The Information Noise
        </h2>

        <div className="flex flex-col gap-6 md:gap-8 max-w-4xl">
          {problems.map((problem, index) =>
          <div
            key={index}
            className={`flex items-start gap-6 p-6 bg-narvo-surface border-l-4 border-l-narvo-primary slide-fade-up delay-${index + 2}`}>

              {problem.icon}
              <p
              className="font-body text-narvo-text"
              style={{
                fontSize: 'var(--body-size)'
              }}>

                {problem.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideLayout>);

}