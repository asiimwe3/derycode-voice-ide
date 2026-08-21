import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ide-bg": "#1e1e2e",
        "ide-surface": "#313244",
        "ide-border": "#45475a",
        "ide-accent": "#89b4fa",
        "ide-text": "#cdd6f4",
        "ide-muted": "#a6adc8",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
