import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export function RoadmapSlide({ id }: { id: string }) {
  const phases = [
    {
      title: 'Phase 1: Foundation',
      status: 'Completed',
      items: ['Design System finalized', 'Web "Command Center" launch', '5:00 AM automated sync system'],
      icon: <CheckCircle2 className="w-5 h-5 text-narvo-primary" />
    },
    {
      title: 'Phase 2: Mobility',
      status: 'Active',
      items: ['Native Expo mobile app', 'Offline audio blob caching', 'Biometric authentication'],
      icon: <ArrowRight className="w-5 h-5 text-narvo-primary animate-pulse" />
    },
    {
      title: 'Phase 3: Intelligence',
      status: 'Roadmap',
      items: ['Media Intelligence API', 'Enterprise RAG integration', 'Regional voice training'],
      icon: <Circle className="w-5 h-5 text-narvo-structural" />
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="08">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto px-4">
        <h2 className="font-header text-narvo-text mb-10 slide-fade-up delay-1 uppercase tracking-tighter" style={{ fontSize: 'var(--h2-size)' }}>
          Current & <span className="text-narvo-primary">Roadmap</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {phases.map((phase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * index }}
              className={`narvo-border p-6 space-y-6 flex flex-col ${phase.status === 'Active' ? 'bg-narvo-surface/40 border-narvo-primary' : 'bg-narvo-surface/10 border-narvo-structural/40'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[9px] px-2 py-1 border ${phase.status === 'Completed' ? 'border-narvo-primary text-narvo-primary' : 'border-narvo-structural text-narvo-dim'}`}>
                  {phase.status.toUpperCase()}
                </span>
                {phase.icon}
              </div>
              
              <h3 className="font-header text-xl text-narvo-text uppercase tracking-wide">{phase.title}</h3>
              
              <ul className="space-y-3 flex-1">
                {phase.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-[13px] font-body text-narvo-dimAccessible leading-snug">
                    <span className="text-narvo-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
