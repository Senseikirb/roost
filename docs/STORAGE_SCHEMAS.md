# Local storage and recovery

Source audit: September 2026. `index.html` remains the schema source of truth. All data belongs to the current browser origin; standalone Where To and RFSoC Explorer hold their controls in memory and do not add persistent keys. There is no server, account, synchronization, or usage telemetry.

## Recovery contract

Full backups retain the `the-roost.localStorage.v1` envelope and raw string values, including legacy and unknown future `kfl_*` / `roost_*` keys. Additive `metadata` reports schema version, data categories, approximate UTF-8 bytes, key count, and exclusions. `exportedAt` records export time. Sizes describe stored key/value content, not browser quota or the final indented download size.

All keys in the table are included in full backup and eligible for restore unless the table says otherwise. Missing keys in an import are preserved. Known JSON shapes and link protocols are validated before any write; invalid known entries reject the whole import. Unknown prefixed extension keys remain opaque, so their original bytes survive backup/restore. Configuration packs allow only the seven explicitly marked keys and exclude private progress. Packs replace matching categories; they do not merge individual records.

Restore preview shows new, replaced, and unchanged keys, categories, and approximate size. Before replacing data, restore and configuration-pack import require a saved, readable one-step recovery snapshot. A failed write rolls back values already written; the UI reports failure instead of partial success. If rollback also fails, the recovery snapshot stays available. Undo uses the same rollback path and keeps its snapshot when unsuccessful. Reload applies the restored UI state.

The shared storage reader uses defaults for malformed JSON and unexpected top-level types without deleting or rewriting the original bytes. Collection readers isolate malformed records. If custom sections are damaged, orphaned links appear in a temporary recovery section without changing section bytes or link references. These are defensive reads, not schema migrations. Existing startup writes for profile settings, daily quests, achievements, and shell status still occur. Editing a damaged subsystem can save its normalized state; export first when recovering important data. LocalStorage is not transactional across tabs, and simultaneous edits in another open Roost tab are not coordinated.

## Schema map

“Key version” means the version is encoded only in the key, with no envelope field. Optional fields are omitted below when they do not change compatibility. Config pack “No” means deliberately excluded from shareable packs, not excluded from full backups.

| Key | Schema / purpose / expected structure | Migration and bounds | Config pack |
| --- | --- | --- | --- |
| `kfl_pins_v1` | Key version 1; favorites, array of `{href,label,desc}` | Safe HTTP(S) links; old keys retained. UI writes up to 24 pins; imported arrays are preserved. | No |
| `kfl_recent_v1` | Key version 1; recent links, array of `{href,label,desc}` | Same legacy representation; both paths write up to 8 recent items. No behavioral score. | No |
| `kfl_collapsed_v1` | Key version 1; array of collapsed section IDs | Original and upgrade section controls share the same set; dynamic IDs may remain after a section disappears. | No |
| `kfl_v3_view` | Legacy raw string; selected original section view, such as `all` | Not JSON; preserved verbatim. | No |
| `kfl_v3_compact` | Legacy raw `0` / `1`; global card density | Not a JSON envelope; onboarding mirrors its density here. | No |
| `roost_settings_v1` | Key version 1; object with `headlines`, `newsMode`, `searchScope`, `ambient`, `wireCollapsed`, `todayCollapsed` and additive settings | Defaults merged in memory; old settings remain valid. Onboarding also mirrors news and density choices. | No |
| `roost_onboarding_v1` | `{version:1,profile,completed,skipped,step,data,layoutApplied,createdAt,updatedAt}`; `data` contains display name, use, modules, news, density, visual mode, starter sections | Meaningful pre-onboarding data creates a `legacy-personal` profile with `migratedFrom`. Defaults fill missing fields; existing user data remains. Name 40 chars, custom use 80. | No; contains personal name |
| `roost_launcher_minimized_v1` | JSON number `0` / `1`; Section Launcher disclosure | Existing numeric flag retained. | No |
| `roost_mission_intro_v1` | Key version 1; `{hidden,updatedAt}` | Missing state shows optional intro when Academy is disabled. | No |
| `roost_mission_v1` | Key version 1; object with completed missions, notes, start date, selected cycle, filters, mission statement, resource status/query, side quests, leadership, projects | Missing new maps get defaults. Legacy `projectData` alias is recognized. Statement 500 chars, resource query 80; mission notes generally 2,000. | No; personal progress |
| `missionControlRPG_v3` | Legacy standalone Academy object; `activities`, `rpg`, `resourceStatus`, `projectData`, `bonusQuests`, `leadershipStatus` | When modern state is absent, maps `wN_aN` activities/completion/notes, statement, resources, projects, side quests, and leadership to modern key. Old key is retained. | No; personal progress |
| `roost_mission_tab_v1` | JSON string; `deck`, `board`, `library`, `quests`, `projects`, `portfolio` | Unknown tab falls back through UI tab selection. | No |
| `roost_workbench_v1` | Key version 1; note array `{id,title,method,body,t,pinned}` | Missing IDs derived defensively; pin field optional. Read/write max 100; body 12,000 chars, title 120. | No; private notes |
| `roost_readlater_v1` | Key version 1; array `{title,link,source,date,savedAt,status,priority,note,archived,updatedAt}` | Legacy `href` and `archived` supported. Status `new/reading/done/archived`; priority `high/normal`; save max 200, note 800 chars. | No; private reading list |
| `roost_session_v1` | `{version:1,status,goal,timebox,links,note,summary,createdAt,updatedAt,completedAt}` | One current/last session; status derived for older goal-only records. Empty session removes this key. Goal 120, links/summary 800, note 1,000 chars. | No; private work |
| `roost_quests_v1` | `{version:1,date,quests,updatedAt}`; three local Daily Quest records including completion timestamps | Daily date/version/pool mismatches generate the deterministic current deck. Old day is not a historical log. | No; daily progress |
| `roost_boards_v1` | Key version 1; array `{id,name,links,templateId?,createdAt?,updatedAt?}`; link records contain `href,title,desc,section,addedAt,source?` | Template merge preserves prior links; UI saves max 40 boards and template path max 80 links. Manual board links are not globally capped. | **Yes**; board names/links are shared |
| `roost_link_notes_v1` | Key version 1; map keyed by URL, values `{title,section,status,rating,tags,note,updatedAt}` | Optional local tags normalized to 12 × 32 chars; notes 1,000 chars. Orphan notes retained if link disappears. | No; private annotations |
| `roost_achievements_v1` | Key version 1; map of achievement IDs to `{unlockedAt,trigger}` | Missing achievements derived from existing local state; no separate analytics history. | No; personal progress |
| `roost_custom_sections_v1` | Key version 1; array `{id,title,order,hidden,importBatchId,createdAt,updatedAt}` | Normalized IDs/order; malformed records isolated, title 80 chars. No global count cap. | **Yes** |
| `roost_custom_links_v1` | Key version 1; array `{id,title,url,description,sectionId,tags,icon,favorite,hidden,importBatchId,createdAt,updatedAt}` | Legacy `href/label/desc/section` aliases supported. Safe HTTP(S) only; title 120, description 500, tags 12 × 32, icon 12 chars. No global count cap. | **Yes** |
| `roost_import_history_v1` | Key version 1; array `{id,importedAt,type,mode,imported,skipped,linkIds,sectionIds,undoneAt,removedLinks,removedSections}` | Latest 20 batches; each records max 1,000 links / 200 section IDs. Import undo removes only batch-created links and empty created sections. | No; local undo history |
| `roost_custom_feeds_v1` | `{version:1,feeds,updatedAt}`; feeds `{id,label,url,wire,sectionId,createdAt,updatedAt}` | Legacy plain array and `xmlUrl/title` aliases accepted. Safe HTTP(S), max 80 feeds, label 40 chars. | **Yes** |
| `roost_layout_v1` | `{version:1,preset,topOrder,sectionOrder,hidden,sizes,updatedAt,migratedFrom?}` | Unknown widgets filtered in memory, known missing IDs appended, launcher locked visible. Different version recorded as `migratedFrom`; no key rename. | **Yes** |
| `roost_views_v1` | `{version:1,activeId,custom,updatedAt}`; custom records `{id,name,desc,layout,settings,collapsed,createdAt,updatedAt}` | Defaults normalize old values; max 20 saved views and 120 collapsed IDs each. Names 60 chars, descriptions 140. | **Yes** |
| `roost_accessibility_v1` | `{version:1,textScale,contrast,focus,motion,updatedAt}` | Enum defaults; missing preferences use standard UI and system motion. | **Yes** |
| `roost_link_health_v1` | `{version:1,results,updatedAt}`; URL-keyed manual check results | Checks are explicit and bounded per batch; accumulated result map has no global cap. | No; local diagnostics |
| `roost_shell_status_v1` | `{version:1,lastOnlineAt?,lastShellReadyAt?,lastShellErrorAt?,serviceWorker?,updatedAt,...}` | Device/browser-local status; full backup includes it for compatibility, but it is not proof the receiving browser has cached the shell. | No; device status |
| `roost_tip_state_v1` | `{version:1,dismissedDate,tipId,updatedAt}` | Only current daily dismissal matters. | No |
| `roost_recent_commands_v1` | Key version 1; array `{title,meta,usedAt}` | Latest six command titles; current commands resolve at use time. Clear from Backup / Restore. | No; private usage history |
| `roost_backup_meta_v1` | `{version:1,lastExportedAt,method}` | Records a local download/copy action, not verification that a durable backup exists. | No; local status |
| `roost_restore_undo_v1` | `{version:1,createdAt,keys,previous}`; each previous entry `{existed,value}` | Exact old strings captured before restore/pack writes. One step only; successful undo removes snapshot. **Excluded from export and imported restore data.** | No |
| `roost_feed_*` | Key-specific cache `{t,items}`; headline records contain title/link/description/date/source | Temporary cache; enabled only by export checkbox, eligible for restore. Cache age remains based on original timestamp. | No |
| `roost_next_step_skipped` | **sessionStorage**, raw current-day key | Session-only Next learning step dismissal; never included in localStorage backup/restore. | No |

## Remaining bounded scope

The recovery change does not rename keys, change schema versions, delete orphan references, impose new destructive global limits, or silently rewrite a damaged collection. Large custom collections, manual board lists, note maps, and health history can still approach browser quota. Ordinary feature save helpers return a failure signal, but not every existing feature surfaces that signal yet. A full backup may contain privately named boards, notes, reading history, and progress; configuration packs deliberately include board names/URLs and custom link/source configuration, so review those before sharing.

The validation suite `tests/run-storage-tests.mjs` executes the production storage functions with a controlled storage adapter. It tests corrupt input, legacy compatibility, export exclusions, exact undo, preview counts, snapshot quota failure, partial-write rollback, failed-undo retry, and configuration-pack privacy boundaries. Browser journeys supplement these checks.
