'use client';

import React from 'react';
import { COPY } from '@/lib/narvo-app-copy';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">{COPY.news_error_title}</h2>
      <p className="max-w-md text-sm text-narvo-ink/55 dark:text-white/50">
        {error.message || COPY.error_app_body_fallback}
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-[48px] rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20"
      >
        {COPY.error_retry_cta}
      </button>
    </div>
  );
}
