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
          bg:      '#12151a',
          surface: '#1a1e25',
          card:    '#21262e',
          border:  '#2e3440',
          text:    '#f5f5f5',
          muted:   '#8b919a',
          dim:     '#505868',
          accent:  '#00d4ff',
          cyan:    '#00d4ff',
          orange:  '#ff6600',
          gold:    '#ffd700',
          green:   '#00ff88',
          red:     '#ff3b30',
          amber:   '#ffb800',
          emerald: '#10b981',
        },
      },
      borderRadius: {
        'nxt-sm': '12px',
        'nxt-md': '16px',
        'nxt-lg': '20px',
        'nxt-xl': '24px',
      },
      fontFamily: {
        grotesk: ['var(--font-space-grotesk)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', "'JetBrains Mono'", "'Courier New'", 'monospace'],
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        scan: 'scan 1.5s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'fade-up-1': 'fade-up 0.5s ease-out 0.05s forwards',
        'fade-up-2': 'fade-up 0.5s ease-out 0.1s forwards',
        'fade-up-3': 'fade-up 0.5s ease-out 0.15s forwards',
        'fade-up-4': 'fade-up 0.5s ease-out 0.2s forwards',
        'fade-up-5': 'fade-up 0.5s ease-out 0.25s forwards',
        'fade-up-6': 'fade-up 0.5s ease-out 0.3s forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-in': 'slide-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
