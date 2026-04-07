'use client';

import Link from 'next/link';
import { COPY } from '@/lib/narvo-app-copy';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';

type Props = {
  className?: string;
};

/**
 * When the user has an app session but no JWT (or is logged out), explains next step for `/api/me/*` features.
 * Returns null while hydrating or when a token is present.
 */
export function CloudFeatureGateBanner({ className = '' }: Props) {
  const { hydrated, hasSession, hasApiToken } = useNarvoAuthBridge();
  if (!hydrated || hasApiToken) return null;

  const box =
    'mb-4 rounded-[22px] border border-narvo-ink/10 bg-narvo-mist/45 px-4 py-3.5 sm:px-5 sm:py-4 dark:border-white/10 dark:bg-white/[0.05]';

  if (!hasSession) {
    return (
      <div className={`${box} text-sm text-narvo-ink/70 dark:text-white/65 ${className}`}>
        <p className="mb-2 leading-relaxed">{COPY.subscription_sign_in_hint}</p>
        <Link
          href="/auth"
          className="inline-flex min-h-[44px] items-center rounded-full bg-narvo-vermilion px-5 text-sm font-bold text-white shadow-md shadow-narvo-vermilion/20"
        >
          {COPY.auth_sign_in}
        </Link>
      </div>
    );
  }

  return (
    <div className={`${box} text-sm text-narvo-ink/75 dark:text-white/65 ${className}`} role="status">
      <p className="mb-3 leading-relaxed">{COPY.cloud_sync_paused_body}</p>
      <Link
        href="/auth"
        className="inline-flex min-h-[44px] items-center rounded-full bg-narvo-teal px-5 text-sm font-bold text-white dark:bg-narvo-mint dark:text-narvo-ink"
      >
        {COPY.auth_renew_session_cta}
      </Link>
    </div>
  );
}
