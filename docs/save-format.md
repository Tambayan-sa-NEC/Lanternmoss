# Adventure saves (version 1)

One adventure slot lives in browser storage under `lanternmoss.adventure`. Save from the pause menu, or let autosave
run every two minutes of play, on planet arrival, after boss cleanup, and before quitting. Closing/hiding the page
also attempts a save. A small **Saved** note confirms successful writes. If storage is blocked or full, saving
reports the failure and Quit keeps the current adventure open; Export Save still downloads a copy.

Continue restores the latest successful save. New Adventure asks before replacing it; cancellation on character
selection preserves the previous save. Import accepts a JSON export, validates it, and asks before replacement.
Export before starting a different adventure if you want to keep both. Clearing browser storage removes the slot.

The JSON envelope contains `game`, `version`, `slot: 0`, `savedAt`, `planetId`, `systems` and `planets`. Planet keys
are stable IDs (`lanternmoss`, `emberfall`, `frostveil`), independent of their positions in the campaign array.
`ctx.planet` remains the runtime array index. Additional slots are deferred; the explicit field reserves room for them.

`src/core/save.js` owns cleaning and the registry. `src/core/AdventureSave.js` registers systems and restores them
in dependency order: globals, regenerated world, planet snapshots, hero position/vitals, pet, active challenge and
house interior. Bag, gear, coins, XP, health/mana, pets and commands, quest/challenge progress, dialogue memory,
day/time, energy, buffs, house gifts, rare gifts and cooldowns belong to the adventure. Farm plots, gathering nodes
and rest timers, chests, boss gates and uncollected pickups belong to each planet snapshot.

Restoration emits no reward events, does not re-run quest grants, and skips travel-only quest checks. Beaten bosses
stay beaten; unopened boss treasure and uncollected rewards survive. Ordinary enemies, weather, projectile effects
and momentary movement/attack animations rebuild; an unfinished fishing cast ends. An awake boss resumes awake
with a fresh combat body. Planet ecosystem simulation while away and building state remain future TODOs 24/25.
Settings, key bindings, the lifetime journal and remembered pet selections stay separate, per device.

Foreign, damaged and future-version files are rejected before writing. Supported snapshots drop unknown IDs,
clamp finite numbers, normalize valid directions and fill safe defaults. Files are limited to 2 MiB. A future format
change must migrate version 1 explicitly and retain `tests/fixtures/save-v1.json` as a compatibility check.

New persistent state must have `toJSON()` / `load()` methods and a registered owner in `SAVE_OWNERS` / `SAVE_SYSTEMS`.
The coverage test scans state exports and rejects unclassified owners. Device-local or transient systems require an
explicit classification and reason. The runtime save simulation round-trips every registered system with populated
data and verifies complete world reconstruction, challenges, interiors, travel, loot and failure paths.

Checks: `npm test`, `npm run sim -- save menus pause journal`, and optional `node scripts/save-smoke.mjs` (requires
`puppeteer-core` and Chrome; set `CHROME` to use Edge or another Chromium browser). The browser check verifies real
reload, exported files and import confirmation, and retakes `continue.jpg` / `save-menu.jpg` for the README.
