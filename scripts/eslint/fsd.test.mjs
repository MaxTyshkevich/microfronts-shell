import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import { createFsdPlugin } from "./fsd.mjs";

const root = mkdtempSync(join(tmpdir(), "fsd-eslint-"));
after(() => {
  assert.equal(dirname(root), tmpdir());
  rmSync(root, { recursive: true, force: true });
});
function write(file, text = "export const value = 1;\n") {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}
write("package.json", '{"type":"module"}');
write("tsconfig.json", JSON.stringify({ compilerOptions: {
  module: "ESNext", moduleResolution: "Bundler", paths: { "@/*": ["./src/*"] },
}, include: ["src"] }));
for (const file of [
  "main.tsx", "CatalogApp.tsx", "CartApp.tsx", "api.ts",
  "app/routes/router.tsx", "app/ui/app.tsx", "app/styles/theme.css",
  "pages/catalog/index.ts", "pages/catalog/ui/page.tsx", "pages/catalog/model/filter.ts",
  "pages/account/index.ts", "pages/account/ui/page.tsx",
  "features/add-to-cart/index.ts", "features/add-to-cart/ui/button.tsx",
  "entities/product/index.ts", "entities/product/model/product.ts", "entities/product/api/query.ts",
  "entities/category/index.ts", "entities/category/model/category.ts",
  "entities/no-api/model/item.ts", "shared/api/index.ts", "shared/api/request.ts",
  "shared/ui/index.ts", "shared/ui/button.tsx", "shared/lib/index.ts", "shared/lib/cn.ts",
]) write(`src/${file}`);
write("outside.ts");
write("node_modules/example/package.json", '{"name":"example","types":"index.d.ts"}');
write("node_modules/example/index.d.ts", "export declare const value: number;");
write("node_modules/example/reset.css", ":root {}");

const plugin = createFsdPlugin({ root, entrypoints: ["main.tsx", "CatalogApp.tsx"], legacyFiles: ["CartApp.tsx", "api.ts"] });
const linter = new Linter({ cwd: root });
function lint(file, code) {
  return linter.verify(code, [{
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser },
    plugins: { fsd: plugin },
    rules: { "fsd/imports": "error" },
  }], { filename: join(root, "src", file) });
}
const page = "pages/catalog/ui/page.tsx";
const product = "entities/product/model/product.ts";
const valid = [
  ["cross-layer public API", page, 'import { value } from "@/entities/product";'],
  ["type-only public API", page, 'import type { value } from "@/entities/product";'],
  ["internal direct path", page, 'import { value } from "../model/filter";'],
  ["slice exports internals", "entities/product/index.ts", 'export { value } from "./model/product";'],
  ["internal sibling segment", product, 'import { value } from "../api/query";'],
  ["shared segment dependencies", "shared/ui/button.tsx", 'import { value } from "@/shared/lib/cn";'],
  ["shared segment internals", "shared/ui/index.ts", 'export { value } from "./button";'],
  ["app segment dependencies", "app/routes/router.tsx", 'import { value } from "../ui/app";'],
  ["bootstrap", "main.tsx", 'import { value } from "@/app/ui/app";'],
  ["federation adapter", "CatalogApp.tsx", 'export { value } from "@/app/ui/app";'],
  ["static dynamic import", page, 'const lazy = import("@/entities/product");'],
  ["literal template import", page, 'const lazy = import(`@/entities/product`);'],
  ["TypeScript import type", page, 'type Product = import("@/entities/product").value;'],
  ["static require", page, 'const product = require("@/entities/product");'],
  ["builtin dependency", page, 'import fs from "node:fs";'],
  ["package dependency", page, 'import { value } from "example";'],
  ["package stylesheet", page, 'import "example/reset.css";'],
  ["local stylesheet", "main.tsx", 'import "@/app/styles/theme.css";'],
  ["legacy to legacy alias", "CartApp.tsx", 'import { value } from "@/api";'],
  ["legacy to FSD alias", "CartApp.tsx", 'import { value } from "@/entities/product";'],
];
for (const [name, file, code] of valid) test(`allows ${name}`, () => assert.deepEqual(lint(file, code), []));

const invalid = [
  ["relative cross-layer path", page, 'import { value } from "../../../entities/product";', "alias"],
  ["deep slice import", page, 'import { value } from "@/entities/product/model/product";', "publicApi"],
  ["explicit index path", page, 'import { value } from "@/entities/product/index";', "publicApi"],
  ["upward dependency", product, 'import { value } from "@/features/add-to-cart";', "boundary"],
  ["same-layer slice", product, 'import { value } from "@/entities/category";', "boundary"],
  ["alias inside slice", page, 'import { value } from "@/pages/catalog/model/filter";', "relative"],
  ["own relative public API", product, 'import { value } from "..";', "selfApi"],
  ["own absolute public API", product, 'import { value } from "@/entities/product";', "selfApi"],
  ["self re-export in public API", "entities/product/index.ts", 'export * from "./index";', "selfApi"],
  ["shared own public API", "shared/ui/button.tsx", 'import { value } from "./index";', "selfApi"],
  ["relative shared segment crossing", "shared/ui/button.tsx", 'import { value } from "../lib/cn";', "alias"],
  ["shared to entity", "shared/ui/button.tsx", 'import { value } from "@/entities/product";', "boundary"],
  ["relative bootstrap", "main.tsx", 'import { value } from "./app/ui/app";', "alias"],
  ["bootstrap bypassing app", "main.tsx", 'import { value } from "@/entities/product";', "entrypoint"],
  ["importing root adapter", "app/ui/app.tsx", 'import { value } from "@/CatalogApp";', "entrypoint"],
  ["escaping src", page, 'import { value } from "../../../../outside";', "outside"],
  ["alias traversal outside src", page, 'import { value } from "@/../outside";', "outside"],
  ["unresolved alias", page, 'import { value } from "@/entities/missing";', "unresolved"],
  ["unresolved package", page, 'import { value } from "missing-package";', "unresolved"],
  ["type import bypass", page, 'import type { value } from "@/entities/product/model/product";', "publicApi"],
  ["TypeScript import type bypass", page, 'type Product = import("@/entities/product/model/product").value;', "publicApi"],
  ["re-export bypass", page, 'export { value } from "@/entities/product/model/product";', "publicApi"],
  ["wildcard re-export bypass", page, 'export * from "@/entities/product/model/product";', "publicApi"],
  ["dynamic import bypass", page, 'const lazy = import("@/entities/product/model/product");', "publicApi"],
  ["computed import", page, 'const lazy = import(moduleName);', "computed"],
  ["computed template import", page, 'const lazy = import(`@/entities/${name}`);', "computed"],
  ["require bypass", page, 'const product = require("@/entities/product/model/product");', "publicApi"],
  ["computed require", page, 'const product = require(moduleName);', "computed"],
  ["import equals bypass", page, 'import Product = require("@/entities/product/model/product");', "publicApi"],
  ["new loose source", "another.ts", 'export const value = 1;', "structure"],
  ["missing slice public API", "entities/no-api/model/item.ts", 'export const value = 1;', "structure"],
  ["missing segment", "entities/product/loose.ts", 'export const value = 1;', "structure"],
  ["FSD depending on legacy", page, 'import { value } from "@/api";', "legacy"],
  ["relative legacy import", "CartApp.tsx", 'import { value } from "./api";', "alias"],
  ["legacy bypassing slice API", "CartApp.tsx", 'import { value } from "@/entities/product/model/product";', "publicApi"],
];
for (const [name, file, code, messageId] of invalid) test(`rejects ${name}`, () => {
  const messages = lint(file, code);
  assert(messages.every((message) => message.ruleId === "fsd/imports"), JSON.stringify(messages));
  assert(messages.some((message) => message.messageId === messageId), JSON.stringify(messages));
});
