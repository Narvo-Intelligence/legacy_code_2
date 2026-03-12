import React from 'react';
import { motion } from 'framer-motion';

interface NavigationProps {
  currentSlide: number;
  totalSlides: number;
  slideIds: string[];
}

export function Navigation({
  currentSlide,
  totalSlides,
  slideIds
}: NavigationProps) {
  const scrollToSlide = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'start'
    });
  };

  return (
    <div className="nav-dots fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
      <div className="font-mono text-[9px] text-narvo-secondary tracking-[0.3em] vertical-text mb-4 opacity-50 select-none">
        SIGNAL_TRACK
      </div>
      {slideIds.map((id, index) => (
        <button
          key={id}
          onClick={() => scrollToSlide(id)}
          aria-label={`Go to slide ${index + 1}`}
          className="relative flex items-center justify-center w-8 h-8 group"
        >
          {/* Active Ring */}
          {currentSlide === index && (
            <motion.div
              layoutId="active-nav"
              className="absolute inset-0 border border-narvo-primary opacity-40"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          
          {/* Dot */}
          <div
            className={`w-1.5 h-1.5 transition-all duration-500 ${
              currentSlide === index 
                ? 'bg-narvo-primary scale-125' 
                : 'bg-narvo-border-subtle group-hover:bg-narvo-secondary'
            }`}
          />

          {/* Label (Hover) */}
          <div className="absolute right-10 px-2 py-1 bg-narvo-surface border border-narvo-structural text-[10px] font-mono text-narvo-text opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest">
            {id.replace('slide-', 'CH_')}
          </div>
        </button>
      ))}
      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}