import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(rootDir, "functions/_data/go-links.json");
const outputPath = resolve(rootDir, "functions/_data/go-links.generated.mjs");

const links = JSON.parse(readFileSync(inputPath, "utf8"));
const moduleSource = [
  "// Generated from functions/_data/go-links.json. Do not edit by hand.",
  `export const goLinks = ${JSON.stringify(links, null, 2)};`,
  "export default goLinks;",
  ""
].join("\n");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, moduleSource, "utf8");
