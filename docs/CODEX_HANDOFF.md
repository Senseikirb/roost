# Maintainer handoff

Read [AGENTS.md](../AGENTS.md) for conventions, [SETUP.md](../SETUP.md) for local and Pages validation, and [SECURITY.md](../SECURITY.md) for data boundaries. The [feature guide](FEATURES.md) describes user-facing workflows. Earlier [product review](PRODUCT_REVIEW.md) and [daily-use audit](DAILY_USE_AUDIT.md) record prior releases and measurements.

The responsive desk lives in `roost-desk.css`. The static corpus stays in `index.html`. Section navigation, the launcher, local tools and storage migrations share the existing application code. Daily desk, Library and Full page must continue to expose the same collection.

Use `node scripts/check-csp.mjs --write` after reviewing an inline-script change. Update the service worker version when changing shell assets. Run `node tests/run-roost-validation.mjs` and the browser workflow before releasing. Browser fixtures use disposable storage. GitHub Actions runs Chrome at a Pages-style path and publishes desktop and mobile previews with its verification evidence.
