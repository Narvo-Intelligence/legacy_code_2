/**
 * Onboarding language rows ↔ YarnGPT narrator ids (same as landing voice preview / TTS).
 * One narrator per language — selection sets both briefing language and voice_id.
 */

export type OnboardingLangRow = {
  id: string;
  name: string;
  native: string;
  flag: string;
  /** Supabase/API `settings.broadcast_language` */
  broadcastCode: 'en' | 'pcm' | 'yo' | 'ha' | 'ig';
  /** YarnGPT / `user_preferences.voice_id` */
  yarnVoiceId: string;
  narratorName: string;
  accentLabel: string;
};

export const ONBOARDING_LANG_ROWS: OnboardingLangRow[] = [
  {
    id: 'en',
    name: 'English',
    native: 'English',
    flag: '🇳🇬',
    broadcastCode: 'en',
    yarnVoiceId: 'emma',
    narratorName: 'Emma',
    accentLabel: 'English',
  },
  {
    id: 'pidgin',
    name: 'Nigerian Pidgin',
    native: 'Pidgin',
    flag: '🇳🇬',
    broadcastCode: 'pcm',
    yarnVoiceId: 'wura',
    narratorName: 'Wura',
    accentLabel: 'Pidgin',
  },
  {
    id: 'yoruba',
    name: 'Yorùbá',
    native: 'Yoruba',
    flag: '🇳🇬',
    broadcastCode: 'yo',
    yarnVoiceId: 'idera',
    narratorName: 'Idera',
    accentLabel: 'Yoruba',
  },
  {
    id: 'hausa',
    name: 'Hausa',
    native: 'Hausa',
    flag: '🇳🇬',
    broadcastCode: 'ha',
    yarnVoiceId: 'zainab',
    narratorName: 'Zainab',
    accentLabel: 'Hausa',
  },
  {
    id: 'igbo',
    name: 'Igbo',
    native: 'Igbo',
    flag: '🇳🇬',
    broadcastCode: 'ig',
    yarnVoiceId: 'osagie',
    narratorName: 'Osagie',
    accentLabel: 'Igbo',
  },
];

const BY_ID = new Map(ONBOARDING_LANG_ROWS.map((r) => [r.id, r]));
const BY_VOICE = new Map(ONBOARDING_LANG_ROWS.map((r) => [r.yarnVoiceId, r]));

export function onboardingRowForLangId(id: string): OnboardingLangRow | undefined {
  return BY_ID.get(id);
}

export function onboardingRowForYarnVoice(voiceId: string): OnboardingLangRow | undefined {
  return BY_VOICE.get(voiceId.trim().toLowerCase());
}

/** Map legacy localStorage voice ids (pre–Yarn alignment) to yarn voice. */
export function migrateLegacyOnboardingVoice(voice: string, language: string): string {
  const v = voice.trim().toLowerCase();
  if (BY_VOICE.has(v)) return v;
  const fromLang = onboardingRowForLangId(language)?.yarnVoiceId;
  if (fromLang) return fromLang;
  const legacy: Record<string, string> = {
    'female-1': 'emma',
    'male-1': 'emma',
    'female-2': 'emma',
    'male-2': 'wura',
  };
  return legacy[v] || 'emma';
}
