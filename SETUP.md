# The Roost - Setup Guide

Your personal homepage and command center. The current bundle includes 738 curated link cards, Kid Zone, Creative Writing, Philosophy & Ethics, Leadership & Management, Battle History & Maps, Defense & National Security, a privacy-preserving first-run setup, saved home views, a visual layout editor, a daily dashboard, live headlines, custom RSS sources, a mode-aware Roost Wire board, read-later saves, personal boards with starter templates, link notes with local tags, accessibility preferences, manual link-health checks, the dock tools, and an optional Mission Control Academy example profile.

## What's In This Folder

| File | What it is | Required? |
|---|---|---|
| `index.html` | The Roost single-page app | Yes |
| `manifest.json` | PWA install metadata | Yes for install |
| `sw.js` | Offline shell service worker | Yes for offline |
| `icon-180.png`, `icon-192.png`, `icon-512.png`, `favicon-32.png` | App icons | Yes for install |
| `iq-rfsoc-explorer.html` | Optional sibling tool opened by the dock RFSoC tile | Optional |

Keep everything in the same folder. The page is vanilla HTML/CSS/JS: no build step, no npm, no framework.

## Validate Before Publishing

Run the no-dependency validation bundle from the repo root:

```text
node tests/run-roost-validation.mjs
```

By default it checks the curated link count, section count, tag balance, manifest JSON, manifest icon files, inline script syntax, `sw.js` syntax, and custom import parser fixtures. To include the browser/runtime suite, serve the page over HTTP and launch Chrome with remote debugging, then run:

```text
$env:ROOST_APP_URL='http://127.0.0.1:8765/index.html'
$env:ROOST_CDP_PORT='9223'
node tests/run-roost-validation.mjs
```

## Launcher Shortcuts

The search surface directly under the header is the main launcher for links, sections, and Roost tools.

- `/`: focus the launcher.
- `Ctrl+K` or `Cmd+K`: open/focus the launcher.
- `Arrow Up` / `Arrow Down`: move through grouped launcher results.
- `Enter`: activate the selected result.
- `Escape`: close the launcher and restore focus.
- `?`: open the Quick Start help panel.

The enhanced launcher uses the existing page search/filter behavior for link results, so the inline search still works as a fallback if enhanced behavior fails.

Command matches count as launcher results even when no link cards match, which keeps searches such as `import`, `backup`, or `setup` from showing a misleading no-results state.

The Quick Start panel is also available from the launcher command **Open Help**. The launcher command **Keyboard Shortcuts** opens a compact shortcut-only reference. Quick Start provides direct actions for Add Link, Import Bookmarks, News Feeds, Home Views, Edit Layout, Run Setup Again, Backup / Restore, Read Later, Headlines, Accessibility, Link Health, Mission Control, and Workbench.

The launcher stores a short local-only Recent Commands list under `roost_recent_commands_v1`. Use Backup / Restore -> Clear Recent Commands to erase it.

## Layout Editor

Use **Edit Layout** in the Section Launcher controls, the dock, or the command launcher to arrange the homepage without editing source code.

What it stores:

- Key: `roost_layout_v1`
- Schema version: `version: 1`
- Top widget order: launcher, Roost Wire, Today
- Homepage section order: Section Launcher, Favorites, Recent, Mission Control, built-in sections, and custom sections
- Hidden widgets
- Compact or comfortable widget sizes
- Selected preset name

Presets:

- **Default**: normal homepage order.
- **Morning**: Today and news-oriented sections higher.
- **Learning**: Mission Control, AI, coding, research, and course sections higher.
- **Quiet**: compact sections and Roost Wire hidden.
- **Custom**: any manual Move, Hide, Show, or Size edit.

Preset changes show a preview before applying. The Search / Launcher widget is locked visible so there is always a recovery path. Collapsed sections are not overwritten; they remain stored separately in `kfl_collapsed_v1`.

The launcher command **Apply Calm Start** applies the Quiet preset immediately and also collapses Wire and Today in `roost_settings_v1`. It is meant as an explicit mobile-friendly reset, not an automatic migration for existing users.

## Saved Home Views

Use **Home Views** from Today, the dock, Quick Start, or the command launcher to switch local homepage contexts.

Built-in views:

- **Morning Scan**: Today and news-forward.
- **Learning Sprint**: Mission Control and learning sections forward.
- **Quiet Desk**: compact, calm, and less news-heavy.
- **Family Mode**: family, cooking, health, Kid Zone, and everyday links.
- **Research Desk**: research, AI learning, news, and security links.

Custom views are stored under `roost_views_v1` and can capture the current layout snapshot, search scope, Roost Wire mode, Wire/Today collapse state, and collapsed sections. Backup / Restore includes this key automatically.

Home Views also includes **Current View Snapshot**, an on-demand Markdown export of the currently visible sections and links. It stores no new key, excludes link notes/private annotations, and includes Read Later titles only when the checkbox is enabled.

Manual verification:

- Desktop: open Edit Layout, apply Morning after preview, move a section down, hide and show Roost Wire, choose Compact for a section, reset that section, then Reset Defaults.
- Keyboard only: open with `Ctrl+K`, choose Edit Layout, Tab through controls, activate Move Up/Move Down/Hide/Show/Reset with Enter or Space, then Escape to close.
- Mobile touch: verify the editor opens as a bottom sheet at 360px and 390px widths, buttons remain tappable, and Done closes editing mode.

## Boards

Use **Boards** from the dock or command launcher to group links into local workflows. Each link card also has a Board action for adding that card to a named board.

The Boards panel includes starter templates for Morning Launch, AI Build Sprint, Research Desk, and Family Admin. Templates resolve against existing safe `http` / `https` Roost links, skip missing links, merge when reapplied, and store the result only in `roost_boards_v1`.

## Custom Links

Use **Add Link** or **Import Bookmarks** beside the launcher, from Quick Start, from the dock, or from `Ctrl+K` / `Cmd+K` to customize local links without editing `index.html`.

Custom link fields:

- title
- URL
- description
- section
- tags
- optional custom icon
- favorite status

The **Custom Links** dock tool manages local sections and import/export:

- Sections: create, rename, reorder, hide, and delete.
- Links: edit, move, duplicate, and delete.
- Import: browser bookmark HTML, Roost JSON, CSV, and compatible OPML feed subscriptions.
- Feeds: add safe `http` / `https` RSS or Atom sources to Roost Wire, section headline strips, or both.
- Export: custom links and custom sections as Roost JSON.

Imports are previewed before they write localStorage. Duplicate URLs are detected against built-in and custom links and can be skipped, merged into existing custom links, or imported anyway. Built-in links are read-only, so Merge skips built-in duplicates instead of modifying them. New links and new empty sections from the latest import batch can be removed with **Undo Last Import**; merge edits to existing links are not silently rolled back.

CSV example:

```csv
title,url,description,section,tags,favorite
OpenAI Docs,https://platform.openai.com/docs,API reference,Research,"ai,docs",true
Local News,https://example.com/news,Daily local source,News,local,false
```

Roost custom JSON exports use schema `the-roost.custom-links.v1`. Full Backup / Restore also includes `roost_custom_links_v1`, `roost_custom_sections_v1`, custom feeds under `roost_custom_feeds_v1`, and compact import history under `roost_import_history_v1`.

Backup / Restore includes a **Memory Health** card showing local Roost key count, approximate storage size, custom link/note/feed/view counts, and the last export timestamp. The timestamp is stored locally in `roost_backup_meta_v1` after Download Backup or Copy JSON. Backup restores also create a transient one-step `roost_restore_undo_v1` snapshot so **Undo Last Restore** can put overwritten keys back before you reload.

Backup / Restore also includes **Configuration Pack** export/import with schema `the-roost.config-pack.v1`. Packs are for shareable local setup surfaces only: custom links, custom sections, custom feeds, saved views, boards, accessibility preferences, and layout. They intentionally exclude Mission Control progress, recents, Read Later, Workbench notes, link notes, and feed caches.

## First-Run Setup And Privacy

New public users see a short setup wizard that asks for an optional display name, intended use, enabled modules, live news preference, density, visual mode, and starter sections. The wizard can be skipped, resumed if interrupted, or opened later from **Run Setup Again** in the dock or command launcher.

Setup is stored under `roost_onboarding_v1` in this browser only. The Roost does not create accounts, send telemetry, use analytics, sync to the cloud, or call an external setup API.

Existing users with meaningful `kfl_*` or `roost_*` memory are migrated to a completed onboarding state so their current personal setup continues working. The current Mission Control curriculum remains available as an optional example profile, not the universal public default.

If the Mission Control example is disabled, a dismissible intro card below Quick Access explains the academy and offers a preview without creating Mission Control progress. Hiding that card stores only `roost_mission_intro_v1`.

The Today dashboard can show one dismissible **Local Tip** per day. Dismissal is stored only in this browser under `roost_tip_state_v1`; it does not track whether you followed the tip.

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
4. The small launcher status strip can show **Offline-ready** after the service worker is ready, or **Offline** when the browser loses network access. This status is stored locally under `roost_shell_status_v1`; live headlines pause offline, but curated links and local tools remain usable.
5. After scrolling, the floating **Back to top** button sits above the tool dock so you can return to the launcher from anywhere on the page.

## Live Headlines

The Roost Wire and per-section headline strips pull public RSS/Atom feeds in the browser through public CORS proxies (`allorigins.win`, `corsproxy.io`). They are best-effort by design:

- If a feed or proxy fails, the headlines hide or show an unavailable message.
- The curated links are never blocked by headline failures.
- Feed results are cached in `localStorage` for 30 minutes.
- Cached feed data is preferred for the Wire when available, so the board appears faster on repeat visits.
- Headline cards can show **Cached** or **Stale** freshness labels based on the local `roost_feed_*` cache timestamps.
- Refresh buttons update the Wire or a section strip in place. They only touch feed data and do not reset Mission Control Academy progress.
- Roost Wire topic cards include a **More** action for rotating that topic's headline without switching or narrowing the active Wire mode.
- Custom RSS/Atom feeds are stored locally under `roost_custom_feeds_v1` and reuse the same proxy, parser, cache, and graceful-fallback path as built-in feeds.
- Roost Wire modes let you narrow the board to Tech, Defense, AI, Gaming, Finance, World/Priority, or Quiet.
- Roost Wire and Today can be collapsed independently. Their collapsed/expanded state is remembered in local settings.

Use the dock's "Headlines: on/off" control to disable or re-enable headline surfaces. The setting is saved under `roost_settings_v1` and mirrored into `roost_onboarding_v1` so it survives future setup-aware reloads.

## Mission Control Academy

The Academy is integrated into The Roost as an optional native section directly under Quick Access. It uses `ROOST_MISSION_CONFIG` in the bottom upgrade layer and saves progress under `roost_mission_v1`.

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

When Mission Control is enabled, the Today dashboard can show a **Next learning step** card with Start and Skip Today. Skip Today is stored in `sessionStorage` for the current browser session only and does not edit `roost_mission_v1`.

Legacy Mission Control progress from `missionControlRPG_v3` is migrated defensively when present.

## Local Memory

The Roost stores memory only in the browser's `localStorage`; there is no account, server, sync, or cloud database.

- Original curated-link features use `kfl_` keys, including `kfl_pins_v1`, `kfl_recent_v1`, and `kfl_collapsed_v1`.
- Upgrade-layer settings use `roost_` keys, including `roost_settings_v1`, `roost_launcher_minimized_v1`, `roost_mission_v1`, `roost_mission_tab_v1`, and `roost_workbench_v1`.
- First-run setup uses `roost_onboarding_v1` for the versioned local profile, module choices, display name, news preference, density, visual mode, and starter sections.
- Local customization uses `roost_custom_links_v1` and `roost_custom_sections_v1`.
- Custom RSS/Atom feed subscriptions use `roost_custom_feeds_v1`.
- Layout customization uses `roost_layout_v1` for widget order, hidden widgets, compact/comfortable sizes, and selected preset.
- Saved Home Views use `roost_views_v1` for named local contexts.
- Accessibility preferences use `roost_accessibility_v1` for text size, contrast, focus rings, and reduced motion.
- Manual link-health results use `roost_link_health_v1`.
- `roost_settings_v1` stores the headline toggle, Roost Wire mode, search scope, Cozy Mode, and the remembered Wire/Today collapsed state.
- Mission Control Academy stores completed missions, notes, selected filters, mission statement, resource status, side quests, leadership lessons, project data, and the active tab.
- Workbench stores saved notes and local pin state under `roost_workbench_v1`.
- Read Later stores saved headline/article links, status, priority, and local notes under `roost_readlater_v1`.
- Session Planner stores the current or last local timeboxed session under `roost_session_v1`.
- Daily Quest Deck stores the current local quest draw under `roost_quests_v1`.
- Boards, Link Notes, Cozy Mode, search scope, and Roost achievements use `roost_boards_v1`, `roost_link_notes_v1`, `roost_settings_v1`, and `roost_achievements_v1`. Achievement next-badge hints are derived from existing local state and do not add a separate storage key. Boards may include optional starter-template metadata; Link Notes can also store local tags for built-in links.
- Custom import undo history uses `roost_import_history_v1`; restore undo snapshots use transient `roost_restore_undo_v1` and are excluded from backup exports.

## Accessibility And Link Health

The **Accessibility Preferences** tool stores optional text size, stronger contrast, stronger focus rings, and reduced-motion choices under `roost_accessibility_v1`. These settings are local-only and do not change the curated link corpus.

The **Link Health** tool is manual and on-demand. It checks small batches of visible, favorite, recent, or custom links and stores the latest results under `roost_link_health_v1`. It also renders local coverage counts, per-section coverage, oldest visible check age, and a copyable Markdown report. Browser CORS rules often hide exact HTTP status, so a "reached" result means the browser could contact the site, not that every destination page is semantically valid.

Clearing site data for the hosted Pages URL will clear this memory.

### Backup / Restore

Use the dock's **Backup / Restore** tool before major edits, browser cleanup, or moving devices. It downloads a JSON snapshot of The Roost memory keys. Restore validates the snapshot, writes only allowed Roost keys, and never deletes keys that are missing from the backup. Before writing restored keys, it captures a one-step undo snapshot for **Undo Last Restore**. Cached headline feeds are excluded unless the "Include cached headline feeds" box is checked.

Use **Configuration Pack** when you want a smaller, shareable setup template instead of a full personal backup. Use **Current View Snapshot** when you want a readable run sheet of the page that is currently visible.

## Tweaking It Later

All additive behavior lives at the bottom of `index.html` inside `ROOST UPGRADE LAYER`.

- `WIRE_FEEDS`: six Roost Wire topic buckets.
- `SECTION_FEEDS`: per-section headline strips.
- `CUSTOM_FEEDS_KEY`: local custom RSS/Atom subscriptions, currently `roost_custom_feeds_v1`.
- `ROOST_MISSION_CONFIG`: Academy plan, resources, side quests, projects, achievements.
- `TOOLS`: dock tiles and actions.
- `CUSTOM_LINKS_KEY` / `CUSTOM_SECTIONS_KEY`: local customization schema keys.
- `LAYOUT_KEY`: optional visual layout schema key, currently `roost_layout_v1`.
- `VIEWS_KEY`: saved home view schema key, currently `roost_views_v1`.
- `ACCESSIBILITY_KEY`: optional display preference key, currently `roost_accessibility_v1`.
- `LINK_HEALTH_KEY`: manual link-health result key, currently `roost_link_health_v1`.
- `QUEST_KEY`: Daily Quest Deck key, currently `roost_quests_v1`.
- `WB_METHODS`: Workbench templates.
- `DIAGRAMS`: Concept Diagram topics.
- `ROOST_ACHIEVEMENTS`: cross-page achievement definitions and closest-next-badge hint sources.

The original curated link cards use the `kfl_` localStorage namespace. Upgrade-layer features use the `roost_` namespace.

## Quick Sanity Checklist

- 738 curated link cards preserved.
- Static link sections preserved, plus Pinned/Recent utility sections and the dynamic Academy section.
- "new" chips removed from link cards.
- Dead standalone Mission Control and PMD Toolkit dock tiles removed.
- Section Launcher can be minimized on mobile or desktop.
- All sections can be collapsed/expanded from the Section Launcher controls.
- Edit Layout can reorder, hide/show, compact, reset, and apply previewed presets without editing source.
- Home Views can apply built-in or custom saved local contexts.
- Custom RSS feeds can appear in Roost Wire and section headline strips.
- Accessibility preferences can be saved and reset locally.
- Manual Link Health can render saved check results without touching links.
- Mission Control Academy can be enabled from setup and minimized like the link sections.
- News-enabled sections are moved above non-news sections after Quick Access and AI.
- When enabled, Mission Control Academy sits directly under Quick Access.
- PWA install and offline shell remain intact.

Optional validation commands:

```text
node tests/run-custom-import-parser-tests.mjs
$env:ROOST_APP_URL='http://127.0.0.1:8765/index.html'; $env:ROOST_CDP_PORT='9223'; node tests/run-layout-cdp-tests.mjs
```
