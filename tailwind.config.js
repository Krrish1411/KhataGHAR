/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PaisaBook Semantic Theme Tokens
        ink: 'var(--color-ink)',
        moss: 'var(--color-moss)',
        card: 'var(--color-card)',
        line: 'var(--color-line)',

        // Emerald / Pine (Money In / Assets / Positive)
        pine: {
          50: '#eef7f1',
          100: '#d9eee2',
          200: '#b3dcc6',
          300: '#86c5a5',
          400: '#4fa881',
          500: '#228a61',
          600: '#12855a',
          700: '#0e5138',
          800: '#0b3d2e',
          900: '#082d22',
          950: '#052018',
        },

        // Marigold / Amber (Attention / Commitments / Alerts)
        mari: {
          50: '#fef8ec',
          100: '#fcefd3',
          200: '#f9dea6',
          300: '#f3c76f',
          400: '#eda82c',
          500: '#e8940a',
          600: '#c47a05',
          700: '#97600a',
          800: '#6f4708',
        },

        // Flare / Rose (Debt / Overdue / Outflows)
        flare: {
          100: '#fbe3e7',
          200: '#f7c2cb',
          300: '#f097a8',
          400: '#e56782',
          500: '#d6455d',
          600: '#b93550',
          700: '#962a3d',
        },

        // Sky / Blue (Custodial / People / Lent / Borrowed)
        skyx: {
          100: '#e2f0f9',
          200: '#bedef2',
          300: '#91c7e9',
          400: '#5da9dd',
          500: '#388dcb',
          600: '#2273a8',
          700: '#1b5c86',
        },

        // Backward compatibility
        brand: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#12855a',
          600: '#0e5138',
          700: '#0b3d2e',
          DEFAULT: '#12855a',
        },
        navy: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#334155',
          700: '#16201a',
          750: '#111915',
          800: '#0c120f',
          850: '#080d0a',
          900: '#060a08',
          950: '#040705',
        },
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['IBM Plex Sans', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 2px rgba(8, 45, 34, 0.05), 0 10px 30px -18px rgba(8, 45, 34, 0.25)',
        'hero': '0 10px 30px -5px rgba(14, 81, 56, 0.35)',
        'btn': '0 1px 2px rgba(8, 45, 34, 0.15)',
        'card-light': '0 1px 3px rgba(0, 0, 0, 0.04), 0 10px 30px -18px rgba(0, 0, 0, 0.12)',
        'card-dark': '0 0 0 1px rgba(255, 255, 255, 0.06), 0 4px 16px -2px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      maxWidth: {
        '8xl': '1536px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
