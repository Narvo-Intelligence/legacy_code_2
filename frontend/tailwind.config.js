/** @type {import('tailwindcss').Config} */
/**
 * Narvo Design System v5.1 — Tailwind Configuration
 */

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ── v5.1 Brand Identity ── */
        'narvo-teal':     'var(--color-primary)',       /* #0F5F73 Petrol Teal */
        'narvo-ink':      'var(--color-primary-deep)',  /* #17324A Deep Ink */
        'narvo-cloud':    'var(--color-bg)',            /* #F6F8FB Cloud White */
        'narvo-mist':     'var(--color-surface-alt)',   /* #EEF3F7 Cool Mist */
        'narvo-surface':  'var(--color-surface)',       /* #FFFFFF */

        /* ── v5.1 Functional ── */
        'narvo-vermilion':'var(--color-alert)',         /* #F04B24 Signal Vermilion */
        'narvo-mint':     'var(--color-success)',       /* #7FDDCA Seafoam Mint */
        'narvo-butter':   'var(--color-highlight)',     /* #F2D66B Soft Butter */
        'narvo-lilac':    'var(--color-insight)',       /* #ACB6FF Mist Lilac */
        'narvo-coral':    'var(--color-coral)',         /* #FF9F8D Soft Coral */

        /* ── Semantic aliases ── */
        'primary':              'var(--color-primary)',
        'surface':              'var(--color-surface)',
        'surface-raised':       'var(--color-surface)',
        'content':              'var(--color-text-primary)',
        'content-secondary':    'var(--color-text-mid)',
        'content-dim':          'var(--color-text-dim)',
        'content-dim-accessible':'var(--color-text-mid)',
        'background-dark':      'var(--color-bg)',
        'forest':               'var(--color-primary)', /* legacy compat */
        'border-subtle':        'var(--color-border)',

        /* Backward compat aliases */
        'narvo-bg':           'var(--color-bg)',
        'narvo-border':       'var(--color-border)',
        'narvo-primary':      'var(--color-primary)',
        'narvo-text':         'var(--color-text-primary)',
        'narvo-text-secondary':'var(--color-text-mid)',
        'narvo-text-dim':     'var(--color-text-dim)',
        'narvo-green':        'var(--color-primary)',
        'narvo-yellow':       'var(--color-highlight)',
        'narvo-cream':        'var(--color-bg)',
        'narvo-cta':          'var(--color-alert)',
        'narvo-urgent':       'var(--color-alert)',
        'narvo-verified':     'var(--color-success)',
      },

      fontFamily: {
        /* v5.1 type system */
        'display': ['Newsreader', 'Georgia', 'serif'],           /* Headlines H1-H4 */
        'body':    ['Instrument Sans', 'system-ui', 'sans-serif'], /* Body, nav, buttons */
        'mono':    ['Geist Mono', 'Courier New', 'monospace'],  /* Labels, stamps, meta */
        'header':  ['Newsreader', 'Georgia', 'serif'],            /* Alias for display */
      },

      borderRadius: {
        'none':    '0',
        'DEFAULT': '0',
        'sm':      '0',
        'md':      '0',
        'lg':      '0',
        'xl':      '0',
        '2xl':     '0',
        '3xl':     '0',
        'full':    '9999px',
      },

      spacing: {
        /* 8px grid */
        '1':  '4px',  '2':  '8px',  '3':  '12px', '4':  '16px',
        '5':  '20px', '6':  '24px', '7':  '28px', '8':  '32px',
        '9':  '36px', '10': '40px', '11': '44px', '12': '48px',
        '13': '52px', '14': '56px', '16': '64px', '18': '72px',
        '20': '80px', '24': '96px', '32': '128px',
      },

      height: {
        'header':          'var(--header-h)',
        'header-desktop':  'var(--header-h-desktop)',
        'header-landing':  'var(--header-h-landing)',
        'mobile-nav':      'var(--mobile-nav-h)',
        'audio-bar':       'var(--audio-bar-h)',
        'btn-app':         'var(--btn-h-app)',
        'btn-landing':     'var(--btn-h-landing)',
        'input-app':       'var(--input-h-app)',
        'input-landing':   'var(--input-h-landing)',
      },

      minHeight: {
        'touch':      'var(--touch-target-min)',
        'touch-icon': 'var(--touch-target-icon)',
      },
      minWidth: {
        'touch':      'var(--touch-target-min)',
        'touch-icon': 'var(--touch-target-icon)',
      },
      maxWidth: {
        'content':        'var(--content-max-w)',
        'content-narrow': 'var(--content-max-w-narrow)',
      },

      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
        '4': 'var(--shadow-4)',
        'narvo-1': 'var(--shadow-1)',
        'narvo-2': 'var(--shadow-2)',
        'narvo-3': 'var(--shadow-3)',
        'narvo-4': 'var(--shadow-4)',
      },

      transitionTimingFunction: {
        'spring-dock': 'var(--motion-dock-spring)',
      },

      transitionDuration: {
        'hover': '200ms',
        'toggle': '100ms',
        'lift': '220ms',
      },

      animation: {
        'pulse-slow':     'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe':        'breathe 3s ease-in-out infinite',
        'scan':           'scan 4s linear infinite',
        'blink':          'blink 1s step-end infinite',
        'fade-in-up':     'fadeInUp 0.3s ease-out forwards',
        'wave-bar':       'waveBar 1.2s ease-in-out infinite',
        'fragment-drift': 'fragmentDrift1 2.8s ease-in-out infinite',
      },

      keyframes: {
        breathe:       { '0%, 100%': { opacity: '0.15' }, '50%': { opacity: '0.4' } },
        scan:          { '0%': { top: '0%' }, '100%': { top: '100%' } },
        blink:         { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        fadeInUp:      { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        waveBar:       { '0%, 100%': { transform: 'scaleY(0.4)' }, '50%': { transform: 'scaleY(1)' } },
        fragmentDrift1:{ '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
};
