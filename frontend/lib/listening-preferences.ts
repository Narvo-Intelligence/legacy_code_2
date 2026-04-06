import { loadPreferences } from '@/lib/narvo-session';
import { migrateLegacyOnboardingVoice, onboardingRowForYarnVoice } from '@/lib/onboarding-narrators';

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
