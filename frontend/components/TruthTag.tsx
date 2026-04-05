'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Info, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type VerificationStatus = 'verified' | 'unverified' | 'disputed';

interface TruthTagProps {
  status: VerificationStatus;
  sources?: string[];
  lastChecked?: string;
  details?: string;
}

export function TruthTag({ status, sources = [], lastChecked, details }: TruthTagProps) {
  const [isOpen, setIsOpen] = useState(false);

  const config = {
    verified: {
      icon: <ShieldCheck size={14} />,
      color: 'text-narvo-teal',
      bg: 'bg-narvo-teal/10',
      label: 'Verified',
    },
    unverified: {
      icon: <Info size={14} />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-600/10 dark:bg-yellow-400/10',
      label: 'Unverified',
    },
    disputed: {
      icon: <ShieldAlert size={14} />,
      color: 'text-narvo-vermilion',
      bg: 'bg-narvo-vermilion/10',
      label: 'Disputed',
    }
  };

  const currentConfig = config[status];

  return (
    <div className="relative inline-block">
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-80 ${currentConfig.color} ${currentConfig.bg}`}
      >
        {currentConfig.icon}
        {currentConfig.label}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-50 bottom-full left-0 mb-2 w-64 p-4 rounded-2xl bg-white dark:bg-narvo-ink shadow-xl border border-narvo-ink/10 dark:border-white/10 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`flex items-center gap-2 font-bold text-sm ${currentConfig.color}`}>
                  {currentConfig.icon}
                  {currentConfig.label}
                </div>
                <button onClick={() => setIsOpen(false)} className="text-narvo-ink/40 dark:text-white/40 hover:text-narvo-ink dark:hover:text-white">
                  <X size={16} />
                </button>
              </div>
              
              {details && (
                <p className="text-xs text-narvo-ink/80 dark:text-white/80 mb-3 leading-relaxed">
                  {details}
                </p>
              )}

              {sources.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-narvo-ink/40 dark:text-white/40 block mb-1">Sources Checked</span>
                  <ul className="space-y-1">
                    {sources.map((source, idx) => (
                      <li key={idx} className="text-xs text-narvo-ink/80 dark:text-white/80 flex items-center gap-1">
                        <ExternalLink size={10} className="text-narvo-teal" />
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lastChecked && (
                <div className="text-[10px] text-narvo-ink/40 dark:text-white/40">
                  Last checked: {lastChecked}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
