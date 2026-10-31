import { existsSync, realpathSync } from "node:fs";
import { createRequire, isBuiltin } from "node:module";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";

const layers = ["app", "pages", "widgets", "features", "entities", "shared"];
const sliced = new Set(["pages", "widgets", "features", "entities"]);
const slash = (path) => path.split(sep).join("/");
const literal = (node) => node?.type === "Literal" && typeof node.value === "string"
  ? node.value
  : node?.type === "TemplateLiteral" && node.expressions.length === 0
    ? node.quasis[0].value.cooked
    : undefined;

// Kept inside each independent repository; no dependency on a sibling checkout.
export function createFsdPlugin({ root, entrypoints = ["main.tsx"], legacyFiles = [] }) {
  const src = realpathSync(resolve(root, "src"));
  const require = createRequire(resolve(root, "package.json"));
  const config = ts.readConfigFile(resolve(root, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
  const entries = new Set(entrypoints);
  const legacy = new Set(legacyFiles);
  const parts = (file) => slash(relative(src, file)).split("/");
  const inside = (file) => {
    const path = relative(src, file);
    return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
  };
  const unit = (path) => layers.includes(path[0])
    ? sliced.has(path[0]) || path[0] === "shared" ? path.slice(0, 2).join("/") : path[0]
    : null;

  return {
    rules: {
      imports: {
        meta: {
          type: "problem",
          docs: { description: "Enforce local aliases, FSD boundaries and slice public APIs" },
          schema: [],
          messages: {
            structure: "Use layer/slice/segment/file (with a slice index.ts) or layer/segment/file in app/shared.",
            unresolved: "Cannot resolve '{{path}}'. Check the module path and @/ alias.",
            outside: "Local imports must stay inside this repository's src: '{{path}}'.",
            alias: "Use @/ for imports outside the current slice (or app/shared unit): '{{path}}'.",
            relative: "Use a direct relative import inside the current slice (or app/shared unit): '{{path}}'.",
            boundary: "Dependencies must point down FSD layers; sibling slices are isolated: '{{path}}'.",
            publicApi: "Import a different slice through @/layer/slice, without a deep path: '{{path}}'.",
            selfApi: "Do not import the current unit's own index.ts; import the internal file directly.",
            entrypoint: "Technical entrypoints may only import app; FSD modules cannot import root entrypoints.",
            legacy: "New FSD modules cannot depend on legacy root files; migrate the responsibility first.",
            computed: "Use a literal module specifier so FSD boundaries can be checked.",
          },
        },
        create(context) {
          const file = resolve(context.filename);
          const from = parts(file);
          const name = from.join("/");
          const fromUnit = unit(from);
          const report = (node, messageId, path) => context.report({ node, messageId, data: { path } });

          function check(node) {
            const specifier = literal(node);
            if (specifier === undefined) return report(node, "computed");
            const local = specifier.startsWith(".") || specifier.startsWith("@/") || isAbsolute(specifier);
            if (!local && isBuiltin(specifier)) return;
            const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
            if (!local && resolved?.isExternalLibraryImport) return;
            // TypeScript does not resolve package CSS exports, but Node can.
            if (!local && !resolved) {
              try { require.resolve(specifier); return; } catch { return report(node, "unresolved", specifier); }
            }
            const raw = specifier.split(/[?#]/)[0];
            const target = resolved?.resolvedFileName ?? (raw.startsWith("@/")
              ? resolve(src, raw.slice(2)) : resolve(dirname(file), raw));
            if (!existsSync(target)) return report(node, "unresolved", specifier);
            const canonicalTarget = realpathSync(target);
            if (!inside(canonicalTarget)) return report(node, "outside", specifier);
            const to = parts(canonicalTarget);
            const targetName = to.join("/");
            const toUnit = unit(to);
            const sameUnit = fromUnit !== null && fromUnit === toUnit;
            if (sameUnit) {
              const ownIndex = `${fromUnit}/index.ts`;
              if (targetName === ownIndex) return report(node, "selfApi");
              if (!specifier.startsWith(".")) report(node, "relative", specifier);
              return;
            }
            if (!specifier.startsWith("@/")) report(node, "alias", specifier);
            if (entries.has(name)) {
              if (to[0] !== "app") report(node, "entrypoint");
              return;
            }
            // Explicit, finite migration baseline for Cart; never a blanket src/** exemption.
            if (legacy.has(name)) {
              if (!toUnit && !legacy.has(targetName)) report(node, "legacy");
              if (sliced.has(to[0]) && (targetName !== `${toUnit}/index.ts` || specifier !== `@/${toUnit}`)) {
                report(node, "publicApi", specifier);
              }
              return;
            }
            if (entries.has(targetName)) return report(node, "entrypoint");
            if (legacy.has(targetName)) return report(node, "legacy");
            if (!toUnit) return report(node, "structure");
            if (layers.indexOf(to[0]) <= layers.indexOf(from[0]) && !(from[0] === "shared" && to[0] === "shared")) {
              report(node, "boundary", specifier);
            }
            if (sliced.has(to[0]) && (targetName !== `${toUnit}/index.ts` || specifier !== `@/${toUnit}`)) {
              report(node, "publicApi", specifier);
            }
          }

          return {
            Program(node) {
              if (entries.has(name) || legacy.has(name)) return;
              const sliceIndex = `${fromUnit}/index.ts`;
              if (!fromUnit || (sliced.has(from[0])
                ? (from.length < 4 && name !== sliceIndex) || !existsSync(resolve(src, sliceIndex))
                : from.length < 3)) report(node, "structure");
            },
            ImportDeclaration: (node) => check(node.source),
            ExportNamedDeclaration: (node) => { if (node.source) check(node.source); },
            ExportAllDeclaration: (node) => check(node.source),
            ImportExpression: (node) => check(node.source),
            TSImportType: (node) => {
              const source = node.argument ?? node.source;
              check(source.type === "TSLiteralType" ? source.literal : source);
            },
            TSImportEqualsDeclaration: (node) => {
              if (node.moduleReference.type === "TSExternalModuleReference") check(node.moduleReference.expression);
            },
            CallExpression(node) {
              if (node.callee.type === "Identifier" && node.callee.name === "require") {
                if (node.arguments[0]) check(node.arguments[0]);
                else report(node, "computed");
              }
            },
          };
        },
      },
    },
  };
}
