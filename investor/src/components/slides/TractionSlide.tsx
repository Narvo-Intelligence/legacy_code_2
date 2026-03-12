import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { Activity, Zap, ShieldCheck } from 'lucide-react';

export function TractionSlide({ id }: { id: string }) {
  const kpis = [
    {
      label: 'Consensus Accuracy',
      value: '98.2%',
      desc: 'Cross-verified narrative accuracy vs 62% for single-source reports.',
      icon: <ShieldCheck className="w-5 h-5 text-narvo-primary" />
    },
    {
      label: 'News Velocity',
      value: '-14m',
      desc: 'Automated synchronization and synthesis vs 45m manual baseline.',
      icon: <Zap className="w-5 h-5 text-narvo-primary" />
    },
    {
      label: 'Compute Efficiency',
      value: '$0.08',
      desc: 'Per-user operational cost via advanced TTS caching and synthesis.',
      icon: <Activity className="w-5 h-5 text-narvo-primary" />
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="06">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-12 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          Performance <span className="text-narvo-primary">Metrics</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpis.map((kpi, index) => (
            <div
              key={index}
              className={`narvo-border bg-narvo-surface/20 p-8 flex flex-col items-center text-center space-y-4 slide-fade-up delay-${index + 2} group hover:border-narvo-primary transition-colors`}
            >
              <div className="p-3 bg-narvo-primary/10 rounded-none group-hover:scale-110 transition-transform">
                {kpi.icon}
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-narvo-secondary tracking-[0.2em] uppercase">{kpi.label}</p>
                <p className="font-header text-4xl text-narvo-text tracking-tighter">{kpi.value}</p>
              </div>
              <p className="font-body text-narvo-dimAccessible text-[13px] leading-relaxed">
                {kpi.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}