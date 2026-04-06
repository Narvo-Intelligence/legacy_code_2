/** Aligns with `narvo_news/backend/services/briefing_service.py` briefing shape. */

export const BRIEFING_STORY_COUNT_MIN = 5;
export const BRIEFING_STORY_COUNT_MAX = 8;
export const BRIEFING_MINUTES_MIN = 3;
export const BRIEFING_MINUTES_MAX = 12;
/** Midpoints for push previews and placeholders when the API has not returned a briefing yet. */
export const BRIEFING_PLACEHOLDER_STORY_MID = 6;
export const BRIEFING_PLACEHOLDER_MINUTES_MID = 8;

export function briefingMinutesFromEstimate(
  raw?: string | null,
  fallback = BRIEFING_PLACEHOLDER_MINUTES_MID
): number {
  if (!raw?.trim()) return fallback;
  const m = raw.trim().match(/(\d+)/);
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  return Math.min(BRIEFING_MINUTES_MAX, Math.max(BRIEFING_MINUTES_MIN, n));
}
