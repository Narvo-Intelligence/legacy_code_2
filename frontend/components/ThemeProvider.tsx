'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyDisplayTogglesToDom,
  readDisplayToggles,
  readStoredTheme,
  writeStoredTheme,
  type NarvoThemeChoice,
} from '@/lib/narvo-ui-persistence';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** Stored preference (light / dark / system). */
  theme: NarvoThemeChoice;
  /** Effective theme applied to `<html class="dark">`. */
  resolvedTheme: ResolvedTheme;
  setThemeChoice: (t: NarvoThemeChoice) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<NarvoThemeChoice>('light');
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readStoredTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    applyDisplayTogglesToDom(readDisplayToggles());
    const onToggles = () => applyDisplayTogglesToDom(readDisplayToggles());
    window.addEventListener('narvo-display-toggles-changed', onToggles);
    const onThemeStorage = () => setTheme(readStoredTheme());
    window.addEventListener('narvo-theme-changed', onThemeStorage);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('narvo-display-toggles-changed', onToggles);
      window.removeEventListener('narvo-theme-changed', onThemeStorage);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') return systemDark ? 'dark' : 'light';
    return theme;
  }, [theme, systemDark]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme, mounted]);

  const setThemeChoice = useCallback((t: NarvoThemeChoice) => {
    setTheme(t);
    writeStoredTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: NarvoThemeChoice = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeChoice(next);
  }, [resolvedTheme, setThemeChoice]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setThemeChoice, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
