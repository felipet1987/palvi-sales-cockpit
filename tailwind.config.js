/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0b0d12', soft: '#11141b', card: '#151924' },
        ink: { DEFAULT: '#e6e9ef', muted: '#8b93a7', faint: '#5b6276' },
        border: { DEFAULT: '#1f2433', strong: '#2a3145' },
        ok: '#10b981',
        watch: '#f59e0b',
        alert: '#fb923c',
        crit: '#ef4444',
        accent: '#6366f1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
