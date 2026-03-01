/**
 * Tag/category colour mapping — Narvo Design System §3 Semantic Label Palette.
 * Single source of truth for topic categories (onboarding interests) and tags app-wide.
 * Design System: each category uses text colour + 10% opacity background + border for classification.
 */

import { ONBOARDING_INTEREST_IDS } from '../constants/onboarding';

/** Semantic label styles (Design System §3). Tailwind classes use label-* from tailwind.config.js. */
const SEMANTIC_STYLES = {
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

/**
 * Onboarding interest id → semantic key (Design System category).
 * Used for feed tags, trending, and any place we show topic categories.
 */
const ONBOARDING_TO_SEMANTIC = {
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

/** Tag string (from API, trending, or display) → semantic key. Covers #TAG, lowercase, underscores. */
const TAG_STRING_TO_SEMANTIC = {
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

function normalizeTag(tag) {
  return (tag || '')
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Get semantic key for a tag or onboarding interest id.
 * @param {string} tagOrId - Tag (e.g. '#TECH', 'economy') or onboarding interest id (e.g. 'world_news')
 * @returns {string}
 */
export function getSemanticKeyForTag(tagOrId) {
  const key = normalizeTag(tagOrId);
  if (ONBOARDING_TO_SEMANTIC[key] !== undefined) return ONBOARDING_TO_SEMANTIC[key];
  return TAG_STRING_TO_SEMANTIC[key] || 'general';
}

/**
 * Get Tailwind classes for a tag/category (Design System §3: text + border + 10% bg).
 * Use for pills, trending tags, and any category display app-wide.
 * @param {string} tag - Tag or category (e.g. '#TECH', 'politics', 'world_news')
 * @returns {{ text: string, border: string, bg: string }}
 */
export function getTagLabelClass(tag) {
  const semanticKey = getSemanticKeyForTag(tag);
  return SEMANTIC_STYLES[semanticKey] || SEMANTIC_STYLES.general;
}

/**
 * All onboarding interest ids that have an explicit semantic mapping.
 * Use when you need to iterate or validate.
 */
export const MAPPED_INTEREST_IDS = [...ONBOARDING_INTEREST_IDS];

export default getTagLabelClass;
