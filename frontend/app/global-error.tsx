'use client';

import React from 'react';
import { COPY } from '@/lib/narvo-app-copy';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f8fb] p-8 text-[#17324a]">
        <h2 className="font-serif text-xl font-semibold">{COPY.news_error_title}</h2>
        <p className="max-w-md text-center text-sm text-[#17324a]/70">
          {error.message || COPY.error_app_body_fallback}
        </p>
        <button
          type="button"
          onClick={reset}
          className="min-h-[48px] rounded-full bg-[#f04b24] px-6 font-bold text-white"
        >
          {COPY.error_retry_cta}
        </button>
      </body>
    </html>
  );
}
