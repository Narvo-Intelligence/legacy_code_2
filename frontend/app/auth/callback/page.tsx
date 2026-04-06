'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { hasCompletedOnboarding } from '@/lib/narvo-session';
import { warmMePreferencesAfterAuth } from '@/lib/me-api';
import { COPY } from '@/lib/narvo-app-copy';

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string>(COPY.queue_processing);

  useEffect(() => {
    const supa = getSupabaseBrowser();
    if (!supa) {
      router.replace('/auth');
      return;
    }

    const next = safeNextPath(searchParams.get('next'));

    const finish = () => {
      void supa.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session?.access_token) {
          setMessage(COPY.error_generic);
          router.replace('/auth');
          return;
        }

        applySupabaseSession(session);
        void warmMePreferencesAfterAuth();

        if (next) {
          router.replace(next);
          return;
        }

        router.replace(hasCompletedOnboarding() ? '/dashboard' : '/onboarding');
      });
    };

    requestAnimationFrame(finish);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <p className="text-sm text-narvo-ink/55 dark:text-white/50 text-center max-w-xs">{message}</p>
    </div>
  );
}

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <p className="text-sm text-narvo-ink/55 dark:text-white/50 text-center max-w-xs">{COPY.queue_processing}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
