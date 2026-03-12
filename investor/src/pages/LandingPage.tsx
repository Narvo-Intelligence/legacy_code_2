import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-narvo-bg text-narvo-text font-body">
      <section className="min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl narvo-border bg-narvo-surface/30 p-6 md:p-10 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-narvo-primary/10 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 bg-narvo-primary animate-pulse" />
              <span className="font-mono text-[11px] tracking-widest text-narvo-secondary uppercase">
                Investor Access
              </span>
            </div>
            <h1 className="font-header text-[var(--title-size)] leading-[var(--line-height-heading)] text-narvo-text uppercase tracking-tight">
              Narvo Investor Hub
            </h1>
            <p className="font-body text-narvo-dimAccessible max-w-2xl mt-4">
              Choose your path. Dive into the pitch narrative or jump directly into the investor board
              for live platform metrics and execution signals.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate('/board')}
                className="narvo-border bg-narvo-primary text-narvo-bg font-mono text-[12px] uppercase tracking-widest px-6 py-5 hover:brightness-110 transition-all min-h-[56px]"
                data-testid="cta-board"
              >
                Board
              </button>
              <button
                type="button"
                onClick={() => navigate('/pitch')}
                className="narvo-border bg-narvo-bg text-narvo-text font-mono text-[12px] uppercase tracking-widest px-6 py-5 hover:bg-narvo-surface transition-all min-h-[56px]"
                data-testid="cta-pitch"
              >
                Pitch
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-[10px] uppercase font-mono text-narvo-dimAccessible">
              <span className="narvo-border px-3 py-1">Narvo Intelligence</span>
              <span className="narvo-border px-3 py-1">Broadcast-Grade TTS</span>
              <span className="narvo-border px-3 py-1">Pan-African Coverage</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
