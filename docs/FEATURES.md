# Using The Roost

## Daily Desk And Library

Choose how much of Roost to see using the three buttons above the launcher:

- **Daily desk**: Today, enabled Wire, Quick Access, Favorites, and Recent. Saved layouts still determine their order and visibility.
- **Library**: find a section by name or category, then browse that section with a persistent **All sections** return. Library tools contains density, random exploration, map copying, and layout controls.
- **Full page**: the original complete homepage with its saved layout, section groups, and collapse controls.

These are three presentations of the same content. All 785 curated cards remain intact, and global launcher searches cross the library's category filter. Section jumps can temporarily reveal a layout-hidden section without changing the layout. Opening a collapsed section expands it as before.

The choice is stored in `roost_settings_v1.homeSurface`. Missing preferences default to Daily desk unless an existing saved layout or legacy category choice should be preserved; those users retain Full page. Home Views apply their layout in Full page. Layout editing temporarily shows Full page, then returns to your chosen presentation. No new storage key or tracking is involved.

Workbench, Session Planner, and Link Notes protect unsaved edits when closing or switching tools, report failed saves without clearing the editor, and check for newer saved content before overwriting it. Keep a backup: these checks are not cross-tab synchronization, and browser shutdown warnings cannot protect against a crash or an OS terminating the app.

## Customize your desk

New visitors open directly on Daily desk. Choose **Customize desk** for an optional display name, modules, news visibility, density, colors and starter sections.

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

The launcher ranks exact titles, title prefixes, and title words before descriptive matches. Favorites and Recent provide small tie-breaks using existing local saves; there is no usage score or new tracking. Saved search includes favorite, custom and annotated links alongside Workbench notes, Read Later articles and Boards. On the Daily desk, a pinned note has priority. When space is available, **Continue writing** opens your latest unpinned note and keeps its title off the desk. Commands and section jumps share the same relevance order. If the enhanced launcher fails, the original inline search input still works as a link filter.

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
- Choose **Connect live feeds** to allow built-in public feeds to be retrieved using AllOrigins or corsproxy.io. Saved custom feeds need individual approval and a public HTTPS endpoint that permits direct browser requests. Disconnect to use only cached stories.
- Results are cached in browser storage for 30 minutes.
- Refresh buttons on Roost Wire and each headline strip swap headlines in place without reloading the page.
- Each Roost Wire topic has a local More action that rotates just that topic's headline without changing the active Wire mode.
- Headlines show per-story **Live**, **Cached**, or **Stale** labels; **Unavailable** indicates no usable results. Wire and section strips exclude dated stories older than 14 days. Disabling headlines cancels pending requests and observers; concurrent requests for one feed share the same work.
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

Restore validates the envelope and known data structures before writing, previews new/replaced/unchanged keys and categories, and requires a saved recovery snapshot. Failed writes roll back to the previous values, with explicit errors if browser storage also blocks recovery. **Undo Last Restore** covers backups and configuration packs. Missing keys are preserved. After restore or undo, reload the page to apply restored UI state. Exports include the schema, export date, categories, approximate UTF-8 data size, and transient exclusions. See [Storage schemas](STORAGE_SCHEMAS.md) for exact formats and limits.

The same panel includes **Configuration Pack** export/import with schema `the-roost.config-pack.v1`. Pack exports start with appearance and layout selected. Choose bookmarks and sections, feed addresses, views or boards to include them. Open **Review selected export** to inspect the exact JSON that Copy and Download will use. They exclude personal progress, recents, Read Later, link notes, Workbench notes, Mission Control progress, and feed caches.
