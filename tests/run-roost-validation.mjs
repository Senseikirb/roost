import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const checks = [];
const EXPECTED_LINK_CARDS = 762;
const EXPECTED_STATIC_SECTIONS = 33;

function record(name, ok, detail = "") {
  checks.push({ name, ok: !!ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark} ${name}${detail ? ` - ${detail}` : ""}`);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function runNode(args, name, options = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) }
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  record(name, result.status === 0, output.split(/\r?\n/).slice(-3).join(" | "));
  return result.status === 0;
}

function validateStructure() {
  const html = read("index.html");
  const manifest = JSON.parse(read("manifest.json"));
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `index-inline-${index + 1}.js` });
  });

  const counts = {
    linkCards: (html.match(/class="link-card"/g) || []).length,
    sections: (html.match(/<div\s+class="section"\s+id="[^"]+"/g) || []).length,
    divOpen: (html.match(/<div\b/g) || []).length,
    divClose: (html.match(/<\/div>/g) || []).length,
    scriptOpen: (html.match(/<script\b/g) || []).length,
    scriptClose: (html.match(/<\/script>/g) || []).length,
    styleOpen: (html.match(/<style\b/g) || []).length,
    styleClose: (html.match(/<\/style>/g) || []).length
  };

  record("curated link count", counts.linkCards === EXPECTED_LINK_CARDS, `${counts.linkCards}/${EXPECTED_LINK_CARDS} link cards`);
  record("section count", counts.sections === EXPECTED_STATIC_SECTIONS, `${counts.sections}/${EXPECTED_STATIC_SECTIONS} static sections`);
  record("div tag balance", counts.divOpen === counts.divClose, `${counts.divOpen}/${counts.divClose}`);
  record("script tag balance", counts.scriptOpen === counts.scriptClose, `${counts.scriptOpen}/${counts.scriptClose}`);
  record("style tag balance", counts.styleOpen === counts.styleClose, `${counts.styleOpen}/${counts.styleClose}`);
  record("inline script syntax", true, `${scripts.length} inline scripts`);
  record("manifest required fields", !!(manifest.name && manifest.short_name && manifest.start_url && manifest.display && Array.isArray(manifest.icons) && manifest.icons.length), manifest.name || "manifest");
  const missingIcons = (manifest.icons || []).map((icon) => icon && icon.src).filter(Boolean).filter((src) => !fs.existsSync(path.join(root, src.replace(/^\.\//, ""))));
  record("manifest icons resolve", missingIcons.length === 0, missingIcons.length ? missingIcons.join(", ") : `${(manifest.icons || []).length} icons`);
}

function validateStandaloneTool(file, label) {
  const html = read(file);
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `${file}-inline-${index + 1}.js` });
  });
  const counts = {
    divOpen: (html.match(/<div\b/g) || []).length,
    divClose: (html.match(/<\/div>/g) || []).length,
    scriptOpen: (html.match(/<script\b/g) || []).length,
    scriptClose: (html.match(/<\/script>/g) || []).length,
    styleOpen: (html.match(/<style\b/g) || []).length,
    styleClose: (html.match(/<\/style>/g) || []).length
  };
  const controls = /class="roost-home"/.test(html) &&
    /class="chip"/.test(html) &&
    /id="runBtn"/.test(html) &&
    /copybtn/.test(html);
  record(`${label} tag balance`, counts.divOpen === counts.divClose && counts.scriptOpen === counts.scriptClose && counts.styleOpen === counts.styleClose, `${counts.divOpen}/${counts.divClose} divs, ${counts.scriptOpen}/${counts.scriptClose} scripts`);
  record(`${label} inline script syntax`, true, `${scripts.length} inline scripts`);
  record(`${label} controls present`, controls, "home/chips/run/copy");
}

function main() {
  try {
    validateStructure();
  } catch (error) {
    record("static structure", false, error.message);
  }

  try {
    const destinationFile = path.join(root, "roost-destination-finder.html");
    const hasDestinationTool = fs.existsSync(destinationFile);
    record("destination finder file present", hasDestinationTool, "roost-destination-finder.html");
    if (hasDestinationTool) validateStandaloneTool("roost-destination-finder.html", "destination finder");
  } catch (error) {
    record("destination finder static checks", false, error.message);
  }

  runNode(["--check", "sw.js"], "service worker syntax");
  runNode(["tests/run-custom-import-parser-tests.mjs"], "custom import parser fixtures");

  if (process.env.ROOST_CDP_PORT && process.env.ROOST_APP_URL) {
    runNode(["tests/run-layout-cdp-tests.mjs"], "layout and runtime CDP suite");
  } else {
    record("layout and runtime CDP suite", true, "skipped; set ROOST_CDP_PORT and ROOST_APP_URL to enable");
  }

  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({ total: checks.length, failed: failed.length }, null, 2));
  if (failed.length) process.exit(1);
}

main();
