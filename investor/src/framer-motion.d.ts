declare module 'framer-motion' {
  import type { ComponentType, SVGAttributes } from 'react';
  export interface MotionProps {
    initial?: object;
    animate?: object;
    transition?: object;
    [key: string]: unknown;
  }
  export const motion: {
    rect: ComponentType<MotionProps & SVGAttributes<SVGRectElement>>;
    [key: string]: ComponentType<MotionProps & Record<string, unknown>>;
  };
}
