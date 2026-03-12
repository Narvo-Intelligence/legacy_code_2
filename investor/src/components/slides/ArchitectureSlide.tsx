import { motion } from 'framer-motion';
import { SlideLayout } from '../SlideLayout';
import { ShieldCheck, Wifi } from 'lucide-react';

export function ArchitectureSlide({ id }: { id: string }) {
  const points = [
    'FastAPI assembly point (`server.py`) orchestrates middleware → routers, with structured JSON logs, CSP, Referrer-Policy and standardized HTTP error envelopes that always expose `request_id`/`user_id` (docs/TECHNICAL_REFERENCE.md §4.1).',
    'Shared `httpx.AsyncClient` reuses keep-alive/TLS across services, while RateLimit + RequestID middlewares log latency, user, and request context to Cloud Run logs (§10).',
    'Security headers (CSP, frame-ancestors, media-src) plus strict auth middleware keep cron/QStash, push, and user data channels hardened for broadcast-grade production.',
  ];

  return (
    <SlideLayout id={id} slideNumber="02">
      <div className="relative z-10 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-narvo-primary" />
          <h2 className="font-header text-3xl text-narvo-text uppercase tracking-wider">Server Architecture</h2>
        </div>
        <motion.ul
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="space-y-3 font-body text-[15px] leading-relaxed text-narvo-dimAccessible"
        >
          {points.map((point) => (
            <li key={point} className="narvo-border-l pl-3 border-l-narvo-primary/60">
              {point}
            </li>
          ))}
        </motion.ul>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-narvo-secondary">
          <Wifi className="w-4 h-4 text-narvo-primary" />
          SIGNAL ARCHIVE
        </div>
      </div>
    </SlideLayout>
  );
}
