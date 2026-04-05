import {
  fetchNewsDetail,
  pickAudioUrlFromDetail,
  type ApiNewsDetail,
} from '@/lib/narvo-api';

export type PlayableTrack = {
  id: string;
  title: string;
  source: string;
  audioUrl?: string;
  category?: string;
};

/**
 * Resolve narration audio for a story (detail fetch). Falls back to no URL (mock / silent bar).
 */
export async function resolveStoryPlayback(
  storyId: string,
  base: Omit<PlayableTrack, 'audioUrl'>
): Promise<PlayableTrack> {
  try {
    const detail: ApiNewsDetail = await fetchNewsDetail(storyId);
    const audioUrl = pickAudioUrlFromDetail(detail);
    return { ...base, audioUrl };
  } catch {
    return { ...base };
  }
}
