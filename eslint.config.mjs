import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...(Array.isArray(nextTypescript) ? nextTypescript : [nextTypescript]),
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React hooks — turn off noisy rules
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "warn",
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // TypeScript rules — relax for existing codebase
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      // Core JS
      "prefer-const": "warn",
    },
  },
  {
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "supabase/",
      ".hermes/",
    ],
  },
];

export default eslintConfig;
