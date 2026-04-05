'use client';

import React from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h2 className="font-serif text-xl font-semibold text-narvo-ink dark:text-white">Something went wrong</h2>
      <p className="text-sm text-narvo-ink/55 dark:text-white/50 max-w-md">
        {error.message || 'Try again, or head back to your feed.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-[48px] rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20"
      >
        Try again
      </button>
    </div>
  );
}
