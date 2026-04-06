import {
  fetchNewsDetail,
  pickAudioUrlFromDetail,
  type ApiNewsDetail,
} from '@/lib/narvo-api';
import { getPreferredBroadcastLanguage } from '@/lib/listening-preferences';

export type PlayableTrack = {
  id: string;
  title: string;
  source: string;
  audioUrl?: string;
  category?: string;
};

/**
 * Resolve narration for a story: fetches detail with Settings-aligned language, picks audio for that language.
 */
export async function resolveStoryPlayback(
  storyId: string,
  base: Omit<PlayableTrack, 'audioUrl'>,
  opts?: { language?: string }
): Promise<PlayableTrack> {
  const language = opts?.language ?? getPreferredBroadcastLanguage();
  try {
    const detail: ApiNewsDetail = await fetchNewsDetail(storyId, { language });
    const audioUrl = pickAudioUrlFromDetail(detail, language);
    return { ...base, audioUrl };
  } catch {
    return { ...base };
  }
}
