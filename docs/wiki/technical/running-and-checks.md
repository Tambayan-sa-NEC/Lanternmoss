# Running, checks and screenshots

ES modules can't be loaded from `file://`, so the game needs a local web server:

```sh
npm start            # zero-dependency static server -> http://localhost:8080/
npm start -- 3000    # or pick a port
npm stop             # stop this project's server on port 8080
npm stop -- 3000     # stop it on a custom port (PORT also works, as with npm start)
```

Any static server works too (`npx serve`, `python -m http.server`). An internet connection is needed: Three.js and the
UI font come from CDNs, declared in the import map in `index.html`.

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
node scripts/photo-smoke.mjs       # photo mode input, filters/frames in a downloaded PNG, 720p/1080p; retakes its two shots
```

`CHROME` points it at another browser, `PUPPETEER` at an existing puppeteer-core install. A new feature worth showing
gets a scene in `scripts/screenshots.mjs` and a spot in the tour above; every new shot is first given a folder in
`scripts/shots.mjs` (saving one without a folder stops the script).
