import React from 'react';
import { Sun, Moon, Tree } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';

const THEME_ICONS = { nature: Tree, sun: Sun, moon: Moon };
const THEME_LABELS = { nature: 'NATURE', sun: 'SUN', moon: 'MOON' };

export const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const Icon = THEME_ICONS[theme] || Tree;
  const nextTheme = theme === 'nature' ? 'sun' : theme === 'sun' ? 'moon' : 'nature';

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 p-2 transition-colors hover:bg-[rgb(var(--color-surface))] ${className}`}
      data-testid="theme-toggle"
      aria-label={`Theme: ${theme}. Switch to ${nextTheme}.`}
    >
      <Icon weight="fill" className="w-5 h-5 text-[rgb(var(--color-primary))]" />
      {showLabel && (
        <span className="font-mono text-[11px] uppercase text-[rgb(var(--color-text-secondary))]">
          {THEME_LABELS[theme] || 'NATURE'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
