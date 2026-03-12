import { motion } from 'framer-motion';
import { SlideLayout } from '../SlideLayout';
import { Clock4, Rocket } from 'lucide-react';

export function OpsSlide({ id }: { id: string }) {
  const highlights = [
    'Service worker now retries digest + queue flush with backoff, trims caches at 150 entries, and ships a `narvo-config` cache for offline sync (TECH REF §5.6).',
    'Audit script for unused deps plus Vitest + Playwright smoke tests ensure frontend coverage; backend smoke tests exercise API pings (§“audit” log).',
    'Vite manualChunks split Tone.js / GSAP / analytics bundles, keeping the board lean while still animating the pitch motion suite.',
  ];

  return (
    <SlideLayout id={id} slideNumber="06">
      <div className="relative z-10 max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6 text-narvo-primary" />
          <h2 className="font-header text-3xl text-narvo-text uppercase tracking-wider">Operational Rhythm</h2>
        </div>
        <motion.ul
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: 'linear' }}
          className="space-y-3 font-body text-[15px] leading-relaxed text-narvo-dimAccessible"
        >
          {highlights.map((item) => (
            <li key={item} className="narvo-border-l pl-3 border-l-narvo-primary/60">
              {item}
            </li>
          ))}
        </motion.ul>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-narvo-secondary">
          <Clock4 className="w-4 h-4 text-narvo-primary" />
          LIVE FEEDBACK
        </div>
      </div>
    </SlideLayout>
  );
}
