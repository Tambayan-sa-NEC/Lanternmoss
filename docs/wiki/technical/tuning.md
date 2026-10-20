# Tuning

| What | Where |
|---|---|
| Movement, jump, camera | `src/config/game.js` |
| Spells, enemy stats, XP per enemy | `src/config/combat.js` |
| Boss health, attacks (damage, warning times, cooldowns, reuse), phases | `src/config/combat.js` → `enemies.gloomcap / pyrrhax / malgrath` |
| Ultimates (Meteor, Leap Slam, Arrow Rain) and evasion cooldowns | `src/config/combat.js` (witch) and `src/config/characters.js` |
| Planet catalog and release order | `src/config/planets.js` |
| World content, NPCs, house overrides, act/release/secret flags | `src/config/planets/<id>.js` |
| Victory / fade timings, heal on arrival | `src/config/planets.js` → `TRANSITION` |
| Items (stats, stack sizes, effects, icons), bag size, keys, pickup radius | `src/config/items.js` |
| What lies around each planet | `src/config/planets/<id>.js` → `forage` |
| Each planet's shape: hills, ridges, plateaus / cliffs, lakes | `src/config/planets/<id>.js` → `terrain` (cliff / peak colours: `palette`) |
| Planet size, scenery density, flattened areas, steepest walkable slope, swimming | `src/config/game.js` → `PLANET_RADIUS`, `WORLD` |
| Hero stats and abilities | `src/config/characters.js` |
| XP curve, level cap, stat / damage growth | `src/config/leveling.js` |
| Combat timing targets, per-world summon levels, XP routes and coin reserves (including Tidewhisper) | `src/config/balance.js` → `BALANCE` |
| Challenges and their dialogue | `src/config/challenges.js` |
| Quests (steps, rewards, dialogue) | `src/config/quests.js` |
| Day length, phases and light | `src/config/day.js` |
| Coins per monster, shop stock, prices and hours | `src/config/shop.js` |
| Houses: who lives where, furniture, notes, chest gifts, nap healing | `src/config/houses.js` |
| Chests: kinds, loot tables, key drop chance, boss chest timings | `src/config/chests.js` |
| Gear: stats per piece, rarity multipliers, stat caps, gear kinds and the worn slots | `src/config/items.js` → `equip`, `RARITIES`, `STATS`, `GEAR_KINDS`, `EQUIP_SLOTS` |
| Tools and what they do | `src/config/items.js` → `tool`, `TOOL_KINDS` |
| The energy meter: drain, hungry effects | `src/config/survival.js` → `NEEDS` |
| What can be gathered, tools needed, drops, regrow times; trees and rocks | `src/config/resources.js` → `NODE_KINDS`, `SCENERY`; trees: `src/config/flora.js` (`wood`) |
| Each planet's nodes and rare veins | `src/config/planets/<id>.js` → `resources` |
| Fishing: bite timing, the meter, catches per planet | `src/config/resources.js` → `FISHING` |
| Crops, growing time, the farm plot | `src/config/resources.js` → `CROPS`, `FARM` |
| Crafting stations, the corner's layout; which recipe needs which station | `src/config/stations.js`; `src/config/crafting.js` → `station` |
| Smelting: ore and fuel per ingot, what burns and for how long | `src/config/crafting.js` → `fuel`, `FUEL` (the Smelting group) |
| Buff strengths (Mighty, Stoneskin, Quickstep, Mending) | `src/config/game.js` → `BUFFS` |
| Monster drop chance and table, gear rarity odds per source | `src/config/chests.js` → `MONSTER_DROPS`, `GEAR_RARITY` |
| What wakes each boss, its arena wall | `src/config/planets/<id>.js` → `boss.summon`, `boss.arena` |
| Each planet's trees, flowers, tall grass, weather mix, animals and mini bosses | `src/config/planets/<id>.js` → `flora`, `weather`, `wildlife`, `miniBosses` |
| Tree kinds and their colliders | `src/config/flora.js` (looks: `src/world/props.js`) |
| Weather kinds (wind, fog, light, rain / snow / ash, lightning, sound), spell length | `src/config/weather.js` |
| Animals: looks and behaviour kinds, rare creatures and their gifts, how shy they are | `src/config/critters.js` |
| Mini bosses (the Hydra, the Basilisk): stats, attacks, phases; their loot | `src/config/combat.js` → `hydra`, `basilisk`; `src/config/chests.js` → `MINI_BOSS_LOOT` |
| Giving up a chase: healing on the way home, the mini boss's delay before it heals | `src/config/combat.js` → `leashReturn` |
| Monsters fighting each other: how hard they hit, how long a grudge lasts, how wide a swipe catches | `src/config/combat.js` → `mobFeud` |
| The waking sequence, elites, the arena ring, villager hints | `src/config/bossSummon.js` |
| Soft lock-on cone and range | `src/config/combat.js` → `autoAimAngle`, `autoAimRange` |
| Crafting recipes | `src/config/crafting.js` |
| Coastal recipes and Tide gear forge fees (70/80/70/60 coins) | `src/config/coastalResources.js` → `COASTAL_RECIPES` |
| Bounty board: kinds of job, counts, coins, material, rare-piece chance, board placement | `src/config/bounties.js` → `BOUNTIES` |
| Gear sets: pieces, two- and three-piece bonuses (burn, chill, healing, swimming, push), burn tick | `src/config/sets.js` → `SETS`, `BURN_TICK` |
| Talents: points per level, the reset wizard, each hero's tree and its release flag | `src/config/talents.js` → `TALENTS` |
| Pets: attacks, abilities and cooldowns, health, unlocks, growth per level, fainting, commands and keys | `src/config/pets.js` |
| How the menus frame a pet (where it shows off, camera distance and angle) | `src/config/pets.js` → `PET_SHOWCASE` |
| How the menus frame the hero | `src/ui/showcase.js` → `HERO_VIEW` |
| Photo mode: camera range, filters, frames, poses, emotes | `src/config/photo.js` → `PHOTO` (filter / frame looks: `RenderSystem` paper pass) |
| Achievements: goals, rewards, boss challenge levels, banner timing, when a monster counts as met | `src/config/achievements.js` |
| Bestiary pages: blurbs, attacks, how to beat each monster, drop notes | `src/config/bestiary.js` |
| Default keys, hotbar keys | `src/config/controls.js` → `KEYBINDS`, `HOTBAR_KEYS` |
| Hotbar size, use cooldown, which items land on it first | `src/config/items.js` → `HOTBAR` |
| Fonts | `styles/main.css` → `--font-display`, `--font-body` (and the font link in `index.html`; see `docs/wiki/technical/typography.md`) |
| How many chests each planet has, its loot material | `src/config/planets/<id>.js` → `chests`, `material` |
| Villager dialogue, schedules and places | `src/entities/npc/npcDefs.js` |
| Fog, bloom, outlines | `src/config/render.js` |
| Frame-time target and per-world count ceilings (including Tidewhisper's 550 calls / 230,000 triangles) | `src/config/render.js` → `PERFORMANCE_BUDGET`; calibrated frame limit: `src/config/contentGate.js` → `frameLimitMs` |
| Default desktop validation machine, GPU, viewport, quality and hero/seed/scene matrix | `src/config/render.js` → `PERFORMANCE_REFERENCE`; actual GPU/profile helpers are shared by the collector and content gate |
| Local light for dark places: light spots, real point lights, hero light, bands, minimum ambient, dimming | `src/config/render.js` → `RENDER.localLight` ([docs](lighting.md)) |
| Caves: room kit, grid/corridors, darkness, lanterns, mouth, wall sweep step, route reach, per-planet caves | `src/config/dungeons.js` → `CAVE`, `ROOM_KIT`, `CAVES` ([docs](../world/caves.md)) |
| Cave rewards: how near E offers a chest or vein, how far fixtures and monster spawns sit off the walls, how many monsters clear a room | `src/config/dungeons.js` → `CAVE.reward` |
| Cave ore: the veins that grow only underground (tool, tier, swings, drops) and each cave's ore, vein count and chest kinds | `src/config/dungeons.js` → `CAVE_VEINS`, `CAVES` (`ore`, `veins`, `chest`, `endChest`) |
| Cave puzzles: how near E works a switch or the door, how many switches/stones a room holds, plate and stone sizes, push speed, how far off the walls they sit | `src/config/dungeons.js` → `CAVE.puzzle` |
| The cave guardian's toughness and halo, and how near E takes the way home | `src/config/dungeons.js` → `CAVE.guardian`, `CAVE.shortcut` |
| Which puzzle, guardian and guardian loot each cave gets | `src/config/dungeons.js` → `CAVES` (`puzzle`, `guardian`, `guardianLoot`) |
| A cave's wandering monsters, its warden's keepsake, its lantern colour, and whether it is open to players | `src/config/dungeons.js` → `CAVES` (`roster`, `guardianExtra`, `lantern`, `released`) |
| What a cave warden's purse holds | `src/config/chests.js` → `LOOT_TABLES.caveGuardian` |
| The cave render regression guard (draw calls, triangles) | `src/config/render.js` → `PERFORMANCE_BUDGET.cave` |
| Player settings (what the Settings screen offers, defaults, ranges) | `src/config/settings.js` |
