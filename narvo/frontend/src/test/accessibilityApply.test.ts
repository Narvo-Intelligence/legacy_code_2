import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyAccessibilityFromCache,
  isPinchZoomEnabled,
  dispatchSettingsUpdated,
  NARVO_SETTINGS_UPDATED,
} from '../lib/accessibilityApply';

const CACHE_KEY = 'narvo_settings_cache';

describe('accessibilityApply', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--font-scale');
    document.documentElement.style.removeProperty('--density-gap');
    document.documentElement.style.removeProperty('--density-card-padding');
    delete document.documentElement.dataset.density;
  });

  describe('applyAccessibilityFromCache', () => {
    it('applies default density and font when cache is empty', () => {
      applyAccessibilityFromCache();
      expect(document.documentElement.dataset.density).toBe('standard');
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1');
    });

    it('applies compact density from cache', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ display_density: 'compact', font_scale: 100 }));
      applyAccessibilityFromCache();
      expect(document.documentElement.dataset.density).toBe('compact');
    });

    it('applies font scale from cache', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ display_density: 'standard', font_scale: 125 }));
      applyAccessibilityFromCache();
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.25');
    });
  });

  describe('isPinchZoomEnabled', () => {
    it('returns false when gestural_pinch is not set', () => {
      expect(isPinchZoomEnabled()).toBe(false);
    });

    it('returns true when gestural_pinch is true', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ gestural_pinch: true }));
      expect(isPinchZoomEnabled()).toBe(true);
    });

    it('returns false when gestural_pinch is false', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ gestural_pinch: false }));
      expect(isPinchZoomEnabled()).toBe(false);
    });
  });

  describe('dispatchSettingsUpdated', () => {
    it('dispatches NARVO_SETTINGS_UPDATED event', () => {
      const handler = vi.fn();
      window.addEventListener(NARVO_SETTINGS_UPDATED, handler);
      dispatchSettingsUpdated();
      expect(handler).toHaveBeenCalled();
      window.removeEventListener(NARVO_SETTINGS_UPDATED, handler);
    });
  });
});
