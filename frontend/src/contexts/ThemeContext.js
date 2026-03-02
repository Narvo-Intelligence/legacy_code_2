import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = ['nature', 'sun', 'moon'];
const DEFAULT_THEME = 'nature';

/** Normalize legacy 'dark'|'light' to 'nature'|'sun'|'moon' */
function normalizeTheme(value) {
  if (value === 'light') return 'sun';
  if (value === 'dark') return 'nature';
  if (THEMES.includes(value)) return value;
  return DEFAULT_THEME;
}

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
  setTheme: () => {},
  themes: THEMES,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('narvo_theme');
    if (saved) return normalizeTheme(saved);
    try {
      const cache = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}');
      if (cache.theme) return normalizeTheme(cache.theme);
    } catch { /* ignore */ }
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      return 'sun';
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('narvo_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  const setTheme = (newTheme) => {
    const next = normalizeTheme(newTheme);
    if (THEMES.includes(next)) setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};
