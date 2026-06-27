# The Roost

**The Roost** is a single-page personal command center: part homepage, part live intelligence board, part learning platform, and part thinking workspace. It is built to be fast, durable, installable, and useful every day without needing a backend, build step, framework, or account.

At its core, The Roost is a carefully curated launchpad: **762 hand-picked link cards** across the homepage sections. Around that foundation it adds a privacy-preserving first-run setup, saved home views, current-view snapshot export, shareable configuration packs, a visual layout editor, a daily dashboard with a Daily Quest Deck, a local session planner, live RSS headlines, custom RSS sources, read-later triage, personal boards, offline-first PWA support, a lightweight tool dock, searchable Workbench notes, concept diagrams, a local Where To trip finder, Kid Zone, Creative Writing resources, philosophy, leadership, defense and battle-history reference sections, and an optional **Mission Control Academy** example profile for long-range career development.

## Why It Exists

Most personal homepages are either pretty link dumps or heavy dashboards that need accounts, APIs, databases, and maintenance. The Roost aims for a different balance:

- **Fast enough to open constantly**
- **Organized enough to replace scattered bookmarks**
- **Useful offline**
- **Personal enough to grow with the owner**
- **Simple enough to deploy on GitHub Pages**

It is intentionally vanilla: one main HTML file, one manifest, one service worker, local icons, and browser-local storage.

## Highlights

- **762 curated link cards** across AI, coding, RF, embedded systems, game dev, writing, philosophy, leadership, finance, security, defense, battle history, family, homestead, cooking, news, sports, Kid Zone, and more.
- **First-run setup wizard** for display name, use case, modules, news, density, visual mode, and starter sections.
- **Mission Control Academy** available as an optional local example profile directly under Quick Access.
- **24-cycle learning plan** with 240 core missions, 97 resources, 120 side quests, 23 leadership lessons, 6 projects, and 18 achievements.
- **Today Dashboard** with current Mission Control progress, a Daily Quest Deck, a next learning step, a local session summary, focus missions, active read-later count, boards, notes, and badges.
- **Command launcher** directly under the header for links, sections, and Roost tools.
- **Keyboard Shortcuts** command for a compact launcher, modal, and tool key reference.
- **Roost Wire**, a six-topic live news board with modes for Tech, Defense, AI, Gaming, Finance, World, and Quiet.
- **Per-section headline strips** for sections that benefit from fresh context.
- **Philosophy & Ethics**, **Leadership & Management**, **Battle History & Maps**, and **Defense & National Security** sections for durable reference, practical judgment, campaign maps, military history, defense industry news, and strategy analysis.
- **Read Later** saves for articles from Roost Wire and section headlines, with status, priority, filters, and local offline notes.
- **Session Planner** for one local timeboxed goal, resources, notes, and a completion summary.
- **Personal Boards** for grouping favorite links into custom workflows, with local starter templates.
- **Custom Links** for local user-added sections and links without editing `index.html`.
- **Saved Home Views** for switching between Morning Scan, Learning Sprint, Quiet Desk, Family Mode, Research Desk, and custom saved contexts.
- **Current View Snapshot** export from Home Views for a human-readable Markdown run sheet of visible sections and links.
- **Custom RSS sources** that can appear in Roost Wire and section headline strips while reusing the existing RSS cache/proxy fallback.
- **Visual Layout Editor** for arranging, hiding, restoring, compacting, and resetting homepage widgets without editing source.
- **Scoped search** across links, Mission Control, news-enabled sections, and saved local items.
- **Link Notes** for per-link notes, ratings, review status, and local tags on built-in or custom links.
- **Accessibility Preferences** for local text-size, contrast, focus-ring, and reduced-motion choices.
- **Manual Link Health** checks for small on-demand audits of visible, favorite, recent, or custom links, with coverage summary and Markdown report.
- **Contextual empty-state cards** in local tools for safer first actions without analytics or onboarding APIs.
- **Cozy Mode** for a softer, calmer visual mode.
- **Roost achievements** for cross-page usage milestones, with closest-next-badge hints.
- **Daily local tip** inside Today for gentle feature discovery without tracking.
- **Workbench** for saving, searching, filtering, and pinning local notes from structured thinking templates.
- **Concept Diagrams** for quick visual explanations.
- **Section Launcher** with minimize and collapse/expand-all controls.
- **Offline-first PWA shell** for GitHub Pages and iOS home-screen install.
- **No framework, no build step, no npm install, no server.**

## First-Run Setup And Privacy

New public users see a short setup wizard before The Roost assumes a personal layout. Setup asks for an optional display name, intended use, enabled modules, live news preference, density, visual mode, and starter sections.

The setup state is versioned under `roost_onboarding_v1` and saved only in that browser. There are no accounts, telemetry, analytics, cloud sync, setup APIs, or external profile services. Existing users with meaningful `kfl_*` or `roost_*` data are migrated silently so their current setup keeps working instead of being interrupted by onboarding.

Use the dock or launcher command **Run Setup Again** to reopen the wizard. Resetting setup choices does not delete saved links, notes, boards, Workbench notes, or Mission Control progress.

## Mission Control Academy

Mission Control Academy can turn The Roost from a homepage into a lightweight educational platform. It is not a separate app or external page anymore; it is built directly into `index.html`, but new public users opt into it through setup instead of inheriting it as the universal default.

When Mission Control is not enabled, The Roost shows a small optional intro card below Quick Access. It explains the academy, offers a read-only preview, and lets the user enable the example profile through setup or hide the intro locally.

Academy views:

- **Command Deck**: current cycle, XP, rank, mission statement, and focus missions.
- **Mission Board**: cycle/track/mode filters, completion toggles, and mission notes.
- **Academy Library**: resource tracking plus leadership lessons.
- **Side Quests**: optional certification, build, learning, and portfolio challenges.
- **Projects**: portfolio project status, task checklists, links, and notes.
- **Portfolio**: summary, achievements, project status, and export packet.

Progress is saved locally in the browser under `roost_mission_v1`. Legacy standalone Mission Control progress from `missionControlRPG_v3` can be migrated defensively when present.

When Mission Control is enabled, Today can show a **Next learning step** card. Its **Skip today** control is session-only and does not change Mission Control progress.

## Launcher

The primary search box is also The Roost command launcher. It sits directly under the header so opening, finding, or launching something is the first action on the page.

Shortcuts:

- `/`: focus the launcher.
- `Ctrl+K` or `Cmd+K`: open/focus the launcher.
- `Arrow Up` / `Arrow Down`: move through grouped results.
- `Enter`: activate the selected result.
- `Escape`: close the launcher and restore focus.

The launcher reuses the existing page search/filter behavior for link results, then layers commands and section jumps on top. If the enhanced launcher fails, the original inline search input still works as a link filter.

Command matches are treated as valid launcher results even when no link card matches the same query, so searches like `import`, `backup`, or `setup` do not show a misleading no-results page state.

Launcher commands include Focus Mode or Mission Control setup, Session Planner, Home Views, Keyboard Shortcuts, News Feeds, Boards, Read Later, Workbench, Accessibility Preferences, Link Health, Cozy Mode, Calm Start, Headlines, Run Setup Again, Backup / Restore, Concept Diagrams, and Surprise Me. Optional module commands appear only when those modules are enabled.

Commands you run are remembered locally in a short **Recent Commands** group at the top of the empty launcher. Clear that history from Backup / Restore.

Press `?` or use the launcher command **Open Help** for the in-app Quick Start panel. It groups the main actions for opening links, adding or importing bookmarks, editing layout, backing up local memory, toggling headlines, and opening Mission Control or Workbench.

## Layout Editor

Use **Edit Layout** from the Section Launcher controls, the dock, or the command launcher to arrange the homepage locally without editing `index.html`.

The editor models:

- Search / Launcher
- Today
- Roost Wire
- Favorites
- Recent
- Mission Control Academy
- Section Launcher
- Built-in link sections
- Custom sections

Controls are button-based so they work with keyboard and touch: Move Up, Move Down, Show, Hide, Reset, size selection, Reset Defaults, and Done. The launcher is locked visible as a recovery path. Existing collapsed-section state is separate and remains stored under `kfl_collapsed_v1`.

Layout state is stored only in this browser under `roost_layout_v1`:

```json
{
  "version": 1,
  "preset": "Custom",
  "topOrder": ["launcher", "wire", "today"],
  "sectionOrder": ["command-center", "quick-access"],
  "hidden": { "wire": true },
  "sizes": { "quick-access": "compact" },
  "updatedAt": "2026-06-21T00:00:00.000Z"
}
```

Named presets are **Default**, **Morning**, **Learning**, **Quiet**, and **Custom**. Presets show a preview summary before applying. Manual edits are saved as Custom. Backup / Restore includes this key automatically.

Use the command **Apply Calm Start** when the mobile opening view feels too busy. It applies the Quiet preset, compacts sections, hides Roost Wire through layout state, and collapses Wire/Today controls so the launcher and Quick Access stay front and center.

## Saved Home Views

Use **Home Views** from Today, the dock, Quick Start, or the command launcher to switch the homepage between named local contexts. Built-in views include **Morning Scan**, **Learning Sprint**, **Quiet Desk**, **Family Mode**, and **Research Desk**.

Views can apply:

- Layout preset or saved layout snapshot
- Search scope
- Roost Wire mode
- Roost Wire and Today collapsed state
- Section collapsed/expanded state

Custom saved views are stored under `roost_views_v1`. They are local-only and included in Backup / Restore.

Home Views can also export the current visible page as Markdown. This **Current View Snapshot** is generated on demand and does not store a new key. It lists visible sections and links plus board names; Read Later titles are included only when explicitly checked. Link notes and other private annotations are excluded.

## Personal Boards

Use **Boards** from the dock or command launcher to collect built-in or custom links into local workflows. The Board button on each link card adds that link to a named board.

Starter templates in the Boards tool create useful boards such as **Morning Launch**, **AI Build Sprint**, **Research Desk**, and **Family Admin** from existing Roost links. Applying a template writes only to `roost_boards_v1`, skips missing links, merges with an existing board of the same template/name, and never edits the curated link corpus.

## Live Headlines

The Roost uses public RSS/Atom feeds for its news surfaces:

- `WIRE_FEEDS` powers the six-topic Roost Wire board.
- `SECTION_FEEDS` powers section-level headline strips.
- Public CORS proxies are used because the site has no backend.
- Results are cached in browser storage for 30 minutes.
- Refresh buttons on Roost Wire and each headline strip swap headlines in place without reloading the page.
- Each Roost Wire topic has a local More action that rotates just that topic's headline without changing the active Wire mode.
- Cached headline surfaces show compact **Cached** or **Stale** labels, so slow or failed public proxies are visible without blocking the curated links.
- Custom RSS/Atom sources can be added from Custom Links -> Feeds. A feed can appear in Roost Wire, attach to a section headline strip, or both.
- Roost Wire and Today are individually collapsible, and their display state is remembered locally.
- If feeds or proxies fail, the headline areas degrade gracefully. The curated links still work.

This means The Roost stays simple and deployable while still surfacing fresh information.

## Local Memory

The Roost stores memory in browser `localStorage`. There is no cloud sync, server account, database, or analytics pipeline.

Important keys:

- `kfl_pins_v1`: pinned/favorite link cards.
- `kfl_recent_v1`: recently opened links.
- `kfl_collapsed_v1`: collapsed section state.
- `roost_settings_v1`: upgrade-layer settings such as headline toggle, Roost Wire mode, search scope, Cozy Mode, and Wire/Today collapsed state.
- `roost_onboarding_v1`: versioned setup profile, module choices, local display name, news preference, density, visual mode, and starter sections.
- `roost_launcher_minimized_v1`: Section Launcher minimized state.
- `roost_mission_v1`: Mission Control Academy progress.
- `roost_mission_tab_v1`: active Academy tab.
- `roost_workbench_v1`: Workbench saved notes, including local pin state.
- `roost_readlater_v1`: saved headline/article links, including status, priority, and local notes.
- `roost_session_v1`: the current or last local session plan.
- `roost_quests_v1`: the current local Daily Quest Deck.
- `roost_boards_v1`: personal link boards, including optional starter-template metadata.
- `roost_link_notes_v1`: per-link notes, ratings, and status.
- `roost_achievements_v1`: unlocked Roost-wide achievements.
- `roost_custom_sections_v1`: user-created local sections.
- `roost_custom_links_v1`: user-created local links, tags, icons, and favorite status.
- `roost_import_history_v1`: compact history for undoing the latest custom import batch.
- `roost_custom_feeds_v1`: user-added RSS/Atom feed subscriptions for Wire and section headline strips.
- `roost_layout_v1`: optional homepage widget order, visibility, sizes, and selected layout preset.
- `roost_views_v1`: saved homepage contexts that can apply layout, search, news, and collapsed-section state.
- `roost_accessibility_v1`: optional text size, contrast, focus, and motion preferences.
- `roost_link_health_v1`: local results from manual on-demand link checks.
- `roost_shell_status_v1`: local offline-shell status, last online time, and last successful service-worker readiness timestamp.
- `roost_tip_state_v1`: the current day's dismissed Daily Tip state.
- `roost_recent_commands_v1`: short local command launcher history.

Restore also uses a transient `roost_restore_undo_v1` snapshot after a backup restore. It is local-only, one-step, and excluded from normal backup exports.

Clearing site data for the hosted URL clears this memory.

## Custom Links

Use **Add Link** or **Import Bookmarks** near the launcher, the dock, Quick Start, or the command launcher to customize the page without editing `index.html`. Built-in links remain read-only defaults; custom links are rendered into their own local sections and participate in search, Favorites, Recent, Boards, Link Notes, section counts, Backup / Restore, and the command launcher.

The **Custom Links** tool supports:

- Create, rename, reorder, hide, and delete custom sections.
- Add, edit, move, duplicate, and delete custom links.
- Import browser bookmark HTML, Roost custom JSON, CSV, and compatible OPML feed lists.
- Preview imports before writing data.
- Handle duplicate URLs with Skip, Merge, or Import Anyway.
- Undo the latest custom import batch for links and empty sections created by that import.
- Export only custom links and sections as JSON.
- Add RSS/Atom feeds in the **Feeds** tab for custom Roost Wire and section headline sources.

CSV import example:

```csv
title,url,description,section,tags,favorite
OpenAI Docs,https://platform.openai.com/docs,API reference,Research,"ai,docs",true
Local News,https://example.com/news,Daily local source,News,local,false
```

Roost custom JSON exports use:

```json
{
  "app": "The Roost",
  "schema": "the-roost.custom-links.v1",
  "sections": [],
  "links": []
}
```

## Backup And Restore

The dock includes a **Backup / Restore** tool for local memory. It exports The Roost's `kfl_*`, `roost_*`, and legacy Mission Control keys to a JSON file, including custom links, custom sections, custom feeds, saved views, accessibility preferences, link health results, session state, import history, and layout state. Cached news feeds are skipped by default because they are temporary; the panel has an opt-in checkbox if you want them included. The panel also includes **Memory Health**: key count, approximate size, custom link/note/feed/view counts, and the last local export time stored under `roost_backup_meta_v1`.

Restore is intentionally conservative: it validates the backup schema, writes only The Roost keys, overwrites matching keys, and does not delete other browser storage. Before writing, it keeps a one-step local undo snapshot so **Undo Last Restore** can put overwritten keys back. After restore or undo, reload the page to apply restored UI state.

The same panel includes **Configuration Pack** export/import with schema `the-roost.config-pack.v1`. Packs include shareable setup surfaces such as custom links, custom sections, custom feeds, saved views, boards, accessibility preferences, and layout. They exclude personal progress, recents, Read Later, link notes, Workbench notes, Mission Control progress, and feed caches.

## File Structure

Required files for the GitHub repo root:

```text
index.html
manifest.json
sw.js
favicon-32.png
icon-180.png
icon-192.png
icon-512.png
README.md
SETUP.md
```

Optional:

```text
iq-rfsoc-explorer.html
roost-destination-finder.html
tests/run-custom-import-parser-tests.mjs
tests/run-layout-cdp-tests.mjs
tests/run-roost-validation.mjs
```

The RFSoC Explorer and Where To dock tiles expect `iq-rfsoc-explorer.html` and `roost-destination-finder.html` as sibling files. If either standalone tool is not present, the rest of The Roost still works.

The combined validation runner is optional for deployment, but useful before publishing changes:

```text
node tests/run-roost-validation.mjs
```

It checks link/section counts, tag balance, manifest JSON, manifest icon files, inline script syntax, `sw.js` syntax, and custom import parser fixtures. If `ROOST_APP_URL` and `ROOST_CDP_PORT` are set, it also runs the browser/CDP layout and runtime suite.

The parser test can still run by itself:

```text
node tests/run-custom-import-parser-tests.mjs
```

The layout CDP test is optional and expects a local HTTP server plus a Chrome instance with remote debugging enabled:

```text
$env:ROOST_APP_URL='http://127.0.0.1:8765/index.html'; $env:ROOST_CDP_PORT='9223'; node tests/run-layout-cdp-tests.mjs
```

Do not upload old standalone Mission Control or PMD Toolkit files. Mission Control Academy is already integrated into `index.html`.

## Deploy On GitHub Pages

1. Create a GitHub repository.
2. Upload the required files into the repository root.
3. Go to **Settings -> Pages**.
4. Set **Source** to `Deploy from a branch`.
5. Select branch `main` and folder `/ (root)`.
6. Open:

```text
https://<your-username>.github.io/<repo-name>/
```

Because the entry file is `index.html`, no route configuration is needed.

## Install As An App

On iPhone:

1. Open the GitHub Pages URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. When the offline shell is ready, The Roost can show an **Offline-ready** notice near the launcher. If the device goes offline, that notice changes to explain that local links and tools still work while live headlines pause.
5. After scrolling, use the floating **Back to top** button above the tool dock to jump back to the launcher.
6. Launch The Roost from the installed icon.

On desktop Chrome or Edge, use the install icon in the address bar when available.

## Offline Behavior

The service worker in `sw.js` caches the app shell:

- `./`
- `./index.html`
- `./manifest.json`
- local icons

Cross-origin resources such as RSS proxies, feeds, and remote favicons are not cached by the service worker. That keeps the offline cache clean and avoids accidentally storing third-party responses.

Live headlines still require a network connection, but the page and curated links remain available offline.

## Customization Guide

Most future edits live at the bottom of `index.html` in the clearly marked **ROOST UPGRADE LAYER**.

Useful places to edit:

- `WIRE_FEEDS`: Roost Wire topic buckets.
- `SECTION_FEEDS`: headline strips by section id.
- `CUSTOM_FEEDS_KEY`: local custom RSS/Atom feed subscriptions.
- `ROOST_MISSION_CONFIG`: Academy plan, projects, resources, side quests, leadership, achievements.
- `TOOLS`: dock tiles and actions.
- `CUSTOM_LINKS_KEY` / `CUSTOM_SECTIONS_KEY`: local custom link and section schemas.
- `VIEWS_KEY`: saved local home views.
- `ACCESSIBILITY_KEY`: optional local display preferences.
- `LINK_HEALTH_KEY`: manual link-health results.
- `WB_METHODS`: Workbench templates.
- `DIAGRAMS`: Concept Diagram topics.

The original curated-link code uses the `kfl_` localStorage namespace. Upgrade-layer additions use the `roost_` namespace.

## Design Notes

The Roost is designed as a daily-use operational page, not a marketing site. The interface prioritizes:

- dense but scannable information,
- fast navigation,
- predictable controls,
- mobile usability,
- graceful failure,
- low maintenance,
- and preserving the curated link corpus.

The result is intentionally personal: a little command center, a little library, a little classroom, a little dashboard.

## Current Integrity Snapshot

- 762 link cards
- 33 static sections
- Mission Control Academy available as an optional setup module under Quick Access
- 24 Academy cycles
- 240 Academy missions
- 97 Academy resources
- 120 side quests
- 23 leadership lessons
- 6 portfolio projects
- 18 achievements
- PWA manifest and service worker included

## License

Personal project. Add a formal license if this repository will be shared, forked, or reused by others.
