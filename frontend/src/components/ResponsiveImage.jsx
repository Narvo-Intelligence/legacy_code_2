import React from 'react';
import { buildSrcset } from '../lib/responsiveImageUtils';

/**
 * Renders an <img> with srcset/sizes for responsive loading when the URL supports it
 * (Unsplash, Pexels, or local narvo icons). Otherwise falls back to a single src.
 *
 * @param {string} src - Image URL (required)
 * @param {string} alt - Accessible description (required)
 * @param {string} [sizes] - Sizes attribute (e.g. "(max-width: 600px) 100vw, 600px")
 * @param {number[]} [widths] - Widths for srcset (default [400, 600, 800, 1200])
 * @param {object} [props] - Remaining props spread onto <img> (className, loading, decoding, width, height, etc.)
 */
function ResponsiveImage({ src, alt, sizes, widths, ...props }) {
  const srcset = buildSrcset(src, widths);

  if (srcset) {
    return (
      <img
        src={src}
        alt={alt}
        srcSet={srcset}
        sizes={sizes}
        {...props}
      />
    );
  }

  return <img src={src} alt={alt} {...props} />;
}

export default ResponsiveImage;
