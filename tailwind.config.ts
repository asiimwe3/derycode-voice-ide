import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ide-bg": "var(--ide-bg)",
        "ide-surface": "var(--ide-surface)",
        "ide-surface-hover": "var(--ide-surface-hover)",
        "ide-border": "var(--ide-border)",
        "ide-accent": "var(--ide-accent)",
        "ide-accent-hover": "var(--ide-accent-hover)",
        "ide-text": "var(--ide-text)",
        "ide-muted": "var(--ide-muted)",
        "ide-danger": "var(--ide-danger)",
        "ide-success": "var(--ide-success)",
        "ide-warning": "var(--ide-warning)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        "slide-up": "slide-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
