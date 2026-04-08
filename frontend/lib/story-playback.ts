import {
  fetchNewsDetail,
  pickAudioUrlFromDetail,
  postTtsGenerate,
  buildSpeakableTextFromDetail,
  type ApiNewsDetail,
} from '@/lib/narvo-api';
import { getPreferredBroadcastLanguage, getPreferredTtsVoiceId } from '@/lib/listening-preferences';

export type PlayableTrack = {
  id: string;
  title: string;
  source: string;
  audioUrl?: string;
  category?: string;
};

/**
 * Resolve narration for a story: fetches detail with Settings-aligned language and voice,
 * uses cached audio only when it matches the selected voice, otherwise on-demand TTS.
 */
export async function resolveStoryPlayback(
  storyId: string,
  base: Omit<PlayableTrack, 'audioUrl'>,
  opts?: { language?: string; voiceId?: string }
): Promise<PlayableTrack> {
  const language = opts?.language ?? getPreferredBroadcastLanguage();
  const voiceId = opts?.voiceId ?? getPreferredTtsVoiceId();
  try {
    const detail: ApiNewsDetail = await fetchNewsDetail(storyId, { language, voiceId });
    let audioUrl = pickAudioUrlFromDetail(detail, language, { strictPreferredLang: true });
    if (!audioUrl?.trim()) {
      const text = buildSpeakableTextFromDetail(detail);
      if (text.trim()) {
        const res = await postTtsGenerate({
          text,
          voiceId,
          language,
          storyId,
          skipTranslation: language === 'en',
        });
        audioUrl = (res.audio_url || '').trim() || undefined;
      }
    }
    return { ...base, audioUrl };
  } catch {
    return { ...base };
  }
}
