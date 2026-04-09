'use client';

export type InvestorAnalyticsEvent =
  | 'page_view'
  | 'cta_click'
  | 'section_view'
  | 'pitch_chapter_view'
  | 'roadmap_phase_view'
  | 'metrics_refresh';

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

interface AnalyticsPayload {
  event: InvestorAnalyticsEvent;
  path: string;
  label?: string;
  href?: string;
  props?: AnalyticsProps;
  ts: string;
}

function serializePayload(payload: AnalyticsPayload): string {
  return JSON.stringify(payload);
}

export function trackEvent(
  event: InvestorAnalyticsEvent,
  options?: {
    label?: string;
    href?: string;
    props?: AnalyticsProps;
  }
): void {
  if (typeof window === 'undefined') return;

  const payload: AnalyticsPayload = {
    event,
    path: `${window.location.pathname}${window.location.search}`,
    label: options?.label,
    href: options?.href,
    props: options?.props,
    ts: new Date().toISOString(),
  };

  const body = serializePayload(payload);
  const target = '/api/track';

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(target, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Tracking must not break navigation or interaction.
  }

  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    va?: (...args: unknown[]) => void;
  };

  analyticsWindow.dataLayer?.push({ event, ...options?.props });
  analyticsWindow.gtag?.('event', event, options?.props ?? {});
  analyticsWindow.va?.('track', event, options?.props ?? {});

  if (process.env.NODE_ENV === 'development') {
    console.info('[investor analytics]', payload);
  }
}
