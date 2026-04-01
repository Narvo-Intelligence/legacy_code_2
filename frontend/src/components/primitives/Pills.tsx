import React from 'react';

type PillProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * CategoryPill — used for story classification.
 * v5.1: Geist Mono, subtle tint background.
 */
export const CategoryPill: React.FC<PillProps> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full bg-[rgb(var(--color-primary-tint))] text-[rgb(var(--color-primary))] font-mono font-bold text-[10px] uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

export type StatusType = 'live' | 'breaking' | 'saved' | 'downloaded' | 'syncing' | 'queued' | 'default';

/**
 * StatusPill — used for operational states (Live, Offline, Syncing).
 * v5.1: High-contrast or subtle depending on state.
 */
export const StatusPill: React.FC<PillProps & { status: StatusType }> = ({ children, status, className = '' }) => {
  let colorClass = 'bg-[rgb(var(--color-surface-alt))] text-[rgb(var(--color-text-mid))] border border-[rgb(var(--color-border))]';
  
  switch (status) {
    case 'live':
    case 'breaking':
      colorClass = 'bg-[rgb(var(--color-alert-tint))] text-[rgb(var(--color-alert))] border border-[rgb(var(--color-alert))]/20';
      break;
    case 'saved':
    case 'downloaded':
      colorClass = 'bg-[rgb(var(--color-primary-tint))] text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary))]/20';
      break;
    case 'syncing':
    case 'queued':
      colorClass = 'bg-[rgb(var(--color-highlight-tint))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-highlight))]/50';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold text-[10px] uppercase tracking-widest ${colorClass} ${className}`}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-alert))] mr-1.5 animate-pulse" />}
      {children}
    </span>
  );
};

export type TruthType = 'verified' | 'mixed' | 'disputed' | 'checking';

/**
 * TruthPill — Narvo's verification signal (Truth Tag).
 * v5.1: Uses v5 tints and Geist Mono.
 */
export const TruthPill: React.FC<PillProps & { status: TruthType }> = ({ children, status, className = '' }) => {
  let colorClass = '';
  
  switch (status) {
    case 'verified':
      colorClass = 'bg-[rgb(var(--color-success-tint))] text-[rgb(var(--color-primary))] border border-[rgb(var(--color-success))]/30';
      break;
    case 'mixed':
      colorClass = 'bg-[rgb(var(--color-highlight-tint))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-highlight))]/50';
      break;
    case 'disputed':
      colorClass = 'bg-[rgb(var(--color-alert-tint))] text-[rgb(var(--color-alert))] border border-[rgb(var(--color-alert))]/20';
      break;
    case 'checking':
    default:
      colorClass = 'bg-[rgb(var(--color-primary-tint))] text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary))]/20';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase tracking-widest ${colorClass} ${className}`}>
      {children}
    </span>
  );
};

type FilterPillProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  size?: 'sm' | 'md';
};

/**
 * FilterPill — used for topic selection.
 * v5.1: Instrument Sans, rounded-full, high-contrast active state.
 */
export const FilterPill: React.FC<FilterPillProps> = ({ 
  children, active = false, size = 'md', className = '', ...props 
}) => {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-5 py-2.5 text-sm';
  const stateClass = active 
    ? 'bg-[rgb(var(--color-primary-deep))] text-white shadow-md' 
    : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-surface-alt))]';

  return (
    <button 
      className={`inline-flex items-center justify-center font-body font-bold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--color-primary))] ${sizeClass} ${stateClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
