import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

// Review script edits before refreshing their digests. The default mode is read-only.
const write = process.argv[2] === "--write";
assert.ok(process.argv.length === (write ? 3 : 2), "Usage: node scripts/check-csp.mjs [--write]");
for (const page of ["index.html", "iq-rfsoc-explorer.html", "roost-destination-finder.html"]) {
  const path = new URL("../" + page, import.meta.url);
  const html = readFileSync(path, "utf8");
  const policyPattern = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/gi;
  const head = html.slice(0, html.indexOf("</head>"));
  const policies = [...head.matchAll(policyPattern)];
  assert.equal(policies.length, 1, page + " needs exactly one CSP");
  const policy = policies[0];
  assert.doesNotMatch(html.slice(0, policy.index), /<(?:script|style|link|img)\b/i, page + " needs CSP before resources");
  assert.doesNotMatch(policy[1], /(?:^|;\s*)script-src-(?:elem|attr)\b/i, page + " overrides the script hash policy");
  assert.match(head, /<meta name="referrer" content="no-referrer"/i);
  for (const directive of ["default-src", "object-src", "base-uri", "form-action"]) {
    assert.match(policy[1], new RegExp("(?:^|;\\s*)" + directive + " 'none'(?:;|$)"), page + " missing " + directive);
  }
  const connections = page === "index.html" ? "connect-src 'self' https:" : "connect-src 'none'";
  assert.ok(policy[1].split(";").some(value => value.trim() === connections), page + " changes allowed connections");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  const hashes = new Set();
  for (const match of html.matchAll(scriptPattern)) {
    assert.equal(match[1].trim(), "", page + " only ships inline scripts");
    // HTML parsing normalizes line endings before the browser hashes a script.
    const text = match[2].replace(/\r\n?/g, "\n");
    hashes.add("'sha256-" + createHash("sha256").update(text).digest("base64") + "'");
  }
  assert.ok(hashes.size, page + " is missing its application script");
  const markup = html.replace(scriptPattern, "");
  assert.doesNotMatch(markup, /\son[a-z]+\s*=/i, page + " contains an inline event handler");
  const scriptSrc = /\bscript-src\s+[^;]+/g;
  assert.equal([...policy[1].matchAll(scriptSrc)].length, 1, page + " needs exactly one script-src");
  const expected = policy[0].replace(scriptSrc, "script-src " + [...hashes].join(" "));
  if (expected !== policy[0]) {
    assert.ok(write, page + " has stale CSP hashes. Review the scripts, then run node scripts/check-csp.mjs --write");
    writeFileSync(path, html.slice(0, policy.index) + expected + html.slice(policy.index + policy[0].length));
  }
  console.log(page + " · " + hashes.size + " trusted script block(s)");
}
