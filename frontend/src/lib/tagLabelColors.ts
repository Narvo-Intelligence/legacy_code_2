/**
 * Tag/category colour mapping — Narvo Design System §3 Semantic Label Palette.
 */

import { ONBOARDING_INTEREST_IDS } from '../constants/onboarding';

export interface SemanticStyle {
  text: string;
  border: string;
  bg: string;
}

/** Semantic label styles (Design System §3). */
const SEMANTIC_STYLES: Record<string, SemanticStyle> = {
  finance: { text: 'text-label-finance', border: 'border-label-finance/30', bg: 'bg-label-finance/10' },
  environ: { text: 'text-label-environ', border: 'border-label-environ/30', bg: 'bg-label-environ/10' },
  tech: { text: 'text-label-tech', border: 'border-label-tech/30', bg: 'bg-label-tech/10' },
  urgent: { text: 'text-label-urgent', border: 'border-label-urgent/30', bg: 'bg-label-urgent/10' },
  politics: { text: 'text-label-politics', border: 'border-label-politics/30', bg: 'bg-label-politics/10' },
  science: { text: 'text-label-science', border: 'border-label-science/30', bg: 'bg-label-science/10' },
  culture: { text: 'text-label-culture', border: 'border-label-culture/30', bg: 'bg-label-culture/10' },
  sports: { text: 'text-label-sports', border: 'border-label-sports/30', bg: 'bg-label-sports/10' },
  health: { text: 'text-label-health', border: 'border-label-health/30', bg: 'bg-label-health/10' },
  security: { text: 'text-label-security', border: 'border-label-security/30', bg: 'bg-label-security/10' },
  opinion: { text: 'text-label-opinion', border: 'border-label-opinion/30', bg: 'bg-label-opinion/10' },
  legal: { text: 'text-label-legal', border: 'border-label-legal/30', bg: 'bg-label-legal/10' },
  general: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
};

const ONBOARDING_TO_SEMANTIC: Record<string, string> = {
  world_news: 'general',
  politics: 'politics',
  education: 'science',
  sports: 'sports',
  business: 'finance',
  tech: 'tech',
  science: 'science',
  environment: 'environ',
  culture: 'culture',
  health: 'health',
  radio_clips: 'culture',
  podcasts: 'culture',
  tv_news: 'general',
  interviews: 'opinion',
  government: 'politics',
  security: 'security',
  society: 'culture',
  activism: 'politics',
  trending_voices: 'culture',
};

const TAG_STRING_TO_SEMANTIC: Record<string, string> = {
  economy: 'finance',
  finance: 'finance',
  business: 'finance',
  general: 'general',
  environ: 'environ',
  environment: 'environ',
  climate: 'environ',
  energy: 'environ',
  solar_grid: 'environ',
  tech: 'tech',
  technology: 'tech',
  ai_synth: 'tech',
  urgent: 'urgent',
  breaking: 'urgent',
  politics: 'politics',
  government: 'politics',
  science: 'science',
  culture: 'culture',
  sports: 'sports',
  health: 'health',
  security: 'security',
  opinion: 'opinion',
  legal: 'legal',
  world_news: 'general',
  education: 'science',
  radio_clips: 'culture',
  podcasts: 'culture',
  tv_news: 'general',
  interviews: 'opinion',
  society: 'culture',
  activism: 'politics',
  trending_voices: 'culture',
  africa: 'general',
  nigeria: 'general',
};

function normalizeTag(tag: string | undefined | null): string {
  return (tag ?? '')
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Get semantic key for a tag or onboarding interest id.
 */
export function getSemanticKeyForTag(tagOrId: string | undefined | null): string {
  const key = normalizeTag(tagOrId);
  if (ONBOARDING_TO_SEMANTIC[key] !== undefined) return ONBOARDING_TO_SEMANTIC[key];
  return TAG_STRING_TO_SEMANTIC[key] ?? 'general';
}

/**
 * Get Tailwind classes for a tag/category (Design System §3).
 */
export function getTagLabelClass(tag: string | undefined | null): SemanticStyle {
  const semanticKey = getSemanticKeyForTag(tag);
  return SEMANTIC_STYLES[semanticKey] ?? SEMANTIC_STYLES.general;
}

/** All onboarding interest ids that have an explicit semantic mapping. */
export const MAPPED_INTEREST_IDS = [...ONBOARDING_INTEREST_IDS];

export default getTagLabelClass;
