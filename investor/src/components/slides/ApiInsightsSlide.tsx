import { motion } from 'framer-motion';
import { SlideLayout } from '../SlideLayout';
import { Terminal, Layers } from 'lucide-react';

export function ApiInsightsSlide({ id }: { id: string }) {
  const rows = [
    'Frontend API client logs timing per verb, deduplicates GETs for 2s, and clones responses so charts/counters stay in sync (docs/TECHNICAL_REFERENCE.md §5.2).',
    'Versioned `storage.ts` and runtime `validators.ts` guard localCache + API payloads (sd.-§5.10).',
    'Service worker retries digest + offline queue to avoid cookie storms; manual chunks split Tone.js / GSAP / analytics for precise caching (docs §5.6).',
  ];

  return (
    <SlideLayout id={id} slideNumber="04">
      <div className="relative z-10 max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-narvo-primary" />
          <h2 className="font-header text-3xl text-narvo-text uppercase tracking-wider">Client Signal Layer</h2>
        </div>
        <motion.div
          className="space-y-4 font-body text-[15px] leading-relaxed text-narvo-dimAccessible"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {rows.map((row) => (
            <article key={row} className="narvo-border rounded-none border-narvo-border-subtle bg-narvo-bg/40 p-4">
              {row}
            </article>
          ))}
        </motion.div>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-narvo-secondary">
          <Terminal className="w-4 h-4 text-narvo-primary" />
          EDGE-FIRST DX
        </div>
      </div>
    </SlideLayout>
  );
}
