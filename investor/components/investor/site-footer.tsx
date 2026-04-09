import { ArrowUpRight } from 'lucide-react';
import { siteLinks } from '@/lib/investor-content';
import { TrackLink } from '@/components/investor/track-link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink-deep text-white">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-4">
          <p className="section-kicker text-white/55">Narvo Intelligence</p>
          <h2 className="font-display text-3xl leading-tight text-white md:text-4xl">
            The intelligence layer turning African news into a daily, trusted briefing.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/68">
            This investor platform is the compact operating story for Narvo Intelligence:
            company overview, narrative pitch, live analytics, and the execution roadmap.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {siteLinks.map((item) => (
            <TrackLink
              key={item.href}
              className="flex items-center justify-between rounded-4xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white transition hover:bg-white/[0.08]"
              href={item.href}
              label={`footer nav ${item.label.toLowerCase()}`}
            >
              <>
                <span>{item.label}</span>
                <ArrowUpRight className="h-4 w-4 text-white/55" />
              </>
            </TrackLink>
          ))}
        </div>
      </div>
    </footer>
  );
}
