'use client';

import React, { useState } from 'react';
import { Play, FileText } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY, homeBriefingMeta } from '@/lib/narvo-app-copy';
import { useLatestBriefing } from '@/hooks/use-latest-briefing';

const BRIEFING_MINUTES_FALLBACK = 12;

export default function BriefingPage() {
  const { playTrack } = useAudioPlayer();
  const { briefing, error, loading } = useLatestBriefing();
  const [showTranscript, setShowTranscript] = useState(false);

  const storyCount =
    briefing?.stories?.length && briefing.stories.length > 0
      ? briefing.stories.length
      : 0;
  const metaCount = storyCount > 0 ? storyCount : 8;
  const hasScript = Boolean(briefing?.script?.trim());
  const hasAudio = Boolean(briefing?.audio_url);

  const handlePlay = () => {
    if (briefing?.audio_url) {
      playTrack({
        id: briefing.id || 'briefing-latest',
        title: briefing.title || COPY.briefing_title,
        source: COPY.brand_name,
        audioUrl: briefing.audio_url,
      });
      return;
    }
    playTrack({
      id: 'briefing-pending',
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
          {loading ? 'Checking your briefing…' : error ? 'Briefing unavailable' : COPY.briefing_ready}
        </h2>
        <p className="mt-3 text-lg text-narvo-ink/60 dark:text-white/55">
          {loading
            ? 'Hang tight.'
            : error
              ? error
              : homeBriefingMeta(metaCount, BRIEFING_MINUTES_FALLBACK)}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handlePlay}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-narvo-vermilion px-8 py-3.5 font-bold text-white shadow-lg shadow-narvo-vermilion/25 hover:bg-[#e0441f] transition-colors disabled:opacity-50"
          >
            <Play size={20} fill="currentColor" aria-hidden />
            {COPY.briefing_listen_now}
          </button>
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            disabled={!hasScript}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-full border-2 border-narvo-ink/12 dark:border-white/15 px-8 py-3.5 font-bold text-narvo-ink dark:text-white hover:bg-narvo-ink/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasScript ? 'Transcript appears when a briefing script is available.' : undefined}
          >
            <FileText size={20} aria-hidden />
            {COPY.briefing_transcript}
          </button>
        </div>

        {!hasAudio && !loading && !error ? (
          <p className="mt-6 text-sm text-narvo-ink/50 dark:text-white/45">
            No audio URL yet — run briefing generation on the backend or try again later.
          </p>
        ) : null}

        {showTranscript && hasScript ? (
          <div className="mt-10 rounded-[24px] border border-narvo-ink/10 dark:border-white/10 bg-white/80 dark:bg-narvo-ink/40 p-6 sm:p-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint mb-4">
              Transcript
            </p>
            <div className="text-sm sm:text-base text-narvo-ink/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed font-serif">
              {briefing!.script}
            </div>
          </div>
        ) : null}

        <p className="mt-14 text-sm text-narvo-ink/45 dark:text-white/40 leading-relaxed">
          Story rundown and archive will deepen here as briefing history is connected in the app.
        </p>
      </div>
    </AuthenticatedAppShell>
  );
}
