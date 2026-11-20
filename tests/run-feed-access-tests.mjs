import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Exercise the production request boundary without performing external I/O.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const declarations = ["readHeadlineConnection", "canFetchHeadline", "saveHeadlineConnection",
  "isRoostStorageKey", "fetchOne", "refreshFeed", "pauseHeadlineRequests"];
const production = declarations.map(name => {
  const start = html.indexOf("  function " + name + "(");
  assert.ok(start >= 0, name);
  return html.slice(start, html.indexOf("\n  }", start) + 4);
}).join("\n");
const builtIn = "https://example.test/built-in";
const custom = "https://example.test/custom";
const denied = "https://example.test/imported";
const consentKey = "roost_headline_connection_v1";
const values = new Map();
const requests = [];
const ctx = vm.createContext({
  HEADLINE_CONNECTION_KEY: consentKey, RESTORE_UNDO_KEY: "roost_restore_undo_v1",
  LS: { read: (key, fallback) => values.get(key) ?? fallback, write: (key, value) => { values.set(key, value); return true; } },
  settings: { headlines: true }, navigator: { onLine: true }, CACHE_TTL: 1800000,
  isBuiltInFeedUrl: url => url === builtIn, cacheKey: url => url, readFeedCache: () => null,
  feedItemsWithFreshness: (items, t, live) => items.map(item => ({ ...item, live })),
  feedRequests: Object.create(null), headlineRequestGeneration: 0, feedControllers: [], headlineObserver: null,
  feedRequestTargets: url => [{ url }, { url }], parseFeed: () => [{ title: "Article" }],
  fetchWithTimeout: async spec => { requests.push(spec.url); return "<rss/>"; }
});
vm.runInContext(production, ctx);
ctx.headlineConnection = ctx.readHeadlineConnection();
assert.equal((await ctx.fetchOne(builtIn, "News", { force: true })).length, 0);
assert.deepEqual(requests, [], "visible legacy headlines cannot authorize requests");
ctx.readFeedCache = () => ({ t: 1, items: [{ title: "Saved" }] });
assert.equal((await ctx.fetchOne(builtIn, "News", { force: true }))[0].live, false);
assert.deepEqual(requests, [], "cache remains readable while paused");
ctx.readFeedCache = () => null;
ctx.saveHeadlineConnection(true, [custom]);
assert.ok(!ctx.isRoostStorageKey(consentKey, true), "backup and restore exclude local consent");
assert.equal(ctx.readHeadlineConnection().custom[0], custom);
await ctx.fetchOne(builtIn, "News", { force: true });
await ctx.fetchOne(custom, "News", { force: true });
await ctx.fetchOne(denied, "News", { force: true });
assert.deepEqual(requests, [builtIn, custom], "only built-in and individually approved sources connect");

let finishOldRequest;
ctx.fetchWithTimeout = () => new Promise(resolve => { finishOldRequest = resolve; });
const pending = ctx.fetchOne(custom, "News", { force: true });
ctx.saveHeadlineConnection(false, [custom]);
ctx.pauseHeadlineRequests();
ctx.saveHeadlineConnection(true, [custom]);
finishOldRequest("<rss/>");
assert.equal((await pending).length, 0, "revocation invalidates earlier responses even after a reconnect");
ctx.navigator.onLine = false;
ctx.fetchWithTimeout = () => { throw new Error("Offline network attempt"); };
await ctx.fetchOne(custom, "News", { force: true });
console.log("PASS local feed consent, cached reads, per-source approval, restore boundary, cancellation and offline");
