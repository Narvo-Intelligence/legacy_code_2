'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import {
  setAuthSession,
  setNarvoAccessToken,
  hasCompletedOnboarding,
} from '@/lib/narvo-session';
import { COPY } from '@/lib/narvo-app-copy';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string>(COPY.queue_processing);

  useEffect(() => {
    const supa = getSupabaseBrowser();
    if (!supa) {
      router.replace('/auth');
      return;
    }

    const finish = () => {
      void supa.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session?.access_token) {
          setMessage(COPY.error_generic);
          router.replace('/auth');
          return;
        }

        setNarvoAccessToken(session.access_token);
        const u = session.user;
        const email = (u.email || '').trim() || 'signed-in';
        const name =
          (u.user_metadata?.full_name as string | undefined)?.trim() ||
          (u.user_metadata?.name as string | undefined)?.trim();
        setAuthSession({
          email,
          name: name || undefined,
          createdAt: new Date().toISOString(),
        });

        router.replace(hasCompletedOnboarding() ? '/dashboard' : '/onboarding');
      });
    };

    requestAnimationFrame(finish);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <p className="text-sm text-narvo-ink/55 dark:text-white/50 text-center max-w-xs">{message}</p>
    </div>
  );
}
