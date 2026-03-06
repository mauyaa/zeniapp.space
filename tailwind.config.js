/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Use class strategy so ThemeProvider's `document.documentElement.classList.add('dark')`
  // activates all `dark:` utility variants consistently across the app.
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        zeni: {
          background: '#F8F9FA',
          surface: '#FFFFFF',
          foreground: '#09090B',
          /* Bumped from zinc-500 to zinc-600 for WCAG AA compliance */
          muted: '#52525B',
          border: 'hsl(var(--zeni-border, 220 13% 91%))',
          'border-strong': '#E4E4E7',
          /* Slightly darker green for better contrast on light bg */
          'signal-live': '#16A34A',
          'signal-unread': '#DC2626',
          'signal-warning': '#D97706',
        },
        border: 'hsl(var(--zeni-border, 220 13% 91%))',
        background: '#F8F9FA',
        foreground: '#09090B',
      },
      /* Single radius scale: rounded-xl (0.75rem) everywhere for consistency */
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        md: '0.75rem',
        lg: '0.75rem',
        xl: '0.75rem',
        '2xl': '0.75rem',
      },
      letterSpacing: {
        widest: '0.15em',
        ultra: '0.2em',
      },
      boxShadow: {
        'zeni-card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'zeni-card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
      transitionDuration: {
        zeni: '200ms',
      },
    },
  },
  plugins: [
    /* Accessible state variants for ARIA attributes */
    function ({ addVariant }) {
      addVariant('aria-selected', '&[aria-selected="true"]');
      addVariant('aria-current', '&[aria-current="page"]');
      addVariant('aria-expanded', '&[aria-expanded="true"]');
      addVariant('aria-disabled', '&[aria-disabled="true"]');
    },
  ],
};
