import React from 'react';
import { buildSrcset } from '../lib/responsiveImageUtils';

export interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> {
  src: string;
  alt: string;
  sizes?: string;
  widths?: number[];
}

function ResponsiveImage({ src, alt, sizes, widths, loading = 'lazy', decoding = 'async', ...props }: ResponsiveImageProps) {
  const srcset = buildSrcset(src, widths);

  if (srcset) {
    return (
      <img
        src={src}
        alt={alt}
        srcSet={srcset}
        sizes={sizes}
        loading={loading}
        decoding={decoding}
        {...props}
      />
    );
  }

  return <img src={src} alt={alt} loading={loading} decoding={decoding} {...props} />;
}

export default ResponsiveImage;
