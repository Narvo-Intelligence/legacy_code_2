import { SlideLayout } from '../SlideLayout';
import { Target, Landmark } from 'lucide-react';

export function AskSlide({ id }: { id: string }) {
  return (
    <SlideLayout id={id} slideNumber="14">
      <div className="container flex flex-col justify-center h-full items-center text-center max-w-5xl mx-auto px-4">
        <h2
          className="font-header text-narvo-text mb-6 slide-fade-up delay-1 uppercase tracking-tighter"
          style={{ fontSize: 'var(--h2-size)' }}
        >
          The <span className="text-narvo-primary">Next</span> Tier
        </h2>

        <div className="flex flex-col items-center mb-12 slide-fade-up delay-2">
          <span className="font-mono text-narvo-secondary text-[10px] md:text-sm tracking-[0.4em] uppercase mb-4 opacity-60">
            [ CAPITAL_INJECTION ]
          </span>
          <div
            className="font-header text-narvo-primary"
            style={{
              fontSize: 'clamp(3rem, 15vw, 10rem)',
              lineHeight: 0.8
            }}
          >
            £80,000
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left mb-12">
          <div className="narvo-border bg-narvo-surface/20 p-8 slide-fade-up delay-3 group hover:border-narvo-primary transition-colors">
            <Target className="w-8 h-8 text-narvo-primary mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="font-header text-lg text-narvo-text mb-2 uppercase tracking-wide">Production Launch</h3>
            <p
              className="font-body text-narvo-dimAccessible leading-relaxed"
              style={{ fontSize: 'var(--body-size)' }}
            >
              Secure high-fidelity regional media feeds and launch V2 production builds 
              across Web and Native Expo platforms.
            </p>
          </div>

          <div className="narvo-border bg-narvo-surface/20 p-8 slide-fade-up delay-4 group hover:border-narvo-primary transition-colors">
            <Landmark className="w-8 h-8 text-narvo-primary mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="font-header text-lg text-narvo-text mb-2 uppercase tracking-wide">Strategic Value</h3>
            <p
              className="font-body text-narvo-dimAccessible leading-relaxed"
              style={{ fontSize: 'var(--body-size)' }}
            >
              Establish strategic partnerships with Pan-African telecom entities to scale 
              reach to over 1.2 billion users.
            </p>
          </div>
        </div>

        <div className="slide-fade-up delay-5">
          <div className="inline-block border border-narvo-primary/40 px-6 py-2 bg-narvo-primary/5">
            <p className="font-mono text-[10px] md:text-[12px] text-narvo-primary tracking-[0.3em] uppercase">
              Broadcast Ready v2.0 // investor@narvo.news
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}