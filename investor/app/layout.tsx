import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AnalyticsTracker } from '@/components/investor/analytics-tracker';
import { SiteFooter } from '@/components/investor/site-footer';
import { SiteHeader } from '@/components/investor/site-header';

function metadataBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;

  try {
    return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw);
  } catch {
    return undefined;
  }
}

const base = metadataBase();

export const metadata: Metadata = {
  metadataBase: base,
  title: {
    default: 'Narvo Intelligence Investor Platform',
    template: '%s | Narvo Intelligence Investor Platform',
  },
  description:
    'Investor-facing overview, pitch, live analytics, and roadmap for Narvo Intelligence and the Narvo audio-news platform.',
  applicationName: 'Narvo Investor',
  icons: {
    icon: [
      { url: '/narvo-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/narvo-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/narvo-icon-192.png', sizes: '192x192' }],
  },
  openGraph: {
    type: 'website',
    title: 'Narvo Intelligence Investor Platform',
    description:
      'Investor-facing overview, pitch, live analytics, and roadmap for Narvo Intelligence and the Narvo audio-news platform.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Narvo Intelligence Investor Platform',
    description:
      'Investor-facing overview, pitch, live analytics, and roadmap for Narvo Intelligence and the Narvo audio-news platform.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ink">
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <div className="min-h-screen">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
