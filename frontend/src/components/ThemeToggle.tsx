import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeId } from '../contexts/ThemeContext';
import { THEME_OPTIONS, getThemeOption } from '../constants/themes';

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  placement?: 'bottom' | 'right';
}

export const ThemeToggle = ({
  className = '',
  showLabel = false,
  placement = 'bottom',
}: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = getThemeOption(theme);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const handleSelect = (themeId: string) => {
    setTheme(themeId);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 items-center gap-2 rounded-full p-2 transition-colors hover:bg-surface"
        data-testid="theme-toggle"
        aria-label={`Theme: ${current.label}. Choose theme.`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <current.Icon weight="fill" className="h-5 w-5 shrink-0 text-primary" />
        {showLabel && (
          <span className="truncate font-mono text-[11px] uppercase text-content-secondary">
            {current.label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme options"
          className={`absolute z-50 min-w-[160px] rounded-[20px] border border-border bg-[rgba(255,255,255,0.94)] py-2 shadow-[var(--shadow-3)]
            ${placement === 'right' ? 'left-full top-0 ml-1' : 'right-0 top-full mt-1'}`}
          data-testid="theme-picker"
          style={{ backdropFilter: 'blur(18px)' }}
        >
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === (opt.id as ThemeId);
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(opt.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11px] uppercase transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-content-secondary hover:bg-surface-alt hover:text-content'}`}
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
