'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';

const LS_DONE = 'narvo_feature_tutorial_v1_done';

const STEPS = [
  { title: COPY.tutorial_step_briefing_title, body: COPY.tutorial_step_briefing_body },
  { title: COPY.tutorial_step_truth_title, body: COPY.tutorial_step_truth_body },
  { title: COPY.tutorial_step_language_title, body: COPY.tutorial_step_language_body },
  { title: COPY.tutorial_step_notify_title, body: COPY.tutorial_step_notify_body },
] as const;

type NarvoFeatureTutorialProps = {
  pathname: string;
};

export function NarvoFeatureTutorial({ pathname }: NarvoFeatureTutorialProps) {
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
    if (localStorage.getItem(LS_DONE) === '1') return;
    if (prev !== '/dashboard') setStep(0);
    setOpen(true);
  }, [pathname]);

  const finish = () => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_DONE, '1');
    setOpen(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="narvo-tutorial-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-narvo-ink/50 dark:bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="narvo-tutorial-title"
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
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint mb-2">
              {COPY.brand_name}
            </p>
            <h2 id="narvo-tutorial-title" className="font-serif text-2xl sm:text-3xl font-semibold text-narvo-ink dark:text-white pr-8">
              {current.title}
            </h2>
            <p className="mt-4 text-narvo-ink/60 dark:text-white/55 leading-relaxed text-[15px]">{current.body}</p>
            <div className="mt-6 flex gap-2 justify-center">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-narvo-teal' : 'w-1.5 bg-narvo-ink/15 dark:bg-white/15'}`}
                />
              ))}
            </div>
            <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center">
              <button
                type="button"
                onClick={finish}
                className="text-sm font-bold text-narvo-ink/50 dark:text-white/45 hover:text-narvo-teal dark:hover:text-narvo-mint"
              >
                {COPY.tutorial_skip}
              </button>
              <button
                type="button"
                onClick={next}
                className="min-h-[48px] rounded-full bg-narvo-vermilion px-8 font-bold text-white shadow-lg shadow-narvo-vermilion/25 hover:bg-narvo-vermilion-hover transition-colors"
              >
                {step >= STEPS.length - 1 ? COPY.tutorial_done : COPY.tutorial_next}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

