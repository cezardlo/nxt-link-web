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
          bg:      '#0d0f12',
          surface: '#131519',
          card:    '#181b20',
          border:  '#232730',
          text:    '#f0f0f0',
          muted:   '#6b7280',
          dim:     '#3a3f4b',
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
