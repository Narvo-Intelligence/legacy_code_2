import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { ShieldAlert, ZapOff, Languages } from 'lucide-react';

export function ProblemSlide({ id }: { id: string }) {
  const problems = [
    {
      icon: <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-narvo-primary shrink-0" />,
      title: 'Distrust & Fragmentation',
      text: ' Fragmented news sources and "clickbait" summaries have eroded trust. Modern audiences lack a single, authoritative consensus narrative.'
    },
    {
      icon: <ZapOff className="w-6 h-6 md:w-8 md:h-8 text-narvo-primary shrink-0" />,
      title: 'Digital & Visual Fatigue',
      text: 'In eyes-busy, sunlight-heavy environments, screen-based news consumption creates high friction and cognitive overload.'
    },
    {
      icon: <Languages className="w-6 h-6 md:w-8 md:h-8 text-narvo-primary shrink-0" />,
      title: 'Linguistic Exclusion',
      text: 'A critical lack of high-fidelity, authoritative news in local African dialects excludes millions from the global information economy.'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="02">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-12 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          The Information <span className="text-narvo-primary">Noise</span>
        </h2>

        <div className="flex flex-col gap-4 md:gap-6">
          {problems.map((problem, index) => (
            <div
              key={index}
              className={`flex items-start gap-4 md:gap-6 p-5 md:p-8 bg-narvo-surface/20 border border-narvo-structural/30 slide-fade-up delay-${index + 2} group hover:border-narvo-primary transition-colors`}
            >
              <div className="mt-1 group-hover:scale-110 transition-transform">{problem.icon}</div>
              <div className="space-y-2">
                <h3 className="font-header text-lg md:text-xl text-narvo-text uppercase tracking-wide">{problem.title}</h3>
                <p
                  className="font-body text-narvo-dimAccessible leading-relaxed"
                  style={{ fontSize: 'var(--body-size)' }}
                >
                  {problem.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}