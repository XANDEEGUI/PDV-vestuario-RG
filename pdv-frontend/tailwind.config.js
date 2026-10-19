/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Canvas & Surfaces ──────────────────────────────────────
        canvas: '#FAF9F6',
        surface: '#F4F4F6',
        white: '#FFFFFF',

        // ── Primary (Midnight Navy) ────────────────────────────────
        navy: {
          DEFAULT: '#0A1128',
          deep:    '#0A1128',
          light:   '#0F172A',
          hover:   '#14213D',
          muted:   '#1E2D4F',
        },

        // ── Accent (Champagne Gold) ────────────────────────────────
        gold: {
          DEFAULT: '#C5A059',
          light:   '#D4AF37',
          pale:    '#E8D5A3',
          subtle:  '#F5EDD8',
        },

        // ── Borders & Dividers ─────────────────────────────────────
        border: {
          DEFAULT: '#E2E8F0',
          dark:    '#CBD5E1',
        },

        // ── Status ────────────────────────────────────────────────
        success: '#16A34A',
        danger:  '#DC2626',
        warning: '#D97706',
      },

      fontFamily: {
        // Títulos, totais e valores
        serif:  ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        // Tabelas, inputs, botões
        sans:   ['"Plus Jakarta Sans"', 'Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-xl': ['3rem',   { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.25rem',{ lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md': ['1.5rem', { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
      },

      boxShadow: {
        'luxury':   '0 1px 3px rgba(10,17,40,0.08), 0 4px 16px rgba(10,17,40,0.06)',
        'luxury-lg':'0 4px 24px rgba(10,17,40,0.12), 0 1px 4px rgba(10,17,40,0.08)',
        'gold':     '0 0 0 2px #C5A05940',
      },

      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },

      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
