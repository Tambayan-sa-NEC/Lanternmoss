# Project structure (file map)

```text
index.html                 markup only: HUD, dialogue box, challenge panel, character-select overlay
styles/main.css            all styling
scripts/serve.mjs          zero-dependency dev server
scripts/screenshots.mjs    retakes the README screenshots (headless Chrome)
scripts/shots.mjs          which folder of docs/screenshots/ each screenshot belongs in
scripts/save-smoke.mjs     checks real browser save/reload/export/import; retakes save-menu screenshots
docs/screenshots/          the README screenshots, one folder per subject (characters, mobs, huds...)
docs/logs/                 timestamped decisions, tasks, actions and verification
docs/performance-uhd620-720p.json  current-machine 720p Low diagnostic; hardware/method, scene samples and errors
docs/wiki/technical/typography.md         the type brief, the pairings compared (type-specimen.html) and the choice
tests/                     unit tests: XP / level math, inventory, planets + enemy scaling, combat + boss config, settings,
                           heroes, villagers + quests + shop, houses, chests + loot, items + gear + crafting, pets, keybinds,
                           the seeded random stream
tests/sim/                 gameplay sims (npm run sim): the real game played headless; balance.sim.mjs is the balance report
favicon.ico                the Girl Witch character mark in the browser tab (16–48 px)
favicon.png                the 32 px PNG browser icon, from docs/logo/witch-A1.png
src/
├── main.js                entry point: builds the Game, starts the loop, exposes window.LANTERNMOSS
├── errorOverlay.js        classic script that shows load/runtime errors on screen
├── config/                every tunable number and authored data table (no logic, no Three.js)
│   ├── game.js            planet radius, world generation (WORLD: scatter, flats, slopes, water), movement, buffs, camera
│   ├── render.js          pixel ratio, fog, bloom, outline width
│   ├── combat.js          spells, enemy and boss stats, boss attacks and phases, XP per enemy, pet marks
│   ├── pets.js            every pet: body, attack, ability, unlock; pet growth, care, commands, keys, motion
│   ├── photo.js           photo mode: camera limits, filters, frames, poses, emotes, the picture's file name
│   ├── planets.js         ordered catalog, released campaign views and transition timings
│   ├── planets/           one config per world: seeds, content, NPCs, house overrides and release metadata
│   ├── planetRules.js     release, secret-unlock, completion and population rules
│   ├── items.js           item definitions (incl. gear), categories, rarities and their stat multipliers, gear slots and
│   │                      stats, the hotbar, effects, bag size and pickup settings
│   ├── crafting.js        crafting recipes in groups (tools, food, potions, weapons, armour, trinkets, vanity), and
│   │                      the station each needs (if any)
│   ├── stations.js        the crafting stations (workbench, forge, cooking pot, brewing stand) and the corner's layout
│   ├── resources.js       gathering: node kinds (drops, tools, regrow), trees and rocks, fishing, crops, the farm
│   ├── survival.js        the energy meter: drain, hungry / starving effects, after fainting
│   ├── characters.js      the three playable heroes (stats, abilities, texts, ability tooltips, selection profile)
│   ├── settings.js        player settings schema (drives the Settings screen, defaults and validation)
│   ├── controls.js        every key: the remappable KEYBINDS (defaults), hotbar keys, fixed controls, key-cap labels
│   ├── credits.js         the Credits page text
│   ├── day.js             the village clock: day length, phases, light per phase
│   ├── shop.js            coins per monster, the shop's keeper, hours, stock and prices
│   ├── houses.js          enterable houses per planet: layout, furniture, owner / resident, note, chest gift
│   ├── chests.js          treasure chests and drops: kinds, loot tables, gear rarity odds, monster drops, keys, boss chest
│   ├── quests.js          multi-step villager quests (steps, rewards, dialogue)
│   ├── bounties.js        the bounty board: kinds of job, counts, coins, rare-piece chance, where the board stands
│   ├── sets.js            gear sets: each world's pieces and their two- and three-piece bonuses (burn, chill, healing...)
│   ├── challenges.js      villager mini-challenges and their dialogue
│   ├── leveling.js        XP curve, level cap, stat and damage growth
│   ├── talents.js         talent points, the reset wizard and each hero's tree (Witch, Warrior and Ranger)
│   ├── dungeons.js        caves: the room kit, cave rules and each planet's (unreleased) cave
│   └── critters.js        ambient animal looks
├── core/
│   ├── Game.js            startup order, per-frame update order, run lifecycle (begin / reset)
│   ├── GameLoop.js        requestAnimationFrame loop with a clamped timestep
│   ├── save.js            versioned adventure format, cleaning, storage and state ownership registry
│   ├── AdventureSave.js   save lifecycle, planet snapshots, Continue and file import/export
│   ├── context.js         the shared live state (time, player, enemies, NPCs, paused...)
│   ├── settings.js        live player settings: validated, saved to localStorage, change listeners
│   ├── keybinds.js        live key bindings: is / held / labels, remapping with swaps, saved to localStorage
│   ├── events.js          game-wide events (quest completed, chest opened) other systems react to
│   └── controls.js        key bindings: what each input does
├── systems/               engine-level services
│   ├── RenderSystem.js    WebGL renderer, bloom + storybook post-processing, resize
│   ├── CameraSystem.js    third-person, surface-aligned, collision-aware camera rig
│   ├── InputSystem.js     keyboard state and mouse gestures (devices only, no game rules)
│   └── AudioSystem.js     procedural WebAudio music and sound effects
├── render/                Three.js building blocks
│   ├── scene.js           the scene and camera
│   ├── materials.js       toon ramp, glow, inverted-hull outline, point-sprite materials
│   ├── lighting.js        local light: light radii in the toon shader, the shared real point lights, darkness
│   ├── meshes.js          primitive geometries and outlined model parts
│   └── Batcher.js         merges static scenery into a few draw calls
├── physics/
│   ├── colliders.js       static, moving and camera colliders; overlap resolution
│   ├── RoomSpace.js       flat cave floor: wall/body sweeps, gravity and paths through connected rooms
│   └── Walker.js          shared actor movement: spherical surface physics or the attached flat room frame
├── world/                 the planet (generated once, in a fixed order, from a seeded RNG)
│   ├── World.js           generation order, landmarks, per-frame sun / sky / ambient animation
│   ├── caveLayout.js      cave layouts: rooms joined from a seed, the walkable floor, which room a point is in (pure)
│   ├── caves.js           a cave's rooms, corridors and lanterns, built far below the planet
│   ├── mechanics/         pure registered mechanic descriptors and per-module save cleaning
│   ├── physics.js         planet gravity, live pond/sea levels and declared maximum-water queries
│   ├── terrain.js         each planet's shape (seeded hills / ridges / plateaus), flats, the baked height field, ponds,
│   │                      slopes, water depth, ground-placement matrices
│   ├── placement.js       free-spot searches for scenery and spawns
│   ├── planet.js          the planet mesh (cliff faces and high ground coloured from the palette)
│   ├── props.js           prop builders (houses, nine kinds of tree, rocks, lanterns, flowers...)
│   ├── weather.js         weather spells per planet: wind, fog, light, sky tint, rain / snow / ash / petals, lightning
│   ├── village.js         houses, standing-stone circle, lantern paths
│   ├── interiors.js       house interiors: room shells and furniture, built away from the planet
│   ├── scatter.js         pond decoration, the planet's trees, rocks, flowers; swaying grass, tall grass, wildflowers
│   ├── water.js           pond water shader
│   └── sky.js             sky dome, clouds, fireflies
├── models/                procedural character and item art (swap a builder to use real assets)
│   ├── humanoid.js  heroes.js  creatures.js  villagers.js (incl. planet locals and outfits)  monsters.js
│   ├── chest.js           treasure chest (hinged lid, padlock, light beam)
│   ├── resources.js       resource nodes (bushes, herbs, branches, veins), the farm (fence, plots, scarecrow), crops, the float
│   ├── stations.js        the four crafting stations (glowing coals, a bubbling pot, flasks on a stand)
│   ├── vanity.js          hats and capes drawn on the hero
│   ├── bosses.js          demon lords (Gloomcap; Malgrath with greatsword + wings) and the shared bat wing
│   └── dragon.js          Pyrrhax, the red dragon
├── items/                 ItemRegistry (validated item catalogue), itemActions (what each category does),
│                          gear (rarity -> stats, totals, caps), sets (worn sets -> bonuses) and crafting (recipe
│                          rules); all pure
├── inventory/             Inventory: slot storage, stacking, capacity, moving / swapping, events (pure)
├── entities/              things that live and move in the world
│   ├── player/            Player (movement, model swap, placement) and pose animation
│   ├── enemies/           Enemy (melee / ranged / hopper AI), shared AI states, and behaviors/ for the newer AIs:
│   │                      bomber, charger, burrower, support, and boss/: the boss framework (core.js) with one kit
│   │                      per boss (gloomcap.js, dragon.js, demonLord.js)
│   ├── companions/        pet bodies: FlyingPet (owl, wisp, dragon whelp), WalkingPet (wolf, fox), petBrain (targets, hits)
│   ├── npc/               NPC behaviour (schedules, sleep, lines, outfits) and the villager definitions
│   │                      (places, schedules, story-aware dialogue, a local villager per later planet)
│   ├── wildlife/          critters (village pets, wild animals, rare creatures to befriend), birds and flocks, pond
│   │                      fish and lake koi, and their spawning per planet
│   ├── Projectile.js      surface-hugging projectiles
│   ├── Chest.js           a treasure chest in the world: collider, falling in, opening, rattling when locked
│   ├── ResourceNode.js    something to gather: its model, wobble when worked, regrowing
│   └── WorldItem.js       an item stack lying on the ground (can hop out of a chest)
├── combat/
│   ├── CombatSystem.js    per-frame combat update order
│   ├── space.js           combat points, height, floor, distance, headings and visibility in either frame
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
│   ├── talentRules.js     talent points, learning, save validation and the kit with talents applied (pure)
│   ├── experience.js      applies XP to the hero and emits 'xp' / 'levelup' events
│   └── levelFeedback.js   float text, burst, jingle and toast on those events
├── gameplay/
│   ├── PlanetProgression.js  boss defeated -> victory; portal choice -> fade -> chosen planet; restart at planet 1
│   ├── PlanetMechanics.js  world-owned entry/exit, frame and calendar-skip hooks, independent planet saves
│   ├── BossGate.js        the sealed lair: summon conditions (level, seals, elites' sigils, a quest, night), the waking
│   │                      sequence, the arena ring, villager hints, the lair chip and compass marks
│   ├── characters.js      switching heroes (model, stats, abilities, pet)
│   ├── Pets.js            the pet system: unlocked pets, the one out, names, commands, health and fainting, petting
│   ├── petPicks.js        which pet each hero last took (saved in the browser)
│   ├── Journal.js         the journal: fills in achievements, the bestiary and the collection from game events, boss
│   │                      challenges, rewards; saved in the browser across adventures
│   ├── journalRules.js    the journal's saved shape, cleaning it on load, counters and achievement progress (pure)
│   ├── petAbilities.js    pet abilities (Scout, Howl, Fetch, Mend, Flame Burst) and their lasting effects
│   ├── buffs.js           buff timers: Moon-Hop, Feather-Step, Howl, and from food Mighty, Stoneskin, Quickstep, Mending
│   ├── Needs.js           the energy meter: drains while you play, food fills it, low = slower healing and sprint
│   ├── needsRules.js      energy levels, effects, drain and warnings (pure)
│   ├── Gathering.js       resource nodes, chopping trees and mining rocks, tool jobs (swing, drops, regrow), tips
│   ├── Fishing.js         casting, the bite, the reeling meter, catches
│   ├── Farm.js            the village farm: tilling, planting, watering (and rain), growing, harvesting
│   ├── Stations.js        the village's crafting corner: placing it, which station you stand at, opening its recipes
│   ├── Bounties.js        the village bounty board: placing it, counting jobs from game events, claiming, per-planet saves
│   ├── Dungeons.js        caves: mouth, entry/exit, combat frame and safe surface encounter restoration
│   ├── Talents.js         the hero's learned talents: their kit for casting, saves, Old Bramble's free reset
│   ├── bountyRules.js     the day's jobs generated from a planet's config, progress and the saved shape (pure)
│   ├── resourceRules.js   drops, tool tiers, catches, the needle, crop stages, what a planet supplies (pure)
│   ├── heldTool.js        the tool in the hero's hand while working
│   ├── dayClock.js        the village clock (phase, day, light)
│   ├── storyState.js      what villagers know about your adventure (dialogue conditions and placeholders)
│   ├── wallet.js          coins: earning, spending, shop prices
│   ├── Houses.js          entering / leaving houses, walking indoors, using furniture, the E-prompt target
│   ├── quests/            quest runtime (offers, steps, tracker, rewards)
│   ├── pickups.js         world <-> bag: walk-over pickup, granting, dropping, forage
│   ├── Chests.js          placing a planet's chests, opening them, keys from monsters, the boss chest
│   ├── loot.js            rolling a loot table into coins and item stacks (gear with a rolled rarity)
│   ├── drops.js           monster drops
│   ├── equipment.js       what the hero wears (8 slots: head, body, feet, weapon, two trinkets, hat, cape); stats =
│   │                      base + level + gear; vanity drawn on the hero
│   ├── hotbar.js          the hotbar (keys 1-9): which slot the hero holds, using what's held
│   ├── bagCommands.js     what the bag window can ask the game to do (use, equip, craft...)
│   ├── itemUse.js         using items: effect handlers (heal, mana, energy, buff), tool / seed actions
│   └── challenges/        challenge runtime, activity kinds (collect / race / defeat), rewards
├── fx/                    sparkles, emote bubbles, blob shadows, rings, damage numbers, hit-stop,
│                          groundDecals (terrain-hugging circles, wedges and lanes for warnings and aiming)
├── ui/                    DOM side: element lookups, HUD (bars, status row, ability bar + tooltips, boss bar), icons (SVG),
│                          waypoints (compass strip + off-screen arrows), PauseMenu (pause, settings, controls, quit),
│                          MainMenu (title screen: play, settings, controls, credits, campaign strip),
│                          ShopUI (buy / sell), portraits (dialogue faces),
│                          dialogue, challenge panel, banner + travel fade,
│                          InventoryUI + itemTooltip (the bag window: the grid, the equipment side, the details
│                          window under it, and the Craft tab), itemArt (SVG item
│                          pictures), petHud (the pet card on the lower left), PetMenu (the pet menu during play), PhotoMode (photo mode),
│                          BountyUI (the bounty board window), TalentUI (the talent page),
│                          petViews (pet cards and detail panels for both pet screens), showcase (the menus' still
│                          camera framings of the hero and pet, and finding a clear view for them),
│                          itemNotices (item toasts), JournalUI (the journal screen: achievements, bestiary,
│                          collection), monsterPortraits (bestiary pictures rendered from the real models),
│                          achievementToast (the unlock banner),
│                          overlay (planet chip), toast, character select (hero, then pet; from the title, or C in play).
│                          HUD layout: vitals + hotbar bottom centre, skills lower right, pet card lower left, boss bar top
└── utils/                 math helpers, seeded / runtime random, sphere geometry
```

There are no asset files: every model, texture and sound is generated in code. Real assets would replace the
builders in `src/models`, the props in `src/world/props.js`, or the methods in `src/systems/AudioSystem.js`.
