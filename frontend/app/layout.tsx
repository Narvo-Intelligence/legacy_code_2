import type {Metadata, Viewport} from 'next';
import { Newsreader, Instrument_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';

function appMetadataBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw);
  } catch {
    return undefined;
  }
}

const metaBase = appMetadataBase();
const defaultOgImage = metaBase ? new URL('/og-default.png', metaBase).toString() : '/og-default.png';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: metaBase,
  title: {
    default: "Narvo — Africa's news, spoken clearly",
    template: '%s — Narvo',
  },
  description: "The day's biggest stories, turned into a briefing.",
  applicationName: 'Narvo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Narvo',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/narvo-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/narvo-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/narvo-icon-192.png', sizes: '192x192' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Narvo',
    title: "Narvo — Africa's news, spoken clearly",
    description: "The day's biggest stories, turned into a briefing.",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Narvo' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@narvo',
    title: "Narvo — Africa's news, spoken clearly",
    description: "The day's biggest stories, turned into a briefing.",
    images: [defaultOgImage],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f5f73' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1520' },
  ],
};

import { ThemeProvider } from '@/components/ThemeProvider';
import { AudioPlayerProvider } from '@/components/AudioPlayerContext';
import { OfflineDownloadProvider } from '@/components/OfflineDownloadContext';
import { NarvoClientBootstrap } from '@/components/NarvoClientBootstrap';
import { ToastProvider } from '@/components/Toast';
import { DeferredAudioPlayer } from '@/components/DeferredAudioPlayer';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${instrumentSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans antialiased">
        <ThemeProvider>
          <NarvoClientBootstrap />
          <AudioPlayerProvider>
            <OfflineDownloadProvider>
              <ToastProvider>
                {children}
                <DeferredAudioPlayer />
              </ToastProvider>
            </OfflineDownloadProvider>
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
