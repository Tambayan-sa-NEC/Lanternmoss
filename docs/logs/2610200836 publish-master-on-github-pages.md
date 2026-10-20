# Publishing master on GitHub Pages

The playable build on `master` (TODO 27e publication, `d34a82f`) made public at
<https://tambayan-sa-nec.github.io/Lanternmoss/>. No release merge: `develop` (caves, TODO 29, and the
unmerged 45a pursuit work) stays unpublished at the owner's instruction.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-20 08:36 | RESEARCH | TODO N/A | Check whether `master` can be served as a static site | master | Root `index.html`, no build step, Three.js and fonts from CDN; every path in `index.html`, `styles/` and `src/` is relative, so a project subpath works. No tracked path starts with `_`, so no `.nojekyll` needed. `master` identical to `origin/master`. Zero commits required | 0h 06m |
| 2026-10-20 08:36 | DECISION | TODO N/A | Publish `master` only, no release merge, no tag | master | Owner's call: ship the already-tested public build. Rejected: merging `develop` first (would publish TODO 29 caves untested in the wild) and tagging now (deferred with the release merge) | 0h 01m |
| 2026-10-20 08:36 | TEST | TODO N/A | Verify the live site over HTTPS | master | Served HTML byte-identical to `master`; `styles/main.css`, `src/main.js`, `src/errorOverlay.js`, `favicon.ico` all 200 with correct MIME types | 0h 03m |
| 2026-10-20 08:36 | TEST | TODO N/A | Real browser check of the published build (Edge, SwiftShader) | master | Throwaway probe `scripts/_live-check.mjs`, deleted in the same command. Boots, witch run survives 180 explicit frames (hp 100, not dead, WebGL canvas, empty error overlay), no overflow at 720p or 1080p, 3 localStorage keys persist across reload, zero page errors, zero console errors, zero failed requests | 0h 04m |
| 2026-10-20 08:43 | TEST | TODO N/A | `npm test` and `npm run sim` before the README merge | docs/play-link | 275 unit tests pass, 0 fail; all 58 sims pass | 0h 07m |
| 2026-10-20 08:44 | DOCS | TODO N/A | Lead the README with a play link | docs/play-link | Pages URL added above the overview paragraph | 0h 02m |
| 2026-10-20 08:44 | MERGE | TODO N/A | Merge `docs/play-link` into `develop`, push, delete the branch | develop | `61f64de`; branch deleted locally, never pushed to the remote | 0h 01m |
| 2026-10-20 08:46 | RELEASE | TODO N/A | Lanternmoss published and playable by anyone | master | Live at <https://tambayan-sa-nec.github.io/Lanternmoss/>, serving `master` root. Untagged, by the owner's decision above | 0h 02m |
| 2026-10-20 08:46 | TOTAL | TODO N/A | Publish the playable build on the internet | master | Public, verified in a real browser, linked from the README. Caves and 45a remain unpublished on `develop` | 0h 16m |
