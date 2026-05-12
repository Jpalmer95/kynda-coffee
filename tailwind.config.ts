import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ========= Page Background (switches light<->dark) =========
        cream: {
          DEFAULT: "rgb(var(--bg-cream) / <alpha-value>)",
          50: "rgb(var(--bg-cream-50) / <alpha-value>)",
          100: "rgb(var(--bg-cream-100) / <alpha-value>)",
          200: "rgb(var(--bg-cream-200) / <alpha-value>)",
        },

        // ========= Primary Text (switches light<->dark) =========
        espresso: {
          DEFAULT: "rgb(var(--text-espresso) / <alpha-value>)",
          50: "rgb(var(--text-espresso-50) / <alpha-value>)",
          100: "rgb(var(--text-espresso-100) / <alpha-value>)",
          200: "rgb(var(--text-espresso-200) / <alpha-value>)",
          800: "rgb(var(--text-espresso-800) / <alpha-value>)",
          900: "rgb(var(--text-espresso-900) / <alpha-value>)",
        },

        // ========= Card Surface (switches light<->dark) =========
        card: { DEFAULT: "rgb(var(--bg-card) / <alpha-value>)" },

        // ========= Dark Container Surface (always dark, both modes) =========
        surface: {
          DEFAULT: "rgb(var(--bg-surface) / <alpha-value>)",
          800: "rgb(var(--bg-surface-800) / <alpha-value>)",
        },

        // ========= Border (switches light<->dark) =========
        latte: {
          DEFAULT: "rgb(var(--border-latte) / <alpha-value>)",
          300: "rgb(var(--border-latte-300) / <alpha-value>)",
          400: "rgb(var(--border-latte-400) / <alpha-value>)",
          500: "rgb(var(--border-latte-500) / <alpha-value>)",
          600: "rgb(var(--border-latte-600) / <alpha-value>)",
          700: "rgb(var(--border-latte-700) / <alpha-value>)",
        },

        // ========= Secondary Muted Text (switches light<->dark) =========
        mocha: {
          DEFAULT: "rgb(var(--text-mocha) / <alpha-value>)",
          300: "rgb(var(--text-mocha-300) / <alpha-value>)",
          400: "rgb(var(--text-mocha-400) / <alpha-value>)",
          500: "rgb(var(--text-mocha-500) / <alpha-value>)",
          600: "rgb(var(--text-mocha-600) / <alpha-value>)",
          700: "rgb(var(--text-mocha-700) / <alpha-value>)",
        },

        // ========= Forest Green (switches light<->dark) =========
        forest: {
          DEFAULT: "rgb(var(--accent-forest) / <alpha-value>)",
          300: "rgb(var(--accent-forest-300) / <alpha-value>)",
          400: "rgb(var(--accent-forest-400) / <alpha-value>)",
          500: "rgb(var(--accent-forest-500) / <alpha-value>)",
          600: "rgb(var(--accent-forest-600) / <alpha-value>)",
          700: "rgb(var(--accent-forest-700) / <alpha-value>)",
        },

        // ========= Sage (switches light<->dark) =========
        sage: {
          DEFAULT: "rgb(var(--accent-sage) / <alpha-value>)",
          300: "rgb(var(--accent-sage-300) / <alpha-value>)",
          400: "rgb(var(--accent-sage-400) / <alpha-value>)",
          500: "rgb(var(--accent-sage-500) / <alpha-value>)",
          600: "rgb(var(--accent-sage-600) / <alpha-value>)",
        },

        // ========= Light text for dark surfaces (always #F5F0E8) =========
        // Used as text-sand on bg-surface. This NEVER switches modes.
        sand: {
          DEFAULT: "rgb(var(--text-cream) / <alpha-value>)",
          50: "rgb(var(--text-cream-50) / <alpha-value>)",
        },

        // ========= Rust (legacy alias to forest) =========
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
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.06)",
        hover: "0 10px 25px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
