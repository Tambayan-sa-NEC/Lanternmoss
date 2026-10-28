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
in dependency order: globals, regenerated world with mechanic restoration/entry, other planet snapshots, hero position/vitals, pet, active challenge and
house interior. Bag, gear, coins, XP, health/mana, pets and commands, quest/challenge progress, dialogue memory,
day/time, energy, buffs, house gifts, rare gifts and cooldowns belong to the adventure. Farm plots, gathering nodes
and rest timers, chests, boss gates, uncollected pickups, cottages, outdoor buildings and mechanic state belong to each planet snapshot.

Restoration emits no reward events, does not re-run quest grants, and skips travel-only quest checks. Beaten bosses
stay beaten; unopened boss treasure and uncollected rewards survive. Ordinary enemies, weather, projectile effects
and momentary movement/attack animations rebuild; an unfinished fishing cast ends. An awake boss resumes awake
with a fresh combat body. Gathering uses elapsed unpaused adventure time when revisited; crops still need presence
and watering, with bed rests advancing watered crops. General ecosystem simulation while away remains deferred.
Settings, key bindings, the lifetime journal and remembered pet selections stay separate, per device.

TODO 27a uses the existing optional mechanic snapshot for a bounded lagoon drain timer. Tide phase derives from
the saved adventure clock, not a second timer; Continue and away-time advancement restore/reflood it before placement.
Tidewhisper remains unreleased and the development fixture uses the original Lanternmoss save slot.

TODO 27b's Pearl Turtle charm reuses the adventure `rareGifts` ledger, item inventory and equipment snapshots.
Its first gift is not duplicated by Continue or revisits. Coastal roaming, bird/fish animation and swimming
destinations are ambient state rebuilt at generation/respawn; they do not add a persistent save owner.

TODO 26d extends the cap to 16 without changing v1 or old XP thresholds. Old level-10 saves can earn XP again;
new levels 11–16 round-trip through Continue with computed stats, and level 16 keeps no surplus XP. Future worlds
remain invalid destinations until released. The original three-boss award and original save fixture remain intact.

TODO 21 adds an optional adventure-owned `systems.tutorial` record to version 1: guide status and completed step
IDs, seen help IDs, movement practice distance, time since the last waking, the last fainting recap and its remaining
respawn seconds. Existing v1 files remain readable and default to a skipped guide; the pause menu can restart it.
Missing tutorial state does not alter player or planet data. The original v1 fixture is retained unchanged.
Fainting saves resume the recap and countdown; pause freezes the countdown. Tutorial completion gives no rewards.

TODO 22 adds `systems.crafting: { learned, favourites }`, `systems.buffs.meal: { kind, seconds } | null`, and
validated `props.enchantment` on combat gear in inventory, equipment and ground pickups. Learned recipe IDs and
favourites belong to the adventure; essential recipes remain available even when crafting state is absent.
Potion/pet timers and the one meal timer save independently. Old v1 files default to no meal and empty discoveries
and favourites; their existing buff timers remain intact. Unknown runes and enchantments on vanity or materials
are discarded. The original v1 fixture remains unchanged.

TODO 31a adds an adventure-owned `systems.rematch: { wins }`: how many rematches of each encounter the hero has
won, keyed `<planet>:<type>` (`frostveil:hydra`, since 31d: two worlds may field the same species and each keeps
its own ladder). Counts for an unknown world or monster are dropped and the numbers are clamped. A rematch **in
progress** is deliberately absent from the format: the active fight and each lair's cooldown live only in memory,
so a reload, a journey or a faint always finds a lair simply beaten and offering again, and a crafted save cannot
inject a half-woken boss. Old v1 files default to none won.

TODO 26b adds optional per-planet `mechanics: { id, state, at } | null`. The module validates its state, and `at`
records adventure-calendar seconds rather than wall-clock time. Missing old-v1 state uses defaults; unknown or
mismatched modules are discarded. Continue loads this state and applies away time before mechanic entry and
actor/resource population. Later planet restoration skips it to avoid undoing that advancement. Weather stays
transient. See [mechanic lifecycle and save hooks](planet-mechanics.md); the original v1 fixture is unchanged.

TODO 26c derives gravity and moving-water queries from planet config plus that mechanic snapshot, before
population. They have no separate save owner. Travel/disposal resets the previous world's queries and water
meshes; existing builds and crop data survive flooding. See [shared world physics](world-physics.md).

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

TODO 27c adds optional `claimedCycle` integers to gathering node deltas for tidal washups. Claims persist after
cooldowns expire, preventing another gather in the same high-tide batch after Continue. The adventure calendar
derives the current batch; skips never grant items. Missing claims default to -1, and v1 remains compatible.

TODO 30b adds the optional per-planet `fireflies: { away: [seconds] }` row: how long each caught firefly swarm
still has to wait before another settles somewhere else. Only the timers are saved; where the swarms sit is rebuilt
with the world. Without it, Continue would relight every swarm, so reloading could farm jars of oil. Missing or
invalid rows default to no waiting, and v1 saves remain compatible.

TODO 27d uses existing quest state for partial lens/fuel deliveries and lighthouse completion. The beacon
is derived from that completion, never independently saved. Existing house indices, gift/lore memory and
indoor coordinates persist the two coastal rooms; no save version or persistent owner was added.
