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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 p-2 transition-colors hover:bg-[rgb(var(--color-surface))] rounded min-w-0"
        data-testid="theme-toggle"
        aria-label={`Theme: ${current.label}. Choose theme.`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <current.Icon weight="fill" className="w-5 h-5 text-[rgb(var(--color-primary))] shrink-0" />
        {showLabel && (
          <span className="font-mono text-[11px] uppercase text-[rgb(var(--color-text-secondary))] truncate">
            {current.label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme options"
          className={`absolute z-50 min-w-[140px] py-1 bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] shadow-lg
            ${placement === 'right' ? 'left-full top-0 ml-1' : 'right-0 top-full mt-1'}`}
          data-testid="theme-picker"
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
