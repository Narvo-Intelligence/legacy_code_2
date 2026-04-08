import { loadPreferences } from '@/lib/narvo-session';
import { migrateLegacyOnboardingVoice, onboardingRowForYarnVoice } from '@/lib/onboarding-narrators';

/**
 * YarnGPT / API `voice_id` from Settings (`voice_id` in localStorage) or onboarding language default.
 * Use for TTS and `voice_id` on GET /api/news/:id so cached audio matches the selected narrator.
 */
export function getPreferredTtsVoiceId(): string {
  if (typeof window === 'undefined') return 'emma';
  const p = loadPreferences();
  if (!p) return 'emma';
  const fromSettings = (p.voice_id || '').trim().toLowerCase();
  if (fromSettings) return fromSettings;
  const v = migrateLegacyOnboardingVoice(p.voice, p.language);
  const id = (v || 'emma').trim().toLowerCase();
  return id || 'emma';
}

/**
 * Broadcast language code for GET /api/news/:id (`language` query) — aligns with Settings / onboarding voice.
 */
export function getPreferredBroadcastLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  const p = loadPreferences();
  if (!p) return 'en';
  const voice = migrateLegacyOnboardingVoice(p.voice, p.language);
  const row = onboardingRowForYarnVoice(voice);
  return row?.broadcastCode ?? 'en';
}
