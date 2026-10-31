import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { ESLint } from "eslint";
import config from "../../eslint.config.mjs";

// Exercise this repository's configuration, not the implementation of the plugin.
const root = mkdtempSync(join(tmpdir(), "fsd-config-"));
after(() => { assert.equal(dirname(root), tmpdir()); rmSync(root, { recursive: true, force: true }); });
function write(file, content = "export const value = 1;\n") {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
write("tsconfig.json", JSON.stringify({ compilerOptions: { module: "ESNext", moduleResolution: "Bundler", paths: { "@/*": ["./src/*"] } }, include: ["src"] }));
for (const file of [
  "main.tsx", "CatalogApp.tsx", "CartApp.tsx", "api.ts",
  "app/ui/app.tsx", "app/config/config.ts",
  "pages/catalog/index.ts", "pages/catalog/ui/page.tsx", "pages/catalog/model/filter.ts",
  "entities/product/index.ts", "entities/product/model/product.ts", "entities/category/index.ts",
  "shared/ui/index.ts", "shared/ui/button.tsx", "shared/lib/cn.ts",
]) write(`src/${file}`);
write("outside.ts");
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: [...config, { settings: {
    "boundaries/root-path": root,
    "import/resolver": { typescript: { project: join(root, "tsconfig.json") } },
  } }],
});
const page = "pages/catalog/ui/page.tsx";
async function messages(file, code) {
  const [result] = await eslint.lintText(code, { filePath: join(root, "src", file) });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages;
}
async function rejects(file, code, ruleId = "boundaries/dependencies") {
  const result = await messages(file, code);
  assert(result.some((message) => message.ruleId === ruleId), `${code}: ${JSON.stringify(result)}`);
}
test("allows the configured public API, internal, app and Shared imports", async () => {
  for (const [file, code] of [
    [page, 'import { value } from "@/entities/product";'],
    [page, 'import { value } from "../model/filter";'],
    ["entities/product/index.ts", 'export { value } from "./model/product";'],
    ["app/ui/app.tsx", 'import { value } from "../config/config";'],
    ["shared/ui/button.tsx", 'import { value } from "@/shared/lib/cn";'],
    ["main.tsx", 'import { value } from "@/app/ui/app";'],
  ]) assert.deepEqual(await messages(file, code), [], file);
});
test("rejects upward and same-layer slice dependencies", async () => {
  await rejects("entities/product/model/product.ts", 'import { value } from "@/pages/catalog";');
  await rejects("entities/product/model/product.ts", 'import { value } from "@/entities/category";');
});
test("requires aliases between units and relative paths inside a unit", async () => {
  await rejects(page, 'import { value } from "../../../entities/product";');
  await rejects(page, 'import { value } from "@/pages/catalog/model/filter";');
  await rejects("shared/ui/button.tsx", 'import { value } from "../lib/cn";');
});
test("protects public APIs across imports, types, re-exports and dynamic imports", async () => {
  for (const code of [
    'import { value } from "@/entities/product/model/product";',
    'import type { value } from "@/entities/product/model/product";',
    'type Value = import("@/entities/product/model/product").value;',
    'export { value } from "@/entities/product/model/product";',
    'const value = import("@/entities/product/model/product");',
    'const value = require("@/entities/product/model/product");',
    'import Value = require("@/entities/product/model/product");',
    'import { value } from "@/entities/product/index";',
  ]) await rejects(page, code);
});
test("does not reject valid type and dynamic public API imports", async () => {
  for (const code of ['type Value = import("@/entities/product").value;', 'const value = import("@/entities/product");']) {
    assert.deepEqual(await messages(page, code), []);
  }
});
test("rejects own public API imports", async () => {
  await rejects("entities/product/model/product.ts", 'import { value } from "..";');
  await rejects("shared/ui/button.tsx", 'import { value } from "./index";');
});
test("rejects computed module paths with standard ESLint rules", async () => {
  await rejects(page, 'const value = import(moduleName);', "no-restricted-syntax");
  await rejects(page, 'const value = require(moduleName);', "no-restricted-syntax");
});
test("rejects unknown files and files missing an FSD segment", async () => {
  await rejects("new-root-file.ts", "export const value = 1;", "boundaries/no-unknown-files");
  await rejects("entities/product/loose.ts", "export const value = 1;", "no-restricted-syntax");
});
test("rejects unresolved aliases and imports outside src", async () => {
  await rejects(page, 'import { value } from "@/entities/missing";', "boundaries/no-unknown-dependencies");
  await rejects(page, 'import { value } from "../../../../outside";', "boundaries/no-unknown-dependencies");
});
test("preserves the repository-specific root entrypoint or Cart legacy boundary", async () => {
  const legacy = config[1].settings["boundaries/files"].some((file) => file.category === "legacy");
  if (legacy) {
    assert.deepEqual(await messages("CartApp.tsx", 'import { value } from "@/api";'), []);
    await rejects(page, 'import { value } from "@/api";');
    await rejects("CartApp.tsx", 'import { value } from "./api";');
  } else {
    await rejects("main.tsx", 'import { value } from "@/entities/product";');
    await rejects("app/ui/app.tsx", 'import { value } from "@/main";');
  }
});
