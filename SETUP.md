# The Roost - Setup Guide

Your personal homepage and command center. The current bundle includes 689 curated link cards across 28 link sections, Kid Zone, Creative Writing, a daily dashboard, live headlines, a mode-aware Roost Wire board, read-later saves, personal boards, link notes, the dock tools, and an integrated Mission Control Academy.

## What's In This Folder

| File | What it is | Required? |
|---|---|---|
| `index.html` | The Roost single-page app | Yes |
| `manifest.json` | PWA install metadata | Yes for install |
| `sw.js` | Offline shell service worker | Yes for offline |
| `icon-180.png`, `icon-192.png`, `icon-512.png`, `favicon-32.png` | App icons | Yes for install |
| `iq-rfsoc-explorer.html` | Optional sibling tool opened by the dock RFSoC tile | Optional |

Keep everything in the same folder. The page is vanilla HTML/CSS/JS: no build step, no npm, no framework.

## Deploy To GitHub Pages

1. Create or open the repo that hosts The Roost.
2. Upload the files into the repo root.
3. Go to Settings -> Pages.
4. Set Source to "Deploy from a branch", choose `main`, folder `/ (root)`, and save.
5. Open `https://<your-username>.github.io/<repo-name>/`.

## Add To iPhone Home Screen

1. Open the GitHub Pages URL in Safari.
2. Tap Share -> Add to Home Screen -> Add.
3. The installed app uses `manifest.json`, the Apple touch icon, and the offline shell cache in `sw.js`.

## Live Headlines

The Roost Wire and per-section headline strips pull public RSS/Atom feeds in the browser through public CORS proxies (`allorigins.win`, `corsproxy.io`). They are best-effort by design:

- If a feed or proxy fails, the headlines hide or show an unavailable message.
- The curated links are never blocked by headline failures.
- Feed results are cached in `localStorage` for 30 minutes.
- Cached feed data is preferred for the Wire when available, so the board appears faster on repeat visits.
- Refresh buttons update the Wire or a section strip in place. They only touch feed data and do not reset Mission Control Academy progress.
- Roost Wire modes let you narrow the board to Tech, Defense, AI, Gaming, Finance, World/Priority, or Quiet.

Use the dock's "Headlines: on/off" control to disable or re-enable headline surfaces. The setting is saved under `roost_settings_v1`.

## Mission Control Academy

The Academy is integrated into The Roost as a native section directly under Quick Access. It uses `ROOST_MISSION_CONFIG` in the bottom upgrade layer and saves progress under `roost_mission_v1`.

Current Academy data:

- 24 cycles
- 240 core missions
- 97 resources
- 120 side quests
- 23 leadership lessons
- 6 portfolio projects
- 18 achievements

Academy tabs:

- Command Deck: current cycle, XP, rank, mission statement, focus missions.
- Mission Board: cycle/track/mode filters, completion toggles, notes.
- Academy Library: resource tracking plus leadership lessons.
- Side Quests: optional certification, build, and learning missions.
- Projects: portfolio project status, task checklists, links, notes.
- Portfolio: progress summary, achievements, project status, export packet.

Legacy Mission Control progress from `missionControlRPG_v3` is migrated defensively when present.

## Local Memory

The Roost stores memory only in the browser's `localStorage`; there is no account, server, sync, or cloud database.

- Original curated-link features use `kfl_` keys, including `kfl_pins_v1`, `kfl_recent_v1`, and `kfl_collapsed_v1`.
- Upgrade-layer settings use `roost_` keys, including `roost_settings_v1`, `roost_launcher_minimized_v1`, `roost_mission_v1`, `roost_mission_tab_v1`, and `roost_workbench_v1`.
- Mission Control Academy stores completed missions, notes, selected filters, mission statement, resource status, side quests, leadership lessons, project data, and the active tab.
- Workbench stores saved notes locally under `roost_workbench_v1`.
- Read Later, Boards, Link Notes, Cozy Mode, search scope, and Roost achievements use `roost_readlater_v1`, `roost_boards_v1`, `roost_link_notes_v1`, `roost_settings_v1`, and `roost_achievements_v1`.

Clearing site data for the hosted Pages URL will clear this memory.

### Backup / Restore

Use the dock's **Backup / Restore** tool before major edits, browser cleanup, or moving devices. It downloads a JSON snapshot of The Roost memory keys. Restore validates the snapshot, writes only allowed Roost keys, and never deletes keys that are missing from the backup. Cached headline feeds are excluded unless the "Include cached headline feeds" box is checked.

## Tweaking It Later

All additive behavior lives at the bottom of `index.html` inside `ROOST UPGRADE LAYER`.

- `WIRE_FEEDS`: six Roost Wire topic buckets.
- `SECTION_FEEDS`: per-section headline strips.
- `ROOST_MISSION_CONFIG`: Academy plan, resources, side quests, projects, achievements.
- `TOOLS`: dock tiles and actions.
- `WB_METHODS`: Workbench templates.
- `DIAGRAMS`: Concept Diagram topics.
- `ROOST_ACHIEVEMENTS`: cross-page achievement definitions.

The original curated link cards use the `kfl_` localStorage namespace. Upgrade-layer features use the `roost_` namespace.

## Quick Sanity Checklist

- 689 curated link cards preserved.
- 28 real link sections preserved, plus Pinned/Recent utility sections and the dynamic Academy section.
- "new" chips removed from link cards.
- Dead standalone Mission Control and PMD Toolkit dock tiles removed.
- Section Launcher can be minimized on mobile or desktop.
- All sections can be collapsed/expanded from the Section Launcher controls.
- Mission Control Academy can be minimized like the link sections.
- News-enabled sections are moved above non-news sections after Quick Access and AI.
- Mission Control Academy sits directly under Quick Access.
- PWA install and offline shell remain intact.
