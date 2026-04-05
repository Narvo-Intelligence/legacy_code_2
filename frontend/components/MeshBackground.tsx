'use client';

import React from 'react';
import { motion } from 'motion/react';

export const MeshBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dynamic Blobs */}
      <div className="absolute inset-0 opacity-50 dark:opacity-40">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-mesh-1 blur-[160px]"
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
            ease: "linear"
          }}
          className="absolute top-[20%] right-[-5%] w-[50%] h-[50%] rounded-full bg-mesh-2 blur-[160px]"
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
            ease: "linear"
          }}
          className="absolute bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full bg-mesh-3 blur-[160px]"
        />
      </div>

      {/* Noise Overlay */}
      <div className="absolute inset-0 noise-overlay opacity-[0.05] mix-blend-overlay" />
      
      {/* Subtle Bottom Fade */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bg-primary to-transparent" />
    </div>
  );
};
