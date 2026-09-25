# Daily-use improvement audit

Inspected from `main` at `6411653` (merged PRs #1–#5). Scope: connect existing daily surfaces and make local recovery dependable while preserving the static, private command-center identity.

## Product map

| System | Role and relationship |
| --- | --- |
| Launcher / search | Primary path to links, commands, sections, Mission Control and saved work. Saved results open individual notes, articles and Boards. |
| Today | Up to three resume actions from explicit local saves. Existing quests, learning detail, tips and badges are disclosed below. |
| Quick Access | Curated everyday destinations; retained as the durable launchpad. |
| Roost Wire / section headlines | Optional fresh context, with live/cached/stale/unavailable states; never a prerequisite for the library. |
| Section Launcher | Existing visual library navigator. Today’s Browse library reveals it and moves keyboard focus there. No second library/database UI. |
| Home Views / Layout Editor | Views are the convenient context switch; Layout Editor remains advanced arrangement. Explicit saved orders remain authoritative. |
| Favorites / Recent | Existing local shortcuts and small ranking tie-breaks. No new usage scoring. |
| Boards / Read Later | Named link workflows and article triage respectively. Both provide actionable saved search results and eligible resume points. |
| Workbench / Link Notes | Structured saved thinking versus annotations on destinations. Pinned notes resume directly and save in place; link notes/tags remain search evidence. |
| Session Planner | One unfinished/last timeboxed goal; an unfinished session is the first resume point. |
| Daily Quest Deck / achievements | Optional exploration and progress feedback, retained under Today detail and existing tools. |
| Mission Control Academy | Optional curriculum with unchanged progress, missions, resources, projects and legacy migration. |
| Custom Links / Custom RSS | Local additions to the corpus and sources; existing managers and import previews reused. |
| Quick Start / dock | Help and tool shortcuts; launcher remains the primary discovery path. |
| Accessibility Preferences | Existing text, contrast, focus and motion controls. Today uses a native disclosure; touch targets and modal keyboard continuity are tested. |
| Backup / Restore / config packs | Personal recovery versus explicit shareable configuration. Validated writes, preview, rollback and one-step Undo shared by both import paths. |
| Offline PWA / sibling tools | Cached shell and local tools remain useful; external destinations need network. Installation-scoped caches and explicit update notice. |

See [Storage schemas](STORAGE_SCHEMAS.md) for every persistent key, alias, bound, migration, backup, restore and pack policy. Test hooks expose production functions; no replacement parser or production dependency was introduced.

## Ranked opportunities and decisions

1. **Today’s footprint and weak continuation:** replace large counters and repeated entry points with three saved-work actions. Keep deeper tools behind a disclosure. Default top order is launcher → Today → Wire; saved layouts retain their explicit order.
2. **Unsafe recovery:** reject malformed known structures before writing, require exact recovery snapshots, rollback failures, preview changes, extend Undo to packs.
3. **Search relevance and dead-end Saved scope:** rank titles ahead of descriptions and open the selected saved item. Existing Favorites/Recent provide bounded tie-breaks, not a learned profile.
4. **Search work per keystroke:** cache stable corpus metadata, invalidate on edits, read annotations once/query, avoid forced result-layout measurements on input.
5. **Feed lifecycle/freshness:** cancel disabled/offline work, reuse observers/in-flight requests, retain per-story freshness, reject unsafe markup/URLs and old/future dates, keep unavailable retry controls.
6. **Offline ownership/updates:** cache known GET shell assets for this installation, preserve sibling caches, retain worker lifetime during revalidation, offer optional-tool fallback and update notice.
7. **Keyboard continuity/mobile density:** preserve typed slashes, modal isolation and focus return; keep mobile Add/Import side by side and all actions accessible.
8. **Documentation/test blind spots:** count real HTML, cover journeys/failures, document storage, retain the original validation harness.

## Corpus integrity

There are **785 curated anchors across 33 curated sections**, plus Favorites and Recent, for **35 static sections**. The old 786 count included a JavaScript card template; its 34-section regex skipped Kid Zone’s second CSS class. The browser fixture adds a custom card/section; with Academy enabled its expected counts remain 786 cards / 35 non-utility sections. No curated anchor text, URL, description or ordering changed.

## Measurement and validation

Browser checks use isolated headless Chrome over HTTP at 360, 390, 768 and 1440px. Local journeys block external content. Controlled feed responses test failure/security; real service-worker installation and offline reload are also tested under `/roost/`.

The screenshot fixture has an active session, pinned note and high-priority reading item, with headlines disabled on both sides. Today shrank from 1,324px to approximately 438px at 390px, and from 766px to approximately 290px at desktop width. Annotation reads per search fell from 797 to 1. Timing evidence is recorded with the PR; these are not hardware-independent benchmarks. No claim of a smaller overall DOM or faster cold start is made.

Screenshots in `screenshots/` show synthetic local data at mobile and desktop widths. The original CDP suite is retained alongside daily, launcher, storage and feed/offline journeys.

Measured on Windows with Node 22.19.0 and Chrome 153.0.8010.53, using the same synthetic saved-work fixture and disabled headlines:

| Measurement | Main | This branch |
| --- | --- | --- |
| Today height, 390px | 1,324px | 438px |
| Today height, 1440px | 766px | 290px |
| Annotation reads per search input | 797 | 1 |
| Median search input handler, 390px | 32.0ms | 1.2ms |
| Median search input handler, 1440px | 21.0ms | 3.6ms |

The timing sample consists of seven repeated `research` input events after the page settled; it measures synchronous handler work, not end-to-end typing latency or a cold-start benchmark. Raw samples are in [before measurements](screenshots/before-measurements.json) and [after measurements](screenshots/after-measurements.json).

Executed validation on September 25, 2026:

- `node tests/run-roost-validation.mjs`: static, parser wiring, production storage recovery, and service-worker isolation passed; browser tests explicitly skipped when their environment variables were absent.
- The same command with `ROOST_APP_URL=http://127.0.0.1:8765/index.html` and `ROOST_CDP_PORT=9223`: **22 checks/suites, 0 failed, 0 skipped**, with no uncaught runtime exceptions. Includes the original layout/runtime suite and daily, launcher, storage, and feed/offline journeys.
- `node tests/run-feed-cdp-tests.mjs` with `ROOST_FEED_APP_URL=http://pages.localhost:8767/roost/index.html`: actual worker installation, offline reload under a Pages-style subpath, all 785 cards, saved-note preservation, and update-notice wiring passed. The update notice uses a simulated controller-change event; it does not claim a complete real installed-app upgrade test.
- Direct comparison with `origin/main`: all 785 curated anchor blocks are identical, including order, URLs, titles, and descriptions. Both standalone tools' inline scripts compile. The manifest and sibling tool files are unchanged.
- Visually inspected the before/after desktop and 390px screenshots. Automated overflow and primary Today target-size checks passed at 360, 390, 768, and 1440px.

## Deliberately deferred

- No new dashboard, library database, tracking, framework, backend, account or cloud store.
- Old section-group filters still overlap scopes/views; broader consolidation needs its own behavior-preserving pass.
- No mass event-handler refactor or virtualization; the measured search path had clearer value. The full corpus remains a substantial DOM and long page.
- No deletion of orphan notes or destructive global limits. Large custom collections can approach browser quota; some ordinary saves still need failure feedback. Restore now reports failures and keeps recovery.
- No coordination of simultaneous writes across tabs.
- Real iOS installation, installed-app updates across browser versions, touch keyboards/safe areas, screen-reader use and public proxy uptime still need manual verification. Emulated viewport tests do not establish these.
