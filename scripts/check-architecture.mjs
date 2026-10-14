import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'src');
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const sliced = new Set(['pages', 'widgets', 'features', 'entities']);
const failures = [];
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(src);
const parts = path => relative(src, path).split(sep);
const display = path => relative(root, path).split(sep).join('/');
const configPath = resolve(root, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const { options, errors } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (errors.length) throw new Error(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('\n'));

function checkImport(file, specifier) {
  const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule;
  if (resolved?.isExternalLibraryImport) return;
  const target = resolved?.resolvedFileName ?? resolve(dirname(file), specifier);
  // CSS and other assets still follow layer/slice boundaries.
  if (!resolved && !existsSync(target)) {
    failures.push(`${display(file)}: unresolved import ${specifier}`);
    return;
  }
  const from = parts(file);
  const to = parts(target);
  if (to[0] === '..' || !layers.includes(to[0])) {
    failures.push(`${display(file)}: import outside FSD layers: ${specifier}`);
    return;
  }
  if (from[0] === 'main.tsx') {
    if (to[0] !== 'app') failures.push(`${display(file)}: bootstrap may only import app`);
    return;
  }
  const sameSlice = from[0] === to[0] && (!sliced.has(from[0]) || from[1] === to[1]);
  if (sameSlice) return;
  if (layers.indexOf(to[0]) <= layers.indexOf(from[0])) {
    failures.push(`${display(file)}: upward or cross-slice import: ${specifier}`);
  }
  if (sliced.has(to[0]) && !(to.length === 3 && to[2] === 'index.ts')) {
    failures.push(`${display(file)}: use the slice public API: ${specifier}`);
  }
}

for (const file of files) {
  const path = parts(file);
  if (path[0] !== 'main.tsx') {
    if (!layers.includes(path[0])) failures.push(`${display(file)}: unknown layer or loose source file`);
    else if (sliced.has(path[0])) {
      if (path.length < 4 && !(path.length === 3 && path[2] === 'index.ts')) {
        failures.push(`${display(file)}: expected slice/segment/file or slice/index.ts`);
      }
      if (!existsSync(resolve(src, path[0], path[1], 'index.ts'))) {
        failures.push(`${display(file)}: missing slice public API`);
      }
    } else if (path.length < 3) failures.push(`${display(file)}: expected layer/segment/file`);
  }
  if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) specifier = node.moduleReference.expression;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      specifier = node.arguments[0];
      if (!specifier || !ts.isStringLiteralLike(specifier)) failures.push(`${display(file)}: computed module imports cannot be checked`);
    }
    if (specifier && ts.isStringLiteralLike(specifier)) checkImport(file, specifier.text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else console.log(`FSD boundaries OK (${files.length} source files).`);
