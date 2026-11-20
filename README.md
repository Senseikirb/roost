# The Roost

A personal start page with a searchable library of **785 hand-picked links across 33 sections**. Use the Daily desk to pick up a note, continue a reading list, plan a work session, or open a favorite. The desk works immediately. Customization is optional.

**[Open The Roost](https://senseikirb.github.io/roost/)** · [User guide](docs/FEATURES.md) · [Setup and installation](SETUP.md)

## Find your way around

| If you want to… | Start here |
| --- | --- |
| Find a site or tool by name | Press `/` to focus the launcher. Type, then use the arrow keys and Enter. |
| Continue yesterday’s work | Open **Daily desk**. **Today** offers shortcuts to saved work. |
| Browse the collection | Open **Library** and pick a section. **Full page** shows the entire board. |
| Save something | Use the star for **Favorites**, **Board** to group links, or **Note** to annotate one. |
| Set up your own board | Choose **Customize desk** to pick modules, density and starter sections. |
| Take your work to another device | Open **Backup / Restore**, download a backup, then preview and restore it on the other device. |

The tools include a Workbench for writing, Session Planner, Read Later, optional news feeds, a trip finder and Mission Control Academy. Search the launcher for a tool or open its entry in the tool dock.

## Privacy and offline use

Your browser stores notes, links, preferences and progress on the device. The default desk loads its assets from the site’s own origin. Live headlines require a separate connection choice. Built-in news uses public feed relays. Each custom source needs its own approval. The manual link checker and links you open can also contact outside sites. [Security and data handling](SECURITY.md)

After the first successful online visit and service worker installation, the desk and cached tools can reopen offline. Clearing site data removes the browser’s copy of your work. A full backup contains readable personal data. A configuration pack can also contain private link and board names. Review either file before sharing it.

## Run and verify

Serve the repository root with a static server, then open the local address. There are no production packages to install.

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Run the static, storage, security and offline checks with Node.js. The GitHub Actions workflow also runs the browser journeys against a project-site path using a disposable profile.

```sh
node tests/run-roost-validation.mjs
```

Application code lives in `index.html`, the board’s visual design in `roost-desk.css`, and the offline shell in `sw.js`. After editing an inline script, review the change, run `node scripts/check-csp.mjs --write`, and rerun validation. [Deployment guide](SETUP.md) · [Storage formats](docs/STORAGE_SCHEMAS.md) · [GitHub Actions](https://github.com/Senseikirb/roost/actions/workflows/validate.yml)
