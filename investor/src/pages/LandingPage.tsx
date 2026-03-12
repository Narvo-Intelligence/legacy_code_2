import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-narvo-bg text-narvo-text font-body selection:bg-narvo-primary selection:text-narvo-bg">
      <section className="min-h-screen flex items-center justify-center p-4 md:p-12 lg:p-24 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-narvo-primary/5 blur-[120px] rounded-full -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-narvo-primary/5 blur-[120px] rounded-full -ml-64 -mb-64" />

        <div className="w-full max-w-5xl narvo-border bg-narvo-surface/30 p-6 sm:p-10 md:p-16 relative overflow-hidden backdrop-blur-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2.5 h-2.5 bg-narvo-primary animate-pulse" />
              <span className="font-mono text-[10px] md:text-[11px] tracking-[0.4em] text-narvo-secondary uppercase">
                INVESTOR_GATEWAY_V2
              </span>
            </div>

            <div className="space-y-6">
              <h1 
                className="font-header text-narvo-text uppercase tracking-tighter leading-[0.9]"
                style={{ fontSize: 'var(--title-size)' }}
              >
                Narvo <br />
                <span className="text-narvo-primary">Investor Hub</span>
              </h1>
              
              <p className="font-body text-narvo-dimAccessible max-w-2xl text-base md:text-xl leading-relaxed">
                Choose your entry point. Immerse yourself in the technical pitch narrative 
                or dive directly into the live metrics dashboard.
              </p>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/pitch')}
                className="flex-1 narvo-border bg-narvo-primary text-narvo-bg font-mono text-[12px] uppercase tracking-[0.2em] px-8 py-6 hover:brightness-110 active:scale-[0.98] transition-all min-h-[64px] flex items-center justify-center gap-2 group"
                data-testid="cta-pitch"
              >
                Explore Pitch
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/board')}
                className="flex-1 narvo-border bg-narvo-surface text-narvo-text font-mono text-[12px] uppercase tracking-[0.2em] px-8 py-6 hover:bg-narvo-surface-raised active:scale-[0.98] transition-all min-h-[64px] flex items-center justify-center gap-2 group"
                data-testid="cta-board"
              >
                View Dashboard
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-narvo-structural/30 flex flex-wrap gap-x-8 gap-y-4 text-[9px] md:text-[10px] uppercase font-mono text-narvo-secondary tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-narvo-primary" />
                NARVO_INTELLIGENCE
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-narvo-primary" />
                BROADCAST_FIDELITY
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-narvo-primary" />
                PAN_AFRICAN_DATA
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
