'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import { useTheme } from '@/components/ThemeProvider';
import { NarvoLogoMark } from '@/components/NarvoLogo';

export type AuthMarketing = {
  kicker: string;
  title: string;
  body: string;
  emphasis?: string;
};

type AuthShellProps = {
  backHref: string;
  backLabel: string;
  marketing: AuthMarketing;
  children: React.ReactNode;
  /** Widen main canvas (e.g. onboarding grids). Defaults to auth form width. */
  canvasClassName?: string;
};

export function AuthShell({
  backHref,
  backLabel,
  marketing,
  children,
  canvasClassName = 'w-full max-w-[440px]',
}: AuthShellProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Marketing rail — light: airy editorial panel; dark: deep rail (Design Foundation v5) */}
      <aside className="relative order-2 lg:order-1 lg:min-h-screen lg:w-[min(44vw,32rem)] shrink-0 overflow-hidden border-b border-narvo-ink/10 bg-narvo-mist dark:border-white/10 dark:bg-narvo-ink text-narvo-ink dark:text-white">
        <div
          className="absolute inset-0 bg-gradient-to-br from-white via-narvo-mist to-narvo-teal/[0.08] dark:hidden"
          aria-hidden
        />
        <div
          className="absolute inset-0 hidden opacity-90 dark:block"
          style={{
            background:
              'radial-gradient(ellipse 120% 80% at 20% 0%, rgba(15,95,115,0.55) 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 100% 100%, rgba(240,75,36,0.12) 0%, transparent 50%), linear-gradient(165deg, #0a1520 0%, #17324a 45%, #0f5f73 100%)',
          }}
          aria-hidden
        />
        <div className="absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-narvo-teal/10 blur-[80px] dark:bg-narvo-teal/20" aria-hidden />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-narvo-mint/15 blur-[70px] dark:bg-narvo-mint/10" aria-hidden />

        <div className="relative z-10 flex flex-col justify-between min-h-[200px] lg:min-h-screen p-8 sm:p-10 lg:p-12 xl:p-14">
          <Link
            href="/"
            className="inline-flex items-center gap-3 group w-fit"
            aria-label={`${COPY.brand_name} home`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-narvo-teal shadow-md shadow-narvo-teal/20 ring-1 ring-narvo-teal/30 transition-transform group-hover:scale-[1.02] dark:bg-white/10 dark:shadow-none dark:ring-white/15">
              <NarvoLogoMark size="xl" inset="tight" className="dark:opacity-95" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-narvo-ink dark:text-white">{COPY.brand_name}</span>
          </Link>

          <div className="py-10 lg:py-0 lg:my-auto max-w-md">
            <p className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-narvo-teal dark:text-narvo-mint/90 mb-4 sm:mb-5">
              {marketing.kicker}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-[clamp(1.75rem,2.5vw,2.25rem)] font-medium leading-[1.15] tracking-tight text-narvo-ink dark:text-white mb-4">
              {marketing.title}
              {marketing.emphasis ? (
                <>
                  <br />
                  <span className="italic text-narvo-vermilion dark:text-narvo-butter/95">{marketing.emphasis}</span>
                </>
              ) : null}
            </h2>
            <p className="text-sm sm:text-base text-narvo-ink/70 dark:text-white/65 leading-relaxed font-sans">{marketing.body}</p>
          </div>

          <p className="font-mono text-[9px] tracking-[0.12em] text-narvo-ink/40 dark:text-white/35 hidden lg:block leading-relaxed">
            {COPY.brand_tagline}
          </p>
        </div>
      </aside>

      {/* Canvas */}
      <div className="relative order-1 lg:order-2 flex-1 flex flex-col min-h-0">
        <div className="absolute top-5 left-4 right-4 sm:top-8 sm:left-8 sm:right-8 z-10 flex items-start justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-narvo-ink/65 hover:text-narvo-teal dark:text-white/60 dark:hover:text-narvo-mint transition-colors bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-narvo-ink/10 dark:border-white/10 shadow-sm dark:shadow-none"
          >
            <ArrowLeft size={18} aria-hidden className="shrink-0" />
            {backLabel}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-narvo-ink/10 bg-white/80 text-narvo-ink shadow-sm transition-transform hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white dark:shadow-none touch-manipulation"
            aria-label={resolvedTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {resolvedTheme === 'light' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
          </button>
        </div>

        <div className="flex-1 flex min-h-0 items-center justify-center overflow-y-auto p-6 pt-20 sm:p-8 sm:pt-24 lg:p-12 lg:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className={canvasClassName}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
