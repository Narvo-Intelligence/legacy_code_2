import type { ReactNode } from 'react';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  summary: string;
  actions?: ReactNode;
}

export function PageHero({ eyebrow, title, summary, actions }: PageHeroProps) {
  return (
    <section className="shell pt-10 md:pt-14">
      <div className="frame-panel overflow-hidden px-6 py-10 md:px-10 md:py-14">
        <div className="content-grid items-end">
          <div className="space-y-5">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="section-title max-w-4xl">{title}</h1>
            <p className="section-copy">{summary}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
