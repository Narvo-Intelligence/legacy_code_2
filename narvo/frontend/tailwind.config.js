/** @type {import('tailwindcss').Config} */
/**
 * Narvo Design System v4 — Tailwind Configuration
 *
 * IMPORTANT — border radius history:
 *   v2 (Swiss Grid): all radii = 0px (sharp edges throughout)
 *   v3 (warm):       partial restoration via [data-theme='warm'] overrides
 *   v4 (current):    full restoration — all v4 radii use arbitrary values
 *                    e.g. rounded-[16px] NOT rounded-lg (which = 0px here)
 *
 * The borderRadius overrides below are kept to avoid breaking existing
 * components that still use rounded-none etc. All new v4 components
 * must use arbitrary values: rounded-[8px], rounded-[16px], rounded-[20px]
 * or rounded-full. The named tokens (rounded-lg etc.) remain 0px until
 * a full codebase migration is complete.
 */

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ── v4 Brand Identity ── */
        'narvo-green':    'var(--color-primary)',       /* #18542A Forest Green */
        'narvo-yellow':   'var(--color-accent)',        /* #FFC926 Sunshine Yellow */
        'narvo-cream':    'var(--color-bg)',            /* #F3E8CC Cream */
        'narvo-surface':  'var(--color-surface)',       /* #FDF8EF */

        /* ── v4 Functional ── */
        'narvo-cta':      'var(--color-cta)',           /* #F96015 Crisp Carrot */
        'narvo-urgent':   'var(--color-urgent)',        /* #D52518 Tomato Burst */
        'narvo-verified': 'var(--color-verified)',      /* #9ABC05 Kiwi */

        /* ── Semantic aliases — unchanged API from v3 ── */
        'primary':              'var(--color-primary)',
        'surface':              'var(--color-surface)',
        'surface-raised':       'var(--color-surface)',
        'content':              'var(--color-text-primary)',
        'content-secondary':    'var(--color-text-mid)',
        'content-dim':          'var(--color-text-dim)',
        'content-dim-accessible':'var(--color-text-mid)',
        'background-dark':      'var(--color-bg)',
        'forest':               'var(--color-primary)',
        'border-subtle':        'var(--color-border-subtle)',

        /* Backward compat aliases */
        'narvo-bg':           'var(--color-bg)',
        'narvo-border':       'var(--color-border)',
        'narvo-primary':      'var(--color-primary)',
        'narvo-text':         'var(--color-text-primary)',
        'narvo-text-secondary':'var(--color-text-mid)',
        'narvo-text-dim':     'var(--color-text-dim)',

        /* ── Warm neutral scale ── */
        'neutral-900': 'var(--neutral-900)',
        'neutral-800': 'var(--neutral-800)',
        'neutral-700': 'var(--neutral-700)',
        'neutral-600': 'var(--neutral-600)',
        'neutral-500': 'var(--neutral-500)',
        'neutral-400': 'var(--neutral-400)',
        'neutral-300': 'var(--neutral-300)',
        'neutral-200': 'var(--neutral-200)',
        'neutral-100': 'var(--neutral-100)',
        'neutral-50':  'var(--neutral-50)',

        /* ── Category label palette (v3 — kept for compat) ── */
        'label-finance':  '#EBD5AB',
        'label-environ':  '#93C5FD',
        'label-tech':     '#D8B4FE',
        'label-urgent':   '#FCA5A5',
        'label-politics': '#FDBA74',
        'label-science':  '#5EEAD4',
        'label-culture':  '#F472B6',
        'label-sports':   '#FB923C',
        'label-health':   '#4ADE80',
        'label-security': '#94A3B8',
        'label-opinion':  '#A8A29E',
        'label-legal':    '#818CF8',
      },

      fontFamily: {
        /* v4 type system — three layers, no overlap */
        'display': ['Fraunces', 'Georgia', 'serif'],           /* Headlines H1-H4 */
        'body':    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'], /* Body, nav, buttons */
        'mono':    ['Geist Mono', 'Courier New', 'monospace'],  /* Labels, stamps, meta */
        'header':  ['Fraunces', 'Georgia', 'serif'],            /* Alias for display */
      },

      borderRadius: {
        /*
         * LEGACY v2 Swiss Grid values — kept to avoid breaking existing components.
         * All named tokens remain 0px. v4 components use arbitrary values only.
         *
         * v4 arbitrary value reference:
         *   rounded-[8px]    → --radius-sm  (tags, inputs)
         *   rounded-[12px]   → --radius-md  (standard elements)
         *   rounded-[16px]   → --radius-lg  (standard cards)
         *   rounded-[20px]   → --radius-xl  (featured cards, modals)
         *   rounded-[24px]   → --radius-2xl (hero sections)
         *   rounded-full     → 9999px       (pill buttons, avatars)
         */
        'none':    '0',
        'DEFAULT': '0',
        'sm':      '0',
        'md':      '0',
        'lg':      '0',     /* ← 0px NOT 8px — use rounded-[16px] for cards */
        'xl':      '0',
        '2xl':     '0',
        '3xl':     '0',
        'full':    '9999px', /* ← pill shapes — this one is correct */
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
        'header-desktop':  'var(--header-h)',
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
