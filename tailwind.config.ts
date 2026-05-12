import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ========= Sand / Canvas Background =========
        // Light: warm sand (#F5F0E8)
        // Dark: warm charcoal (#1C1917)
        cream: {
          DEFAULT: "rgb(var(--bg-cream) / <alpha-value>)",
          50: "rgb(var(--bg-cream-50) / <alpha-value>)",
          100: "rgb(var(--bg-cream-100) / <alpha-value>)",
          200: "rgb(var(--bg-cream-200) / <alpha-value>)",
        },

        // ========= Primary Text (Charcoal / Sand) =========
        // Light: near-black charcoal (#1A1A1A) -- 15.9:1 on sand
        // Dark: sand/canvas (#F5F0E8) -- 14.8:1 on charcoal
        espresso: {
          DEFAULT: "rgb(var(--text-espresso) / <alpha-value>)",
          50: "rgb(var(--text-espresso-50) / <alpha-value>)",
          100: "rgb(var(--text-espresso-100) / <alpha-value>)",
          200: "rgb(var(--text-espresso-200) / <alpha-value>)",
          800: "rgb(var(--text-espresso-800) / <alpha-value>)",
          900: "rgb(var(--text-espresso-900) / <alpha-value>)",
        },

        // ========= Card Background =========
        // Light: white (#FFFFFF)
        // Dark: warm stone (#292524)
        card: {
          DEFAULT: "rgb(var(--bg-card) / <alpha-value>)",
        },

        // ========= Border / Divider =========
        // Light: warm sand-tan (#C8BFB0)
        // Dark: warm stone (#44403C)
        latte: {
          DEFAULT: "rgb(var(--border-latte) / <alpha-value>)",
          300: "rgb(var(--border-latte-300) / <alpha-value>)",
          400: "rgb(var(--border-latte-400) / <alpha-value>)",
          500: "rgb(var(--border-latte-500) / <alpha-value>)",
          600: "rgb(var(--border-latte-600) / <alpha-value>)",
          700: "rgb(var(--border-latte-700) / <alpha-value>)",
        },

        // ========= Secondary Muted Text =========
        // Light: medium gray (#5A5A5A) -- 5.4:1 on sand
        // Dark: warm stone gray (#A8A29E) -- 7.5:1 on charcoal
        mocha: {
          DEFAULT: "rgb(var(--text-mocha) / <alpha-value>)",
          300: "rgb(var(--text-mocha-300) / <alpha-value>)",
          400: "rgb(var(--text-mocha-400) / <alpha-value>)",
          500: "rgb(var(--text-mocha-500) / <alpha-value>)",
          600: "rgb(var(--text-mocha-600) / <alpha-value>)",
          700: "rgb(var(--text-mocha-700) / <alpha-value>)",
        },

        // ========= Forest Green (Primary Accent) =========
        // Light: deep forest (#286849) -- 4.8:1 on sand
        // Dark: bright green (#52B788) -- 7.2:1 on charcoal
        // White text on light forest = 6.7:1
        forest: {
          DEFAULT: "rgb(var(--accent-forest) / <alpha-value>)",
          300: "rgb(var(--accent-forest-300) / <alpha-value>)",
          400: "rgb(var(--accent-forest-400) / <alpha-value>)",
          500: "rgb(var(--accent-forest-500) / <alpha-value>)",
          600: "rgb(var(--accent-forest-600) / <alpha-value>)",
          700: "rgb(var(--accent-forest-700) / <alpha-value>)",
        },

        // ========= Soft Accent (Sage Green) =========
        // Light: sage (#5E8A66) -- 4.7:1 on sand
        // Dark: lighter sage (#78C480) -- 9.0:1 on charcoal
        sage: {
          DEFAULT: "rgb(var(--accent-sage) / <alpha-value>)",
          300: "rgb(var(--accent-sage-300) / <alpha-value>)",
          400: "rgb(var(--accent-sage-400) / <alpha-value>)",
          500: "rgb(var(--accent-sage-500) / <alpha-value>)",
          600: "rgb(var(--accent-sage-600) / <alpha-value>)",
        },

        // ========= Rust (Legacy alias to Forest) =========
        // Keep for backward compat: existing bg-rust / text-rust maps to forest
        rust: {
          DEFAULT: "rgb(var(--accent-forest) / <alpha-value>)",
          300: "rgb(var(--accent-forest-300) / <alpha-value>)",
          400: "rgb(var(--accent-forest-400) / <alpha-value>)",
          500: "rgb(var(--accent-forest-500) / <alpha-value>)",
          600: "rgb(var(--accent-forest-600) / <alpha-value>)",
          700: "rgb(var(--accent-forest-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        heading: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.06)",
        hover: "0 10px 25px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
