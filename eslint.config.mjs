import { fileURLToPath } from "node:url";
import parser from "@typescript-eslint/parser";
import { createFsdPlugin } from "./scripts/eslint/fsd.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));

export default [
  { ignores: ["node_modules/**", "dist/**", "vendor/**", "playwright-report/**", "test-results/**"] },
  {
    files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { fsd: createFsdPlugin({ root }) },
    rules: { "fsd/imports": "error" },
  },
];
