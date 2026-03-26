/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Primary semantic tokens (theme-aware via CSS vars) ──
        'primary':                 'rgb(var(--color-primary) / <alpha-value>)',
        'forest':                  'rgb(var(--color-border) / <alpha-value>)',
        'background-dark':         'rgb(var(--color-bg) / <alpha-value>)',
        'surface':                 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised':          'rgb(var(--color-surface-raised) / <alpha-value>)',
        'content':                 'rgb(var(--color-text-primary) / <alpha-value>)',
        'content-secondary':       'rgb(var(--color-text-secondary) / <alpha-value>)',
        'content-dim':             'rgb(var(--color-text-dim) / <alpha-value>)',
        'content-dim-accessible':  'rgb(var(--color-text-dim-accessible) / <alpha-value>)',
        'border-subtle':           'rgb(var(--color-border-subtle) / <alpha-value>)',
        // ── Aliases for backward compat ──
        'narvo-bg':           'rgb(var(--color-bg) / <alpha-value>)',
        'narvo-surface':      'rgb(var(--color-surface) / <alpha-value>)',
        'narvo-border':       'rgb(var(--color-border) / <alpha-value>)',
        'narvo-primary':      'rgb(var(--color-primary) / <alpha-value>)',
        'narvo-text':         'rgb(var(--color-text-primary) / <alpha-value>)',
        'narvo-text-secondary':'rgb(var(--color-text-secondary) / <alpha-value>)',
        'narvo-text-dim':     'rgb(var(--color-text-dim) / <alpha-value>)',
        // ── Semantic category label palette ──
        'label-finance':   '#EBD5AB',
        'label-environ':   '#93C5FD',
        'label-tech':      '#D8B4FE',
        'label-urgent':    '#FCA5A5',
        'label-politics':  '#FDBA74',
        'label-science':   '#5EEAD4',
        'label-culture':   '#F472B6',
        'label-sports':    '#FB923C',
        'label-health':    '#4ADE80',
        'label-security':  '#94A3B8',
        'label-opinion':   '#A8A29E',
        'label-legal':     '#818CF8',
      },
      fontFamily: {
        // v3 — General Sans is primary; Space Grotesk / Inter as fallback during revamp
        'display': ['General Sans', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'body':    ['General Sans', 'Inter', 'system-ui', 'sans-serif'],
        'mono':    ['Geist Mono', 'JetBrains Mono', 'monospace'],
        'header':  ['General Sans', 'Space Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Swiss design — sharp edges everywhere
        'none': '0', 'DEFAULT': '0', 'sm': '0', 'md': '0',
        'lg': '0', 'xl': '0', '2xl': '0', '3xl': '0', 'full': '9999px',
      },
      spacing: {
        // 8pt grid aligned with CSS vars
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '7':  '28px',
        '8':  '32px',
        '9':  '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
      },
      height: {
        'header':         'var(--header-h)',
        'header-desktop': 'var(--header-h-desktop)',
        'mobile-nav':     'var(--mobile-nav-h)',
        'audio-bar':      'var(--audio-bar-h)',
      },
      minHeight: {
        'touch':  'var(--touch-target-min)',
        'touch-icon': 'var(--touch-target-icon)',
      },
      minWidth: {
        'touch':  'var(--touch-target-min)',
        'touch-icon': 'var(--touch-target-icon)',
      },
      maxWidth: {
        'content':        'var(--content-max-w)',
        'content-narrow': 'var(--content-max-w-narrow)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe':    'breathe 3s ease-in-out infinite',
        'scan':       'scan 4s linear infinite',
        'blink':      'blink 1s step-end infinite',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
      },
      keyframes: {
        breathe:    { '0%, 100%': { opacity: '0.15' }, '50%': { opacity: '0.4' } },
        scan:       { '0%': { top: '0%' }, '100%': { top: '100%' } },
        blink:      { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
