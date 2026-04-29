/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Instrument Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Instrument Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        border:      'rgb(var(--border) / <alpha-value>)',
        input:       'rgb(var(--input) / <alpha-value>)',
        ring:        'rgb(var(--ring) / <alpha-value>)',
        background:  'rgb(var(--background) / <alpha-value>)',
        foreground:  'rgb(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT:    'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:    'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:    'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT:    'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT:    'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT:    'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT:    'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT:          'rgb(var(--sidebar-background) / <alpha-value>)',
          foreground:       'rgb(var(--sidebar-foreground) / <alpha-value>)',
          primary:          'rgb(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'rgb(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent:           'rgb(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'rgb(var(--sidebar-accent-foreground) / <alpha-value>)',
          border:           'rgb(var(--sidebar-border) / <alpha-value>)',
          ring:             'rgb(var(--sidebar-ring) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
