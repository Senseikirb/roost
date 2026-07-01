# New Codex Thread Starter Prompt

Copy/paste this into a fresh Codex thread:

```text
You are working on The Roost, a local-first static personal homepage and command center.

Repo: Senseikirb/roost. Use my local checkout path for this thread: <paste current local repo path here>.

Before changing files:
- Read AGENTS.md and docs/CODEX_HANDOFF.md.
- Run git status --short --branch and inspect recent git/GitHub state.
- Preserve vanilla HTML/CSS/JS: no framework, bundler, backend, accounts, analytics, ads, payment system, or new production dependency unless I explicitly approve it.
- Preserve PWA install/offline shell behavior.
- Do not delete or silently alter curated links.
- Preserve localStorage data and add migrations for schema changes.
- Treat URLs, RSS, imports, JSON, and user strings as untrusted.
- Keep changes surgical, preferably in or near the existing ROOST UPGRADE LAYER.
- Validate after implementation with node tests/run-roost-validation.mjs. For UI/runtime changes, also serve index.html over HTTP, launch Chrome/Edge with remote debugging, set ROOST_APP_URL and ROOST_CDP_PORT, and rerun the validator.

Use one focused branch/task per thread. Start from current origin/main unless I say otherwise.
```

# Codex Handoff

Last refreshed: 2026-07-01.

## Current Repo State

- Repository: `Senseikirb/roost`
- Default remote branch: `origin/main`
- Current remote `main` at inspection time: `c485ca2` (`Merge pull request #4 from Senseikirb/codex/mobile-wire-polish`)
- Current local handoff branch: `codex/handoff-package`, created from `origin/main`
- Working tree before this handoff edit: clean
- Tracked files at inspection time: static app files only, plus `tests/`
- No `package.json`, lockfile, bundler config, TypeScript config, ESLint config, Prettier config, `.codex/`, `docs/`, or `AGENTS.md` existed before this handoff package
- Validation baseline in `tests/run-roost-validation.mjs`: 786 curated link cards and 34 static sections
- Runtime browser baseline in `tests/run-layout-cdp-tests.mjs`: 786 link cards and 35 runtime sections

## Active Branches And PRs

GitHub PR state from the GitHub connector:

- PR #1 `[codex] Polish Where To tool dock`: merged
- PR #2 `[codex] Harden Roost validation checks`: merged
- PR #3 `[codex] Add Briefing Room`: merged
- PR #4 `[codex] Polish mobile Roost Wire headlines`: merged

Remote branches still existed at inspection time:

- `main` -> `c485ca2`
- `codex/where-to-polish` -> `be2c05b`
- `codex/briefing-room` -> `390f41d`
- `codex/mobile-wire-polish` -> `a633127`

Local branches still existed at inspection time:

- `main` was stale and behind `origin/main`
- `codex/where-to-polish`
- `codex/briefing-room`
- `codex/mobile-wire-polish`
- `codex/handoff-package`

These feature branches are historical after their PRs were merged. They can be deleted later if desired, but do not delete branches unless Kirby asks.

## Recent Important GitHub Work

- PR #1 added the Where To standalone tool beside the RFSoC/IQ tool, tightened mobile dock affordances, and introduced the validation harness.
- PR #2 hardened validation against curated-content loss, moved parser tests onto production hooks, and fixed malformed CSV handling.
- PR #3 added the Briefing Room section with battle-history briefs and defense-industry decoder cards, updated counts, and added section-count-label validation.
- PR #4 fixed mobile Roost Wire/section headline issues: decoded feed entities, filtered very old section headlines, separated Save/Refresh controls on mobile, and made Saved toggle back to unsaved.

## Unfinished Or Risky Work

- This handoff package itself must be reviewed, committed, and merged if it should live on `main`.
- `SETUP.md` begins by saying the bundle includes 762 curated link cards, while current validation expects and passes 786. The README and tests are newer than that line. This looks like doc drift and should be fixed in a small docs-only task.
- PowerShell displayed mojibake for some UTF-8 punctuation in `manifest.json` and `sw.js` comments. Do not mass-rewrite encoding unless a real browser or file-byte check confirms a problem.
- The local remote fetch refspec only tracks `main` (`+refs/heads/main:refs/remotes/origin/main`). Use `git ls-remote --heads origin` when checking remote feature branch heads, or adjust/fetch specific branches if needed.
- `gh` was not available on PATH during prior publishing work. Git push worked, and the GitHub connector was used for PR creation/update.

## Known Bugs, Failing Tests, Or Flaky Areas

- No current failing validation was found before this handoff edit.
- Browser/CDP validation depends on a stable local HTTP server and an available Chrome/Edge remote debugging session.
- A temporary Node static server exited early in an older run; Python `http.server` was more reliable.
- Browser tests can be state-sensitive if search filters or modal state are left active. Recent tests explicitly clear search state where needed.
- Generic `git push --force-with-lease` failed once because local tracking info for a feature branch was stale. An explicit lease against the fetched remote SHA worked. Prefer avoiding force pushes unless rebasing a PR branch is truly needed.

## Durable Repo Instructions

Use `AGENTS.md` as the durable instruction source. The short version:

- Vanilla static PWA only.
- Keep edits surgical.
- Do not delete curated links.
- Preserve localStorage keys and migrate schema changes.
- Treat feeds/imports/user data as untrusted.
- Preserve offline shell behavior.
- Validate every implementation.

## Temporary Current-State Notes

- Current source of truth is `origin/main` at or after `c485ca2`.
- This handoff branch is `codex/handoff-package`.
- The repo now has merged content from Where To polish, validation hardening, Briefing Room, and mobile Wire polish.
- Remote feature branches still exist but are historical after merged PRs.
- If starting a new task, create a new branch from `origin/main` rather than reusing the old feature branches.

## Historical Details Safe To Omit

- The long thread included many intermediate branches, failed/retried validation wrappers, auth/login learning, PR drafting, and debug probes.
- Exact temporary ports, browser profile directories, and local validation helper scripts from prior runs are not important unless a similar failure recurs.
- Earlier link/section counts such as 690/29, 762/33, or 762/34 are stale for current `origin/main`; trust current validator output.
- Detailed discussion of productization ideas is historical unless Kirby explicitly asks for monetization or product strategy again.

## Architectural Decisions

- The app remains a static local-first PWA rather than SaaS.
- The main app stays in `index.html`; new systems are usually safest near the `ROOST UPGRADE LAYER`.
- Public RSS/Atom feeds use browser-side proxy fallback and local cache; failures must not block curated links.
- User data lives in localStorage, with `kfl_*` legacy/core keys and `roost_*` upgrade-layer keys.
- Backup/restore and config packs should remain local and explicit.
- Manual link health remains opt-in and bounded.
- Personal Roost improvements and Product Roost packaging ideas should be kept separate.

## Files Or Modules To Inspect First

- `AGENTS.md`
- `README.md`
- `SETUP.md`
- `tests/run-roost-validation.mjs`
- `tests/run-layout-cdp-tests.mjs`
- `index.html`, especially:
  - `ROOST UPGRADE LAYER`
  - `WIRE_FEEDS`
  - `SECTION_FEEDS`
  - localStorage key constants
  - `roostTestHooks`
  - custom import parser functions
  - read-later/feed/headline functions
  - `ROOST_MISSION_CONFIG`
- `manifest.json`
- `sw.js`
- `iq-rfsoc-explorer.html`
- `roost-destination-finder.html`

## Verified Commands

Verified before this handoff edit on current merged content:

```powershell
node --check tests/run-layout-cdp-tests.mjs
node tests/run-roost-validation.mjs
```

Static validator output after PR #4 merge baseline:

- 16 total checks
- 0 failed
- 786/786 link cards
- 34/34 static sections
- section count labels matched

Full browser/CDP validation was also verified before this handoff edit with local HTTP plus Chrome/Edge remote debugging:

- 16 total checks
- 0 failed
- `runtimeErrors: []`
- `failed: []`

## Browser Validation Recipe

One reliable PowerShell shape:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Launch Chrome or Edge separately with a fresh profile and remote debugging, for example:

```powershell
chrome.exe --remote-debugging-port=9223 --user-data-dir="$env:TEMP\roost-cdp-profile" --no-first-run --no-default-browser-check http://127.0.0.1:8765/index.html
```

Then run:

```powershell
$env:ROOST_APP_URL='http://127.0.0.1:8765/index.html'
$env:ROOST_CDP_PORT='9223'
node tests/run-roost-validation.mjs
```

Use a different app or CDP port if one is already busy.

## Commands That Failed Or Need Caveats

- `gh --version` and `gh auth status` failed because `gh` was not installed or not on PATH.
- `rg tests/*.mjs ...` failed in PowerShell because that glob was passed literally. Use `rg ... tests` instead.
- Generic `git push --force-with-lease origin codex/mobile-wire-polish` rejected once due stale local tracking info. An explicit lease using the remote SHA worked.
- Browser/CDP validation can fail if no Chrome/Edge is available, if the remote debugging port is wrong, or if the app is opened as `file://` instead of over HTTP.

## Environment Assumptions

- Developer environment in prior work was Windows PowerShell.
- Node.js was available and able to run `.mjs` validation scripts.
- Python was available for `python -m http.server`.
- Chrome or Edge was available for CDP validation.
- Network was available for Git/GitHub operations.
- The GitHub connector was available in Codex for PR creation/update when `gh` was unavailable.

## Next Recommended Tasks

1. Review and merge this handoff package.
2. Fix the stale 762 count in the opening line of `SETUP.md`, then run `node tests/run-roost-validation.mjs`.
3. Decide whether to delete merged remote branches `codex/where-to-polish`, `codex/briefing-room`, and `codex/mobile-wire-polish`.
4. Start future feature work as one branch/thread per focused task from current `origin/main`.
5. For any UI change, add or adjust CDP coverage when practical, especially for iPhone-width layout.

## Manual Steps For Kirby

- Paste the starter prompt above into a new Codex thread when starting new work.
- Provide the new thread with the current local repo path.
- Review this handoff for wording or priorities before treating it as canonical.
- If you want the branch cleanup done, explicitly ask a future Codex thread to delete merged local/remote feature branches.
