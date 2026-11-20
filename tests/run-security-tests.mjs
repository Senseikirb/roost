import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
function source(start, end) {
  const first = html.indexOf(start);
  const last = html.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, "Production code moved: " + start);
  return html.slice(first, last);
}
const app = vm.createContext({ URL, Blob, Response, TextDecoder, AbortController, setTimeout, clearTimeout });
vm.runInContext(
  source("  function safeCustomUrl(", "  function customSectionsStorageIsMalformed(") +
  source("  function clean(s)", "  function decodeHtmlEntities(") +
  source("  function safeHttpUrl(", "  function defaultMissionState(") +
  source("  var WIRE_FEEDS =", "  function cacheKey(") +
  source("  async function readFeedResponse(", "  function fetchWithTimeout(") +
  source("  async function checkLinkHealthUrl(", "  function healthClass(") +
  source("  var BACKUP_SCHEMA =", "  var CONFIG_PACK_SCHEMA =") +
  source("  var LINK_IMPORT_BYTES =", "  function detectImportType(") +
  source("  function parseCustomCsv(", "  function parseOpmlFeeds(") +
  source("  function buildMissionPortfolioHtml(", "  function protectAcademySearchVisibility(") +
  source("  function esc(s)", "\n\n"), app
);

const publicFeed = "https://example.com/feed?category=science";
const builtInFeed = app.WIRE_FEEDS[0].feeds[0];
assert.equal(app.feedRequestTargets(publicFeed).length, 1);
assert.equal(app.feedRequestTargets(publicFeed)[0].url, publicFeed);
assert.equal(app.feedRequestTargets(publicFeed)[0].direct, true);
assert.ok(app.feedRequestTargets(builtInFeed).every(target => new URL(target.url).hostname !== new URL(builtInFeed).hostname));
for (const feed of app.builtInFeedUrls) {
  for (const target of app.feedRequestTargets(feed)) {
    const relay = new URL(target.url);
    assert.equal(relay.protocol, "https:");
    assert.equal(new URL(relay.searchParams.get("url")).protocol, "https:");
  }
}
const privateVariant = builtInFeed + "?subscription=example";
assert.equal(app.feedRequestTargets(privateVariant)[0].url, privateVariant);
for (const address of [
  "http://example.com/feed", "https://user:pass@example.com/feed",
  "https://127.0.0.1/feed", "https://[::1]/feed", "https://printer.local./feed",
  "https://localhost/feed", "https://example.com:8001/feed"
]) assert.equal(app.feedRequestTargets(address).length, 0, address);
console.log("PASS Exact relay allowlist, direct custom sources and restricted network destinations");

assert.equal(await app.readFeedResponse(new Response("Héllo")), "Héllo");
await assert.rejects(app.readFeedResponse(new Response("short", { headers: { "content-length": "2500000" } })), /oversized/i);
let cancelled = false;
const response = new Response(new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array(500001)); },
  cancel() { cancelled = true; }
}));
await assert.rejects(app.readFeedResponse(response), /oversized/i);
assert.equal(cancelled, true);
console.log("PASS Response cap enforced during streaming even without Content-Length");

const calls = [];
app.fetch = async (url, options) => {
  calls.push({ url, options });
  return new Response(null, { status: 200 });
};
const requestSignal = new AbortController().signal;
assert.equal((await app.checkLinkHealthUrl({ href: "https://localhost/admin" }, requestSignal)).status, "skipped");
assert.equal(calls.length, 0);
assert.equal((await app.checkLinkHealthUrl({ href: publicFeed }, requestSignal)).status, "ok");
assert.equal(calls.length, 1);
const request = calls[0].options;
assert.deepEqual([request.method, request.redirect, request.credentials, request.referrerPolicy], ["HEAD", "manual", "omit", "no-referrer"]);
const pending = new AbortController();
app.fetch = (url, options) => new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("Closed"))));
const checking = app.checkLinkHealthUrl({ href: publicFeed }, pending.signal);
pending.abort();
assert.equal(await checking, null);
console.log("PASS Link checks skip restricted addresses, use HEAD only and cancel when closed");

assert.throws(() => app.checkImportSize("é".repeat(10), 12), /exceeds/);
assert.throws(() => app.parseImportJson('{"records":{"constructor":"reserved"}}'), /reserved/);
assert.throws(() => app.parseImportJson("[".repeat(60) + "]".repeat(60)), /nested/);
assert.throws(() => app.parseCustomCsv("title,url\n" + "Site,https://example.com\n".repeat(2001)), /2,000/);
assert.equal(app.safeCustomUrl("example.com/news"), "https://example.com/news");
assert.equal(app.safeCustomUrl("https://name:pass@example.com/"), "");
assert.equal(app.esc('"example" & friends'), "&quot;example&quot; &amp; friends");
console.log("PASS Import size, record count, dictionary fields, nesting and URL boundaries");

app.readMissionState = () => ({ missionStatement: "Compare <draft> & final" });
app.missionSummary = () => ({ done: 1, total: 2, questDone: 0, xp: 4, rank: { name: "Learner" } });
app.ROOST_MISSION_CONFIG = { projects: [], rpg: { achievements: [] } };
const portfolio = app.buildMissionPortfolioHtml();
assert.match(portfolio, /http-equiv="Content-Security-Policy" content="default-src 'none'/);
assert.ok(portfolio.includes("Compare &lt;draft&gt; &amp; final"));
assert.doesNotMatch(portfolio, /<script\b|<iframe\b/i);
console.log("PASS Standalone portfolio export is escaped and carries its own offline policy");
