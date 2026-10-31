import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";

const eslint = new ESLint({ cwd: fileURLToPath(new URL("../", import.meta.url)) });
const results = await eslint.lintFiles(["src"]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);
if (output) console.log(output);
if (results.some((result) => result.errorCount || result.warningCount)) process.exitCode = 1;
else console.log("FSD imports and structure OK (ESLint).");
