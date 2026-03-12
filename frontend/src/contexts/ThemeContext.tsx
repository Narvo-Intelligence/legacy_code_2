import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = ['nature', 'sun', 'moon', 'dusk'] as const;
const DEFAULT_THEME = 'nature';
export type ThemeId = (typeof THEMES)[number];

function normalizeTheme(value: string | null | undefined): ThemeId {
  if (value === 'light') return 'sun';
  if (value === 'dark') return 'nature';
  if (THEMES.includes(value as ThemeId)) return value as ThemeId;
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  theme: ThemeId;
  toggleTheme: () => void;
  setTheme: (newTheme: string) => void;
  themes: readonly string[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
  setTheme: () => {},
  themes: THEMES,
});

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('narvo_theme');
    if (saved) return normalizeTheme(saved);
    try {
      const cache = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}');
      if (cache.theme) return normalizeTheme(cache.theme);
    } catch (err) {
      /* ignore */
    }
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'sun';
    return DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('narvo_theme', theme);
    const themeColor = { nature: '#1B211A', sun: '#FCF6F0', moon: '#0b0c14', dusk: '#14100c' }[theme] ?? '#1B211A';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColor);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  const setTheme = (newTheme: string) => {
    const next = normalizeTheme(newTheme);
    if (THEMES.includes(next)) setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};
