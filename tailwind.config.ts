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
          DEFAULT: "var(--bg-cream)",
          50: "var(--bg-cream-50)",
          100: "var(--bg-cream-100)",
          200: "var(--bg-cream-200)",
        },

        // ========= Primary Text (Charcoal / Sand) =========
        // Light: near-black charcoal (#1A1A1A) — 15.9:1 on sand
        // Dark: sand/canvas (#F5F0E8) — 14.8:1 on charcoal
        espresso: {
          DEFAULT: "var(--text-espresso)",
          50: "var(--text-espresso-50)",
          100: "var(--text-espresso-100)",
          200: "var(--text-espresso-200)",
          800: "var(--text-espresso-800)",
          900: "var(--text-espresso-900)",
        },

        // ========= Card Background =========
        // Light: white (#FFFFFF)
        // Dark: warm stone (#292524)
        card: {
          DEFAULT: "var(--bg-card)",
        },

        // ========= Border / Divider =========
        // Light: warm sand-tan (#C8BFB0)
        // Dark: warm stone (#44403C)
        latte: {
          DEFAULT: "var(--border-latte)",
          300: "var(--border-latte-300)",
          400: "var(--border-latte-400)",
          500: "var(--border-latte-500)",
          600: "var(--border-latte-600)",
          700: "var(--border-latte-700)",
        },

        // ========= Secondary Muted Text =========
        // Light: medium gray (#5A5A5A) — 5.4:1 on sand
        // Dark: warm stone gray (#A8A29E) — 7.5:1 on charcoal
        mocha: {
          DEFAULT: "var(--text-mocha)",
          300: "var(--text-mocha-300)",
          400: "var(--text-mocha-400)",
          500: "var(--text-mocha-500)",
          600: "var(--text-mocha-600)",
          700: "var(--text-mocha-700)",
        },

        // ========= Forest Green (Primary Accent) =========
        // Light: deep forest (#286849) — 4.8:1 on sand
        // Dark: bright green (#52B788) — 7.2:1 on charcoal
        // White text on light forest = 6.7:1 ✓
        forest: {
          DEFAULT: "var(--accent-forest)",
          300: "var(--accent-forest-300)",
          400: "var(--accent-forest-400)",
          500: "var(--accent-forest-500)",
          600: "var(--accent-forest-600)",
          700: "var(--accent-forest-700)",
        },

        // ========= Soft Accent (Sage Green) =========
        // Light: sage (#5E8A66) — 4.7:1 on sand
        // Dark: lighter sage (#78C480) — 9.0:1 on charcoal
        sage: {
          DEFAULT: "var(--accent-sage)",
          300: "var(--accent-sage-300)",
          400: "var(--accent-sage-400)",
          500: "var(--accent-sage-500)",
          600: "var(--accent-sage-600)",
        },

        // ========= Rust (Legacy alias → Forest) =========
        // Keep for backward compat: any existing `bg-rust` / `text-rust` maps to forest
        rust: {
          DEFAULT: "var(--accent-forest)",
          300: "var(--accent-forest-300)",
          400: "var(--accent-forest-400)",
          500: "var(--accent-forest-500)",
          600: "var(--accent-forest-600)",
          700: "var(--accent-forest-700)",
        },
      },
      fontFamily: {
        // Modernized typography
        heading: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Adding modern snappy shadows
        soft: "0 2px 10px rgba(0, 0, 0, 0.06)",
        hover: "0 10px 25px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
