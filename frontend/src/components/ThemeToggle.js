import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 p-2 transition-colors hover:bg-[rgb(var(--color-surface))] ${className}`}
      data-testid="theme-toggle"
      aria-label={showLabel ? (isDark ? 'Dark mode. Switch to light mode.' : 'Light mode. Switch to dark mode.') : `Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5">
        <motion.div
          initial={false}
          animate={{ 
            rotate: isDark ? 0 : 180,
            scale: isDark ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon weight="fill" className="w-5 h-5 text-[rgb(var(--color-primary))]" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ 
            rotate: isDark ? -180 : 0,
            scale: isDark ? 0 : 1
          }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun weight="fill" className="w-5 h-5 text-[rgb(var(--color-primary))]" />
        </motion.div>
      </div>
      {showLabel && (
        <span className="font-mono text-[11px] uppercase text-[rgb(var(--color-text-secondary))]">
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
