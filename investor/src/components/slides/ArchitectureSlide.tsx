import { motion } from 'framer-motion';
import { SlideLayout } from '../SlideLayout';
import { ShieldCheck, Cpu, Database, Zap } from 'lucide-react';

export function ArchitectureSlide({ id }: { id: string }) {
  const points = [
    {
      icon: <Zap className="w-5 h-5 text-narvo-primary" />,
      title: 'Pre-Generation Pipeline',
      desc: 'Automatic translation and TTS synthesis for all 5 languages triggered as a background task immediately after fetch (§4.5).'
    },
    {
      icon: <Cpu className="w-5 h-5 text-narvo-primary" />,
      title: 'Multi-Model LLM Layer',
      desc: 'Gemini 1.5 Flash for composite story synthesis, translation, and semantic recommendation boosting (§4.3).'
    },
    {
      icon: <Database className="w-5 h-5 text-narvo-primary" />,
      title: 'Global State & Sync',
      desc: 'Upstash Redis for real-time feed caching + QStash for reliable cron-driven aggregator updates (§4.6).'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="02">
      <div className="container flex flex-col justify-center h-full max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-12 slide-fade-up delay-1">
          <ShieldCheck className="w-8 h-8 text-narvo-primary" />
          <h2 className="font-header text-4xl text-narvo-text uppercase tracking-wider">Engine Architecture</h2>
        </div>
        
        <div className="space-y-6">
          {points.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 * (index + 1) }}
              className="narvo-border-subtle bg-narvo-surface/20 p-6 flex gap-6 group hover:border-narvo-primary transition-colors"
            >
              <div className="mt-1">{point.icon}</div>
              <div>
                <h3 className="font-header text-xl text-narvo-text mb-2 uppercase tracking-wide">{point.title}</h3>
                <p className="font-body text-narvo-dimAccessible leading-relaxed">{point.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-narvo-secondary slide-fade-up delay-5">
          <span className="w-2 h-2 bg-narvo-primary animate-pulse" />
          System Hardened (§10)
        </div>
      </div>
    </SlideLayout>
  );
}
