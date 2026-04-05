'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Shared empty surface — Component DS empty-state pattern; calm reading scale.
 */
export function EmptyState({ icon: Icon, title, description, children, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`text-center py-16 sm:py-20 rounded-[28px] border border-dashed border-narvo-ink/12 dark:border-white/10 bg-narvo-mist/15 dark:bg-white/[0.02] px-6 ${className}`}
      role="status"
    >
      {Icon ? (
        <Icon size={40} className="mx-auto mb-4 text-narvo-ink/20 dark:text-white/15" aria-hidden />
      ) : null}
      <h3 className="text-xl font-serif font-bold text-narvo-ink dark:text-white mb-2">{title}</h3>
      {description ? (
        <p className="text-narvo-ink/50 dark:text-white/45 max-w-md mx-auto leading-relaxed">{description}</p>
      ) : null}
      {children ? <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}
