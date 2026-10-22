# Architecture

**Startup order is part of the design** (`Game.init`):

1. The world is generated from a seeded RNG (`utils/random.js` `rand`). Every draw shifts everything after it, so
   `World.generate()` runs its steps in a fixed order, and the initial enemy spawn runs right after it. Change that
   order and the planet's layout changes.
2. Moving bodies resolve collisions in the order they were created, so the player, critters, villagers and enemies are
   created in that order.

**Per-frame order** (`Game.update`): day clock → planet mechanic → player → critters → birds → fish → villagers → world items → combat (vitals, casting +
area aim, aim, projectiles, enemies, hazards, pet body, pet system, effects, combat HUD) → planet progression → challenges,
quests, shop, houses, chests, hotbar → knight upkeep → menu orbit → camera → compass → world → particles and
emotes → dialogue → overlay, buffs, toast, pet card. Rendering follows each update.

**Dependencies flow one way:** `config` and `utils` depend on nothing. `render` and `physics` build on them, and
`world` on those. Entities, combat and gameplay sit above, and `core/Game.js` wires everything. UI modules receive the
data they show (`updateCombatHud(dt, spellState, aimTarget)`) rather than reaching into combat. Challenges plug into the
dialogue through `Dialog.lineProvider` instead of the dialogue importing them. Level-ups are announced on an
`EventTarget` (`progression/experience.js`), so feedback stays decoupled from the rules.

**Shared state** lives in `core/context.js` (`ctx.player`, `ctx.enemies`, `ctx.time`...), filled in by `Game`. That
is the one place to look for "what is alive right now", instead of dozens of loose globals.

**Cave combat (29c, unreleased):** `ctx.room` is a transient `RoomSpace`. Cave actors keep actual world positions
and a fixed up; `combat/space.js` supplies floor points, distance, headings, altitude and visibility while the
surface continues to use spherical geometry. `Walker.step` dispatches to the attached frame, so the same player,
enemy and walking-pet controllers run in either place. Projectiles, hazards, aiming and decals use the same frame.
`ctx.indoors` still names both houses and caves; only houses are peaceful (`indoors && !room`).

`Dungeons` keeps the surface enemies, boss, pickups and visibility while the room owns the active combat arrays.
It freezes surface encounter updates, clears attacks at both boundaries and restores the same surface objects
before world-save hooks or disposal. Combat loops tolerate a lethal hit tearing down their room mid-callback.
Cave persistence and rewards remain 29d; see [cave contracts and checks](../world/caves.md).

**Build a shelter:** craft Timber Floors, walls, open doorways, window panels and Shingled Roofs. Connected tiles
share a foundation grid; opposite walls support roofs, and furniture/storage/stations can sit on the floors.
Walk through the doorway to see roof and near-wall cutaways. Floor support, roof ceilings and safe dismantling
keep the pieces usable, and shelters persist on each planet. See [structure controls and recipes](../systems/structures.md).

**Build a garden:** craft and place furniture, lights, fences, stepping stones, storage chests, all four crafting
stations and farm plots outdoors. Use a piece from your bag/hotbar to start a ground preview; Y rotates, U toggles
grid/free ground, and click/Enter/E places. E beside a piece opens management and safe pickup. Storage and the bag
have quick-stack and sorting buttons that keep your hotbar in place. Builds, chest contents and crops persist
separately on every planet. See [building controls, recipes and saves](../systems/building.md).

**Your cottage:** each village has a separate vacant cottage on the compass. Enter it and use the sign to claim
it, then furnish fixed spots with five crafted pieces (bed, table, rug, lantern and plant). Your own bed restores
health, energy and ability resources, sleeping to morning at night. Ownership and furnishings persist separately
on each planet, including indoor Continue. See [cottage controls, recipes and saves](../systems/home.md).

**Planets:** `World.generate(planet)` builds a planet from its PLANETS entry (seed + palette) and `World.dispose()`
tears it down. `PlanetProgression` listens for `'bossdefeated'`: monsters vanish without XP, challenges end and
boss treasure falls, while the hero stays to explore. `Portals` validates a destination and key cost at the village
gate; explicit travel fades out, rebuilds the chosen world and restores its saved deltas. Boss wins open the next
world and free return travel. A Wayfarer's Key (4% chance from a Lantern chest or one per no-hit boss win) opens
the next locked world one way; returning costs another key until its boss falls. Beaten bosses and mini bosses stay
beaten; ordinary monsters respawn. Chest lids, ground items, farms and local quests persist. Resources regrow by
elapsed unpaused adventure time; crop growth still needs presence and watering. Travelling villagers follow;
Cinder and Tuva stay home and remember their progress. See [portal travel and saves](../systems/portals.md).

Each world owns its config in `src/config/planets/<id>.js`; the ordered catalog also contains unfinished Act II
metadata. Only released worlds enter generation, travel and save validation. Secret gates require their configured
conditions, and main-campaign completion excludes secret worlds. See [catalog and release rules](../world/planets.md).

The level cap is 16 with the original XP curve continued. The title previews planned Act II worlds and masks the
secret; their travel and awards activate only after release. The original three-boss award stays unchanged.
New worlds must pass the content/registration and measured performance gate. See [Act II progression and release
acceptance](content-release.md).

Tidewhisper's unreleased development terrain has six islands, tidal sandbars, protected village/farm sites and a
daily 1.5 m tide with a clock chip. Local lagoon drainage shares physics and rendering, survives Continue and
expires through skips/away time. The remaining content and campaign release are later stages. See
[terrain, controls and development previews](../world/tidewhisper.md).

The Tidewhisper development config now includes lantern palms, swaying kelp, coral fans and coastal plants;
ambient crabs, turtles, seals, gulls/terns, shoals and night lanternfish; and the rare Pearl Turtle's saved charm.
Scenery is batched and counts are capped. The world remains unreleased pending its later content/release stages.
See [coastal flora, wildlife and previews](../world/tidewhisper.md#coastal-flora-and-wildlife-27b).

`PlanetMechanics` loads optional per-planet state before entry and actor/resource population. Frame updates freeze
on the title and while paused; naps, sleep and away time use a separate bounded advancement hook. Exit removes rules
and listeners before world disposal. Weather stays separate, and the original three worlds have no mechanic module.
See [the lifecycle, module contract and save format](planet-mechanics.md).

Planet physics composes with each Walker's acceleration and Moon-Hop. Pond and optional sea surfaces feed the
same swimming, rendering, fishing and dry-placement queries. High-water limits keep resources and new builds
safe without shifting saved ids as water moves; submerged crops/builds retain their state. See
[shared gravity and moving-water rules](world-physics.md).

**Enemy behaviours:** `def.behavior ?? def.ai` picks the AI. The originals are methods on `Enemy`; newer ones are modules in
`entities/enemies/behaviors/` (`think`, plus optional `init / reset / update / animate / onDie / dispose` hooks).
A new enemy type = stats in `COMBAT.enemies`, a model in `models/monsters.js`, and (for new behaviour) a module there.

**Bosses** (`behaviors/boss/core.js`) share one state machine: `chase` (the kit steers) → `windup` (the move
telegraphs) → optional `active` (multi-step moves) → `recover` (the punish window), plus `transition` for phase
changes. Each boss is a kit: its own movement, poses and moveset, where every move says when it is usable
(`ready(e, dist)`, e.g. range or facing) and how much the boss wants it (`weight`). The framework picks among the
current phase's moves, never repeats the last one, honours each move's own `reuse` cooldown, and waits for hazards a
move left behind before the next one, so attacks never stack into something unreadable. Moves that travel (charges,
leaps, dives, strafes) are clamped inside the boss's arena so they can't end the fight by leaving it.

**Ultimates:** each hero's `5` / `G` ability has `target: 'ground'`. `casting.js` hands it to `aiming.js` first and only
pays the cost and cooldown on confirm; then `CAST[id].execute(s, dir, target)` (`abilities/ultimates.js`) runs it.
Their damage rides on `hazards.js`: Meteor is a `Blast` with a falling meteor, Leap Slam is a scripted jump
(`Player.motion`) whose landing is a stunning `Blast`, and Arrow Rain is a `Zone` that ticks.

**Heroes:** a new hero = an entry in `config/characters.js`, a builder in `models/heroes.js` (`HERO_BUILDERS`), a pose
overlay in `entities/player/poses.js` (`HERO_POSES`) and its ability functions in `combat/abilities/` (added to `CAST`).
The character-select cards are generated from `CHARACTERS`; each needs a `.pic.<id>` icon in `styles/main.css`.

**Console:** `window.LANTERNMOSS` exposes the player, enemies, projectiles, NPCs, camera, dialogue, challenges and
helpers such as `spawnEnemy('ramhorn')`, `gainXp(100)`, `boss`, `planet`, `goToPlanet(1)`, `inventory` and
`spawnItem('moonberry', 5)`.
