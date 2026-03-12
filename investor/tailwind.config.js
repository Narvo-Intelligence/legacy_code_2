import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const frontendConfig = require('../frontend/tailwind.config.js');

const narvoPalette = {
  bg: 'rgb(var(--color-bg) / <alpha-value>)',
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  primary: 'rgb(var(--color-primary) / <alpha-value>)',
  structural: 'rgb(var(--color-border) / <alpha-value>)',
  text: 'rgb(var(--color-text-primary) / <alpha-value>)',
  secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
  dim: 'rgb(var(--color-text-dim) / <alpha-value>)',
  dimAccessible: 'rgb(var(--color-text-dim-accessible) / <alpha-value>)',
};

const frontendExtend = frontendConfig?.theme?.extend ?? {};
const mergedColors = {
  ...(frontendExtend.colors ?? {}),
  narvo: narvoPalette,
};

/** @type {import('tailwindcss').Config} */
export default {
  ...frontendConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...frontendConfig.theme,
    extend: {
      ...frontendExtend,
      colors: mergedColors,
      fontFamily: {
        ...(frontendExtend.fontFamily ?? {}),
        header: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
