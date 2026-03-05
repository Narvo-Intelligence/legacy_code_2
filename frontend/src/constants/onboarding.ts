/**
 * Shared onboarding constants. Use across the app (onboarding, settings, preferences, API).
 */

export interface Region {
  id: string;
  name: string;
  tz: string;
  country: string;
}

/** Supported regions for onboarding and preferences. Backend stores region id. */
export const REGIONS: Region[] = [
  { id: 'nigeria', name: 'Nigeria', tz: 'WAT', country: 'NIGERIA' },
  { id: 'ghana', name: 'Ghana', tz: 'GMT', country: 'GHANA' },
];

/** Default region when none is saved (must be a REGIONS[].id). */
export const DEFAULT_REGION = 'nigeria';

/** Legacy region id from older backend; map to DEFAULT_REGION when loading. */
export const LEGACY_REGION_LAGOS = 'lagos';

/** Topic/category ids for onboarding interests. */
export const ONBOARDING_INTEREST_IDS = [
  'world_news',
  'politics',
  'education',
  'sports',
  'business',
  'tech',
  'science',
  'environment',
  'culture',
  'health',
  'radio_clips',
  'podcasts',
  'tv_news',
  'interviews',
  'government',
  'security',
  'society',
  'activism',
  'trending_voices',
] as const;

export type OnboardingInterestId = (typeof ONBOARDING_INTEREST_IDS)[number];

/** Human-readable names for each interest id. */
export const ONBOARDING_INTEREST_NAMES: Record<string, string> = {
  world_news: 'World News',
  politics: 'Politics',
  education: 'Education',
  sports: 'Sports',
  business: 'Business',
  tech: 'Tech',
  science: 'Science',
  environment: 'Environment',
  culture: 'Culture',
  health: 'Health',
  radio_clips: 'Radio Clips',
  podcasts: 'Podcasts',
  tv_news: 'TV News',
  interviews: 'Interviews',
  government: 'Government',
  security: 'Security',
  society: 'Society',
  activism: 'Activism',
  trending_voices: 'Trending Voices',
};

/** Default selected interest ids when user has none saved. */
export const DEFAULT_ONBOARDING_INTERESTS = ['world_news', 'politics', 'sports'];

export interface OnboardingInterestItem {
  id: string;
  name: string;
}

/** Build list of { id, name } for UI. */
export function getOnboardingInterestsList(): OnboardingInterestItem[] {
  return ONBOARDING_INTEREST_IDS.map((id) => ({
    id,
    name: ONBOARDING_INTEREST_NAMES[id] ?? id,
  }));
}

/** Normalize saved region from API (e.g. lagos → nigeria). */
export function normalizeRegionId(regionId: string | undefined | null): string {
  if (regionId === LEGACY_REGION_LAGOS) return DEFAULT_REGION;
  return REGIONS.some((r) => r.id === regionId) ? regionId! : DEFAULT_REGION;
}

/** Filter interest ids to only those that exist in ONBOARDING_INTEREST_IDS. */
export function filterValidInterestIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const set = new Set<string>(ONBOARDING_INTEREST_IDS);
  return ids.filter((id): id is string => typeof id === 'string' && set.has(id));
}
