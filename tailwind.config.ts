import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#faf7f2",
          50: "#fdfcfa",
          100: "#faf7f2",
          200: "#f5efe5",
        },
        espresso: {
          DEFAULT: "#2c1810",
          50: "#5a4a42",
          100: "#4d3d35",
          200: "#3f3028",
          800: "#1e1009",
          900: "#100805",
        },
        latte: {
          DEFAULT: "#c4a882",
          300: "#d4bfa0",
          400: "#ccb391",
          500: "#c4a882",
          600: "#a8926e",
          700: "#8c7c5a",
        },
        mocha: {
          DEFAULT: "#8b6f4e",
          300: "#a8926e",
          400: "#9a8060",
          500: "#8b6f4e",
          600: "#6e5840",
          700: "#514132",
        },
        sage: {
          DEFAULT: "#a8b5a0",
          300: "#c2ccbc",
          400: "#b5c0ae",
          500: "#a8b5a0",
          600: "#8a9a82",
        },
        rust: {
          DEFAULT: "#c4724e",
          300: "#d4916f",
          400: "#cc815f",
          500: "#c4724e",
          600: "#a85e3e",
          700: "#8c4a2e",
        },
      },
      fontFamily: {
        heading: ["Playfair Display", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
