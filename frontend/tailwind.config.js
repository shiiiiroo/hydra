/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        status: {
          ok: '#22c55e', okDark: '#16a34a',
          watch: '#0ea5e9', watchDark: '#0284c7',
          repair: '#f97316', repairDark: '#ea580c',
          critical: '#ef4444', criticalDark: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
      },
    },
  },
  plugins: [],
}
