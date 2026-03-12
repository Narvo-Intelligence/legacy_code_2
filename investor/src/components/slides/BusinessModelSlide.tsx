import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { UsersIcon, BookOpenIcon, DollarSignIcon } from 'lucide-react';
export function BusinessModelSlide({ id }: {id: string;}) {
  const streams = [
  {
    icon: <UsersIcon className="w-10 h-10 text-narvo-primary mb-6" />,
    title: 'Freemium',
    desc: 'Basic broadcast access with premium voice personalization.'
  },
  {
    icon: <BookOpenIcon className="w-10 h-10 text-narvo-primary mb-6" />,
    title: 'Institutional API',
    desc: 'Licensed news synthesis for schools and government.'
  },
  {
    icon: <DollarSignIcon className="w-10 h-10 text-narvo-primary mb-6" />,
    title: 'Sponsored Bulletins',
    desc: 'Branded segments integrated into the broadcast loop.'
  }];

  return (
    <SlideLayout id={id} slideNumber="05">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-12 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          Revenue & Reach
        </h2>

        <div className="grid-auto">
          {streams.map((stream, index) =>
          <div
            key={index}
            className={`bg-narvo-surface border border-narvo-structural p-8 relative overflow-hidden slide-fade-up delay-${index + 2}`}>

              {stream.icon}
              <h3
              className="font-header text-narvo-text mb-4"
              style={{
                fontSize: 'var(--h3-size)'
              }}>

                {stream.title}
              </h3>
              <p
              className="font-body text-narvo-dimAccessible"
              style={{
                fontSize: 'var(--body-size)'
              }}>

                {stream.desc}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideLayout>);

}