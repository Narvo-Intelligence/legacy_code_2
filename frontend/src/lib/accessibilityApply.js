const CACHE_KEY = 'narvo_settings_cache';

/** Custom event dispatched when settings are saved (same-tab sync). */
export const NARVO_SETTINGS_UPDATED = 'narvo-settings-updated';

/**
 * Read gestural_pinch from cache. Use when implementing pinch-zoom (e.g. map/image zoom):
 * if (!isPinchZoomEnabled()) return; before handling pinch gestures.
 */
export function isPinchZoomEnabled() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data.gestural_pinch === true;
  } catch { return false; }
}

/**
 * Read display_density and font_scale from narvo_settings_cache and apply to document.
 * Call on app load and after accessibility settings are saved.
 * - data-density on documentElement drives grid/feed density (compact | standard | expanded).
 * - --font-scale on documentElement drives news detail and other typography (e.g. 1.25 for 125%).
 * - --density-gap and --density-card-padding are set for use in feed/grid layouts.
 */
export function applyAccessibilityFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const density = data.display_density || 'standard';
    const fontScale = (data.font_scale != null ? Number(data.font_scale) : 100) / 100;
    document.documentElement.dataset.density = density;
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
    const gapMap = { compact: '4px', standard: '12px', expanded: '24px' };
    const paddingMap = { compact: '6px', standard: '12px', expanded: '16px' };
    document.documentElement.style.setProperty('--density-gap', gapMap[density] || gapMap.standard);
    document.documentElement.style.setProperty('--density-card-padding', paddingMap[density] || paddingMap.standard);
  } catch (_) { /* ignore */ }
}

/** Dispatch NARVO_SETTINGS_UPDATED so same-tab listeners (e.g. Dashboard) can re-read cache. */
export function dispatchSettingsUpdated() {
  try {
    window.dispatchEvent(new CustomEvent(NARVO_SETTINGS_UPDATED));
  } catch (_) { /* ignore */ }
}
