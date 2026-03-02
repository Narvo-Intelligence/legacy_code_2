/**
 * Shared onboarding constants. Use across the app (onboarding, settings, preferences, API).
 * See docs/Constants_And_Logic.md for usage and how to extend.
 */

/** Supported regions for onboarding and preferences. Backend stores region id. */
export const REGIONS = [
  { id: 'nigeria', name: 'Nigeria', tz: 'WAT', country: 'NIGERIA' },
  { id: 'ghana', name: 'Ghana', tz: 'GMT', country: 'GHANA' },
];

/** Default region when none is saved (must be a REGIONS[].id). */
export const DEFAULT_REGION = 'nigeria';

/** Legacy region id from older backend; map to DEFAULT_REGION when loading. */
export const LEGACY_REGION_LAGOS = 'lagos';

/** Topic/category ids for onboarding interests. Stored in preferences and used for feed filtering. */
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
];

/** Human-readable names for each interest id. Use for display; id is the source of truth for API/DB. */
export const ONBOARDING_INTEREST_NAMES = {
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

/** Build list of { id, name } for UI. Use with icon mapping in the component that renders (e.g. Phosphor icons). */
export function getOnboardingInterestsList() {
  return ONBOARDING_INTEREST_IDS.map((id) => ({
    id,
    name: ONBOARDING_INTEREST_NAMES[id] || id,
  }));
}

/** Normalize saved region from API (e.g. lagos → nigeria). */
export function normalizeRegionId(regionId) {
  if (regionId === LEGACY_REGION_LAGOS) return DEFAULT_REGION;
  return REGIONS.some((r) => r.id === regionId) ? regionId : DEFAULT_REGION;
}

/** Filter interest ids to only those that exist in ONBOARDING_INTEREST_IDS. */
export function filterValidInterestIds(ids) {
  if (!Array.isArray(ids)) return [];
  const set = new Set(ONBOARDING_INTEREST_IDS);
  return ids.filter((id) => set.has(id));
}
