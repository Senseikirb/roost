import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Execute the production storage functions, not a second implementation.
const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function between(start, end) {
  const offset = source.indexOf(start);
  assert.ok(offset >= 0, `production marker missing: ${start}`);
  const limit = source.indexOf(end, offset + start.length);
  assert.ok(limit > offset, `production end marker missing: ${end}`);
  return source.slice(offset, limit);
}
const constants = [...source.matchAll(/var ([A-Z_]*KEY) = ("[^"\n]*");/g)].map(match => `var ${match[1]} = ${match[2]};`).join("\n");
const production = constants + "\n" + between("  var LS = {", "  var SETTINGS_KEY") +
  between("  function safeCustomUrl(", "  function customSections(") +
  between("  function safeHttpUrl(", "  function defaultMissionState(") +
  between("  function clean(s)", "  function decodeHtmlEntities(") +
  between('  var BACKUP_SCHEMA = ', "  function buildBackupRestore(");
const values = new Map();
let failWrite = null;
const storage = {
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] ?? null; },
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { if (failWrite && failWrite(key, value)) throw new Error("Quota exceeded"); values.set(key, String(value)); },
  removeItem(key) { if (failWrite && failWrite(key, null)) throw new Error("Storage unavailable"); values.delete(key); }
};
const context = vm.createContext({ localStorage: storage, URL, Blob, Date, location: { href: "https://example.com/roost/" } });
vm.runInContext(production, context);
let checks = 0;
function test(name, run) {
  values.clear(); failWrite = null;
  run(); checks++;
  console.log(`PASS ${name}`);
}
const object = value => JSON.stringify(value);

test("Malformed local values fall back without overwriting their bytes", () => {
  for (const raw of ["null", "[]", "false", "4", '"bad"', "{"]) {
    values.set("roost_settings_v1", raw);
    assert.equal(context.LS.read("roost_settings_v1", { headlines: true }).headlines, true);
    assert.equal(values.get("roost_settings_v1"), raw);
  }
  values.set("roost_readlater_v1", "{}");
  assert.ok(Array.isArray(context.LS.read("roost_readlater_v1", [])));
});
test("Backup metadata explains categories, size, and exclusions", () => {
  values.set("roost_workbench_v1", "[]"); values.set("roost_feed_test", object({ t: 1, items: [] }));
  values.set("roost_restore_undo_v1", "{}");
  const backup = context.backupPayload(false);
  assert.equal(backup.schema, "the-roost.localStorage.v1");
  assert.ok(backup.exportedAt && backup.metadata.approximateBytes > 0);
  assert.ok(backup.metadata.categories.includes("Saved work"));
  assert.ok(backup.metadata.excluded.includes("Headline cache"));
  assert.equal(backup.data.roost_feed_test, undefined);
  assert.equal(context.backupPayload(true).data.roost_restore_undo_v1, undefined);
});
test("Malformed section detection preserves original bytes for recovery", () => {
  for (const raw of ["null", "{}", "[null]", '{', '[{"id":"valid","title":"Keep"},null]']) {
    values.set("roost_custom_sections_v1", raw);
    assert.equal(context.customSectionsStorageIsMalformed(), true);
    assert.equal(values.get("roost_custom_sections_v1"), raw);
  }
  values.set("roost_custom_sections_v1", '[{"id":"valid","title":"Keep"}]');
  assert.equal(context.customSectionsStorageIsMalformed(), false);
  values.delete("roost_custom_sections_v1");
  assert.equal(context.customSectionsStorageIsMalformed(), false);
});
test("Invalid JSON, wrong shape, and unsafe URLs are rejected before writes", () => {
  const invalid = [
    ["roost_settings_v1", "null"], ["roost_readlater_v1", "{}"], ["roost_boards_v1", "[null]"],
    ["roost_workbench_v1", "{"], ["roost_custom_links_v1", object([{ url: "javascript:alert(1)" }])],
    ["roost_views_v1", object({ custom: [null] })], ["roost_mission_v1", object({ completed: [] })],
    ["roost_custom_feeds_v1", object({ feeds: [null] })], ["kfl_pins_v1", object([{ href: "data:text/html,Hi" }])]
  ];
  values.set("roost_settings_v1", object({ headlines: false }));
  for (const [key, raw] of invalid) {
    const result = context.applyStorageRestore({ [key]: raw });
    assert.equal(result.ok, false, key);
    assert.equal(values.get("roost_settings_v1"), '{"headlines":false}');
    assert.equal(values.has("roost_restore_undo_v1"), false);
  }
});
test("Legacy shapes and opaque extension keys remain compatible", () => {
  const data = { kfl_v3_view: "all", kfl_v3_compact: "1", roost_custom_feeds_v1: object([{ xmlUrl: "https://example.com/feed" }]), missionControlRPG_v3: object({ activities: { w1_a0: { completed: true } } }), roost_future_extension_v9: "opaque-vendor-value" };
  const result = context.applyStorageRestore(data);
  assert.equal(result.ok, true);
  for (const [key, raw] of Object.entries(data)) assert.equal(values.get(key), raw);
});
test("Preview distinguishes new, replaced, and unchanged values", () => {
  values.set("roost_settings_v1", "{}"); values.set("roost_workbench_v1", "[]");
  const preview = context.storageRestorePreview({ roost_settings_v1: '{"headlines":false}', roost_workbench_v1: "[]", roost_readlater_v1: "[]" });
  assert.equal(preview.added, 1); assert.equal(preview.replaced, 1); assert.equal(preview.unchanged, 1);
});
test("Restore preserves absent keys and Undo recovers exact bytes", () => {
  values.set("roost_settings_v1", '{ "headlines": false }'); values.set("roost_workbench_v1", "[]");
  const result = context.applyStorageRestore({ roost_settings_v1: '{"headlines":true}', roost_boards_v1: "[]" });
  assert.equal(result.ok, true); assert.equal(result.written, 2);
  assert.equal(values.get("roost_workbench_v1"), "[]");
  assert.equal(context.applyRestoreUndo().ok, true);
  assert.equal(values.get("roost_settings_v1"), '{ "headlines": false }');
  assert.equal(values.has("roost_boards_v1"), false);
  assert.equal(values.has("roost_restore_undo_v1"), false);
});
test("Recovery snapshot failure prevents all imported writes", () => {
  values.set("roost_settings_v1", "{}");
  failWrite = key => key === "roost_restore_undo_v1";
  assert.equal(context.applyStorageRestore({ roost_settings_v1: '{"headlines":false}' }).ok, false);
  assert.equal(values.get("roost_settings_v1"), "{}");
});
test("Failure after a partial write rolls back all changed values", () => {
  values.set("roost_settings_v1", "{}");
  failWrite = key => key === "roost_boards_v1";
  const result = context.applyStorageRestore({ roost_settings_v1: '{"headlines":false}', roost_boards_v1: "[]" });
  assert.equal(result.ok, false); assert.equal(result.rollbackFailed, false);
  assert.equal(values.get("roost_settings_v1"), "{}"); assert.equal(values.has("roost_boards_v1"), false);
  assert.ok(context.restoreUndoState());
});
test("Failed Undo retains recovery snapshot for retry", () => {
  values.set("roost_settings_v1", "{}");
  assert.equal(context.applyStorageRestore({ roost_settings_v1: '{"headlines":false}' }).ok, true);
  failWrite = key => key === "roost_settings_v1";
  assert.equal(context.applyRestoreUndo().ok, false); assert.ok(context.restoreUndoState());
  failWrite = null;
  assert.equal(context.applyRestoreUndo().ok, true); assert.equal(values.get("roost_settings_v1"), "{}");
});
test("Configuration packs share validation, rollback, and Undo", () => {
  values.set("roost_boards_v1", '[{"name":"Old board","links":[]}]');
  values.set("roost_mission_v1", '{"completed":{"sentinel":true}}');
  const pack = { schema: "the-roost.config-pack.v1", data: { roost_boards_v1: "[]", roost_mission_v1: "{}" } };
  const result = context.importConfigPackText(object(pack));
  assert.equal(result.ok, true); assert.equal(result.written, 1);
  assert.equal(values.get("roost_mission_v1"), '{"completed":{"sentinel":true}}');
  assert.equal(context.applyRestoreUndo().ok, true);
  assert.equal(values.get("roost_boards_v1"), '[{"name":"Old board","links":[]}]');
  assert.equal(context.configPackPayload().data.roost_mission_v1, undefined);
});
test("Outer schema and malformed undo input are rejected", () => {
  assert.throws(() => context.parseBackupText('{"schema":"the-roost.localStorage.v1","data":[]}'));
  assert.throws(() => context.parseConfigPackText('{"schema":"the-roost.config-pack.v1","data":[]}'));
  values.set("roost_restore_undo_v1", object({ version: 1, keys: ["roost_settings_v1"], previous: {} }));
  assert.equal(context.restoreUndoState(), null);
});
console.log(`Storage validation: ${checks} checks passed.`);
