# Running, checks and screenshots

`node scripts/static-transforms-smoke.mjs` checks immutable branch traversal in Edge on port 8141. It uses real
movement input and explicit simulation frames, compares world matrices and raw canvas pixels after forcing all
visible immutable branches on all four worlds and a locally lit cave at 720p/1080p, checks overflow and page/shader errors, and saves diagnostic
captures to the system temp folder. Tidewhisper is installed through the test-only candidate fixture in this check.
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
node scripts/duskhollow-smoke.mjs  # Duskhollow (unreleased, 30a): readable dusk on Low, the village gap, real WASD lighting
                                   # the glowmoss trail and burning oil, the safe ember; retakes its shot
node scripts/dusk-wildlife-smoke.mjs # Duskhollow (unreleased, 30b): the canopy and its animals, real E catching a firefly
                                   # swarm, the jar pouring oil, the Moonmoth charm; retakes its two shots
node scripts/dusk-umbra-smoke.mjs # Duskhollow (unreleased, 30h): Umbra diving at the brightest light, real E on an
                                  # arena lantern, her wingbeat emptying the Oil bar and her blinding fog
node scripts/dusk-boss-smoke.mjs  # Duskhollow (unreleased, 30g): Grandmother Gloomweaver hanging out of reach,
                                  # and real W walking up with a lit lantern to burn a strand through
node scripts/dusk-weavers-smoke.mjs # Duskhollow (unreleased, 30f): webs that slow and are cut or burnt, oil
                                  # theft and its repayment, and the beetle accessibility toggle
node scripts/dusk-monsters-smoke.mjs # Duskhollow (unreleased, 30e): shadows and mimics, the light that makes a
                                  # shadeling solid, and real E springing a mosslurk
node scripts/old-road-smoke.mjs   # Duskhollow (unreleased, 30d): Wick's quest, real E carrying the village flame and
                                  # lighting waylamps, a flame that runs dry, and the lair's level-11 gate
node scripts/dusk-economy-smoke.mjs # Duskhollow (unreleased, 30c): real E mining a lumen vein, the Craft tab, a glowcap
                                   # poured into the lantern, deep dark, real E planting shade spores; retakes its shot
```

`CHROME` points it at another browser, `PUPPETEER` at an existing puppeteer-core install. A new feature worth showing
gets a scene in `scripts/screenshots.mjs` and a spot in the tour above; every new shot is first given a folder in
`scripts/shots.mjs` (saving one without a folder stops the script).

## Tidewhisper candidate checks (27h)

These use a test catalog substitute without changing the authored release flag. Install optional Puppeteer Core
as above. `node scripts/tidewhisper-campaign-smoke.mjs` owns port 8114 and checks the real fourth-world portal UI,
quest/node Continue, revisit, quest/tide gate, one crown and 720p/1080p bounds with zero page/shader errors.
After the approved 2026-10-19 gate split, these functional checks may pass and merge to `develop` while hardware
performance remains a public-release blocker. The candidate checks do not enable the authored release flag.
It captures `world/tidewhisper-campaign-{720,1080}.jpg` through `shots.mjs`.

`node scripts/tidewhisper-production-smoke.mjs` owns port 8143 and loads the ordinary browser entry with the
authored fourth-world release flag. It rejects candidate-module loading, checks the title and real E-key portal at
720p/1080p, saves a partial coastal quest/node state, reloads Continue, returns and revisits, completes Mirelure,
reloads the single Tide Crown, then opens an old v1 save. It asserts zero page/shader errors and captures the
reviewed `huds/tidewhisper-portal.jpg`. Run it only on a branch where Tidewhisper is intentionally released.

`node scripts/pet-care-smoke.mjs` owns port 8146 and checks pet care (TODO 35): a real `B` opens the pet menu, real
clicks feed a favourite (the pet turns Happy and the panel updates at once) and put outfits on the owl and the fox,
the Care section fits at 720p and 1080p with nothing overflowing, and in the claimed cottage the pet sleeps in its
basket in its outfit, heals, and a real `E` checks on it, with zero page and shader errors. It retakes
`pets/pet-care`, `pets/pet-outfits` and `pets/pet-bed`. `npm run sim -- petCare` runs the matching simulation.

`node scripts/otter-smoke.mjs` owns port 8142 and checks the candidate-only otter unlock and pet selection, real
`B` and `V` input, one Pearl Dive reward, a spent bed and cooldown, Continue, 720p/1080p menu bounds, model cost and
zero page/shader errors. It captures `pets/otter.jpg` through `shots.mjs`.
`node tests/sim/otter.sim.mjs` covers all three heroes, the daily cap, bed state, travel and saved dive state.

## Duskhollow checks (30a)

Duskhollow is unreleased, so its checks run through the development fixture `tests/sim/lib/duskhollowFixture.mjs`,
which borrows the first released world's save and travel slot. Nothing here enables the authored world.

`node scripts/duskhollow-smoke.mjs` owns port 8129 and runs on the lowest quality preset: it measures that the
deepest dusk is still readable and the village gap brighter, walks with real `W`/`D` to light the bounded glowmoss
trail and burn oil, checks that an empty lantern keeps a safe ember and costs no health, and that 720p and 1080p
overflow nothing with zero page and shader errors. It captures `world/duskhollow.jpg` through `shots.mjs`.
`node tests/sim/duskhollow.sim.mjs` covers generation, the clock and canopy, the HUD, pause and sleep, saves,
Continue and real portal travel; `node --test tests/lantern.test.mjs` covers the pure dusk, canopy and oil rules.

`node scripts/dusk-wildlife-smoke.mjs` owns port 8130 and checks the 30b flora and wildlife in the browser: the
canopy grows only where the dusk is closed, the animals and swarms render, a real `E` catches a swarm, really using
the jar pours oil, and the Moonmoth Wing widens the lantern. It captures `world/duskhollow-canopy.jpg` and
`critters/duskhollow-wildlife.jpg`. `node tests/sim/duskWildlife.sim.mjs` covers placement, the animals' reactions,
catching and its save, the charm and the scenery, particle and light budgets;
`node --test tests/duskWildlife.test.mjs` covers the pure canopy, content and charm rules.

`node scripts/dusk-economy-smoke.mjs` owns port 8131 and checks 30c in the browser: a real `E` mines a lumen vein
with the iron pickaxe, the Craft tab lists the lumen chain and the Dusk set, really using a glowcap pours oil into
the lantern, the deep-dark weather visibly darkens the hollow while the lit ground stays readable, and a real `E`
plants shade spores in the farm. It captures `activities/duskhollow-lumen.jpg`.
`node tests/sim/duskEconomy.sim.mjs` and `node --test tests/duskEconomy.test.mjs` cover the same ground headlessly.

`node scripts/old-road-smoke.mjs` owns port 8132 and checks 30d in the browser, through the village fixture
`tests/sim/lib/duskVillageFixture.mjs`: the brazier, the waylamps and the three moonwells render dark, Wick really
offers "Light the Old Road", a real `E` takes the village flame and lights a waylamp, a flame left to run dry costs
no health and a lit waylamp hands out fire again, the village gap still reads as the world's safe light, and a
relit lamp's light reaches the shader that draws the dark hollow. It captures `world/duskhollow-old-road.jpg` and
`npcs/duskhollow-wick.jpg`.
`node tests/sim/oldRoad.sim.mjs` covers the same route headlessly and adds Continue, portal travel, the quest
completing, the local-light budget of a road relit end to end, and the level-11 gate sealing and unsealing the
lair; `node --test tests/oldRoad.test.mjs` covers the pure flame, lamp and moonwell rules and the saved shape.

`node scripts/dusk-monsters-smoke.mjs` owns port 8133 and checks 30e in the browser, through the roster fixture
`tests/sim/lib/duskMonsterFixture.mjs`: both kinds render (shadelings as shadows, mosslurks as glowcap patches), a
shadeling out in the dusk really cannot be hit and really stands up solid when the hero brings a lit lantern, a
waylamp coming on beside one really drives it off, and a real `E` on a mosslurk's caps springs the ambush and puts
its warning circle on the ground before the bite. It captures `mobs/duskhollow-shadeling.jpg` and
`mobs/duskhollow-mosslurk.jpg`.
`node tests/sim/duskMonsters.sim.mjs` covers the same ground headlessly and adds placement, fire, an empty lantern,
and Continue/travel leaving no mimic sprung; `node --test tests/duskMonsters.test.mjs` covers the authored stats,
pages, drops and the brightness arithmetic that makes every counter reachable (30e and 30f both).

`node scripts/dusk-weavers-smoke.mjs` owns port 8134 and checks 30f in the browser: a weaver really spins up to its
own cap of webs, real `W` walking into one really slows the hero, a blade really cuts it and frees them and leaves
spider silk, one touch of fire really burns a whole web away, a snuffer really drains the Oil bar and really pays it
back with interest, and the beetle toggle really swaps every spider on screen without touching the fight. It
captures `mobs/duskhollow-gloomweaver.jpg`, `mobs/duskhollow-beetles.jpg` and `mobs/duskhollow-snuffer.jpg`.
`node tests/sim/duskWeavers.sim.mjs` covers the same ground headlessly and adds the web cap and placement, repeated
theft, an empty lantern having nothing to steal, and Continue/travel rebuilding them with no held oil and no
standing webs.

`node scripts/dusk-boss-smoke.mjs` owns port 8135 and checks 30g in the browser, through the mini-boss fixture
`tests/sim/lib/duskBossFixture.mjs`: she really hangs out of reach over the vein she guards and really refuses every
blow; a strand really refuses a blade and really ignores an empty lantern; really walking up to one with a lit
lantern really burns it through; fire takes one in a touch; the last one drops her; she really re-anchors at a
threshold; and the beetle toggle really swaps her and her grandchildren together. It captures
`bosses/duskhollow-grandweaver.jpg`.
`node tests/sim/duskBoss.sim.mjs` covers the same fight headlessly and adds all three rounds, the dazed window, the
loot, the vein she frees, and a defeat that survives Continue and travel.

`node scripts/dusk-umbra-smoke.mjs` owns port 8136 and checks 30h in the browser, through the boss fixture
`tests/sim/lib/duskUmbraFixture.mjs`: she wakes in the air inside a ring of moonfire with her arena lanterns dark,
a real `E` with a lit belt lantern really lights one and really costs oil, a lit one really takes the dive and she
really crashes into it, her wingbeat really empties the Oil bar and puts every lantern out, and her fog really
presses the hero's carried light in. It captures `bosses/duskhollow-umbra.jpg` and
`bosses/duskhollow-umbra-crash.jpg`.
`node tests/sim/duskUmbra.sim.mjs` covers the same fight headlessly and adds the gate, the dive at the hero when
nothing is lit, the shadelings the wingbeat calls, a drained lantern that never lights again, all three heroes
lighting the bait, an empty lantern never walling the fight off, and a faint and a Continue both putting it back.

`node scripts/duskhollow-campaign-smoke.mjs` owns port 8147 and exercises the candidate's real fifth-world portal,
the Old Road moonwells through real `E` input, Wick's oil reward and Umbra gate, and Continue. It runs at Low with
the beetle accessibility setting on, checks 720p and 1080p bounds, and requires zero page/shader errors.
`node scripts/duskhollow-performance.mjs --output <path>` owns port 8145. It records the three heroes, seeds 1/7 and
village/night/spore-drift scenes at 1080p High on the Acer RTX 4050. The default is diagnostic; `--release` requires
a clean committed released catalog and passing reference frame/count budgets before writing
`docs/releases/duskhollow.json`. Run it alone, without suites or screenshot work competing for the GPU.

`node scripts/tidewhisper-balance.mjs --check` checks all three heroes on seeds 1/7 (boss timings and roster median).
`node scripts/tidewhisper-performance.mjs --output <path>` owns port 8115 and collects 18 hardware rows at 1080p High
on the owner's Acer RTX 4050 reference (the collector requests the high-performance GPU).
It opens visible fullscreen Edge for desktop acceptance. `--headless` and `--gpu-timing` are optional diagnostics;
neither can be combined with `--release`.
Omit `--output` for the historical default diagnostic path; use a separate output for a new device/run.
`--release` additionally requires a clean commit, the authored Tidewhisper world in the production catalog,
the actual RTX 4050 Laptop GPU renderer and passing timing/count budgets before writing certification. It loads
the ordinary production entry; diagnostic runs still use the test candidate. Run performance alone, with no
simulation suite or screenshot job competing for resources.
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
