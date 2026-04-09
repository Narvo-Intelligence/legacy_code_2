'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { siteLinks } from '@/lib/investor-content';
import { TrackLink } from '@/components/investor/track-link';
import { ThemeToggleButton } from '@/components/investor/theme-toggle-button';

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/10 bg-cloud/75 backdrop-blur-xl">
      <div className="shell flex items-center justify-between gap-4 py-4">
        <TrackLink
          className="flex items-center gap-3"
          href="/"
          label="header brand"
        >
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-deep text-white shadow-soft">
              <img alt="Narvo" className="h-6 w-6 object-contain" src="/narvo_logo.svg" />
            </div>
            <div className="hidden sm:block">
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-quiet">
                Narvo Intelligence
              </div>
              <div className="text-sm text-ink/80">Investor platform</div>
            </div>
          </>
        </TrackLink>

        <nav className="hidden items-center gap-2 lg:flex">
          {siteLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <TrackLink
                key={item.href}
                className={`nav-link ${active ? 'nav-link-active' : ''}`}
                href={item.href}
                label={`header nav ${item.label.toLowerCase()}`}
              >
                {item.label}
              </TrackLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="metric-chip">
            <span className="signal-dot" />
            Investor ready
          </span>
          <ThemeToggleButton />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggleButton />

          <button
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line/10 bg-surface/80 text-ink"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-line/10 bg-surface/95 lg:hidden">
          <div className="shell flex flex-col gap-2 py-4">
            {siteLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <TrackLink
                  key={item.href}
                  className={`nav-link ${active ? 'nav-link-active' : ''}`}
                  href={item.href}
                  label={`mobile nav ${item.label.toLowerCase()}`}
                >
                  {item.label}
                </TrackLink>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
