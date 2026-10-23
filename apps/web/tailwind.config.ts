import type { Config } from 'tailwindcss';

/** Tokens mirror the CSS variables in src/app/globals.css (UI spec §1). */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ws: {
          black: 'var(--ws-black)',
          ink: 'var(--ws-ink-900)',
          yellow: 'var(--ws-yellow)',
          'yellow-soft': 'var(--ws-yellow-soft)',
          'yellow-line': 'var(--ws-yellow-line)',
          'on-yellow': 'var(--ws-on-yellow)',
          text: 'var(--ws-text)',
          'text-2': 'var(--ws-text-2)',
          'text-3': 'var(--ws-text-3)',
          placeholder: 'var(--ws-placeholder)',
          'glass-1': 'var(--ws-glass-1)',
          'glass-2': 'var(--ws-glass-2)',
          'glass-3': 'var(--ws-glass-3)',
          'glass-btn': 'var(--ws-glass-btn)',
          'glass-on': 'var(--ws-glass-on)',
          well: 'var(--ws-well)',
          'line-1': 'var(--ws-line-1)',
          'line-2': 'var(--ws-line-2)',
          'line-3': 'var(--ws-line-3)',
          rec: 'var(--ws-rec)',
        },
      },
      fontFamily: {
        sans: ["var(--font-givonic, 'Givonic')", "var(--font-outfit, 'Outfit')", 'system-ui', 'sans-serif'],
        mono: ["var(--font-geist-mono, 'Geist Mono')", 'ui-monospace', 'monospace'],
      },
      fontSize: {
        h1: ['76px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'h1-m': ['44px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '600' }],
        h2: ['44px', { lineHeight: '1.1', letterSpacing: '-0.035em', fontWeight: '600' }],
        'h2-m': ['30px', { lineHeight: '1.1', letterSpacing: '-0.035em', fontWeight: '600' }],
        card: ['22px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'card-m': ['18px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      borderRadius: {
        pill: '999px',
        shell: '32px',
        panel: '28px',
        card: '22px',
        control: '12px',
        swatch: '12px',
      },
      maxWidth: {
        container: '1280px',
        nav: '1120px',
        faq: '860px',
      },
      transitionTimingFunction: {
        sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
