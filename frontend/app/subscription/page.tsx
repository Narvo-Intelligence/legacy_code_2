'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY } from '@/lib/narvo-app-copy';
import { postSubscriptionCheckout } from '@/lib/me-api';
import { NarvoApiError } from '@/lib/narvo-api';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';

export default function SubscriptionPage() {
  const router = useRouter();
  const authBridge = useNarvoAuthBridge();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const startCheckout = () => {
    if (!authBridge.hydrated) return;
    if (!authBridge.hasApiToken) {
      router.push('/auth');
      return;
    }
    setBusy(true);
    setErr(null);
    void postSubscriptionCheckout()
      .then((r) => {
        if (r.url) window.location.href = r.url;
      })
      .catch((e) => {
        const msg =
          e instanceof NarvoApiError && e.status === 503
            ? COPY.settings_billing_not_configured
            : e instanceof Error
              ? e.message
              : COPY.error_generic;
        setErr(msg);
      })
      .finally(() => setBusy(false));
  };

  return (
    <AuthenticatedAppShell
      header={{ title: COPY.subscription_page_title, kicker: COPY.subscription_page_kicker }}
    >
      <div className="mx-auto max-w-lg overflow-x-hidden px-4 py-10 sm:px-6 space-y-8">
        <p className="text-sm text-narvo-ink/55 dark:text-white/50 leading-relaxed">
          {COPY.settings_billing_placeholder}
        </p>

        <div className="space-y-4 rounded-[28px] border border-narvo-ink/10 dark:border-white/10 bg-narvo-cloud/90 dark:bg-narvo-ink/35 p-6 sm:p-8">
          <div>
            <h2 className="font-serif text-lg font-semibold text-narvo-ink dark:text-white">
              {COPY.subscription_plan_free_title}
            </h2>
            <p className="mt-1 text-sm text-narvo-ink/55 dark:text-white/50">{COPY.subscription_plan_free_desc}</p>
          </div>
          <div className="border-t border-narvo-ink/8 dark:border-white/10 pt-4">
            <h2 className="font-serif text-lg font-semibold text-narvo-teal dark:text-narvo-mint">
              {COPY.subscription_plan_pro_title}
            </h2>
            <p className="mt-1 text-sm text-narvo-ink/55 dark:text-white/50">{COPY.subscription_plan_pro_desc}</p>
          </div>
        </div>

        {err ? <p className="text-sm text-narvo-vermilion dark:text-narvo-butter">{err}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy}
            onClick={startCheckout}
            className="min-h-[48px] rounded-full bg-narvo-teal px-8 font-bold text-white shadow-md shadow-narvo-teal/20 disabled:opacity-50 dark:bg-narvo-mint dark:text-narvo-ink"
          >
            {busy ? COPY.status_loading : COPY.subscription_cta_checkout}
          </button>
          <Link
            href="/settings?tab=billing"
            className="min-h-[48px] inline-flex items-center justify-center rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-6 font-bold text-narvo-ink dark:text-white"
          >
            {COPY.settings_billing_manage}
          </Link>
        </div>

        {authBridge.hydrated && !authBridge.hasApiToken ? (
          <p className="text-sm text-narvo-ink/50 dark:text-white/45 leading-relaxed">
            {authBridge.hasSession ? COPY.cloud_sync_paused_body : COPY.subscription_sign_in_hint}
          </p>
        ) : null}
      </div>
    </AuthenticatedAppShell>
  );
}
