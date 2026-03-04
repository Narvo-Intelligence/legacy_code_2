/**
 * Build a srcset string for responsive images.
 * Supports Unsplash/Pexels URLs (width query param) and local narvo icons.
 * @param {string} url - Image URL (external or local)
 * @param {number[]} [widths] - Desired widths for srcset (default [400, 600, 800, 1200])
 * @returns {string|null} - srcset string or null if not applicable (use single src)
 */
export function buildSrcset(url, widths = [400, 600, 800, 1200]) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Local narvo icons: we have 192 and 512
  if (trimmed.startsWith('/') && trimmed.includes('narvo-icon')) {
    return '/narvo-icon-192.png 192w, /narvo-icon-512.png 512w';
  }

  // External: Unsplash (w=, h=, fit=) or Pexels (w=, etc.)
  try {
    const isUnsplash = trimmed.includes('images.unsplash.com');
    const isPexels = trimmed.includes('pexels.com');
    if (!isUnsplash && !isPexels) return null;

    const parts = trimmed.split('?');
    const base = parts[0];
    const search = parts[1] || '';
    const params = new URLSearchParams(search);

    return widths
      .map((w) => {
        params.set('w', String(w));
        if (isUnsplash) {
          params.set('h', String(Math.round((w * 2) / 3)));
          params.set('fit', 'crop');
        }
        return `${base}?${params.toString()} ${w}w`;
      })
      .join(', ');
  } catch {
    return null;
  }
}

/**
 * Default sizes for hero images (full-width on small, capped on large).
 */
export const HERO_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px';

/**
 * Sizes for card thumbnails (half width on md, small elsewhere).
 */
export const CARD_SIZES = '(max-width: 768px) 50vw, 400px';

/**
 * Sizes for small list thumbnails (fixed small box).
 */
export const THUMB_SIZES = '96px';
