# Planet mechanic lifecycle

`World` owns one `PlanetMechanics` controller. A planet may declare `mechanic: '<id>'`; no declaration means no
mechanic. The registry includes `tides` for unreleased Tidewhisper; the original three worlds keep their existing rules.
See [terrain and tide controls](tidewhisper.md). Lantern darkness and lunar gravity belong to their later roadmap stages. Weather remains a separate
visual system; a mechanic may read it through its environment.

Mechanics can apply derived gravity/water rules through `environment.world.physics.set(...)`. Declare maximum
water in planet config before generation, keep live values within it, and derive them from the mechanic's saved
state before entry/population. Water meshes synchronize before actors; world disposal resets physics queries.
See [shared physics and water](world-physics.md).

Add a pure descriptor in `src/world/mechanics/<id>.js`, import it in `src/world/mechanics/index.js`, and call
`registerMechanic(id, descriptor)` after the registry is initialized. A descriptor provides:

- `clean(value)`: return a plain, JSON-safe state object with validated fields and safe defaults for missing data.
  Cleaning must not create scenes, access the current adventure or grant rewards.
- `create(environment)`: return a fresh instance for each generated world. The environment contains `world`,
  `planet`, a calendar `clock()` and live getters for `player`, `started`, `indoors` and `transitioning`.
  The first title-world instance is created before the player, so read the live getter when needed.

Each instance implements all six hooks:

| Hook | Contract |
| --- | --- |
| `load(state)` | Accept cleaned saved state or defaults before entry. Do not emit reward events. |
| `advance(seconds, { reason, from, to })` | Apply skipped calendar time in bounded work, without replaying frames, combat or rewards. May run before `enter`. |
| `enter()` | Apply rules after terrain, scenery and weather exist, but before actors and resources are populated. |
| `update(dt)` | Apply ordinary frame changes before actor physics. Title and pause receive no frame updates. |
| `toJSON()` | Return only persistent state; the controller cleans and clones it. |
| `exit()` | Undo external rules and remove listeners/resources owned by the instance. Also support cleanup after a failed entry. |

The order on arrival or Continue is: restore adventure globals, regenerate the world, create the instance, load
its planet snapshot, apply away time, enter, then populate actors/resources and restore other planet deltas.
Mechanic state is not loaded a second time after population. Departure captures the snapshot before exit; reset
exits before resetting clocks, and disposal exits before world assets are removed. The controller detaches its
time-skip listener and clears its active instance on exit. Assets added through `world.add()` belong to the world
and are disposed there; the instance must not dispose those assets twice.

`dayClock.skip(seconds, reason)` advances the calendar and emits one `timeskip` notification. Beds use `nap` and
`sleep`; the mechanic receives one `advance` call, rather than thousands of ordinary updates. Other deliberate
time jumps should use this method. An unnotified forward clock change is caught on the next active frame with
reason `clock`. Backward changes never produce negative advancement. Paused/title frames do not advance the
calendar; an explicit skip still applies if a caller changes the clock deliberately.

Version 1 adds optional per-planet `mechanics: { id, state, at } | null`. `at` is seconds on the adventure calendar,
`(day - 1) * DAY.length + t`, not wall-clock time. Revisiting a world applies `advance` with reason `away` for the
positive difference from its saved timestamp. Continue restores the saved calendar, so time spent outside the
game gives no offline advancement. Missing state uses defaults; unknown or mismatched module ids are discarded.
Invalid timestamps suppress catch-up, and snapshots are cloned to isolate worlds and saved data.

Unknown modules disable their destination and direct generation/travel refuses them before replacing the current
world. A module must be registered before save validation or generation. Keep unfinished worlds unreleased until
their content and mechanics pass their release checks.

Verify with `npm test`, `npm run sim -- mechanics save portals home planetCatalog`, the full `npm run sim`, and
`node scripts/mechanics-smoke.mjs` (Puppeteer Core plus Chromium; `CHROME` can override the browser). The browser
helper owns port 8104 and closes its server/browser. `tests/sim/lib/mechanicFixture.mjs` is development-only and
checks ordering, independent state, pause, real portal trips, reload Continue, beds, old v1 defaults and cleanup.
It is never imported by production code.
