# Product review: library and dependable writing

October 2, 2026. Based on `main` at `0c2b0c0`, including merged PR #6. This follow-up evaluates the product broadly and implements a bounded set of changes that belong together. The earlier [daily-use audit](DAILY_USE_AUDIT.md) records the system map, search/recovery/feed work and its evidence; [storage schemas](STORAGE_SCHEMAS.md) remains the key-by-key contract.

## Judgment

Roost has enough capabilities. Its next improvement should make those capabilities easier to inhabit: a selective place to open, a complete place to explore, and writing that does not disappear during ordinary navigation or a failed save. Keep the command center, curated library, workshop and Academy. Do not introduce another dashboard, database view, recommendation engine or background behavioral score.

## Ranked opportunities

Rank reflects daily usefulness, friction, correctness, maintainability and implementation risk together.

| Rank | Problem | Decision |
| --- | --- | --- |
| 1 | The complete library still produces tens of thousands of pixels of scrolling, even after Today was shortened | Implement Daily desk / Library / Full page using the same existing DOM. Preserve explicit layouts and the original presentation. |
| 2 | Several section navigation paths can disagree about what is visible | Share section navigation across the launcher, directory, Academy, empty-state actions and hash links. Replace the old category click handlers. Global search crosses categories. |
| 3 | Closing or switching local writing tools can discard unsaved work | Add a shared dirty-editor guard to Workbench, Session Planner and Link Notes, including Escape/backdrop/tool switching and best-effort page-leave protection. |
| 4 | A failed write can look like a successful save | Keep editor contents on failure, check save results, report errors, and show ordinary shared-storage failures. Retain download/manual-copy escape paths. |
| 5 | A stale open editor can overwrite a newer saved record | Compare the loaded record with current storage before saving; preserve both saved data and the unsaved editor on conflict. This is best effort, not synchronization. |
| 6 | Mobile library controls compete with browsing | Put section search and category choices first. Disclose utility controls. Preserve heading focus without automatically opening a keyboard; keep the section return visible while scrolling. |
| 7 | The full DOM is large, and legacy initialization still overlaps newer behavior | Preserve the corpus DOM for compatibility in this pass. Remove competing group handlers and route native search clearing through the enhanced search handler. Defer virtualization until cold-start measurements justify its migration risk. |
| 8 | Storage contracts and recovery expectations are easy to overstate | Document the additive preference migration, lack of autosave, ordinary-save limits, config-pack boundary and non-atomic conflict checks. Retain existing full-backup and Undo tests. |
| 9 | Physical device and assistive-technology behavior remains incompletely verified | Exercise four widths and existing keyboard/modal journeys; explicitly leave real iOS installation, touch keyboards and screen-reader verification as manual work. |

## Review coverage and retained roles

| Area | Result / boundary |
| --- | --- |
| Opening, Today, Quick Access, Favorites, Recent | Daily desk exposes these existing surfaces and optional Wire. Today still offers at most three explicit saved-work resume points. Layout visibility/order remains authoritative. |
| Wire, section RSS and custom sources | Reuse the existing freshness labels, timeout/fallback, cache, cancellation and untrusted-feed validation. No new feed providers or requests. Feed/offline regression suite retained. |
| Launcher, custom/built-in links, saved items | Existing exact/prefix/title ranking, bounded local tie-breaks and saved-item openers remain. Section results are independent of the library filter and can reveal a layout-hidden section. |
| Section Launcher, Home Views, Layout Editor | Section Launcher becomes the Library directory. Home Views deliberately apply Full page; Layout Editor temporarily exposes it. Layout data is not rewritten merely to switch browsing modes. |
| Curated corpus, local tags and annotations | All 785 original anchors remain, with their descriptions and ordering. One-section browsing uses those exact elements, including existing Favorite, Note and Board controls. No duplicate card database. |
| Boards and Read Later | Retain their distinct workflow and article-triage roles, launcher results, Today resume eligibility and local data. No additional collection type. |
| Workbench, Link Notes and Session Planner | Harden save/dismiss/conflict behavior together. Workbench saves in place, retains pin state, labels fields, bounds input to existing schema limits and reports clipboard failures. |
| Academy, quests and achievements | Preserve their optionality, curriculum and data. Focus Mode's Open Academy uses the common section opener. Quest navigation reveals the existing Today disclosure. No new gamification. |
| Full backup, restore, Undo and configuration packs | Existing validation, preview, recovery snapshot and rollback paths are unchanged and re-tested. `homeSurface` travels in full backups with settings, not shareable packs. |
| Storage and migration | No key rename, collection rewrite or new private draft store. One additive enum field with explicit fallback for legacy layout/group state. Corrupt input and recovery tests retained. |
| Privacy and security | Existing external fonts, Google favicon requests, RSS proxies and external destinations remain network boundaries. No new service, dependency, telemetry or automatic profiling. User text continues through existing escaping/URL validation. This review is not a penetration-test claim. |
| PWA and sibling tools | Worker shell version advances to scoped `v5`. The manifest and both standalone tools remain unchanged; shell/offline and cache-isolation tests retained. |
| Accessibility and mobile | Native buttons, disclosure and search label; pressed states; heading focus; 44px navigation targets; existing modal focus/inertness and preference tests. Four-width checks complement visual review. |
| Performance and maintainability | A small presentation controller and shared editor guard stay in the upgrade layer. No bundler or split runtime. Presentation reduces visible page length, not HTML size or DOM allocation. |
| Tests and documentation | Original harness retained; focused workflow journeys added. Original layout fixture explicitly selects Full page and checks rendered visibility rather than a superseded group implementation detail. HTTP cache bypass prevents testing stale development HTML. |

## Compatibility details

The new field is `roost_settings_v1.homeSurface`: `desk`, `library`, or `full`. Missing or invalid values select Full page when an existing layout object or a non-`all` legacy group exists; other homes select Daily desk. This fallback is computed in memory and later saved through the existing settings path. Old settings remain readable. The legacy `kfl_v3_view` category key remains in use.

Directory query and selected section are ephemeral. Explicit section hashes can reopen a section; returning to the directory or choosing another presentation removes the old section hash, so reload does not undo that choice. Opening a collapsed section expands it through the existing collapse helper. Browsing a layout-hidden section temporarily reveals it; its saved hidden flag is unchanged.

Writing safeguards do not persist unsaved drafts. A browser crash, OS termination, or simultaneous writes in the brief interval after a conflict check can still lose data. The generic storage warning covers shared `LS.write` failures, not every old direct-storage path. Download/copy important unsaved text and keep regular full backups.

## Measurements and screenshots

Same synthetic saved-work fixture on both sides: completed setup, active session, pinned Workbench note, high-priority reading item, headlines disabled, no custom layout. Windows / Node 22.19.0 / Chrome 154.0.8037.93 over HTTP. These are local samples, not hardware-independent benchmarks.

| Measurement | Merged main | Daily desk |
| --- | --- | --- |
| Document height at 390px | 93,212px | 2,492px |
| Document height at 1440px | 21,570px | 1,326px |
| Curated cards retained | 785 | 785 |
| Annotation reads per search input | 1 | 1 |

This is roughly 97% less opening-page scrolling at 390px and 94% at desktop width. The full page remains available. The DOM is still approximately 7,200 elements; this pass does not claim a smaller DOM or a measured cold-start speedup. Search timing samples and navigation timings vary with browser scheduling and are retained as raw observations, not a performance guarantee.

Evidence: [before measurements](screenshots/library-workflow/before-measurements.json), [after measurements](screenshots/library-workflow/after-measurements.json), [390px before](screenshots/library-workflow/before-390.png), [390px desk](screenshots/library-workflow/after-390.png), [1440px before](screenshots/library-workflow/before-1440.png), [1440px desk](screenshots/library-workflow/after-1440.png), [mobile library](screenshots/library-workflow/library-390.png), [desktop library](screenshots/library-workflow/library-1440.png), and [mobile section](screenshots/library-workflow/library-section-390.png). Screenshots contain synthetic data.

## Validation

Executed on October 2, 2026 with an isolated Chrome profile:

- `node tests/run-roost-validation.mjs` with `ROOST_APP_URL=http://127.0.0.1:8765/index.html` and `ROOST_CDP_PORT=9224`: **23 checks/suites passed, zero failed or skipped**. This includes the original layout suite and all focused browser journeys.
- The same command without browser environment variables: **17 static/parser/storage/worker checks passed**; one browser-suite entry explicitly skipped.
- `node tests/run-workflow-cdp-tests.mjs` after the final library reading-order refinement: all four widths, legacy state and reload journeys passed; no uncaught runtime errors.
- `node tests/run-feed-cdp-tests.mjs` with `ROOST_FEED_APP_URL=http://pages.localhost:8767/roost/index.html` and CDP port 9224: actual worker installation and offline reload at a Pages-style path passed, retaining 785 cards and the saved-note sentinel. Feed fixtures and update-notice wiring passed; the controller-change notice is simulated, not a complete installed-app upgrade.
- Exact comparison against `origin/main`: all 785 curated anchor blocks unchanged, including order, URLs, titles and descriptions. Both standalone tools' inline scripts compile; manifest and sibling tools are unchanged.
- `git diff --check` passed. Before/after desk and Library screenshots were visually inspected; automated overflow checks passed at all four widths.

The new workflow suite covers four widths (360, 390, 768, 1440), selective opening, the intact corpus, directory filtering, category-independent search, random exploration, section focus/return, temporarily revealed layout-hidden sections, idempotent presentation initialization, legacy layout/group preferences, deep links, reload persistence, canceled editor dismissal/template replacement, failed save/retry, and stale-record rejection for all three writing tools. Existing suites cover fresh setup, legacy Academy data, custom links/feeds, Home Views/layout, Boards, Read Later, Workbench, backup/restore/Undo, configuration packs, malformed storage, launcher keys, modal isolation, feeds and actual offline reload.

Physical iPhone/iPad installation, installed-app upgrades, virtual-keyboard safe areas, screen-reader use and public proxy uptime still require manual verification. Automated viewport checks do not establish those behaviors.

## Next work worth considering

- Extend checked save/error handling and dirty guards to remaining rich forms, especially Academy writing and custom-link editing. Avoid promises of universal autosave or durability.
- Measure a cold start on an actual midrange phone before virtualizing or lazily constructing the corpus. Preserve in-page search, offline behavior and keyboard navigation if that work is justified.
- Review external font/favicon delivery separately if eliminating optional third-party requests becomes a priority.
- Test installed-app upgrades and screen-reader journeys on real devices before further expanding preferences or PWA complexity.
- Continue consolidating older event/storage helpers when touching their behavior; avoid a broad aesthetic refactor of the single-file architecture.
