'use client';

import React from 'react';
import { Play, FileText } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY, homeBriefingMeta } from '@/lib/narvo-app-copy';

const BRIEFING_STORIES = 8;
const BRIEFING_MINUTES = 12;

export default function BriefingPage() {
  const { playTrack } = useAudioPlayer();

  const handlePlay = () => {
    playTrack({
      id: 'briefing-1',
      title: COPY.briefing_title,
      source: COPY.brand_name,
    });
  };

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.briefing_title,
        kicker: COPY.brand_subtitle,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8 sm:py-10 max-w-3xl mx-auto w-full">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint">
          {COPY.brand_name}
        </p>
        <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-narvo-ink dark:text-white tracking-tight">
          {COPY.briefing_ready}
        </h2>
        <p className="mt-3 text-lg text-narvo-ink/60 dark:text-white/55">{homeBriefingMeta(BRIEFING_STORIES, BRIEFING_MINUTES)}</p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handlePlay}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-narvo-vermilion px-8 py-3.5 font-bold text-white shadow-lg shadow-narvo-vermilion/25 hover:bg-[#e0441f] transition-colors"
          >
            <Play size={20} fill="currentColor" aria-hidden />
            {COPY.briefing_listen_now}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-8 py-3.5 font-bold text-narvo-ink dark:text-white opacity-70 cursor-not-allowed"
            disabled
            title="Transcript will appear when your briefing is generated."
          >
            <FileText size={20} aria-hidden />
            {COPY.briefing_transcript}
          </button>
        </div>

        <p className="mt-14 text-sm text-narvo-ink/45 dark:text-white/40 leading-relaxed">
          Story rundown and archive will appear here when the briefing feed is connected to your account.
        </p>
      </div>
    </AuthenticatedAppShell>
  );
}
