import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { Rocket, Clock, Zap } from 'lucide-react';

export function OpsSlide({ id }: { id: string }) {
  const points = [
    {
      icon: <Clock className="w-5 h-5" />,
      title: 'The 5:00 AM Pulse',
      text: 'Automated Cloud Scheduler triggers AI synthesis and TTS generation daily at dawn to pre-cache morning briefings.'
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Automated Sync',
      text: 'Continuous aggregator refresh via QStash cron schedules ensuring news velocity remains at peak efficiency (§4.6).'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="13">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-10 slide-fade-up delay-1">
          <Rocket className="w-8 h-8 text-narvo-primary" />
          <h2 className="font-header text-4xl text-narvo-text uppercase tracking-wider">Operational Rhythm</h2>
        </div>

        <div className="space-y-6">
          {points.map((point, index) => (
            <div
              key={index}
              className={`narvo-border bg-narvo-surface/10 p-8 flex gap-6 slide-fade-up delay-${index + 2} group hover:border-narvo-primary transition-colors`}
            >
              <div className="mt-1 text-narvo-primary">{point.icon}</div>
              <div>
                <h3 className="font-header text-xl text-narvo-text mb-2 uppercase tracking-wide">{point.title}</h3>
                <p className="font-body text-narvo-dimAccessible leading-relaxed" style={{ fontSize: 'var(--body-size)' }}>
                  {point.text}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-narvo-secondary slide-fade-up delay-4">
          <span className="w-2 h-2 bg-narvo-primary animate-pulse" />
          Zero-Latency Streaming Ready
        </div>
      </div>
    </SlideLayout>
  );
}
