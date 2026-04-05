import type {Metadata} from 'next';
import { Newsreader, Instrument_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';

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
});

export const metadata: Metadata = {
  title: "Narvo - Africa's news, spoken clearly",
  description: "The day's biggest stories, turned into a briefing.",
};

import { ThemeProvider } from '@/components/ThemeProvider';
import { AudioPlayerProvider } from '@/components/AudioPlayerContext';
import { AudioPlayer } from '@/components/AudioPlayer';
import { OfflineDownloadProvider } from '@/components/OfflineDownloadContext';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${instrumentSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans antialiased">
        <ThemeProvider>
          <AudioPlayerProvider>
            <OfflineDownloadProvider>
              {children}
              <AudioPlayer />
            </OfflineDownloadProvider>
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
