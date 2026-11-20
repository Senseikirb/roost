# Security and data handling

Roost is a static, local-first application. A normal desk visit loads HTML, styles, artwork and install assets from its own host. Roost has no accounts, analytics SDK, advertising scripts or cloud database. The hosting provider still serves the page and receives the ordinary connection information needed to do so.

## What leaves the device

| Action | Destination and scope |
| --- | --- |
| Open the desk | The host receives requests for the app and its offline assets. Fonts and link icons are local. |
| Connect live feeds | AllOrigins and corsproxy.io may receive the selected built-in public feed URLs and the visitor’s IP address. The relay retrieves the feed. |
| Allow a custom feed | Your browser requests that public HTTPS URL directly. The server needs to permit cross-origin reads. Roost omits credentials and the referrer. |
| Run Link Health | The browser requests the destinations selected for the batch. A site can decline cross-origin checks or hide its response. |
| Open a link or fare search | The destination receives the visit. External travel searches receive the route and trip details described by the tool. |
| Export, copy or share | Backups, packs, reports and clipboard contents go to the location you choose. A backup can contain notes, history and personal URLs. |

Hiding a news panel changes its visibility. Disconnecting live feeds revokes Roost’s permission to make further feed requests. Browser-specific connection approvals are excluded from backups and configuration packs.

## Local data and hosting

Roost stores personal records in browser local storage. The service worker caches known application assets in a cache named for its installation. Clearing site data or deleting a browser profile can remove both. Download a backup before moving to another browser or origin.

Web storage belongs to an origin. Other pages served by the same scheme, hostname and port can access it, even under different paths. Multiple project sites under one GitHub Pages hostname therefore share this boundary. For a deployment that holds sensitive personal notes, use a dedicated origin you control. Exported files are plain text. Anyone with a copy can read them. [Browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

## Controls and verification

The pages use a Content Security Policy that hashes their trusted scripts. The build-independent checker rejects stale hashes and executable inline event handlers. Importers limit input size, validate data and restrict URL schemes. RSS responses are bounded and parsed as data. The offline worker handles an explicit set of same-origin assets. CI exercises the browser, including new and returning profiles, import and restore errors, feed permissions, and offline navigation.

These safeguards depend on a trusted host, browser, extensions and device. The owner’s GitHub account and other code served from the same origin are part of that trust boundary.

## Reporting an issue

Use GitHub’s private vulnerability reporting option on the repository’s Security tab when available. If private reporting is unavailable, open an issue asking for a private contact channel. Keep personal links, backups, credentials and sensitive reproduction material out of public issues.
