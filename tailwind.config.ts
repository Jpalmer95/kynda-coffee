import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // ===========================================================
        // NEW SEMANTIC TOKENS (DESIGN.md v2 — standard names)
        // These are the preferred tokens for new code.
        // ===========================================================

        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",

        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },

        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },

        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },

        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },

        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },

        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },

        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },

        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",

        // ===========================================================
        // LEGACY TOKENS (keep existing components working)
        // Gradually migrate these to the semantic tokens above.
        // ===========================================================

        // Page Background (switches light<->dark)
        cream: {
          DEFAULT: "rgb(var(--bg-cream) / <alpha-value>)",
          50: "rgb(var(--bg-cream-50) / <alpha-value>)",
          100: "rgb(var(--bg-cream-100) / <alpha-value>)",
          200: "rgb(var(--bg-cream-200) / <alpha-value>)",
        },

        // Primary Text (switches light<->dark)
        espresso: {
          DEFAULT: "rgb(var(--text-espresso) / <alpha-value>)",
          50: "rgb(var(--text-espresso-50) / <alpha-value>)",
          100: "rgb(var(--text-espresso-100) / <alpha-value>)",
          200: "rgb(var(--text-espresso-200) / <alpha-value>)",
          800: "rgb(var(--text-espresso-800) / <alpha-value>)",
          900: "rgb(var(--text-espresso-900) / <alpha-value>)",
        },

        // Dark Container Surface (always dark in both modes)
        surface: {
          DEFAULT: "rgb(var(--bg-surface) / <alpha-value>)",
          800: "rgb(var(--bg-surface-800) / <alpha-value>)",
          sidebar: "rgb(var(--surface-sidebar) / <alpha-value>)",
          card: "rgb(var(--surface-card) / <alpha-value>)",
          deep: "rgb(var(--surface-deep) / <alpha-value>)",
        },

        // Borders (switches light<->dark)
        latte: {
          DEFAULT: "rgb(var(--border-latte) / <alpha-value>)",
          300: "rgb(var(--border-latte-300) / <alpha-value>)",
          400: "rgb(var(--border-latte-400) / <alpha-value>)",
          500: "rgb(var(--border-latte-500) / <alpha-value>)",
          600: "rgb(var(--border-latte-600) / <alpha-value>)",
          700: "rgb(var(--border-latte-700) / <alpha-value>)",
        },

        // Secondary Muted Text (switches light<->dark)
        mocha: {
          DEFAULT: "rgb(var(--text-mocha) / <alpha-value>)",
          300: "rgb(var(--text-mocha-300) / <alpha-value>)",
          400: "rgb(var(--text-mocha-400) / <alpha-value>)",
          500: "rgb(var(--text-mocha-500) / <alpha-value>)",
          600: "rgb(var(--text-mocha-600) / <alpha-value>)",
          700: "rgb(var(--text-mocha-700) / <alpha-value>)",
        },

        // Forest Green (switches light<->dark — primary accent)
        forest: {
          DEFAULT: "rgb(var(--accent-forest) / <alpha-value>)",
          300: "rgb(var(--accent-forest-300) / <alpha-value>)",
          400: "rgb(var(--accent-forest-400) / <alpha-value>)",
          500: "rgb(var(--accent-forest-500) / <alpha-value>)",
          600: "rgb(var(--accent-forest-600) / <alpha-value>)",
          700: "rgb(var(--accent-forest-700) / <alpha-value>)",
        },

        // Sage (switches light<->dark)
        sage: {
          DEFAULT: "rgb(var(--accent-sage) / <alpha-value>)",
          300: "rgb(var(--accent-sage-300) / <alpha-value>)",
          400: "rgb(var(--accent-sage-400) / <alpha-value>)",
          500: "rgb(var(--accent-sage-500) / <alpha-value>)",
          600: "rgb(var(--accent-sage-600) / <alpha-value>)",
        },

        // Bronze (static warm accent)
        bronze: {
          DEFAULT: "rgb(var(--accent-bronze) / <alpha-value>)",
          50: "#F5EDE4",
          100: "#E8D9C8",
          200: "#D4B999",
          300: "#C0996A",
          400: "#A67C52",
          500: "#8B6643",
          600: "#6F5035",
          700: "#523A27",
        },

        // Light text for dark surfaces (switches light<->dark)
        sand: {
          DEFAULT: "rgb(var(--text-sand) / <alpha-value>)",
          50: "rgb(var(--text-sand-50) / <alpha-value>)",
        },

        // Extended semantic tokens
        emerald: {
          DEFAULT: "rgb(var(--emerald-glow) / <alpha-value>)",
          dim: "rgb(var(--emerald-glow-dim) / <alpha-value>)",
        },
        outline: {
          DEFAULT: "rgb(var(--border-latte) / <alpha-value>)",
          variant: "rgb(var(--border-latte-300) / <alpha-value>)",
          dark: "rgb(var(--outline-dark) / <alpha-value>)",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "EB Garamond", "Georgia", "serif"],
        body: ["var(--font-body)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.06)",
        hover: "0 10px 25px rgba(0, 0, 0, 0.08)",
        glow: "0 0 20px rgba(180, 205, 184, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
