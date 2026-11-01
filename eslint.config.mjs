import { fileURLToPath } from "node:url";
import parser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";

const root = fileURLToPath(new URL(".", import.meta.url));
const layers = ["app", "pages", "widgets", "features", "entities", "shared"];
const sliced = ["pages", "widgets", "features", "entities"];
const entrypoints = ["main.tsx"];
const legacyFiles = [];
const relativeSource = "+([.]/|[.][.]/)**";
const publicTarget = (layer) => ({
  to: { element: { type: layer, fileInternalPath: "index.ts" } },
  dependency: { source: `@/${layer}/{{ to.element.captured.slice }}` },
});
const sharedTarget = { to: { element: { type: "shared" } }, dependency: { source: "@/shared/**" } };

export default [
  { ignores: ["node_modules/**", "dist/**", "vendor/**", "playwright-report/**", "test-results/**"] },
  {
    files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": root,
      "boundaries/flag-as-external": { outsideRootPath: false, unresolvableAlias: false },
      "import/resolver": { typescript: { project: fileURLToPath(new URL("tsconfig.json", import.meta.url)) } },
      "boundaries/elements": [
        { type: "app", pattern: "src/app", partialMatch: false },
        ...sliced.map((type) => ({ type, pattern: `src/${type}/*`, capture: ["slice"], partialMatch: false })),
        { type: "shared", pattern: "src/shared/*", capture: ["segment"], partialMatch: false },
      ],
      "boundaries/files": [
        ...entrypoints.map((file) => ({ category: "entrypoint", pattern: `src/${file}` })),
        ...legacyFiles.map((file) => ({ category: "legacy", pattern: `src/${file}` })),
      ],
      "boundaries/additional-dependency-nodes": [
        { selector: "TSImportType > Literal", kind: "type", name: "import-type" },
        { selector: "TSExternalModuleReference > Literal", kind: "value", name: "import-equals" },
      ],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/no-ignored-dependencies": "error",
      "boundaries/dependencies": ["error", {
        default: "disallow",
        checkInternals: true,
        checkUnknownLocals: true,
        policies: [
          // Within one slice, app, or Shared segment: direct relative imports.
          {
            allow: {
              to: { element: { path: "{{ from.element.path }}", isUnknown: false } },
              dependency: { source: relativeSource },
            },
          },
          // Between layers: only downward, with a slice's public API.
          ...layers.map((layer, index) => ({
            from: { element: { type: layer } },
            allow: layers.slice(index + 1).map((lower) => lower === "shared" ? sharedTarget : publicTarget(lower)),
          })).filter((policy) => policy.allow.length),
          { from: { element: { type: "shared" } }, allow: sharedTarget },
          // Shared segments also use relative paths internally.
          {
            from: { element: { type: "shared" } },
            disallow: {
              to: { element: { path: "{{ from.element.path }}" } },
              dependency: { source: "@/**" },
            },
          },
          {
            from: { element: { type: [...sliced, "shared"] } },
            disallow: { to: { element: { path: "{{ from.element.path }}", fileInternalPath: "index.ts" } } },
          },
          {
            from: { file: { categories: "entrypoint" } },
            allow: { to: { element: { type: "app" } }, dependency: { source: "@/app/**" } },
          },
          {
            from: { file: { categories: "legacy" } },
            allow: [
              ...sliced.map(publicTarget), sharedTarget,
              { to: { element: { type: "app" } }, dependency: { source: "@/app/**" } },
              { to: { file: { categories: "legacy" } }, dependency: { source: "@/**" } },
            ],
          },
        ],
      }],
      "no-restricted-syntax": ["error",
        { selector: "ImportExpression[source.type!='Literal']", message: "Use a string literal so architectural boundaries can be checked." },
        { selector: "CallExpression[callee.name='require']:not([arguments.0.type='Literal'])", message: "Use a string literal so architectural boundaries can be checked." },
      ],
    },
  },
  {
    files: ["src/{pages,widgets,features,entities}/*/*.{js,jsx,ts,tsx}", "src/{app,shared}/*.{js,jsx,ts,tsx}"],
    ignores: ["src/{pages,widgets,features,entities}/*/index.ts"],
    rules: { "no-restricted-syntax": ["error", { selector: "Program", message: "Place source files inside an FSD segment; only a slice's public index.ts belongs directly in the slice." }] },
  },
];
