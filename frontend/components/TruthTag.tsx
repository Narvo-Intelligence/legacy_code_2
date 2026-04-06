'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Info, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COPY } from '@/lib/narvo-app-copy';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

export type VerificationStatus = 'verified' | 'unverified' | 'mixed' | 'disputed';

interface TruthTagProps {
  status: VerificationStatus;
  sources?: string[];
  lastChecked?: string;
  details?: string;
}

export function TruthTag({ status, sources = [], lastChecked, details }: TruthTagProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 'unverified' maps to 'mixed' visually per Component DS spec (Soft Butter = mixed/uncertain)
  const resolvedStatus: Exclude<VerificationStatus, 'unverified'> =
    status === 'unverified' ? 'mixed' : status;

  const config = {
    verified: {
      icon: <ShieldCheck size={14} aria-hidden />,
      color: 'text-narvo-teal dark:text-narvo-mint',
      bg: 'bg-narvo-teal/10 dark:bg-narvo-teal/15',
      label: COPY.truth_tag_status_verified,
    },
    mixed: {
      icon: <Info size={14} aria-hidden />,
      color: 'text-[#8d7417] dark:text-narvo-butter',
      bg: 'bg-narvo-butter/[0.18] dark:bg-narvo-butter/[0.12]',
      label: COPY.truth_tag_status_mixed,
    },
    disputed: {
      icon: <ShieldAlert size={14} aria-hidden />,
      color: 'text-narvo-vermilion',
      bg: 'bg-narvo-vermilion/10 dark:bg-narvo-vermilion/15',
      label: COPY.truth_tag_status_disputed,
    },
  };

  const currentConfig = config[resolvedStatus];

  return (
    <div className="relative inline-block">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        transition={SPRING}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-opacity hover:opacity-90 ${currentConfig.color} ${currentConfig.bg}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {currentConfig.icon}
        {currentConfig.label}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/15 dark:bg-black/35"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={currentConfig.label}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={SPRING}
              className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border border-narvo-ink/10 bg-narvo-cloud p-4 text-left shadow-lg dark:border-white/10 dark:bg-narvo-ink"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className={`flex items-center gap-2 font-mono text-sm font-bold ${currentConfig.color}`}>
                  {currentConfig.icon}
                  {currentConfig.label}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-narvo-ink/40 transition-colors hover:bg-narvo-ink/5 hover:text-narvo-ink dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={COPY.truth_tag_close_a11y}
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              {details && (
                <p className="mb-3 text-xs leading-relaxed text-narvo-ink/80 dark:text-white/80">{details}</p>
              )}

              <p className="mb-3 text-[10px] leading-relaxed text-narvo-ink/55 dark:text-white/55">
                {COPY.truth_tag_ai_and_translation_note}
              </p>

              {sources.length > 0 && (
                <div className="mb-3">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-narvo-ink/40 dark:text-white/40">
                    {COPY.news_sources_checked_label}
                  </span>
                  <ul className="space-y-1">
                    {sources.map((source, idx) => (
                      <li key={idx} className="flex items-center gap-1 text-xs text-narvo-ink/80 dark:text-white/80">
                        <ExternalLink size={10} className="shrink-0 text-narvo-teal" aria-hidden />
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lastChecked && (
                <div className="text-[10px] text-narvo-ink/45 dark:text-white/45">
                  {COPY.truth_tag_last_checked_label} {lastChecked}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
