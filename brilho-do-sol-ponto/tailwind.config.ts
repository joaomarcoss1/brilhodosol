import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf2",
          100: "#d5f5df",
          200: "#aeebc3",
          300: "#73d99a",
          400: "#35bd69",
          500: "#149e49",
          600: "#078d3a",
          700: "#06672e",
          800: "#075126",
          900: "#064320"
        },
        sun: {
          50: "#fff9db",
          100: "#fff0a3",
          200: "#ffe065",
          300: "#ffd13a",
          400: "#ffc107",
          500: "#e0a900"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(6, 67, 32, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
