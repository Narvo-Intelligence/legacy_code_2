import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { Users, Briefcase, Zap } from 'lucide-react';

export function BusinessModelSlide({ id }: { id: string }) {
  const streams = [
    {
      icon: <Users className="w-8 h-8 text-narvo-primary mb-6" />,
      title: 'Freemium Access',
      desc: 'Free broadcast entry with premium tiers for custom voice models and offline blob caching.'
    },
    {
      icon: <Briefcase className="w-8 h-8 text-narvo-primary mb-6" />,
      title: 'Enterprise API',
      desc: 'Media Intelligence API licensed to financial institutions, NGOs, and government bodies.'
    },
    {
      icon: <Zap className="w-8 h-8 text-narvo-primary mb-6" />,
      title: 'Sponsored Bulletins',
      desc: 'High-authority, non-intrusive branded segments integrated directly into the 5:00 AM loop.'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="05">
      <div className="container flex flex-col justify-center h-full max-w-6xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-12 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          Revenue & <span className="text-narvo-primary">Reach</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {streams.map((stream, index) => (
            <div
              key={index}
              className={`bg-narvo-surface/20 border border-narvo-structural p-8 relative overflow-hidden slide-fade-up delay-${index + 2} group hover:border-narvo-primary transition-colors`}
            >
              <div className="group-hover:scale-110 transition-transform duration-300 w-fit">
                {stream.icon}
              </div>
              <h3
                className="font-header text-narvo-text mb-4 uppercase tracking-wider"
                style={{ fontSize: 'var(--h3-size)' }}
              >
                {stream.title}
              </h3>
              <p
                className="font-body text-narvo-dimAccessible leading-relaxed"
                style={{ fontSize: 'var(--body-size)' }}
              >
                {stream.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}