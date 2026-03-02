import React, { useState, useEffect } from 'react';
import NarvoLogo from './NarvoLogo';

const LoadingScreen = ({ onComplete, duration = 3000 }) => {
  const [status, setStatus] = useState('Initializing Narrative Engine...');

  useEffect(() => {
    const statuses = [
      'Initializing Narrative Engine...',
      'Connecting to Broadcast Network...',
      'Loading Regional Voices...',
      'Calibrating Signal...',
      'Voice is rendering...',
      'Signal is processing...',
      'System is ready...',
    ];
    let currentIndex = 0;
    const statusInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % statuses.length;
      setStatus(statuses[currentIndex]);
    }, duration / statuses.length);
    const timer = setTimeout(() => { if (onComplete) onComplete(); }, duration);
    return () => { clearInterval(statusInterval); clearTimeout(timer); };
  }, [duration, onComplete]);

  return (
    <div
      className="h-screen w-full flex flex-col justify-between relative overflow-hidden bg-background-dark"
      data-testid="loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Swiss grid overlay – 1px structural borders (Design System §9) */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.15]" aria-hidden>
        <div className="h-full w-full grid grid-cols-6 gap-0">
          {[...Array(6)].map((_, i) => <div key={i} className="border-r border-forest h-full" />)}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.15]" aria-hidden>
        <div className="h-full w-full grid grid-rows-6 gap-0">
          {[...Array(6)].map((_, i) => <div key={i} className="border-b border-forest w-full" />)}
        </div>
      </div>
      <div className="scanning-line z-0" aria-hidden />

      <header className="relative z-10 w-full flex justify-between items-start px-4 py-4 md:px-8 md:py-6 border-b border-forest">
        <div className="flex items-center gap-4">
          <NarvoLogo className="w-8 h-8" />
          <div className="mono-ui text-[12px] leading-[1.5]">
            <span className="block text-content">NARVO_OS_BUILD</span>
            <span className="block text-content-dim-accessible mt-1">SECURE_CHANNEL // ENCRYPTED</span>
          </div>
        </div>
        <div className="mono-ui text-[12px] text-right leading-[1.5]">
          <span className="block text-primary">SIGNAL_STATUS: OPTIMAL</span>
          <span className="block text-content-dim-accessible mt-1">LATENCY: 12MS</span>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 md:px-8">
        <div className="relative">
          <h1 className="font-display text-8xl md:text-9xl font-bold tracking-tighter text-content mb-12" style={{ lineHeight: 1.25 }}>
            NARVO
          </h1>
          <div className="absolute -top-6 -right-10 w-4 h-4 border border-forest bg-primary animate-pulse" aria-hidden />
        </div>
        {/* Grid Breathing indicator – Design System: minimal, 1px, no shadow (§9 Flat Aesthetic) */}
        <div className="w-64 md:w-80 relative h-16 flex items-center justify-center" aria-hidden>
          <div className="absolute w-full h-[1px] bg-forest breathing-grid" />
          <div className="absolute w-[1px] h-4 bg-forest left-0 top-1/2 -translate-y-1/2 opacity-50" />
          <div className="absolute w-[1px] h-4 bg-forest right-0 top-1/2 -translate-y-1/2 opacity-50" />
          <div className="absolute left-0 h-[3px] bg-primary loading-bar loading-bar-flat" />
        </div>
      </main>

      <footer className="relative z-10 w-full flex flex-col items-center justify-end px-4 pt-6 pb-12 md:px-8 md:pb-16 border-t border-forest">
        <p className="mono-ui text-[12px] tracking-widest text-content-secondary uppercase leading-[1.5]" aria-live="polite">
          <span className="mr-2 text-primary" aria-hidden>{'>>>'}</span>
          <span className="blink-cursor text-content">[{status}]</span>
        </p>
        <div className="mt-6 flex gap-1 items-end h-4" aria-hidden>
          {[2, 3, 1, 4, 2, 1].map((h, i) => (
            <div
              key={i}
              className={`w-[2px] signal-bar ${i === 3 ? 'bg-primary' : 'bg-forest'}`}
              style={{ height: `${h * 4}px` }}
            />
          ))}
        </div>
      </footer>
    </div>
  );
};

export default LoadingScreen;
