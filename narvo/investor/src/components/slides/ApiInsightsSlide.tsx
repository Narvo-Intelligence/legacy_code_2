import { SlideLayout } from '../SlideLayout';
import { Terminal, Layers, Code } from 'lucide-react';

export function ApiInsightsSlide({ id }: { id: string }) {
  const points = [
    {
      icon: <Terminal className="w-5 h-5" />,
      title: 'Real-Time Telemetry',
      text: 'Frontend API client logs precise timing per verb, deduplicating GETs for 2s to ensure UI synchronization (§5.2).'
    },
    {
      icon: <Code className="w-5 h-5" />,
      title: 'Runtime Validation',
      text: 'Versioned storage and runtime validators guard IndexedDB caches and API payloads against schema drift (§5.10).'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="12">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-10 slide-fade-up delay-1">
          <Layers className="w-8 h-8 text-narvo-primary" />
          <h2 className="font-header text-4xl text-narvo-text uppercase tracking-wider">Client Signal Layer</h2>
        </div>

        <div className="space-y-6">
          {points.map((point, index) => (
            <div
              key={index}
              className={`narvo-border bg-narvo-surface/10 p-8 flex gap-6 slide-fade-up delay-${index + 2} group hover:border-narvo-primary transition-colors`}
            >
              <div className="mt-1 text-narvo-primary group-hover:rotate-12 transition-transform">{point.icon}</div>
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
          <span className="w-2 h-2 bg-narvo-primary" />
          Hardened Edge Architecture (§5.6)
        </div>
      </div>
    </SlideLayout>
  );
}
