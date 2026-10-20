# Running, checks and screenshots

`node scripts/static-transforms-smoke.mjs` checks immutable branch traversal in Edge on port 8141. It uses real
movement input and explicit simulation frames, compares world matrices and raw canvas pixels after forcing all
visible immutable branches on all four worlds and a locally lit cave at 720p/1080p, checks overflow and page/shader errors, and saves diagnostic
captures to the system temp folder. Tidewhisper is installed through the test-only candidate fixture.
It also restores distance-only actor gates and requires identical raw canvas pixels, checking that frustum-gated
rigs contribute no visible geometry in those fixtures. The cave fixture places an enemy behind the room camera
within the distance gate and requires at least one branch to be restored before comparing pixels.
The same check verifies bounded context-loss/disposal ordering with live animation frames for captured and
uncaptured title renderers, plus repeated cleanup, and requires zero resulting page/shader errors.

ES modules can't be loaded from `file://`, so the game needs a local web server:

```sh
npm start            # zero-dependency static server -> http://localhost:8080/
npm start -- 3000    # or pick a port
npm stop             # stop this project's server on port 8080
npm stop -- 3000     # stop it on a custom port (PORT also works, as with npm start)
```

Any static server works too (`npx serve`, `python -m http.server`). Three.js ships with the game in `vendor/three/`
and is declared in the import map in `index.html`, so play works offline; only the UI font still comes from a CDN,
and the game falls back to a system font without it.

```sh
npm test             # unit tests (Node's built-in test runner, no dependencies)
npm install          # once, for the sims: installs three (the same version as the import map) as a dev dependency
npm run sim          # gameplay sims and pacing audits (several minutes)
npm run sim -- bosses combat     # only some sims
npm run sim -- balance           # time to kill, damage, phases and moves, per hero and planet (several minutes)
npm run sim -- pacing balancePhases # campaign XP/economy audit and real flying-boss hit checks
node scripts/performance.mjs     # optional real-WebGL 1080p measurements and per-planet ceiling checks
```

The **gameplay sims** in `tests/sim/` boot the real game in Node with a fake browser (`tests/sim/lib/`: no WebGL, the
renderer is a stub) and play it by script: fights and bosses, boss gates, menus, the HUD, pets, villagers, houses,
chests, items, terrain, survival, stations, campaign pacing and save/load. Each prints `PASS` / `FAIL` lines; `npm run sim` runs them a few at a
time and sums up. Randomness is seeded (`SIM_SEED`, default 1), so a run plays out the same every time: game code
draws from the play stream in `src/utils/random.js`, never `Math.random` (a unit test checks).

The [balance notes](../game-design/balance.md) define combat targets, the first-visit XP route, coin reserves and survival/farming
budgets. Set `BALANCE_CHECK=1` for a timing report that fails outside those targets, and `BALANCE_JSON` to export its
measurements. `node scripts/balance-smoke.mjs` optionally checks tuned boss phases and seed purchases in real WebGL
(requires `puppeteer-core` and Edge, or a browser path in `CHROME`).

**Performance:** press `F3` during play (including while paused), or enable **Performance overlay** in Settings →
Graphics, to see FPS, frame time, draw calls and triangles. Quality presets now reduce scenery decoration, grass,
distant resource detail, sparkles and weather particles; each has its own percentage slider. Resources stay available
at every quality. See [the performance measurements and browser-check setup](performance.md).

## Refreshing the screenshots

The pictures above live in `docs/screenshots/`, one folder per subject (`characters`, `pets`, `critters`, `mobs`, `bosses`,
`npcs`, `village`, `building`, `world`, `activities`, `huds`; the list is in `scripts/shots.mjs`). They are retaken
after every major update by playing staged scenes in headless Chrome (a few minutes with software rendering):

```sh
npm i --no-save puppeteer-core     # once; not a project dependency
node scripts/screenshots.mjs       # all shots, or e.g. `node scripts/screenshots.mjs bag,pets` for some
node scripts/save-smoke.mjs        # real reload/export/import check; retake title and save menus
node scripts/crafting-smoke.mjs    # bulk crafting, discovery, enchanting and reload persistence
node scripts/structures-smoke.mjs  # structure controls, support/pickup, door movement and reload Continue
node scripts/building-smoke.mjs    # placement controls, storage, 720p/1080p layout and reload Continue
node scripts/tutorial-smoke.mjs    # guide/help/fainting UI, reload/replay and menu bounds; defaults to Edge
node scripts/bounty-smoke.mjs      # bounty board: real E, claim click, 720p/1080p and reload Continue; retakes its two shots
node scripts/sets-smoke.mjs        # gear sets: real I and Equip clicks, set lines and tooltip, 720p/1080p; retakes its shot
node scripts/talents-smoke.mjs     # talent foundation on a stable test-only tree: learning, Continue, free reset
node scripts/witch-talents-smoke.mjs # real Witch tree, live HUD/Controls, keys, Continue/reset, 720p/1080p low; retakes its shots
node scripts/warrior-talents-smoke.mjs # real Warrior tree: Wide Cleave in HUD/Controls/tooltips, keys, Continue/reset; retakes its shots
node scripts/ranger-talents-smoke.mjs # real Ranger tree: Wide Fan in HUD/Controls/tooltips, keys, Continue/reset; retakes its shots
node scripts/lighting-smoke.mjs    # local light harness: shaders compile, no recompiles, readable dark on Low/High; retakes its shot
node scripts/caves-smoke.mjs       # caves (unreleased): real keys room to room, readable dark, real E leaves; retakes its shot
node scripts/cave-combat-smoke.mjs  # cave combat: all heroes, real clicks/ultimate keys, walls, bars, exit, peaceful houses; 720p/1080p
node scripts/cave-rewards-smoke.mjs # cave rewards: real keys and E mine a vein and open a chest, no second payout; retakes its shot
node scripts/cave-puzzles-smoke.mjs # cave puzzles: the ward stops real keys, both puzzle kinds played, guardian and way home
node scripts/photo-smoke.mjs       # photo mode input, filters/frames in a downloaded PNG, 720p/1080p; retakes its two shots
node scripts/mob-combat-smoke.mjs  # monsters fighting each other (45b/45c): brawl damage, a ghost's orb, no damage numbers,
                                   # the hero reclaiming a monster, a boss harmless to them; retakes docs/screenshots/mobs/mob-brawl.jpg
```

`CHROME` points it at another browser, `PUPPETEER` at an existing puppeteer-core install. A new feature worth showing
gets a scene in `scripts/screenshots.mjs` and a spot in the tour above; every new shot is first given a folder in
`scripts/shots.mjs` (saving one without a folder stops the script).

## Tidewhisper candidate checks (27h)

These use a test catalog substitute; the authored destination stays unreleased. Install optional Puppeteer Core
as above. `node scripts/tidewhisper-campaign-smoke.mjs` owns port 8114 and checks the real fourth-world portal UI,
quest/node Continue, revisit, quest/tide gate, one crown and 720p/1080p bounds with zero page/shader errors.
After the approved 2026-10-19 gate split, these functional checks may pass and merge to `develop` while hardware
performance remains a public-release blocker. They never enable the authored Tidewhisper release flag.
It captures `world/tidewhisper-campaign-{720,1080}.jpg` through `shots.mjs`.

`node scripts/otter-smoke.mjs` owns port 8142 and checks the candidate-only otter unlock and pet selection, real
`B` and `V` input, one Pearl Dive reward, a spent bed and cooldown, Continue, 720p/1080p menu bounds, model cost and
zero page/shader errors. It captures `pets/otter.jpg` through `shots.mjs`.
`node tests/sim/otter.sim.mjs` covers all three heroes, the daily cap, bed state, travel and saved dive state.

`node scripts/tidewhisper-balance.mjs --check` checks all three heroes on seeds 1/7 (boss timings and roster median).
`node scripts/tidewhisper-performance.mjs --output <path>` owns port 8115 and collects 18 hardware rows at 1080p High
on the owner's Acer RTX 4050 reference (the collector requests the high-performance GPU).
It opens visible fullscreen Edge for desktop acceptance. `--headless` and `--gpu-timing` are optional diagnostics;
neither can be combined with `--release`.
Omit `--output` for the historical default diagnostic path; use a separate output for a new device/run.
`--release` additionally requires a clean commit, the actual RTX 4050 Laptop GPU renderer and passing timing/count budgets before
writing certification. Run performance alone, with no simulation suite or screenshot job competing for resources.
Every performance row uses a fresh reload and empty ephemeral test storage, seeds play before hero/travel setup,
then runs 120 setup updates, 30 warmup frames and 120 real render intervals. Previous rows cannot carry state forward.
See the [handoff](tidewhisper-release.md).

`node scripts/hud-performance-smoke.mjs` owns port 8140. It checks unchanged prompt/chip DOM preservation,
coin and rebound-key updates, the live marker scale, real rebound keyboard interaction and 720p/1080p bounds,
with zero page/shader errors. Review captures go to the system temp folder, not the feature tour.
`node tests/sim/hudUpdates.sim.mjs` covers the same update rules, prompt hide/return and settings/resize scale.

Save, portal and tutorial browser checks collect both page and shader errors and use bounded browser cleanup.
Save defaults to Edge; its final menu checks assert viewport and content fit at 720p/1080p and place review captures
in the system temp folder. Tutorial waits for the pause-page opening animation before asserting content fit.
