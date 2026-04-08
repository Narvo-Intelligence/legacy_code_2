'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { COPY, tutorialProgressLabel } from '@/lib/narvo-app-copy';
import {
  FEATURE_TOUR_LS_KEY,
  getFeatureTourSteps,
  isFeatureTourDismissedInStorage,
} from '@/lib/narvo-feature-tour';

type NarvoFeatureTutorialProps = {
  pathname: string;
};

export function NarvoFeatureTutorial({ pathname }: NarvoFeatureTutorialProps) {
  const steps = useMemo(() => getFeatureTourSteps(), []);
  const total = steps.length;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (pathname !== '/dashboard') {
      setOpen(false);
      return;
    }
    if (typeof window === 'undefined') return;
    if (isFeatureTourDismissedInStorage()) return;
    if (prev !== '/dashboard') setStep(0);
    setOpen(true);
  }, [pathname]);

  const finish = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.setItem(FEATURE_TOUR_LS_KEY, '1');
    setOpen(false);
  }, []);

  const goNext = useCallback(() => {
    if (step >= total - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }, [finish, step, total]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish]);

  const current = steps[step];
  const stepDisplay = tutorialProgressLabel(step + 1, total);

  return (
    <AnimatePresence>
      {open && current ? (
        <motion.div
          key="narvo-tutorial-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-narvo-ink/50 dark:bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="narvo-tutorial-title"
          aria-describedby="narvo-tutorial-desc"
        >
          <motion.div
            key="narvo-tutorial-panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="relative w-full max-w-md rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-narvo-ink shadow-2xl p-6 sm:p-8"
          >
            <button
              type="button"
              onClick={finish}
              className="absolute top-4 right-4 p-2 rounded-full text-narvo-ink/45 dark:text-white/45 hover:bg-narvo-ink/5 dark:hover:bg-white/10"
              aria-label={COPY.tutorial_skip}
            >
              <X size={20} aria-hidden />
            </button>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint mb-1">
              {COPY.tutorial_series_kicker}
            </p>
            <p className="text-xs font-medium text-narvo-ink/45 dark:text-white/40 mb-2">{stepDisplay}</p>
            <h2
              id="narvo-tutorial-title"
              className="font-serif text-2xl sm:text-3xl font-semibold text-narvo-ink dark:text-white pr-8"
            >
              {current.title}
            </h2>
            <div id="narvo-tutorial-desc" className="mt-4 space-y-3">
              <p className="text-narvo-ink/70 dark:text-white/60 leading-relaxed text-[15px]">{current.lead}</p>
              <ul className="list-disc pl-5 space-y-2 text-[14px] leading-snug text-narvo-ink/65 dark:text-white/55 marker:text-narvo-teal/80">
                {current.bullets.map((line, i) => (
                  <li key={`${current.id}-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex gap-2 justify-center" aria-hidden>
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-narvo-teal' : 'w-1.5 bg-narvo-ink/15 dark:bg-white/15'}`}
                />
              ))}
            </div>
            <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center">
              <div className="flex items-center gap-4 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={finish}
                  className="text-sm font-bold text-narvo-ink/50 dark:text-white/45 hover:text-narvo-teal dark:hover:text-narvo-mint"
                >
                  {COPY.tutorial_skip}
                </button>
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="text-sm font-bold text-narvo-ink/50 dark:text-white/45 hover:text-narvo-teal dark:hover:text-narvo-mint"
                  >
                    {COPY.tutorial_back}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={goNext}
                className="min-h-[48px] rounded-full bg-narvo-vermilion px-8 font-bold text-white shadow-lg shadow-narvo-vermilion/25 hover:bg-narvo-vermilion-hover transition-colors sm:ml-auto"
              >
                {step >= total - 1 ? COPY.tutorial_done : COPY.tutorial_next}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
