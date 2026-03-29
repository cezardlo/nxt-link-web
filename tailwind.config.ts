import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        nxt: {
          bg:       '#0a0a0f',
          surface:  '#111118',
          card:     '#18181f',
          elevated: '#1e1e27',
          border:   '#27272f',
          'border-subtle': '#1f1f28',
          text:     '#ededef',
          secondary:'#a0a0ab',
          muted:    '#6b6b76',
          dim:      '#45454d',
          accent:   '#6366f1',
          'accent-light': '#818cf8',
          green:    '#22c55e',
          red:      '#ef4444',
          amber:    '#f59e0b',
          orange:   '#f97316',
          cyan:     '#06b6d4',
          emerald:  '#10b981',
          gold:     '#eab308',
          purple:   '#a855f7',
        },
      },
      borderRadius: {
        'nxt-sm': '8px',
        'nxt-md': '12px',
        'nxt-lg': '16px',
        'nxt-xl': '20px',
      },
      fontFamily: {
        grotesk: ['var(--font-space-grotesk)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', "'JetBrains Mono'", "'Courier New'", 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'fade-up-1': 'fade-up 0.5s ease-out 0.06s forwards',
        'fade-up-2': 'fade-up 0.5s ease-out 0.12s forwards',
        'fade-up-3': 'fade-up 0.5s ease-out 0.18s forwards',
        'fade-up-4': 'fade-up 0.5s ease-out 0.24s forwards',
        'fade-up-5': 'fade-up 0.5s ease-out 0.3s forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
