import next from "eslint-config-next";

export default [
  ...next,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Next.js
      "@next/next/no-img-element": "off",
      // React
      "react/no-unescaped-entities": "off",
      // React hooks — relax Next.js defaults
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/globals": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/config": "off",
      "react-hooks/gating": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/unsupported-syntax": "off",
      // Core JS
      "prefer-const": "warn",
    },
  },
  {
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      "supabase/",
      ".hermes/",
    ],
  },
];
