import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        // modern-animated-sign-in tokens (resolve via .signin-surface scope)
        skeleton: "var(--skeleton)",
        border: "var(--btn-border)",
        input: "var(--input)",
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
        // Design System & App Spec v1.0 tokens (violet, light content + dark
        // sidebar). Use `spec-*` when building/reskinning toward the spec.
        // See vault/Design-System.md.
        spec: {
          violet:      '#6C5CE0',
          'violet-deep':'#4A3DB0',
          lilac:       '#A99DF2',
          slate:       '#3B3A4A',
          ink:         '#141320',
          'text-2nd':  '#615F72',
          surface:     '#EFEDF5',
          border:      '#E2DFEC',
          'warm-white':'#F8F7FB',
          success:     '#2F9E6A',
          warning:     '#C68A28',
          error:       '#CE4B43',
        },
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        'nxt-sm': '8px',
        'nxt-md': '12px',
        'nxt-lg': '16px',
        'nxt-xl': '20px',
        // Spec radii: cards 8/12/16, buttons 10.
        'spec-btn': '10px',
        'spec-sm': '8px',
        'spec-md': '12px',
        'spec-lg': '16px',
      },
      boxShadow: {
        input: [
          "0px 2px 3px -1px rgba(0, 0, 0, 0.1)",
          "0px 1px 0px 0px rgba(25, 28, 33, 0.02)",
          "0px 0px 0px 1px rgba(25, 28, 33, 0.08)",
        ].join(", "),
      },
      fontFamily: {
        grotesk: ['var(--font-space-grotesk)', 'system-ui', '-apple-system', 'sans-serif'],
        // Spec body font — IBM Plex Sans (falls back gracefully if not loaded).
        plex: ["'IBM Plex Sans'", 'var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
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
        ripple: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
          '50%': { transform: 'translate(-50%, -50%) scale(0.9)' },
        },
        orbit: {
          '0%': {
            transform:
              'rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)',
          },
          '100%': {
            transform:
              'rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)',
          },
        },
      },
      animation: {
        ripple: 'ripple 2s ease calc(var(--i, 0) * 0.2s) infinite',
        orbit: 'orbit calc(var(--duration) * 1s) linear infinite',
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
