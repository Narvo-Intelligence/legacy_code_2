'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { COPY } from '@/lib/narvo-app-copy';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const inputClass =
  'w-full rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-narvo-ink/80 px-4 py-3.5 pl-12 text-[15px] text-narvo-ink dark:text-white placeholder:text-narvo-ink/35 dark:placeholder:text-white/35 outline-none transition-[border-color,box-shadow] focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const em = email.trim();
    if (!isValidEmail(em)) {
      setError(COPY.auth_validation_email);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      backHref="/auth"
      backLabel={COPY.auth_back_sign_in}
      marketing={{
        kicker: COPY.settings_account,
        title: COPY.error_reconnecting,
        body: COPY.error_hold_tight,
      }}
    >
      <div className="rounded-[28px] border border-narvo-ink/8 dark:border-white/10 bg-white/90 dark:bg-narvo-ink/90 backdrop-blur-xl p-8 sm:p-10 shadow-[0_24px_80px_-24px_rgba(23,50,74,0.2)] dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)]">
        <div className="mb-8">
          <h1 className="font-serif text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-narvo-ink dark:text-white leading-tight">
            {COPY.recovery_card_title}
          </h1>
          <p className="mt-2 text-[15px] text-narvo-ink/55 dark:text-white/50 leading-relaxed">
            {COPY.recovery_card_intro}
          </p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-2xl border border-narvo-teal/25 bg-narvo-teal/10 dark:bg-narvo-teal/15 px-5 py-6 text-center"
            role="status"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-narvo-teal/20 text-narvo-teal dark:text-narvo-mint">
              <CheckCircle2 size={24} aria-hidden />
            </div>
            <p className="text-[15px] text-narvo-ink dark:text-white/90 leading-relaxed">
              {COPY.recovery_success_if_account}{' '}
              <span className="font-semibold text-narvo-ink dark:text-white">{email.trim()}</span>,{' '}
              {COPY.recovery_success_then} {COPY.recovery_success_demo}
            </p>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-narvo-vermilion/25 bg-narvo-vermilion/8 px-4 py-3 text-center text-[13px] font-medium text-narvo-vermilion dark:text-narvo-butter"
              >
                {error}
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="reset-email" className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90">
                {COPY.auth_label_email}
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
                  size={18}
                  aria-hidden
                />
                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={COPY.auth_placeholder_email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-narvo-vermilion py-4 text-[15px] font-bold text-white shadow-lg shadow-narvo-vermilion/25 transition-transform hover:bg-[#e0441f] active:scale-[0.99]"
            >
              {COPY.recovery_send_link}
            </button>
          </form>
        )}

        <p className="mt-8 text-center">
          <Link
            href="/auth"
            className="text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline underline-offset-2"
          >
            {COPY.recovery_return_sign_in}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
