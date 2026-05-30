import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F172A",
          soft: "#1E293B",
          muted: "#475569",
          subtle: "#94A3B8",
        },
        canvas: {
          DEFAULT: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        brand: {
          DEFAULT: "#0F172A",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        pop: "0 8px 24px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
