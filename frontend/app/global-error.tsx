'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-[#f4f7f9] text-[#17324A]">
        <h2 className="font-serif text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-[#17324A]/70 max-w-md text-center">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="min-h-[48px] rounded-full bg-[#F04B24] px-6 font-bold text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
