# AGENTS.md

## Purpose

The Roost is a local-first, static personal homepage and command center. It is a curated link hub, installable PWA, live headline board, local tool dock, learning/workspace surface, and optional Mission Control Academy example profile.

## Architecture

- Vanilla HTML/CSS/JavaScript only.
- No framework, bundler, backend, account system, analytics, advertising, payment system, or production dependency.
- `index.html` is the primary app. Most newer behavior lives in the bottom `ROOST UPGRADE LAYER`; inspect that area first for feature work.
- `manifest.json`, `sw.js`, and icon files provide PWA install and offline shell behavior.
- Browser `localStorage` is the data layer. Existing `kfl_*` and `roost_*` keys are user data and must be preserved.
- Public RSS/Atom feeds are fetched from the browser through public CORS proxies and cached locally. Feed data is untrusted.

## Important Files

- `index.html`: main app, curated links, UI, upgrade layer, local tools, feed handling, test hooks.
- `README.md`: product overview and feature documentation.
- `SETUP.md`: user setup, validation, GitHub Pages, iPhone install, and local-memory notes.
- `manifest.json`: PWA metadata and icon references.
- `sw.js`: service worker for offline shell caching.
- `iq-rfsoc-explorer.html`: standalone RFSoC/IQ tool linked from the dock.
- `roost-destination-finder.html`: standalone Where To trip finder linked from the dock.
- `tests/run-roost-validation.mjs`: main validation harness.
- `tests/run-layout-cdp-tests.mjs`: browser/CDP runtime validation.
- `tests/run-custom-import-parser-tests.mjs`: production parser fixture wiring check.

## Runtime And Tooling

- There is no package manager setup and no `npm install` step.
- Use a modern Node.js runtime for validation. The CDP suite expects a Node runtime with built-in `WebSocket`.
- Browser validation requires serving the app over HTTP and launching Chrome or Edge with remote debugging.
- Python's built-in `http.server` is a reliable local static server for browser validation.

## Commands

Static validation:

```powershell
node tests/run-roost-validation.mjs
```

Useful syntax checks:

```powershell
node --check sw.js
node --check tests/run-layout-cdp-tests.mjs
```

Browser validation:

```powershell
python -m http.server 8765 --bind 127.0.0.1
# In another shell, launch Chrome or Edge with --remote-debugging-port=9223.
$env:ROOST_APP_URL='http://127.0.0.1:8765/index.html'
$env:ROOST_CDP_PORT='9223'
node tests/run-roost-validation.mjs
```

## Coding Conventions

- Keep edits surgical and consistent with the existing single-file style.
- Prefer adding to or extending the upgrade layer over rewriting older curated markup.
- Do not delete or silently alter the curated link corpus.
- Treat URLs, RSS/Atom data, imports, JSON, and user-entered strings as untrusted.
- Escape rendered text with existing helpers and validate links with existing safe URL helpers.
- Preserve PWA install/offline behavior when touching shell files or app paths.
- Preserve localStorage data. Add explicit migrations for schema changes and keep them backward compatible.
- Keep personal-use features and productization ideas distinct unless the user asks to combine them.

## Git And PR Workflow

- Start each focused task from current `origin/main` on a `codex/<short-description>` branch.
- Inspect `git status --short --branch` before editing and before committing.
- Stage only the files that belong to the task.
- Use concise commits and draft PRs for GitHub work unless the user asks otherwise.
- Include validation evidence in PR bodies and final summaries.
- Do not rewrite, reset, or revert user changes unless explicitly requested.

## Security And Do-Not-Touch Rules

- Do not add secrets, tokens, credentials, analytics beacons, tracking pixels, ad scripts, account flows, or backend calls.
- Do not add production dependencies without explicit approval.
- Do not broaden RSS/feed behavior into automatic tracking or background analytics.
- Do not remove PWA assets, service-worker registration behavior, or offline shell fallbacks.
- Do not clear, rename, or repurpose existing localStorage keys without migration.

## Definition Of Done

- The requested behavior is implemented with the smallest practical change.
- Static validation passes with the expected curated link and section counts.
- Browser/CDP validation is run for UI, layout, localStorage, feed, or PWA-facing changes when practical.
- Any skipped validation is called out with a reason.
- Git diff is reviewed for accidental curated-content churn.
- The final response includes changed files, validation evidence, and remaining manual steps.
