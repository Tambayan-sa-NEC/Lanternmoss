# Tidewhisper terrain and tides

TODO 27a implements the archipelago and water controls. Tidewhisper remains `released: false`: its plants,
wildlife, resources, village, music and fights belong to 27b–27g, and campaign release requires 27h.
The development fixture borrows existing actors/items in the original Lanternmoss save slot to exercise real
gameplay, Continue and portals. Those borrowed definitions are test-only and do not satisfy the content gate.

The config in `src/config/planets/tidewhisper.js` describes six islands, two connecting sandbars, a lagoon,
sea-green land, sandy shores, turquoise shallows, deep blue water and a peach/aqua sky. Terrain is baked once;
changing water never changes geometry or object ids. The largest island has raised village/house sites and a
reserved farm site. Scenery, grass, farm plots and nodes respect the declared high-water envelope. The actual
stilt houses, pier, interiors and lighthouse are still 27d.

| Development preview | Low tide | High tide |
| --- | --- | --- |
| Causeway | ![Dry sandbar](screenshots/tidewhisper-low.jpg) | ![Flooded sandbar](screenshots/tidewhisper-high.jpg) |

`tides` is a registered mechanic. Its phase comes from the adventure calendar, with one smooth cycle per
300-second day: low at 40% (afternoon), high at 90% (night). Sea radius ranges from 71 to 72.5 metres, a total
1.5 m change. The causeway is dry at low tide and becomes deep enough to swim at high tide; swimming uses the
existing slower movement and extra energy drain. A chip beside the clock displays low/high/rising/falling tide
and whether the causeway is open. The phase freezes on title/pause, follows naps/sleep and calendar jumps, and
returns at the current calendar phase after travel. Time outside the game does not advance it.

The active instance exposes these controls for the later encounter stage:

- `status`: current level/phase/label, `causewayOpen` and `lagoonDrained`. Causeway availability is derived from
  the same live terrain/water query used by Walkers; it is not a separately saved unlock flag.
- `drainLagoon(seconds = 40)`: lower only the lagoon to radius 68.8 for a finite duration of at most one day.
  Invalid durations return `false`. Normal frames, time skips and away time expire the timer once.
- `refloodLagoon()`: cancel drainage and return the lagoon to the current tide immediately.

The lagoon is a bounded local spherical water region. Physics uses its own level instead of the surrounding
sea inside the region; the ocean shader cuts out that region and a matching cap renders its level. This lets
the exposed floor be walked on while the ocean and causeway retain their tide. The later Mirelure stage owns
boss triggers, gradual encounter reflooding, attacks and retries; 27a exposes no player-operated sluice or fight.

Only `{ drainRemaining }` is persistent, cleaned to 0–300 seconds in the existing optional v1 mechanic snapshot.
The controller supplies its calendar timestamp and away-time advancement. Save/Continue reconstructs the water
from config, saved timer and calendar before actor/resource placement. Travel/disposal removes both water meshes
and resets regions; no extra save owner or save-version bump is needed. Missing/malformed state defaults to a
normal, tide-filled lagoon.

Run `npm test`, `npm run sim`, and `node scripts/tides-smoke.mjs` with Puppeteer Core and Chromium (`CHROME`
overrides the executable). The browser helper owns port 8107, uses the low preset at 720p/1080p, checks actual
keyboard movement, swimming/energy, the chip, protected plots, local drainage, reload Continue and keyed portal
travel. It closes its own server/browser, refreshes the two development previews and keeps additional lagoon
captures in the temporary directory. `tests/sim/lib/tideFixture.mjs` is never imported by production code.

These checks verify this stage's rules and rendering; they do not certify the Intel Iris Xe 60-fps release
target. Population, content, balance, complete-world browser traversal and measured performance remain 27h's
requirements. The next stage is 27b, flora and wildlife.
