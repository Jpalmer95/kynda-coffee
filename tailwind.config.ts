import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "var(--color-cream)",
        espresso: "var(--color-espresso)",
        latte: "var(--color-latte)",
        mocha: "var(--color-mocha)",
        sage: "var(--color-sage)",
        rust: "var(--color-rust)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
