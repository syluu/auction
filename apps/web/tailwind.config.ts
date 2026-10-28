import type { Config } from 'tailwindcss';

/** Arena Live design tokens (docs/auction-ui-ux-proposals.html, Direction A). */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stage: '#0B0D17',
        surface: '#151A2E',
        line: '#2A3152',
        ink: '#F2F4FF',
        muted: '#8F98BD',
        lime: '#C6FF3D',
        cta: '#E11D48',
        hot: '#FF3D5A',
        ext: '#3DD9FF',
        lead: '#3DFFA8',
        gold: '#FFC53D',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        price: ['40px', { lineHeight: '1', fontWeight: '700' }],
        'price-md': ['32px', { lineHeight: '1', fontWeight: '700' }],
        'price-sm': ['24px', { lineHeight: '1', fontWeight: '700' }],
        label: ['11px', { lineHeight: '1.2', letterSpacing: '0.04em', fontWeight: '700' }],
      },
      keyframes: {
        flash: { '0%': { backgroundColor: 'rgba(198,255,61,0.35)' }, '100%': { backgroundColor: 'transparent' } },
        burst: { '0%': { transform: 'scale(0.6)', opacity: '0' }, '20%': { transform: 'scale(1.1)', opacity: '1' }, '80%': { transform: 'scale(1)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '0' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        slidein: { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        flash: 'flash 900ms ease-out',
        burst: 'burst 1800ms ease-out forwards',
        pulse2: 'pulse2 1s ease-in-out infinite',
        slidein: 'slidein 200ms ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
