import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cdpSuite = fs.readFileSync(path.join(root, "tests", "run-layout-cdp-tests.mjs"), "utf8");

const forbiddenDuplicates = [
  /function\s+safeUrl\s*\(/,
  /function\s+parseCsv\s*\(/,
  /function\s+parseBookmarkHtml\s*\(/,
  /function\s+parseOpml\s*\(/,
  /function\s+normalize\s*\(\s*item\s*\)/
];

const duplicate = forbiddenDuplicates.find((pattern) => pattern.test(fs.readFileSync(fileURLToPath(import.meta.url), "utf8")));
if (duplicate) {
  throw new Error(`Parser fixture must exercise production code, not duplicate parser logic (${duplicate}).`);
}

if (!/buildCustomImportPreview:\s*buildCustomImportPreview/.test(indexHtml)) {
  throw new Error("Production custom import parser is not exposed through roostTestHooks.");
}

const requiredFixtureSignals = [
  "productionParserFixtures",
  "buildCustomImportPreview",
  "javascript:alert(1)",
  "Malformed CSV quote",
  "malformedOpml"
];

const missing = requiredFixtureSignals.filter((signal) => !cdpSuite.includes(signal));
if (missing.length) {
  throw new Error(`CDP production parser fixtures are missing: ${missing.join(", ")}`);
}

console.log("custom import parser production fixture wiring passed");
