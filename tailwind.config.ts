import type { Config } from "tailwindcss";

// Tokens match the approved prototype (court blue, ball yellow, live red).
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        court: { DEFAULT: "#1F4FD1", 2: "#15389C", 3: "#2C60E6" },
        ball: "#DDF33B",
        live: "#E5322D",
        pitch: "#1E7A46",
        ink: { DEFAULT: "#111111", 2: "#5E605B" },
        surface: { DEFAULT: "#F3F4F0", dark: "#17191A" },
        line: { DEFAULT: "#D6D8D1", dark: "#2C3031" },
      },
      fontFamily: { display: ["'Archivo'", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
