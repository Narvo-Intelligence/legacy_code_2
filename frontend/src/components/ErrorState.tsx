import type React from 'react';

interface ErrorStateProps {
  title: string;
  code: string;
  message: string;
  offline?: boolean;
  offlineLabel?: string;
  accentClass?: string;
  actions: React.ReactNode;
  footerLabel: string;
  testId?: string;
}

const ErrorState = ({
  title,
  code,
  message,
  offline = false,
  offlineLabel = 'OFFLINE_MODE_DETECTED',
  accentClass = 'text-[rgb(var(--color-primary))]',
  actions,
  footerLabel,
  testId,
}: ErrorStateProps) => (
  <div className="h-screen flex flex-col bg-[rgb(var(--color-bg))]" data-testid={testId}>
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
      <div className="max-w-xl w-full space-y-8 text-center">
        {offline && (
          <p className="mono-ui text-[11px] text-[rgb(var(--color-text-secondary))] font-bold" role="status">
            {offlineLabel}
          </p>
        )}
        <div className="space-y-4">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">
            <span className={accentClass}>[</span>
            {title}
            <span className={accentClass}>]</span>
          </h1>
          <p className={`mono-ui text-[12px] md:text-[13px] font-bold ${accentClass}`}>
            {code}
          </p>
          <p className="text-[rgb(var(--color-text-dim-accessible))] text-sm md:text-base font-mono leading-relaxed max-w-md mx-auto">
            {message}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
          {actions}
        </div>
      </div>
    </main>
    <footer className="shrink-0 border-t border-[rgb(var(--color-border))] py-3 px-6 flex items-center justify-center">
      <span className="mono-ui text-[10px] text-[rgb(var(--color-text-secondary))] font-bold">{footerLabel}</span>
    </footer>
  </div>
);

export default ErrorState;
