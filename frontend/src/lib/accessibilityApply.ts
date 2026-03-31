import logger from './logger';
import { readJson } from './storage';

const CACHE_KEY = 'narvo_settings_cache';

/** Custom event dispatched when settings are saved (same-tab sync). */
export const NARVO_SETTINGS_UPDATED = 'narvo-settings-updated';

interface SettingsCache {
  gestural_pinch?: boolean;
  display_density?: 'compact' | 'standard' | 'expanded';
  font_scale?: number;
}

/**
 * Read gestural_pinch from cache. Use when implementing pinch-zoom (e.g. map/image zoom).
 */
export function isPinchZoomEnabled(): boolean {
  const data = readJson<SettingsCache>(CACHE_KEY, {});
  return data.gestural_pinch === true;
}

/**
 * Read display_density and font_scale from narvo_settings_cache and apply to document.
 * Call on app load and after accessibility settings are saved.
 */
export function applyAccessibilityFromCache(): void {
  try {
    const data = readJson<SettingsCache & { display_density?: string; font_scale?: number }>(CACHE_KEY, {});
    const density = (data.display_density as 'compact' | 'standard' | 'expanded') || 'standard';
    const fontScale = (data.font_scale != null ? Number(data.font_scale) : 100) / 100;
    document.documentElement.dataset.density = density;
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
    const gapMap: Record<string, string> = { compact: '4px', standard: '12px', expanded: '24px' };
    const paddingMap: Record<string, string> = { compact: '6px', standard: '12px', expanded: '16px' };
    document.documentElement.style.setProperty('--density-gap', gapMap[density] ?? gapMap.standard);
    document.documentElement.style.setProperty('--density-card-padding', paddingMap[density] ?? paddingMap.standard);
  } catch (err) {
    logger.debug('[accessibilityApply] Failed to apply accessibility cache', err);
  }
}

/** Dispatch NARVO_SETTINGS_UPDATED so same-tab listeners (e.g. Dashboard) can re-read cache. */
export function dispatchSettingsUpdated(): void {
  try {
    window.dispatchEvent(new CustomEvent(NARVO_SETTINGS_UPDATED));
  } catch (err) {
    logger.debug('[accessibilityApply] Failed to dispatch settings update', err);
  }
}
