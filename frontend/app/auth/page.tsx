'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Chrome, Github } from 'lucide-react';
import { hasCompletedOnboarding } from '@/lib/narvo-session';
import { getSupabaseBrowser, isSupabaseAuthConfigured } from '@/lib/supabase-browser';
import { applySupabaseSession } from '@/lib/narvo-auth-sync';
import { warmMePreferencesAfterAuth } from '@/lib/me-api';
import { AuthShell } from '@/components/auth/AuthShell';
import { COPY, brandTaglineParts } from '@/lib/narvo-app-copy';
import { NARVO_AUTH_CANVAS_CARD_CLASS } from '@/lib/narvo-ui-classes';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const inputClass =
  'w-full rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-narvo-ink/80 px-4 py-3.5 pl-12 text-[15px] text-narvo-ink dark:text-white placeholder:text-narvo-ink/35 dark:placeholder:text-white/35 outline-none transition-[border-color,box-shadow] focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const recoveryLinkExpired = searchParams.get('error') === 'recovery';
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<'google' | 'github' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
    setOauthNotice(false);
  };

  const goAfterAuth = (isSignup: boolean) => {
    if (isSignup) {
      router.push('/onboarding');
      return;
    }
    const safeNext =
      nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : null;
    if (safeNext) {
      router.push(safeNext);
      return;
    }
    router.push(hasCompletedOnboarding() ? '/dashboard' : '/onboarding');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const em = email.trim();
    const pw = password;
    if (!isValidEmail(em)) {
      setError(COPY.auth_validation_email);
      return;
    }
    if (pw.length < 8) {
      setError(COPY.auth_validation_password);
      return;
    }
    if (!isLogin) {
      const n = name.trim();
      if (n.length < 2) {
        setError(COPY.auth_validation_name);
        return;
      }
    }

    setSubmitting(true);
    try {
      const supa = getSupabaseBrowser();
      if (supa) {
        if (isLogin) {
          const { data, error: supaErr } = await supa.auth.signInWithPassword({
            email: em,
            password: pw,
          });
          if (supaErr) {
            setError(supaErr.message || COPY.error_generic);
            return;
          }
          const session = data.session;
          if (!session) {
            setError(COPY.error_generic);
            return;
          }
          applySupabaseSession(session);
          void warmMePreferencesAfterAuth();
          goAfterAuth(false);
          return;
        }
        const { data, error: supaErr } = await supa.auth.signUp({
          email: em,
          password: pw,
          options: { data: { full_name: name.trim() } },
        });
        if (supaErr) {
          setError(supaErr.message || COPY.error_generic);
          return;
        }
        if (data.session) {
          applySupabaseSession(data.session);
          void warmMePreferencesAfterAuth();
          goAfterAuth(true);
          return;
        }
        setInfo(COPY.auth_check_email);
        return;
      }

      setError(COPY.auth_supabase_required);
    } finally {
      setSubmitting(false);
    }
  };

  const startOAuth = async (provider: 'google' | 'github') => {
    resetMessages();
    const supa = getSupabaseBrowser();
    if (!supa) {
      setOauthNotice(true);
      return;
    }
    setOauthBusy(provider);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const safeNext =
      nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '';
    const callback = new URL(`${origin}/auth/callback`);
    if (safeNext) callback.searchParams.set('next', safeNext);
    const { error: oauthErr } = await supa.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    setOauthBusy(null);
    if (oauthErr) setError(oauthErr.message || COPY.error_generic);
  };

  const tagline = brandTaglineParts();

  return (
    <AuthShell
      backHref="/"
      backLabel={COPY.auth_back_home}
      marketing={{
        kicker: COPY.brand_subtitle,
        title: tagline.title,
        emphasis: tagline.emphasis || undefined,
        body: `${COPY.landing_subtitle}`,
      }}
    >
      <div className={`${NARVO_AUTH_CANVAS_CARD_CLASS} p-8 sm:p-10`}>
        <div className="mb-8 min-h-[5.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="font-serif text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-narvo-ink dark:text-white leading-tight">
                {isLogin ? COPY.auth_welcome_back : COPY.auth_join_headline}
              </h1>
              <p className="mt-2 text-[15px] text-narvo-ink/55 dark:text-white/50 leading-relaxed">
                {isLogin ? COPY.auth_subtitle_sign_in : COPY.brand_tagline_alt}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {recoveryLinkExpired && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-narvo-teal/20 bg-narvo-teal/8 dark:bg-narvo-teal/15 px-4 py-3 text-center text-[13px] text-narvo-ink/85 dark:text-white/80 leading-snug"
          >
            {COPY.auth_recovery_session_missing}
          </div>
        )}

        {info && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-narvo-teal/20 bg-narvo-teal/8 dark:bg-narvo-teal/15 px-4 py-3 text-center text-[13px] text-narvo-ink/85 dark:text-white/80 leading-snug"
          >
            {info}
          </div>
        )}

        {oauthNotice && !isSupabaseAuthConfigured() ? (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-narvo-teal/20 bg-narvo-teal/8 dark:bg-narvo-teal/15 px-4 py-3 text-center text-[13px] text-narvo-ink/85 dark:text-white/80 leading-snug space-y-2"
          >
            <p className="font-medium text-narvo-ink dark:text-white/90">{COPY.error_signal_fuzzy}</p>
            <p>{COPY.auth_oauth_unavailable}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            type="button"
            disabled={Boolean(oauthBusy) || submitting}
            onClick={() => void startOAuth('google')}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/40 dark:bg-white/[0.06] py-3.5 px-4 text-sm font-bold text-narvo-ink dark:text-white hover:bg-narvo-mist dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <Chrome size={18} aria-hidden className="opacity-80" />
            <span className="text-center leading-tight">
              {oauthBusy === 'google' ? COPY.status_loading : COPY.oauth_continue_google}
            </span>
          </button>
          <button
            type="button"
            disabled={Boolean(oauthBusy) || submitting}
            onClick={() => void startOAuth('github')}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-narvo-ink/10 dark:border-white/10 bg-narvo-mist/40 dark:bg-white/[0.06] py-3.5 px-4 text-sm font-bold text-narvo-ink dark:text-white hover:bg-narvo-mist dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <Github size={18} aria-hidden className="opacity-80" />
            <span className="text-center leading-tight">
              {oauthBusy === 'github' ? COPY.status_loading : COPY.oauth_continue_github}
            </span>
          </button>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-narvo-ink/8 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-narvo-cloud/95 px-3 font-mono text-[10px] font-bold tracking-[0.14em] text-narvo-ink/40 dark:bg-narvo-ink/90 dark:text-white/40">
              {COPY.auth_or_email}
            </span>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-2xl border border-narvo-vermilion/25 bg-narvo-vermilion/8 px-4 py-3 text-center text-[13px] font-medium text-narvo-vermilion dark:text-narvo-butter leading-snug"
          >
            {error}
          </p>
        )}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="space-y-2">
              <label htmlFor="auth-name" className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90">
                {COPY.auth_label_full_name}
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
                  size={18}
                  aria-hidden
                />
                <input
                  id="auth-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder={COPY.auth_placeholder_name}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="auth-email" className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90">
              {COPY.auth_label_email}
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
                size={18}
                aria-hidden
              />
              <input
                id="auth-email"
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
          <div className="space-y-2">
            <label htmlFor="auth-password" className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90">
              {COPY.auth_label_password}
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
                size={18}
                aria-hidden
              />
              <input
                id="auth-password"
                type="password"
                name="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={COPY.auth_placeholder_password_hint}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {isLogin && (
            <div className="flex justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline underline-offset-2"
              >
                {COPY.auth_forgot_password}
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-narvo-vermilion py-4 text-[15px] font-bold text-white shadow-lg shadow-narvo-vermilion/25 transition-transform hover:bg-narvo-vermilion-hover active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none disabled:active:scale-100"
          >
            {submitting ? COPY.status_loading : isLogin ? COPY.auth_sign_in : COPY.auth_create_account}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-narvo-ink/42 dark:text-white/38 font-mono tracking-wide">
          {isSupabaseAuthConfigured() ? COPY.auth_session_note_supabase : COPY.auth_demo_note}
        </p>

        <div className="mt-6 pt-6 border-t border-narvo-ink/8 dark:border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              resetMessages();
            }}
            className="text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline underline-offset-2"
          >
            {isLogin ? COPY.auth_toggle_new : COPY.auth_toggle_existing}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

function AuthFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6 text-[var(--text-primary)] transition-colors duration-300">
      <p className="text-sm text-narvo-ink/50 dark:text-white/45 text-center max-w-xs leading-relaxed">
        {COPY.queue_processing}
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthForm />
    </Suspense>
  );
}
