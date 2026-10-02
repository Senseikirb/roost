# Codex handoff

Last refreshed: 2026-10-02. This describes the library and workflow branch, based on `origin/main` at `0c2b0c0` (PR #6 merged). Check GitHub and `git status` for current state rather than relying on historical branch listings.

## Start here

Read `AGENTS.md`, `README.md`, `SETUP.md`, [Product review](PRODUCT_REVIEW.md), the historical [Daily-use audit](DAILY_USE_AUDIT.md) and [Storage schemas](STORAGE_SCHEMAS.md). The app remains vanilla static HTML/CSS/JavaScript with no build or production dependencies. Work from current `main` on a focused branch. Never silently alter the curated corpus or discard local data.

The upgrade layer in `index.html` owns most behavior. Today connects existing Session Planner, Workbench, Read Later, Boards and learning tools. The command launcher shares the saved-item opener; cached corpus metadata invalidates on edits. Saved explicit layouts retain their ordering.

`installHomeSurface`, `applyHomeSurface`, and `navigateRoostSection` now share presentation and section navigation. Daily desk, Library and Full page reuse the same cards. Legacy layouts/groups default to Full page; missing preferences otherwise select the desk. `roost_settings_v1.homeSurface` is additive, included in full backups and excluded from configuration packs with the rest of personal settings. Selected sections/filter text are ephemeral; direct section hashes still work. Home Views select Full page. Layout Editor temporarily exposes Full page. Category controls replace the old competing click handlers; enhanced search owns both input and native search-clear events.

`watchEditor` and `allowEditorLeave` guard Workbench, Session Planner and Link Notes. These builders check save results and newer persisted content before overwrite. Keep all modal replacement paths behind the shared guard. Drafts stay in memory; there is no silent autosave or cross-tab synchronization. `LS.write` reports ordinary failures, while feed caches and shell status stay non-blocking. The worker cache is now installation-scoped `v5`.

Backup envelope and keys are unchanged. Additive metadata documents categories, approximate bytes and exclusions. Known imports are validated before writing; recovery snapshots are mandatory, failed writes roll back, and config packs share Undo. Malformed custom collections are retained for recovery rather than silently repaired on startup.

## Accurate counts

- 785 curated HTML anchors; no corpus changes in this work.
- 33 curated sections plus Favorites and Recent = 35 static sections.
- The old 786 static count included a JavaScript card template; its 34-section regex omitted Kid Zone’s multi-class element.
- The original browser fixture has a custom card/section; its 786-card and 35 non-utility section expectations remain valid with Academy enabled.

## Validation

```powershell
node tests/run-roost-validation.mjs
```

This runs static integrity/syntax, parser wiring, production storage recovery and service-worker isolation tests. For all browser journeys, serve the repo over HTTP and launch a separate Chrome/Edge test profile with remote debugging:

```powershell
python -m http.server 8765 --bind 127.0.0.1
# Separate shell: launch Chrome/Edge with --remote-debugging-port=9223 and an isolated profile.
$env:ROOST_APP_URL='http://127.0.0.1:8765/index.html'
$env:ROOST_CDP_PORT='9223'
node tests/run-roost-validation.mjs
```

The original layout/CDP suite remains, explicitly exercising Full page, supplemented by daily-opening, launcher, storage, feed/offline and library/writing journeys. Node must provide built-in `WebSocket`. Use a disposable profile: tests seed/clear test-origin storage. Local interaction tests block public requests and bypass HTTP/SW caches; the offline suite explicitly enables its worker. Controlled feed fixtures and actual offline journeys cover failure behavior separately. `ROOST_CDP_TRACE=1` helps diagnose the original suite.

## Limits and future work

Scope and deferred IA/performance work are in the product review. Real iOS installation, installed-app updates, screen-reader use and public proxy availability need manual verification. Viewport emulation does not prove those paths. Some older direct-storage saves still need failure handling. Stale-editor checks are best effort; localStorage offers no atomic cross-tab transactions. Keep backups.

Use draft PRs with validation evidence. Do not merge or delete historical branches without user authorization.
