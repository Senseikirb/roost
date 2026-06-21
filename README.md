# The Roost

**The Roost** is a single-page personal command center: part homepage, part live intelligence board, part learning platform, and part thinking workspace. It is built to be fast, durable, installable, and useful every day without needing a backend, build step, framework, or account.

At its core, The Roost is a carefully curated launchpad: **689 hand-picked links across 28 sections**. Around that foundation it adds a daily dashboard, live RSS headlines, read-later saves, personal boards, offline-first PWA support, a lightweight tool dock, Workbench notes, concept diagrams, Kid Zone, Creative Writing resources, and a fully integrated **Mission Control Academy** for long-range career development.

## Why It Exists

Most personal homepages are either pretty link dumps or heavy dashboards that need accounts, APIs, databases, and maintenance. The Roost aims for a different balance:

- **Fast enough to open constantly**
- **Organized enough to replace scattered bookmarks**
- **Useful offline**
- **Personal enough to grow with the owner**
- **Simple enough to deploy on GitHub Pages**

It is intentionally vanilla: one main HTML file, one manifest, one service worker, local icons, and browser-local storage.

## Highlights

- **689 curated link cards** across AI, coding, RF, embedded systems, game dev, writing, finance, security, family, homestead, cooking, news, sports, Kid Zone, and more.
- **Mission Control Academy** integrated directly under Quick Access.
- **24-cycle learning plan** with 240 core missions, 97 resources, 120 side quests, 23 leadership lessons, 6 projects, and 18 achievements.
- **Today Dashboard** with current Mission Control progress, focus missions, read-later count, boards, notes, and badges.
- **Roost Wire**, a six-topic live news board with modes for Tech, Defense, AI, Gaming, Finance, World, and Quiet.
- **Per-section headline strips** for sections that benefit from fresh context.
- **Read Later** saves for articles from Roost Wire and section headlines.
- **Personal Boards** for grouping favorite links into custom workflows.
- **Scoped search** across links, Mission Control, news-enabled sections, and saved local items.
- **Link Notes** for per-link notes, ratings, and review status.
- **Cozy Mode** for a softer, calmer visual mode.
- **Roost achievements** for cross-page usage milestones.
- **Workbench** for saving local notes from structured thinking templates.
- **Concept Diagrams** for quick visual explanations.
- **Section Launcher** with minimize and collapse/expand-all controls.
- **Offline-first PWA shell** for GitHub Pages and iOS home-screen install.
- **No framework, no build step, no npm install, no server.**

## Mission Control Academy

Mission Control Academy turns The Roost from a homepage into a lightweight educational platform. It is not a separate app or external page anymore; it is built directly into `index.html`.

Academy views:

- **Command Deck**: current cycle, XP, rank, mission statement, and focus missions.
- **Mission Board**: cycle/track/mode filters, completion toggles, and mission notes.
- **Academy Library**: resource tracking plus leadership lessons.
- **Side Quests**: optional certification, build, learning, and portfolio challenges.
- **Projects**: portfolio project status, task checklists, links, and notes.
- **Portfolio**: summary, achievements, project status, and export packet.

Progress is saved locally in the browser under `roost_mission_v1`. Legacy standalone Mission Control progress from `missionControlRPG_v3` can be migrated defensively when present.

## Live Headlines

The Roost uses public RSS/Atom feeds for its news surfaces:

- `WIRE_FEEDS` powers the six-topic Roost Wire board.
- `SECTION_FEEDS` powers section-level headline strips.
- Public CORS proxies are used because the site has no backend.
- Results are cached in browser storage for 30 minutes.
- Refresh buttons on Roost Wire and each headline strip swap headlines in place without reloading the page.
- If feeds or proxies fail, the headline areas degrade gracefully. The curated links still work.

This means The Roost stays simple and deployable while still surfacing fresh information.

## Local Memory

The Roost stores memory in browser `localStorage`. There is no cloud sync, server account, database, or analytics pipeline.

Important keys:

- `kfl_pins_v1`: pinned/favorite link cards.
- `kfl_recent_v1`: recently opened links.
- `kfl_collapsed_v1`: collapsed section state.
- `roost_settings_v1`: upgrade-layer settings such as headline toggle.
- `roost_launcher_minimized_v1`: Section Launcher minimized state.
- `roost_mission_v1`: Mission Control Academy progress.
- `roost_mission_tab_v1`: active Academy tab.
- `roost_workbench_v1`: Workbench saved notes.
- `roost_readlater_v1`: saved headline/article links.
- `roost_boards_v1`: personal link boards.
- `roost_link_notes_v1`: per-link notes, ratings, and status.
- `roost_achievements_v1`: unlocked Roost-wide achievements.

Clearing site data for the hosted URL clears this memory.

## Backup And Restore

The dock includes a **Backup / Restore** tool for local memory. It exports The Roost's `kfl_*`, `roost_*`, and legacy Mission Control keys to a JSON file. Cached news feeds are skipped by default because they are temporary; the panel has an opt-in checkbox if you want them included.

Restore is intentionally conservative: it validates the backup schema, writes only The Roost keys, overwrites matching keys, and does not delete other browser storage. After restore, reload the page to apply restored UI state.

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
```

The RFSoC Explorer dock tile expects `iq-rfsoc-explorer.html` as a sibling file. If it is not present, the rest of The Roost still works.

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
4. Launch The Roost from the installed icon.

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
- `ROOST_MISSION_CONFIG`: Academy plan, projects, resources, side quests, leadership, achievements.
- `TOOLS`: dock tiles and actions.
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

- 689 link cards
- 28 real link sections
- Mission Control Academy integrated directly under Quick Access
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
