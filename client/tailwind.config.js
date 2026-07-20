/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neuro-bg':      '#09090b',   // Deep void
        'neuro-surface': '#18181b',   // Darker surface
        'neuro-border':  '#27272a',   // Subtle borders
        'neuro-accent':  '#06b6d4',   // Synapse Cyan
        'neuro-indigo':  '#4f46e5',   // Deep Indigo
        'neuro-magenta': '#d946ef',   // Neural Magenta
        'neuro-success': '#22c55e',   // Green
        'neuro-danger':  '#ef4444',   // Red
        'neuro-text':    '#f8fafc',   // Crisp white text
        'neuro-muted':   '#94a3b8',   // Slate muted text
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':      'float 6s ease-in-out infinite',
        'blob-spin':  'blob-spin 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        'blob-spin': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        }
      },
    },
  },
  plugins: [],
};
