/**
 * Warms the same dynamic chunk as `DeferredAudioPlayer` on first play intent
 * so the bottom bar / sheet is ready by the time audio starts.
 */

let inflight: Promise<unknown> | null = null;

export function prefetchAudioPlayerChunk(): void {
  if (typeof window === 'undefined') return;
  if (inflight) return;
  inflight = import('@/components/AudioPlayer').catch(() => {
    inflight = null;
  });
}
