import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Deliberate: this site computes browser-only values (today's date in the restaurant's
      // timezone, saved guest details, fetch state) in effects after mount so that cached
      // pages never ship a stale or hydration-mismatched value.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "generated/**", ".pgdata/**", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
