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

type PlaybackResolution = { audioUrl?: string };

const RESOLUTION_TTL_MS = 5 * 60 * 1000;
const RESOLUTION_CACHE_MAX = 80;
const resolvedPlaybackCache = new Map<string, { value: PlaybackResolution; expiresAt: number }>();
const inflightPlaybackCache = new Map<string, Promise<PlaybackResolution>>();

function playbackCacheKey(storyId: string, language: string, voiceId: string): string {
  return `${storyId}::${language.trim().toLowerCase()}::${voiceId.trim().toLowerCase()}`;
}

function trimPlaybackCache(): void {
  const now = Date.now();
  for (const [key, entry] of resolvedPlaybackCache) {
    if (entry.expiresAt <= now) resolvedPlaybackCache.delete(key);
  }
  while (resolvedPlaybackCache.size > RESOLUTION_CACHE_MAX) {
    const oldest = resolvedPlaybackCache.keys().next();
    if (oldest.done) break;
    resolvedPlaybackCache.delete(oldest.value);
  }
}

async function resolvePlaybackAudio(
  storyId: string,
  language: string,
  voiceId: string
): Promise<PlaybackResolution> {
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
    return { audioUrl };
  } catch {
    return {};
  }
}

async function getPlaybackResolution(
  storyId: string,
  language: string,
  voiceId: string
): Promise<PlaybackResolution> {
  const key = playbackCacheKey(storyId, language, voiceId);
  trimPlaybackCache();
  const cached = resolvedPlaybackCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const inflight = inflightPlaybackCache.get(key);
  if (inflight) return inflight;

  const promise = resolvePlaybackAudio(storyId, language, voiceId)
    .then((value) => {
      if (value.audioUrl?.trim()) {
        resolvedPlaybackCache.set(key, { value, expiresAt: Date.now() + RESOLUTION_TTL_MS });
        trimPlaybackCache();
      }
      return value;
    })
    .finally(() => {
      inflightPlaybackCache.delete(key);
    });
  inflightPlaybackCache.set(key, promise);
  return promise;
}

export function prefetchStoryPlayback(
  storyId: string,
  opts?: { language?: string; voiceId?: string }
): void {
  const id = storyId.trim();
  if (!id) return;
  const language = opts?.language ?? getPreferredBroadcastLanguage();
  const voiceId = opts?.voiceId ?? getPreferredTtsVoiceId();
  void getPlaybackResolution(id, language, voiceId);
}

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
  const resolved = await getPlaybackResolution(storyId, language, voiceId);
  return { ...base, audioUrl: resolved.audioUrl };
}
