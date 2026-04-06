'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { getSupabaseBrowser, isSupabaseAuthConfigured } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { warmMePreferencesAfterAuth } from '@/lib/me-api';
import { hasCompletedOnboarding } from '@/lib/narvo-session';
import { AuthShell } from '@/components/auth/AuthShell';
import { COPY } from '@/lib/narvo-app-copy';
import { NARVO_AUTH_CANVAS_CARD_CLASS } from '@/lib/narvo-ui-classes';

const inputClass =
  'w-full rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-narvo-ink/80 px-4 py-3.5 pl-12 text-[15px] text-narvo-ink dark:text-white placeholder:text-narvo-ink/35 dark:placeholder:text-white/35 outline-none transition-[border-color,box-shadow] focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supa = getSupabaseBrowser();
    if (!isSupabaseAuthConfigured() || !supa) {
      router.replace('/auth');
      return;
    }
    void supa.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        router.replace(`/auth?error=recovery`);
        return;
      }
      applySupabaseSession(session);
      setReady(true);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(COPY.auth_validation_password);
      return;
    }
    if (password !== confirm) {
      setError(COPY.auth_update_password_mismatch);
      return;
    }
    const supa = getSupabaseBrowser();
    if (!supa) {
      setError(COPY.error_generic);
      return;
    }
    setSubmitting(true);
    try {
      const { error: upErr } = await supa.auth.updateUser({ password });
      if (upErr) {
        setError(upErr.message || COPY.error_generic);
        return;
      }
      const { data: refreshed } = await supa.auth.getSession();
      if (refreshed.session) {
        applySupabaseSession(refreshed.session);
        void warmMePreferencesAfterAuth();
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
        <p className="text-sm text-narvo-ink/55 dark:text-white/50 text-center max-w-xs">{COPY.queue_processing}</p>
      </div>
    );
  }

  return (
    <AuthShell
      backHref="/auth"
      backLabel={COPY.auth_back_sign_in}
      marketing={{
        kicker: COPY.settings_account,
        title: COPY.auth_update_password_title,
        body: `${COPY.auth_update_password_intro}\n\n${COPY.auth_marketing_briefing_scope}`,
      }}
    >
      <div className={`${NARVO_AUTH_CANVAS_CARD_CLASS} p-8 sm:p-10`}>
        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center space-y-6"
            role="status"
          >
            <p className="text-[15px] text-narvo-ink dark:text-white/90 leading-relaxed">{COPY.auth_update_password_success}</p>
            <Link
              href={hasCompletedOnboarding() ? '/dashboard' : '/onboarding'}
              className="inline-flex w-full justify-center rounded-full bg-narvo-vermilion py-4 text-[15px] font-bold text-white shadow-lg shadow-narvo-vermilion/25 transition-transform hover:bg-[#e0441f] active:scale-[0.99]"
            >
              {COPY.auth_update_password_continue}
            </Link>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="mb-2">
              <h1 className="font-serif text-[1.75rem] font-semibold tracking-tight text-narvo-ink dark:text-white leading-tight">
                {COPY.auth_update_password_title}
              </h1>
              <p className="mt-2 text-[15px] text-narvo-ink/55 dark:text-white/50 leading-relaxed">{COPY.auth_update_password_intro}</p>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-narvo-vermilion/25 bg-narvo-vermilion/8 px-4 py-3 text-center text-[13px] font-medium text-narvo-vermilion dark:text-narvo-butter"
              >
                {error}
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="new-pw" className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90">
                {COPY.auth_label_new_password}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none" size={18} aria-hidden />
                <input
                  id="new-pw"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder={COPY.auth_placeholder_password_hint}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-pw" className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90">
                {COPY.auth_label_confirm_password}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none" size={18} aria-hidden />
                <input
                  id="confirm-pw"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder={COPY.auth_placeholder_password_hint}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-narvo-vermilion py-4 text-[15px] font-bold text-white shadow-lg shadow-narvo-vermilion/25 transition-transform hover:bg-[#e0441f] active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none"
            >
              {submitting ? COPY.status_loading : COPY.auth_update_password_cta}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
