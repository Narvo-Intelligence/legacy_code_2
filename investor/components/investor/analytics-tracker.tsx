'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics-client';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageView = useRef<string>('');

  useEffect(() => {
    const query = searchParams.toString();
    const pageKey = query ? `${pathname}?${query}` : pathname;

    if (lastPageView.current === pageKey) return;
    lastPageView.current = pageKey;

    trackEvent('page_view', {
      label: pageKey,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const seen = new Set<string>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-track-section]'));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const node = entry.target as HTMLElement;
          const label = node.dataset.trackSection;
          const eventName = node.dataset.trackEvent;
          if (!label || seen.has(label)) return;

          seen.add(label);

          if (eventName === 'pitch_chapter_view') {
            trackEvent('pitch_chapter_view', { label });
            return;
          }

          if (eventName === 'roadmap_phase_view') {
            trackEvent('roadmap_phase_view', { label });
            return;
          }

          trackEvent('section_view', { label });
        });
      },
      {
        rootMargin: '0px 0px -20% 0px',
        threshold: 0.45,
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
