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
        neuro: {
          bg: '#111113', // Deep charcoal/warm black
          surface: '#1C1C1F', // Slightly elevated surface
          border: '#2E2E32', // Subtle borders
          accent: '#E87A5D', // Warm Terracotta/Coral for human touch
          text: '#F5F5F4', // Soft stone white
          muted: '#A8A29E', // Warm gray
          danger: '#ef4444',
          success: '#22c55e',
          warning: '#eab308',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
