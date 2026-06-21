# 🦅 Roost — Setup Guide

Your homepage, upgraded. 689 curated links across 28 sections, including the **Creative Writing** section (43 fiction/worldbuilding/craft links), **live headlines**, a rotating **news ticker**, and a **tool dock** (Workbench + Concept Diagrams + launch tiles for your other tools). Installs on your iPhone like an app.

---

## What's in this folder

| File | What it is | Required? |
|---|---|---|
| `index.html` | **Roost itself.** Open this. | ✅ |
| `manifest.json` | Makes it installable as an app | ✅ for install |
| `sw.js` | Service worker — caches the page so it opens offline | ✅ for offline |
| `icon-180/192/512.png`, `favicon-32.png` | App icons (the eagle) | ✅ for install |
| `Mission_Control_v7_8_FINAL.html` | Opened by the dock's 🚀 tile | optional |
| `PMD_ToolkitV9_5.html` | Opened by the dock's 📋 tile | optional |
| `iq-rfsoc-explorer.html` | Opened by the dock's 📡 tile | optional |

Keep everything **in the same folder**. The dock tiles open the sibling tools by filename, so if you drop one, that tile just won't load (Roost is unaffected).

---

## Deploy to GitHub Pages (≈3 min)

1. Make a repo (e.g. `roost`). Public is simplest for Pages.
2. Upload **all** the files above into the repo root (drag-and-drop in the GitHub web UI works fine).
3. Repo → **Settings → Pages**.
4. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**. Save.
5. Wait ~1 minute. Your site is at:
   **`https://<your-username>.github.io/roost/`**
   (Because the entry file is `index.html`, you don't need to add a filename.)

That's the whole deploy. Re-uploading a file updates the live site within a minute.

---

## Add to your iPhone home screen

1. Open your Pages URL in **Safari** (must be Safari for install).
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. You'll get a **Roost** icon (the eagle). It launches full-screen, no browser chrome — like a native app.

On Windows/Chrome/Edge you'll see an **install** icon in the address bar that does the same thing on desktop.

---

## About the live headlines (please read once)

The ticker and the per-section headline strips pull **live RSS feeds** in your browser. Two honest caveats:

- **They only work on the hosted (https) version** — i.e. once it's on GitHub Pages. Opening `index.html` straight off your hard drive (a `file://` path) will *not* load headlines, because browsers block cross-site requests from local files. The links, search, dock, Workbench, and diagrams all still work locally — only the news needs the hosted version.
- **Headlines route through public CORS proxies** (`allorigins.win`, `corsproxy.io`). These are free, best-effort services. If one is slow or down, Roost quietly falls back: the strip shows *"Headlines unavailable"* and the ticker hides itself. **Your links are never affected.** Results are cached for 30 minutes so it's not hammering anything.

If headlines ever annoy you, open the dock (✦ bottom-left) → **⚙️ Headlines: on** to toggle them off. The setting sticks.

---

## Tweaking it later

Everything lives at the **bottom of `index.html`**, in a single clearly-commented block (`ROOST UPGRADE LAYER`). You don't need to touch the 6,700 lines above it.

**Change which feeds a section shows** — find `SECTION_FEEDS`:
```js
var SECTION_FEEDS = {
  "rf": { label: "RF/SDR", feeds: ["https://www.rtl-sdr.com/feed/", "..."] },
  ...
};
```
The key (`"rf"`) is the section's id. Add/remove URLs, or add a brand-new section id to give it a headline strip. Most sites' feed is just their URL + `/feed/` or `/rss`.

**Change the top ticker sources** — find `TICKER_FEEDS` (a simple list of URLs).

**Change the dock tools / tiles** — find `var TOOLS = [...]`. Each entry is either an `action` (built-in) or an `href` (opens a file/URL). To point a tile at a renamed tool file, edit its `href`.

**Add Workbench templates** — find `WB_METHODS`; copy any block and edit the `name`, `blurb`, and `scaffold`.

**Add a diagram** — find `DIAGRAMS`; each topic is a small inline SVG with a caption.

---

## Quick sanity checklist

- ✅ 689 links across 28 sections (auto-counted in the header — never drifts)
- ✅ New **Creative Writing** section + nav tab + launcher tile
- ✅ Roost Wire ticker, 17 section headline strips, graceful offline fallback
- ✅ Dock: Workbench (7 templates, saves notes), Concept Diagrams (4 topics), 3 tool tiles, Surprise-me, headline toggle
- ✅ Installable PWA (manifest + icons + offline service worker)
- ✅ All your original links preserved, untouched

Enjoy the roost. 🦅
