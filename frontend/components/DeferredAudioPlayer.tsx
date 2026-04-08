'use client';

import dynamic from 'next/dynamic';

const AudioPlayer = dynamic(
  () => import('@/components/AudioPlayer').then((m) => m.AudioPlayer),
  { ssr: false }
);

/** Code-splits the heavy player UI off the main bundle; context still lives in `AudioPlayerProvider`. */
export function DeferredAudioPlayer() {
  return <AudioPlayer />;
}
