/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#F8FAFC',
        'bg-secondary': '#FFFFFF',
        'bg-card': '#FFFFFF',
        'bg-card-hover': '#F1F5F9',
        'accent-primary': '#E11D48',
        'accent-secondary': '#475569',
        'success': '#059669',
        'warning': '#D97706',
        'danger': '#DC2626',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-muted': '#64748B',
        'border': '#E2E8F0',
        'border-strong': '#CBD5E1',
      },
      fontFamily: {
        primary: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 4px 14px rgba(225, 29, 72, 0.15)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        panel: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
