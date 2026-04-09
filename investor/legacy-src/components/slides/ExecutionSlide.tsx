import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { Server, Database, Shield } from 'lucide-react';

export function ExecutionSlide({ id }: { id: string }) {
  const strategies = [
    {
      icon: <Server className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'Technical Scalability',
      desc: 'Cloud-native infrastructure (FastAPI + Cloud Run) architected for parallelized audio synthesis and low-latency delivery (§4.1).'
    },
    {
      icon: <Database className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'Forensic Pipeline',
      desc: 'Proprietary multi-source clustering using pgvector and Gemini embeddings to eliminate misinformation at the source (§2).'
    },
    {
      icon: <Shield className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'Verification Logic',
      desc: 'The Truth Tag: Total transparency on data synthesis, verification, and translation accuracy for every broadcast.'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="09">
      <div className="container flex flex-col justify-center h-full max-w-6xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-10 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          Operational <span className="text-narvo-primary">Excellence</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {strategies.map((strategy, index) => (
            <div
              key={index}
              className={`bg-narvo-surface/20 border border-narvo-structural p-8 slide-fade-up delay-${index + 2} group hover:border-narvo-primary transition-colors`}
            >
              <div className="group-hover:rotate-12 transition-transform duration-500 w-fit">
                {strategy.icon}
              </div>
              <h3
                className="font-header text-narvo-text mb-3 uppercase tracking-wider"
                style={{ fontSize: 'var(--h3-size)' }}
              >
                {strategy.title}
              </h3>
              <p
                className="font-body text-narvo-dimAccessible leading-relaxed"
                style={{ fontSize: 'var(--body-size)' }}
              >
                {strategy.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}