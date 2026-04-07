'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const blobClass =
  'absolute rounded-full blur-[160px]';

export const MeshBackground = () => {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 opacity-50 dark:opacity-40">
        {reduceMotion ? (
          <>
            <div className={`${blobClass} top-[-10%] left-[-10%] h-[60%] w-[60%] bg-mesh-1`} />
            <div className={`${blobClass} top-[20%] right-[-5%] h-[50%] w-[50%] bg-mesh-2`} />
            <div className={`${blobClass} bottom-[10%] left-[20%] h-[45%] w-[45%] bg-mesh-3`} />
          </>
        ) : (
          <>
            <motion.div
              animate={{
                x: [0, 100, 0],
                y: [0, 50, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`${blobClass} top-[-10%] left-[-10%] h-[60%] w-[60%] bg-mesh-1`}
            />
            <motion.div
              animate={{
                x: [0, -80, 0],
                y: [0, 120, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`${blobClass} top-[20%] right-[-5%] h-[50%] w-[50%] bg-mesh-2`}
            />
            <motion.div
              animate={{
                x: [0, 50, 0],
                y: [0, -100, 0],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`${blobClass} bottom-[10%] left-[20%] h-[45%] w-[45%] bg-mesh-3`}
            />
          </>
        )}
      </div>

      <div className="absolute inset-0 noise-overlay opacity-[0.05] mix-blend-overlay" />

      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bg-primary to-transparent" />
    </div>
  );
};
