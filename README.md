# Lanternmoss

A tiny cozy planet of lanterns, moss and friendly critters: a third-person browser game built with
[Three.js](https://threejs.org/) (r160) and plain ES modules. Pick the Girl Witch, the Boy Warrior or the Elf Archer, explore a
spherical planet, chat with villagers, take on their mini-challenges and fight the monsters beyond the village lanterns.

**Campaign:** every planet has a boss in a lair on its far side, marked by a shaft of light. Defeat it and the hero
travels on to the next, harder planet (Lanternmoss, then Emberfall, then Frostveil), keeping their level, XP and treats.
Each boss is its own fight: Gloomcap the Moss King, Pyrrhax the red dragon, and Malgrath, the two-phase Winged Demon Lord.

## Running

ES modules can't be loaded from `file://`, so the game needs a local web server:

```sh
npm start            # zero-dependency static server -> http://localhost:8080/
npm start -- 3000    # or pick a port
```

Any static server works too (`npx serve`, `python -m http.server`). An internet connection is needed: Three.js and the
UI font come from CDNs, declared in the import map in `index.html`.

```sh
npm test             # unit tests (Node's built-in test runner, no dependencies)
```

### Controls

| Key | Action |
|---|---|
| `W A S D` / arrows | move (camera-relative) |
| `Shift` | sprint |
| `Space` | jump (hold for a floatier rise) |
| `E` / `X` | talk, advance, accept / decline |
| `I` or `Tab` (`Esc` closes) | open / close the bag |
| `1-4`, `Q R F`, click | abilities (`1` / click can be held to repeat) |
| `5` / `G` | ultimate: a marker follows the cursor; click (or `5` / `G` again) to cast there, `Esc` / right click cancels |
| drag / wheel | rotate / zoom camera |
| `M` | mute |
| `C` (twice) | back to character select (restarts the adventure) |

## Project structure

```text
index.html                 markup only: HUD, dialogue box, challenge panel, character-select overlay
styles/main.css            all styling
scripts/serve.mjs          zero-dependency dev server
tests/                     unit tests: XP / level math, inventory, planets + enemy scaling, combat + boss config
src/
├── main.js                entry point: builds the Game, starts the loop, exposes window.LANTERNMOSS
├── errorOverlay.js        classic script that shows load/runtime errors on screen
├── config/                every tunable number and authored data table (no logic, no Three.js)
│   ├── game.js            planet radius, world seed, movement, buff multipliers, camera
│   ├── render.js          pixel ratio, fog, bloom, outline width
│   ├── combat.js          spells, enemy and boss stats, boss attacks and phases, XP per enemy, owl
│   ├── planets.js         the campaign: each planet's seed, colours, difficulty scale, roster, boss, forage
│   ├── items.js           item definitions, categories, rarities, effects, bag size and pickup settings
│   ├── characters.js      the three playable heroes (stats, abilities, texts)
│   ├── challenges.js      villager mini-challenges and their dialogue
│   ├── leveling.js        XP curve, level cap, stat and damage growth
│   └── critters.js        ambient animal looks
├── core/
│   ├── Game.js            startup order, per-frame update order, run lifecycle (begin / reset)
│   ├── GameLoop.js        requestAnimationFrame loop with a clamped timestep
│   ├── context.js         the shared live state (time, player, enemies, NPCs...)
│   └── controls.js        key bindings: what each input does
├── systems/               engine-level services
│   ├── RenderSystem.js    WebGL renderer, bloom + storybook post-processing, resize
│   ├── CameraSystem.js    third-person, surface-aligned, collision-aware camera rig
│   ├── InputSystem.js     keyboard state and mouse gestures (devices only, no game rules)
│   └── AudioSystem.js     procedural WebAudio music and sound effects
├── render/                Three.js building blocks
│   ├── scene.js           the scene and camera
│   ├── materials.js       toon ramp, glow, inverted-hull outline, point-sprite materials
│   ├── meshes.js          primitive geometries and outlined model parts
│   └── Batcher.js         merges static scenery into a few draw calls
├── physics/
│   ├── colliders.js       static, moving and camera colliders; overlap resolution
│   └── Walker.js          surface movement under spherical gravity (base class for every walker)
├── world/                 the planet (generated once, in a fixed order, from a seeded RNG)
│   ├── World.js           generation order, landmarks, per-frame sun / sky / ambient animation
│   ├── terrain.js         height function, ponds, ground-placement matrices
│   ├── placement.js       free-spot searches for scenery and spawns
│   ├── planet.js          the planet mesh
│   ├── props.js           prop builders (houses, trees, rocks, lanterns, flowers...)
│   ├── village.js         houses, standing-stone circle, lantern paths
│   ├── scatter.js         pond decoration, trees, rocks, flowers, grass
│   ├── water.js           pond water shader
│   └── sky.js             sky dome, clouds, fireflies
├── models/                procedural character and item art (swap a builder to use real assets)
│   ├── humanoid.js  heroes.js  creatures.js  villagers.js  monsters.js
│   ├── bosses.js          demon lords (Gloomcap; Malgrath with greatsword + wings) and the shared bat wing
│   └── dragon.js          Pyrrhax, the red dragon
├── items/                 ItemRegistry (validated item catalogue) and itemActions (what each category does)
├── inventory/             Inventory: slot storage, stacking, capacity, moving / swapping, events (pure)
├── entities/              things that live and move in the world
│   ├── player/            Player (movement, model swap, placement) and pose animation
│   ├── enemies/           Enemy (melee / ranged / hopper AI), shared AI states, and behaviors/ for the newer AIs:
│   │                      bomber, charger, burrower, support, and boss/: the boss framework (core.js) with one kit
│   │                      per boss (gloomcap.js, dragon.js, demonLord.js)
│   ├── companions/        Owl (witch, ranger) and Wolf (knight)
│   ├── npc/               NPC behaviour and the villager definitions (dialogue, homes)
│   ├── wildlife/          critters, birds, pond fish and their spawning
│   ├── Projectile.js      surface-hugging projectiles
│   └── WorldItem.js       an item stack lying on the ground
├── combat/
│   ├── CombatSystem.js    per-frame combat update order
│   ├── casting.js         cooldowns, input buffering, hold-to-repeat, ability dispatch
│   ├── abilities/         witch spells, knight (axe warrior) moves, ranger (elf archer) shots, and ultimates.js
│   ├── aiming.js          aim mode for ground-targeted abilities (cursor -> ground marker, validity, confirm / cancel)
│   ├── area.js            area queries: who is inside a circle, landable spots, cursor -> ground ray
│   ├── hazards.js         timed area effects for both sides: Blast (marked, then detonates) and Zone (ticks over time)
│   ├── damage.js          damage both ways, fainting, respawning, regeneration
│   ├── enemyDefs.js       per-planet enemy stats (base stats x the planet's difficulty scale)
│   ├── events.js          encounter events ('bossdefeated')
│   ├── targeting.js       soft lock-on and "last enemy hit"
│   └── spawning.js        planet rosters, boss lairs, runtime spawning, reset / clear
├── progression/
│   ├── leveling.js        pure XP / level / stat math (unit-tested)
│   ├── experience.js      applies XP to the hero and emits 'xp' / 'levelup' events
│   └── levelFeedback.js   float text, burst, jingle and toast on those events
├── gameplay/
│   ├── PlanetProgression.js  boss defeated -> victory -> fade -> next planet; restart back to planet 1
│   ├── characters.js      switching heroes (model, stats, abilities, companion)
│   ├── buffs.js           Moon-Hop / Feather-Step timers
│   ├── pickups.js         world <-> bag: walk-over pickup, granting, dropping, forage
│   ├── itemUse.js         using items: effect handlers (heal, mana, buff)
│   └── challenges/        challenge runtime, activity kinds (collect / race / defeat), rewards
├── fx/                    sparkles, emote bubbles, blob shadows, rings, damage numbers, hit-stop,
│                          groundDecals (terrain-hugging circles, wedges and lanes for warnings and aiming)
├── ui/                    DOM side: element lookups, HUD (incl. boss bar), dialogue, challenge panel, banner + travel fade,
│                          InventoryUI + itemTooltip (the bag window), itemNotices (item toasts),
│                          overlay (planet chip), toast, character select
└── utils/                 math helpers, seeded / runtime random, sphere geometry
```

There are no asset files: every model, texture and sound is generated in code. Real assets would replace the
builders in `src/models`, the props in `src/world/props.js`, or the methods in `src/systems/AudioSystem.js`.

## Architecture

**Startup order is part of the design** (`Game.init`):

1. The world is generated from a seeded RNG (`utils/random.js` `rand`). Every draw shifts everything after it, so
   `World.generate()` runs its steps in a fixed order, and the initial enemy spawn runs right after it. Change that
   order and the planet's layout changes.
2. Moving bodies resolve collisions in the order they were created, so the player, critters, villagers and enemies are
   created in that order.

**Per-frame order** (`Game.update`): player → critters → birds → fish → villagers → combat (vitals, casting + area aim, aim,
projectiles, enemies, hazards, companion, effects, combat HUD) → planet progression → challenges → knight upkeep → menu orbit → camera → world →
particles and emotes → dialogue → overlay, buffs, toast. Rendering follows each update.

**Dependencies flow one way:** `config` and `utils` depend on nothing. `render` and `physics` build on them, and
`world` on those. Entities, combat and gameplay sit above, and `core/Game.js` wires everything. UI modules receive the
data they show (`updateCombatHud(spellState, aimTarget)`) rather than reaching into combat. Challenges plug into the
dialogue through `Dialog.lineProvider` instead of the dialogue importing them. Level-ups are announced on an
`EventTarget` (`progression/experience.js`), so feedback stays decoupled from the rules.

**Shared state** lives in `core/context.js` (`ctx.player`, `ctx.enemies`, `ctx.time`...), filled in by `Game`. That
is the one place to look for "what is alive right now", instead of dozens of loose globals.

**Planets:** `World.generate(planet)` builds a planet from its PLANETS entry (seed + palette) and `World.dispose()`
tears it down. `PlanetProgression` listens for `'bossdefeated'` and runs the trip: the other monsters vanish (no XP),
any challenge is called off, and after the victory banner the screen fades. Then the next planet is generated, the
villagers move into its village, wildlife and the scaled roster spawn, and the hero arrives healed with level, XP and
treats intact. The transition can't fire twice (it only accepts the event while playing), and returning to character
select always restarts on planet 1.

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

## Tuning

| What | Where |
|---|---|
| Movement, jump, camera | `src/config/game.js` |
| Spells, enemy stats, XP per enemy | `src/config/combat.js` |
| Boss health, attacks (damage, warning times, cooldowns, reuse), phases | `src/config/combat.js` → `enemies.gloomcap / pyrrhax / malgrath` |
| Ultimates (Meteor, Leap Slam, Arrow Rain) and evasion cooldowns | `src/config/combat.js` (witch) and `src/config/characters.js` |
| Planets: order, rosters / spawn counts, difficulty scale, boss, colours | `src/config/planets.js` |
| Victory / fade timings, heal on arrival | `src/config/planets.js` → `TRANSITION` |
| Items (stats, stack sizes, effects, icons), bag size, keys, pickup radius | `src/config/items.js` |
| What lies around each planet | `src/config/planets.js` → `forage` |
| Hero stats and abilities | `src/config/characters.js` |
| XP curve, level cap, stat / damage growth | `src/config/leveling.js` |
| Challenges and their dialogue | `src/config/challenges.js` |
| Villager dialogue | `src/entities/npc/npcDefs.js` |
| Fog, bloom, outlines | `src/config/render.js` |

## Items and the bag

**Definitions vs. state.** `config/items.js` lists what each item *is* (id, name, description, category, icon, stack
size, rarity, value, use effects, tags). `items/ItemRegistry.js` validates them at load: unknown categories or effects
and duplicate ids are reported and skipped. The bag (`inventory/Inventory.js`, `player.inventory`) only stores what you
*have*: slots that are `null` or `{ itemId, quantity, props }`, where `props` holds per-copy data (durability, rolls)
and keeps differing copies from stacking. Reads return copies; every change goes through methods that validate it and
emit `change`, `itemadded`, `itemremoved`, `full` or `itemused`.

**Stacking and capacity.** `add` tops up compatible stacks first, then fills empty slots, one stack at a time, and
returns `{ added, remaining }`. Whatever doesn't fit is reported, never lost. `remove` is all-or-nothing, and emptied
stacks free their slot. `move` merges into a matching stack (any overflow stays behind) or swaps.

**Getting items.** Walk over items lying in the world (each planet's `forage`, or anything dropped). The world item only
shrinks by what the bag accepted, so with a full bag it stays put. Pim hands out buns and tarts, challenge "treats" are
Honey-moss Buns, and each boss leaves its crown. Gifts that don't fit are set down at your feet.

**Using items.** `I` opens the bag. Movement still works, but abilities and talking pause. Click an item to select it,
click another slot to move, merge or swap, and double-click or **Use** to use it. Behaviour comes from the category
(`items/itemActions.js`): consumables are used (effects in `gameplay/itemUse.js`, never wasted when they'd do nothing),
materials are kept, quest items are inspected and can't be dropped, and equipment / weapons are reserved for an equip
system. **Drop** sets a stack on the ground.

**Extending it.** A new item = an entry in `ITEM_DEFINITIONS`. A new effect = a key in `ITEM_EFFECTS` plus a handler in
`itemUse.js`. A new item source (enemy drops, chests, shops) calls `spawnWorldItem` or `grantItem`. Equipment would
add an action handler plus slots of its own, using `Inventory.move`. Save / load can use `inventory.toJSON()` and
`inventory.load()`. The bag is kept across planets and fainting, and emptied on a new adventure (there is no save system).

## Monsters and bosses

| Monster | AI | Planets | How it fights |
|---|---|---|---|
| Goblin | melee | 1, 2, 3 | fast hit-and-run, flees when hurt |
| Ogre | melee | 1, 3 | slow, telegraphed ground slam you can jump over |
| Wisp | ranged | 1, 2, 3 | keeps its distance, fires slow homing orbs |
| Slime | hopper | 1, 2 | bounces at you, splits into slimelings |
| Puffcap | bomber | 2, 3 | rushes in, swells on a fuse, bursts. Stagger it to defuse, kill it to prevent the blast |
| Ramhorn | charger | 2, 3 | marks a lane, then charges in a line. Sidestep it; if it hits scenery it's dazed and takes +50% damage |
| Thornmole | burrower | 3 | tunnels (untargetable) and erupts under you after a tremor, then stays exposed briefly |
| Hexlantern | support | 3 | follows fighting monsters, heals them and shields them (−50% damage). Kill it first |
| **Gloomcap** (boss) | boss: gloomcap | 1 | the introduction: slam, lane charge, homing volley, shockwave ring (jump it), summons; three phases |
| **Pyrrhax** (boss) | boss: dragon | 2 | red dragon: bite up front, tail sweep if you flank it (jump it), sweeping fire breath, lobbed fireballs that leave burning patches, a winged leap onto you from afar; Inferno below 50% |
| **Malgrath** (boss) | boss: demonLord | 3 | Winged Demon Lord. Grounded: greatsword combo, fissure lane, hellfire circles and the **Doom Blade**, a 2 s telegraphed blow that kills anyone left in its circle. At 50% he rises on his wings (immune while transforming): dives, soul-orb barrages, hellstorm, strafing runs |

Bosses are immune to stagger and knockback, and only feel stuns between attacks (shortened by `stunResist`).

**Adding a planet:** append an entry to `PLANETS` in `src/config/planets.js` (new seed, palette, a higher `scale`,
roster, boss). Nothing else needs to change. `npm test` checks that every planet is complete and harder than the one before.

**Quick test from the console** (after starting a game): `LANTERNMOSS.boss.hp = 1` and hit it once to watch the
whole victory → travel sequence, or `LANTERNMOSS.goToPlanet(2)` to jump straight to Frostveil.

## Refactor notes

This project used to be one 2,900-line `lanternmoss.html`. It was split into the modules above. A side-by-side
"golden master" comparison checked that gameplay and visuals are unchanged: both versions ran the same 71-checkpoint
scripted session with seeded randomness, ending in identical state, and rendered pixel-identical frames.

Changes made on the way:

- **Must be served over HTTP** now (ES module files), hence `npm start`.
- **Respawn sun direction:** after fainting, the sun was reset to a different bearing than at startup or restart.
  Respawn now uses the same reset (`World.resetSun()`).
- **Hidden coupling removed:** the wolf companion relied on writing a scratch vector shared with every critter's head
  animation, so each critter now owns its `toP`. Villager gestures were chosen by comparing NPC names, so they are
  now a `gesture` field in the villager data. The audio toggle no longer shows the toast itself. The challenge
  runtime no longer moves HUD elements. Buff timers no longer tick inside the HUD drawing code.
- **No more monkey-patching:** knight sounds and knight abilities used to be bolted onto `AudioSys` / `CAST` with
  `Object.assign` from a later section. Each now has one definition.
- **Duplication and dead code:** camera shake (11 copies), camera snap, collider removal and spawn placement each
  have one helper now. Duplicated CSS rules are merged. An unused CSS variable, an unused `houseB` constant and a
  hand-maintained list of model part names are gone. Both heroes' skill hints now live in config (the witch's used
  to be hard-coded in the HTML).
- **Tests** import the real modules directly. The XP math takes its config as an optional argument, so tests can use
  a hand-checkable curve.
