'use client';

import { Moon, SunMedium } from 'lucide-react';
import { trackEvent } from '@/lib/analytics-client';
import { useTheme } from '@/components/investor/theme-provider';

export function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle"
      onClick={() => {
        trackEvent('cta_click', {
          label: 'theme toggle',
          props: {
            from: resolvedTheme,
            to: isDark ? 'light' : 'dark',
          },
        });
        toggleTheme();
      }}
      type="button"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
