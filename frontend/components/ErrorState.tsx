'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
};

/**
 * Shared recoverable error framing — trust through visible state (Emotional Guidelines §3.5).
 */
export function ErrorState({
  title = COPY.news_error_title,
  message,
  onRetry,
  retryLabel = COPY.error_retry_cta,
  homeHref = '/dashboard',
  homeLabel = COPY.auth_back_home,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-[28px] border border-narvo-vermilion/20 bg-narvo-vermilion/6 dark:bg-narvo-vermilion/10 px-6 py-10 text-center ${className}`}
      role="alert"
    >
      <AlertCircle className="mx-auto mb-4 text-narvo-vermilion" size={36} aria-hidden />
      <h3 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-narvo-ink/65 dark:text-white/60 max-w-md mx-auto mb-6 leading-relaxed">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[48px] rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20"
          >
            {retryLabel}
          </button>
        ) : null}
        <Link
          href={homeHref}
          className="inline-flex min-h-[48px] items-center rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 font-bold text-narvo-teal dark:text-narvo-mint"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
