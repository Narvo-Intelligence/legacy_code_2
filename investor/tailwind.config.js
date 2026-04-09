/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cloud: 'rgb(var(--cloud-rgb) / <alpha-value>)',
        mist: 'rgb(var(--mist-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        'ink-deep': 'rgb(var(--ink-deep-rgb) / <alpha-value>)',
        quiet: 'rgb(var(--quiet-rgb) / <alpha-value>)',
        teal: 'rgb(var(--teal-rgb) / <alpha-value>)',
        'teal-deep': 'rgb(var(--teal-deep-rgb) / <alpha-value>)',
        vermilion: 'rgb(var(--vermilion-rgb) / <alpha-value>)',
        mint: 'rgb(var(--mint-rgb) / <alpha-value>)',
        butter: 'rgb(var(--butter-rgb) / <alpha-value>)',
        indigo: 'rgb(var(--indigo-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 20px 80px rgba(15, 34, 54, 0.10)',
        deep: '0 28px 90px rgba(10, 21, 32, 0.28)',
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [],
};
