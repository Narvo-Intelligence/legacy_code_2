import React from 'react';
import { SlideLayout } from '../SlideLayout';
import { ChevronDown, Radio, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export function TitleSlide({ id }: { id: string }) {
  return (
    <SlideLayout id={id} slideNumber="00">
      <div className="container flex flex-col justify-center h-full relative max-w-6xl mx-auto px-6">
        {/* Dynamic Background Element */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 opacity-10 pointer-events-none overflow-hidden">
          <Activity className="w-full h-full text-narvo-primary animate-pulse" />
        </div>

        <div className="space-y-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-narvo-primary p-2 flex items-center justify-center">
              <img src="/narvo_logo.svg" alt="Narvo Logo" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <div className="h-px w-12 bg-narvo-primary/40" />
            <span className="font-mono text-narvo-secondary text-[10px] tracking-[0.5em] uppercase">
              Broadcast Ready v2.0
            </span>
          </motion.div>

          <div>
            <h1
              className="font-header text-narvo-primary uppercase tracking-tighter slide-fade-up delay-1"
              style={{
                fontSize: 'var(--title-size)',
                lineHeight: 0.85
              }}
            >
              Narvo
            </h1>

            <h2
              className="font-header text-narvo-text mt-6 slide-fade-up delay-2 uppercase tracking-tight"
              style={{
                fontSize: 'var(--h2-size)',
                lineHeight: 1
              }}
            >
              The Local Pulse,
              <br />
              <span className="text-narvo-primary">Refined.</span>
            </h2>

            <p
              className="font-body text-narvo-dimAccessible max-w-2xl mt-8 slide-fade-up delay-3 leading-relaxed"
              style={{
                fontSize: 'var(--body-size)'
              }}
            >
              African broadcast-grade news synthesized via Gemini, 
              delivered in authentic Nigerian accents through YarnGPT, 
              and architected for true offline fidelity.
            </p>
          </div>

          <div className="flex gap-4 slide-fade-up delay-4 pt-4">
            <div className="narvo-border px-4 py-2 flex items-center gap-2 bg-narvo-surface/20">
              <Radio className="w-4 h-4 text-narvo-primary" />
              <span className="font-mono text-[10px] tracking-widest text-narvo-text">5_LOCAL_LANGS</span>
            </div>
            <div className="narvo-border px-4 py-2 flex items-center gap-2 bg-narvo-surface/20">
              <Activity className="w-4 h-4 text-narvo-primary" />
              <span className="font-mono text-[10px] tracking-widest text-narvo-text">REAL_TIME_SYNC</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-6 flex flex-col items-center gap-2 text-narvo-dimAccessible font-mono text-[10px] slide-fade-up delay-5 opacity-60">
          <ChevronDown className="w-4 h-4 animate-bounce" />
          <span className="tracking-[0.3em] uppercase">Initialize Signal</span>
        </div>
      </div>
    </SlideLayout>
  );
}