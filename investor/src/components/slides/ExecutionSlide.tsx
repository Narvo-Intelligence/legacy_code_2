import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { ServerIcon, MapPinIcon, TargetIcon } from 'lucide-react';
export function ExecutionSlide({ id }: {id: string;}) {
  const strategies = [
  {
    icon: <ServerIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'Technical Scalability',
    desc: 'Modular, cloud-native infrastructure for real-time audio synthesis. PWA-based delivery with low-bandwidth optimization for any device, anywhere.'
  },
  {
    icon: <MapPinIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'Regional Rollout',
    desc: 'Phased deployment across key African hubs, partnering with local creators to refine regional voice models and cultural resonance.'
  },
  {
    icon: <TargetIcon className="w-8 h-8 text-narvo-primary mb-4" />,
    title: 'The Master Plan',
    desc: 'A precision-engineered ecosystem blending advanced synthesis with transparent verification — the gold standard for authorized digital broadcasts.'
  }];

  return (
    <SlideLayout id={id} slideNumber="07">
      <div className="container flex flex-col justify-center h-full">
        <h2
          className="font-header text-narvo-text mb-10 slide-fade-up delay-1"
          style={{
            fontSize: 'var(--h2-size)'
          }}>

          How We Scale
        </h2>

        <div className="grid-auto">
          {strategies.map((strategy, index) =>
          <div
            key={index}
            className={`bg-narvo-surface border border-narvo-structural border-t-4 border-t-narvo-primary p-6 md:p-8 slide-fade-up delay-${index + 2}`}>

              {strategy.icon}
              <h3
              className="font-header text-narvo-text mb-3"
              style={{
                fontSize: 'var(--h3-size)'
              }}>

                {strategy.title}
              </h3>
              <p
              className="font-body text-narvo-dimAccessible"
              style={{
                fontSize: 'var(--body-size)'
              }}>

                {strategy.desc}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideLayout>);

}