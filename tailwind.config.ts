import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Redefined "cream" to meaning "base background" (light cool grey)
        // keeping the name so we don't break existing 590+ `bg-cream` references
        cream: {
          DEFAULT: "#f4f4f5", // zinc-100 equivalent
          50: "#fafafa",      // zinc-50
          100: "#f4f4f5",
          200: "#e4e4e7",     // zinc-200
        },
        // Redefined "espresso" to meaning "base foreground text" (charcoal / near-black)
        // keeping the name so we don't break existing 590+ `text-espresso` references
        espresso: {
          DEFAULT: "#18181b", // zinc-900 equivalent
          50: "#52525b",      // zinc-600
          100: "#3f3f46",     // zinc-700
          200: "#27272a",     // zinc-800
          800: "#09090b",     // zinc-950
          900: "#000000",
        },
        // Accent/Border neutral (zinc-400/500/600)
        latte: {
          DEFAULT: "#a1a1aa", // zinc-400
          300: "#d4d4d8",     // zinc-300
          400: "#a1a1aa",     // zinc-400
          500: "#71717a",     // zinc-500
          600: "#52525b",     // zinc-600
          700: "#3f3f46",     // zinc-700
        },
        // Secondary accent neutral 
        mocha: {
          DEFAULT: "#52525b", // zinc-600
          300: "#a1a1aa",
          400: "#71717a",
          500: "#52525b",
          600: "#3f3f46",
          700: "#27272a",
        },
        // Soft accent (maybe keep a subtle muted blue-grey for "sage")
        sage: {
          DEFAULT: "#94a3b8", // slate-400
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
        },
        // Action/Primary accent (keep a clean modern blue or sleek dark grey, using blue here for "rust" replacement)
        rust: {
          DEFAULT: "#3b82f6", // blue-500
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
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
        "soft": "0 2px 10px rgba(0, 0, 0, 0.05)",
        "hover": "0 10px 25px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
