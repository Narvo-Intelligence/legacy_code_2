import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { THEME_OPTIONS, getThemeOption } from '../constants/themes';

export const ThemeToggle = ({ className = '', showLabel = false, placement = 'bottom' }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const current = getThemeOption(theme);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const handleSelect = (themeId) => {
    setTheme(themeId);
    setOpen(false);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 p-2 transition-colors hover:bg-[rgb(var(--color-surface))] ${className}`}
      data-testid="theme-toggle"
      aria-label={showLabel ? (isDark ? 'Dark mode' : 'Light mode') : (isDark ? 'Dark mode. Switch to light mode.' : 'Light mode. Switch to dark mode.')}
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
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(opt.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-[11px] uppercase transition-colors
                  ${isActive
                    ? 'bg-[rgb(var(--color-primary))]/15 text-[rgb(var(--color-primary))] border-l-2 border-l-[rgb(var(--color-primary))]'
                    : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface))]/30 hover:text-[rgb(var(--color-text-primary))]'}`}
                data-testid={`theme-option-${opt.id}`}
              >
                <opt.Icon weight="fill" className="w-4 h-4 shrink-0" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
