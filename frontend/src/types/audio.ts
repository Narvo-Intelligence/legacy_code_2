import type { Story } from './story';

/**
 * Track shape for AudioContext (playback queue, current track, TTS/radio).
 * Extends story-like fields with url, type, station for radio.
 */
export interface AudioTrack extends Pick<Story, 'id' | 'title' | 'source' | 'category' | 'summary' | 'narrative' | 'image_url'> {
  url?: string;
  audio_url?: string;
  type?: 'tts' | 'radio';
  station?: { id: string; name?: string; url?: string; url_resolved?: string; country?: string };
  is_live?: boolean;
  [key: string]: unknown;
}
