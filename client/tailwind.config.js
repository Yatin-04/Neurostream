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
        'neuro-bg':      '#0a0a0f',   // Very dark blue-black — primary background
        'neuro-surface': '#12121a',   // Slightly lighter — cards, panels
        'neuro-border':  '#1e1e2e',   // Subtle borders
        'neuro-accent':  '#6366f1',   // Indigo accent — buttons, highlights
        'neuro-success': '#22c55e',   // Green — 'attentive' state
        'neuro-danger':  '#ef4444',   // Red — 'inattentive' state
        'neuro-text':    '#e2e8f0',   // Light text — primary readable text
        'neuro-muted':   '#64748b',   // Muted text — secondary information
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};
