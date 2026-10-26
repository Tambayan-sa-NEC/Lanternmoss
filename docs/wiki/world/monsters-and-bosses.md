# Monsters and bosses

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
| **Hydra** (mini boss) | boss: hydra | 1, 3 | by a lake: head bites (wedge), homing acid spit, a wide head sweep; grows a 4th and 5th head at 66% / 33% |
| **Basilisk** (mini boss) | boss: basilisk | 2 | petrifying gaze (turn your back before its eyes flare), tail whip (jump), lane lunge, venom fan when enraged |
| **Malgrath** (boss) | boss: demonLord | 3 | Winged Demon Lord. Grounded: greatsword combo, fissure lane, hellfire circles and the **Doom Blade**, a 2 s telegraphed blow that kills anyone left in its circle. At 50% he rises on his wings (immune while transforming): dives, soul-orb barrages, hellstorm, strafing runs |

Bosses are immune to stagger and knockback, and only feel stuns between attacks (shortened by `stunResist`).

**Waking a boss** (`gameplay/BossGate.js`, `config/bossSummon.js`). A planet's boss is spawned dormant: hidden,
untouchable and still. It wakes once its planet's `boss.summon` conditions hold:

| Boss | Conditions |
|---|---|
| Gloomcap | level 2; break the 3 Thorn Seals around its lair |
| Pyrrhax | level 4; bring 3 Ember Sigils, dropped by 4 golden elites |
| Malgrath | level 6; Tuva's quest *Warm Hearts* done; only at night |

How each kind of condition works:
- **Seals** are lair objects (`object: true`): they never move, drop nothing and aren't counted as monsters.
- **Elites** are some of the planet's own monsters, made tougher (`Enemy.makeElite`).

Once the conditions hold, walking into the lair plays the waking sequence. During it the hero can't act or be hurt.
While the boss fights, the ring around the arena keeps the hero inside (it drops if you faint). The boss's moves are
kept inside the ring too (`keepInArena`). In the console, `LANTERNMOSS.wakeBoss()` skips straight to the fight.

**Adding a planet:** create `src/config/planets/<id>.js` and import it into `PLANET_CATALOG` in campaign order.
Start with `released: false`; fill in the content and register its models/behaviors before completing the world-release
checks. `PLANETS` includes only released entries. Tests retain increasing difficulty and roster counts, with an explicit
population minimum allowed for small secret worlds. See [the metadata, NPC and compatibility rules](planets.md).
The [release gate](../technical/content-release.md) runs against actual registries under `npm test` and `npm run sim`.

**Quick test from the console** (after starting a game): `LANTERNMOSS.wakeBoss()`, then `LANTERNMOSS.boss.hp = 1` and hit it once to watch the
victory, open the treasure chest that falls, and choose a destination at the village lantern gate; or `LANTERNMOSS.goToPlanet(2)` to jump straight to
Frostveil. `LANTERNMOSS.Pets.unlock('whelp')`, `LANTERNMOSS.spawnItem('emberAxe')` and friends help try features out.

## Rematches (TODO 31a)

A boss you have already beaten can be challenged again, harder, for loot of its own. Walk back to its lair and the
prompt reads **"E Challenge <boss> again"**; the lantern gate marks the worlds where one is waiting, so you can see
from the village square where to go.

**The campaign never moves.** A rematch win pays its own coins, XP and chest, and nothing else: no trophy, no
Wayfarer's Key, no portal opening, no achievement and no first-win banner. Those belong to the one win that
mattered, and the progression refuses a second win on a world it has already recorded.

| | |
| --- | --- |
| **The ladder** | Three tiers of health, damage and speed, each worth more coins, XP and a better chest table. The last tier repeats for ever, so the fight tops out rather than running away |
| **What is saved** | Only how many rematches of each encounter are won, per adventure. A fight **in progress** is never saved |
| **What ends one** | Travelling, fainting or reloading puts the lair straight back to beaten-and-offered. A save cannot inject a half-woken fight |
| **Which bosses** | Only an encounter whose rematch kit is finished (`COMBAT.enemies[type].rematch`). The lifecycle landed first; each world's kit follows in 31b-31f, so until then a beaten lair stays quiet |

![The lantern gate marking a world with a rematch waiting](../../screenshots/huds/rematch-gate.jpg)
