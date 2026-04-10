'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import type { InvestorAnalyticsEvent } from '@/lib/investor-types';

interface TrackLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  label: string;
  trackingEvent?: InvestorAnalyticsEvent;
}

export function TrackLink({
  href,
  className,
  children,
  label,
  trackingEvent = 'cta_click',
}: TrackLinkProps) {
  const isExternal = /^(https?:|mailto:|tel:)/.test(href);

  const handleClick = () => {
    trackEvent(trackingEvent, {
      label,
      href,
    });
  };

  if (isExternal) {
    return (
      <a className={className} href={href} onClick={handleClick} rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}
