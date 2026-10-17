# Balance and pacing — TODO 23

The tuning contract is a 2–6 second regular encounter, a 90–180 second optional mini boss and a 180–300 second planet
boss at summon levels 2, 4 and 6. These are damage-throughput targets with starting equipment and the default pet,
without food, runes or lucky drops. Better preparation should shorten fights. Individual evasive enemies can take
longer; the median of the planet's regular roster is the pacing target. Puffcaps' self-destruction is an exception.
Optional exploration and a first visit's quest requirements must reach each summon level without repeated kills.

Chests and local quest rewards should reserve one next-tier combat set, with a modest allowance for supplies, rather
than two sets. Lanternmoss also reserves the iron axe/pick fees; the finale reserves its final set and two trinkets. Monster coins and selling are additional income
earned through combat and gathering; materials remain a separate requirement. The boss chest is included in this budget; optional mini-boss treasure is extra income. There is no gear shop: the budget uses crafting fees, while Pim sells provisions,
seeds and tools. Purchases must cost more than their resale value.

The balance report runs the real game with a 60 Hz bot. It attacks from normal hero distances, uses damaging abilities
and aimed ultimates when affordable, and evades Doom Blade with normal movement/evasion. Regular fights start with
full health/resource, cleared cooldowns/buffs, fresh energy and a repositioned companion. Long fights report HP
top-ups below 50% separately: these are throughput probes, not claims that a human can win without healing or dodging.
Trials stop when the target dies; a failed/capped fight is reported honestly. The phase test separately exercises
real projectile hits in flight and the transition immunity window.

Reproduce with `npm run sim -- balance`; set `SIM_SEED` to change the gameplay seed and `BALANCE_JSON` to export the
raw results. Set `BALANCE_CHECK=1` to make out-of-target profiles fail the report. `npm run sim -- pacing` audits the campaign XP, all chest-coin bounds, shop trade margins, farm/food timing
and forge fuel budget from the actual configuration. `src/config/balance.js` holds targets and the reproducible route.
Set `BALANCE_PLANET` to 0, 1 or 2 to rerun only the world being tuned; its JSON export contains only that world's rows.

Bounty boards (TODO 34, `src/config/bounties.js`) are optional, repeatable income outside these budgets, like selling.
Three jobs a day pay about 23 / 30 / 35 coins a day on average on Lanternmoss / Emberfall / Frostveil (200 sampled days,
`tests/bounties.test.mjs`), plus 1-2 of the planet's material each and a rare piece of gear on 8% of jobs. That is
about what selling chest finds pays; materials still gate crafting, so bounties speed gear up rather than replace it.

Gear sets (TODO 28a, `src/config/sets.js`) are likewise outside the duel targets, which use starting gear. They are
optional power from crafting or finding a world's pieces: Moss heals up to 30% more, Ember burns add up to 70% of each
hit over 3 s (a refreshed burn, so fast hitters gain less than slow heavy ones), Frost slows up to 35%. Bosses keep
their slow and knock resistance.

## Witch talents (28c)

The original duel targets remain base-kit, starting-gear targets. Learned talents are optional power. A paired
level-8 diagnostic in `tests/sim/witchTalents.sim.mjs` compares an unlearned Witch with Bright Bolt rank 2 and
Seeking Flame (four earned points). Real enemy AI, casts and projectile hits run in an isolated dry arena, without
scenery colliders, with a passive pet and invulnerability. Both profiles start with full HP/mana, fresh needs,
buffs/cooldowns and a reset gameplay seed. These short throughput probes are not summon-level target certification,
boss measurements or evidence that a human survives without dodging. Unchanged hero controls may differ by up to
two simulation frames because the surrounding world continues advancing between trials.

| Hero / regular foe | Seed 1 base → talents | Seed 7 base → talents |
| --- | --- | --- |
| Witch / goblin | 1.350 → 1.350 s | 1.350 → 1.350 s |
| Witch / ogre | 1.833 → 1.533 s | 1.833 → 1.533 s |
| Warrior / goblin | 1.867 → 1.867 s | 1.867 → 1.867 s |
| Warrior / ogre | 2.300 → 2.300 s | 2.300 → 2.300 s |
| Ranger / goblin | 1.517 → 1.500 s | 1.500 → 1.500 s |
| Ranger / ogre | 1.117 → 1.117 s | 1.117 → 1.117 s |

The Witch's ogre sample improved by 16%; the goblin still fell on the same spell hit. A separate moving-target test
records a missed straight Fireball and a successful seeking explosion (33.0 damage at level 16 in both seeds).
Seeking Flame changes guidance, not damage, blast size, cost or range. Full mixed-set and three-tree acceptance
remains TODO 28e; no balance target was changed for these talents.

## Warrior talents (28d)

The same paired level-8 probe in `tests/sim/warriorTalents.sim.mjs` compares an unlearned Warrior with Keen Edge
rank 2 and Wide Cleave (four earned points, as for the Witch), with the same limits as above. The Witch and Ranger
rows are unchanged controls.

| Hero / regular foe | Seed 1 base → talents | Seed 7 base → talents |
| --- | --- | --- |
| Witch / goblin | 1.350 → 1.350 s | 1.350 → 1.350 s |
| Witch / ogre | 1.833 → 1.833 s | 1.833 → 1.833 s |
| Warrior / goblin | 1.867 → 1.433 s | 1.867 → 1.433 s |
| Warrior / ogre | 2.300 → 1.867 s | 2.300 → 1.867 s |
| Ranger / goblin | 1.500 → 1.500 s | 1.500 → 1.500 s |
| Ranger / ogre | 1.117 → 1.117 s | 1.117 → 1.117 s |

The Warrior's samples improve by 23% (goblin) and 19% (ogre), a little more than the Witch's 16% ogre sample because
Keen Edge raises his most-used hit. Wide Cleave adds no damage against one foe; its value is crowds (a foe 70° aside
takes a full hit). Against a real Gloomcap hit three seconds into Guard, the Warrior takes 32 HP base and 10 with
Steady Guard x2. Boss immunity windows are unchanged. No balance target was changed; combined acceptance is 28e.

## Ranger talents (28e)

The paired level-8 probe in `tests/sim/rangerTalents.sim.mjs` (Steady Aim x2 + Quick Fan x2): Ranger goblin
1.500 → 1.117 s on seeds 1 and 7, ogre 1.117 → 1.117 s (the fight already ends on the opening volley); Witch and
Warrior controls unchanged. Wide Fan adds no single-target damage (a lone foe takes 48 either way).

## Sets and talents together (28e)

`BALANCE_BUILD=depth node tests/sim/balance.sim.mjs` reruns the balance report with each world's three-piece set
(Moss on Lanternmoss, Ember on Emberfall, Frost on Frostveil) and the talents earned at its boss level (1, 2 and 3
points), spent in a fixed order. It is a diagnostic: the targets stay starting-gear targets. Acceptance line
(28e decision): with sets and talents no boss falls below 135 s, three quarters of the 180 s floor.

The first run failed it on Emberfall (Pyrrhax in 105-136 s, a mini boss in 54 s): a weaker hit refreshed a stronger
burn, so one big hit (Fireball, Meteor, a heavy swing) stayed lit as long as small hits kept landing. A weaker hit now
leaves the stronger burn to run out (`nextBurn`; `tests/sim/sets.sim.mjs` fails without it). Rerun, seeds 1 / 7,
base → sets and talents (Lanternmoss and Frostveil rows are unaffected by the burn fix):

| World | Hero | Mini boss | Boss |
| --- | --- | --- | --- |
| Lanternmoss | Warrior | 119.0 → 109.5 / 118.0 → 110.4 | 219.3 → 202.2 / 217.6 → 201.5 |
| Lanternmoss | Ranger | 96.9 → 89.1 / 97.6 → 90.9 | 181.6 → 168.7 / 181.6 → 168.7 |
| Lanternmoss | Witch | 127.3 → 117.0 / 127.2 → 117.4 | 237.8 → 219.6 / 244.0 → 219.6 |
| Emberfall | Warrior | 136.6 → 102.8 / 133.0 → 99.6 | 234.7 → 185.4 / 235.2 → 185.8 |
| Emberfall | Ranger | 97.3 → 122.0 / 97.3 → 136.1 | 186.0 → 140.6 / 186.7 → 140.6 |
| Emberfall | Witch | 137.0 → 97.4 / 167.5 → 97.4 | 245.3 → 180.8 / 245.3 → 180.8 |
| Frostveil | Warrior | 126.5 → 114.3 / 136.7 → 113.2 | 285.6 → 252.8 / 288.2 → 255.2 |
| Frostveil | Ranger | 93.6 → 77.4 / 92.2 → 79.0 | 241.1 → 171.6 / 198.5 → 160.7 |
| Frostveil | Witch | 124.8 → 106.3 / 125.1 → 106.2 | 253.6 → 219.8 / 254.5 → 218.6 |

Remeasured on 2026-10-16 with the corrected harness, the mini-boss leash rule and the raised mini-boss health (see
the next section): every boss stays at or above 140.6 s (Ember Ranger) and most fights shorten by 5-27%. The steepest
mini-boss cut is the Frostveil Ranger (93.6 → 77.4 s); mini bosses were not part of the acceptance line.

## Campaign and economy

The audited route completes Humming Stones, Pie Delivery and First Harvest on Lanternmoss (three wisps and three
seals); Dragon Forge and three lowest-XP goblin elites on Emberfall (also two ramhorns); then Warm Hearts and Songs
of Other Worlds on Frostveil (three thornmoles). Songs is accepted before leaving Lanternmoss and its Emberfall
delivery is done before travelling onward. Each monster is killed once. Rewards from optional mini bosses,
achievements, challenge activities and lucky gear are excluded. Higher-XP elites or extra exploration are bonuses.
Farming and gathering requirements still need play time; this is an XP route audit, not a timed human walkthrough.

| Planet | Level before boss | Required level | Chests + quest coins | Planned set fees | Route monster coins |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lanternmoss | 3 | 2 | 195–206 | 160 | 12 |
| Emberfall | 5 | 4 | 226–237 | 220 | 46 |
| Frostveil | 7 | 6 | 305–330 | 300, including two trinkets | 30 |
| Tidewhisper (27h, unreleased) | 8 | 8 | 281–360 | 280, its own Tide set and pendant | 39 |

The bounds cover every possible chest coin roll, including each planet?s boss chest. The pacing audit also samples 100 loot seeds for each hero/world.
Selling **all** chest contents adds 101–207, 141–261 and 180–407 coins respectively in that sample, but sacrifices
the food, materials and gear they contained. It is deliberately optional, not counted twice as equipment and income.
The reported reserve is a per-planet increment, not a cap on accumulated wealth. Rare chests require keys, available
from Bramble, monster drops with pity or crafting; opening every chest is exploration, not guaranteed route loot.
Planet materials still gate crafting. All three heroes' weapon recipe fees are the same for these budgets.

Chest coins now have narrower ranges (common 8–9, rare 22–24) and increase by 25% per planet. Dragon Forge pays 100,
Warm Hearts 90 and Songs 40 coins; the earlier villager rewards remain 95 total. Boss kill XP is now 80/150/330 after
planet scaling, avoiding the old early level jump while preserving the existing XP curve. Optional fights retain
their rewards. Pim's seed prices are 3/3/5; every stocked item's buy price remains above its sell price.

Tidewhisper is audited with its real id and planet index while it stays unreleased. Act I already ends at level 8,
its summon level, so its route (The Dark Lighthouse and three Shellbacks crossing the beach) keeps the hero at 8
without grinding. With no Act II gear beyond it yet, its coins reserve its own Tide set: the forge fees are 70/80/70
and 60 for the pendant. Its materials are audited at minimum yields: washups return once per 300 s day and low-tide
nodes are reachable once per day. The lens (6 seaglass, 6 wood) fits the first day, and the lens plus the whole set
(28 seaglass, 14 wood including forge fuel, 4 pearls, 6 coral, 9 shells, 1 black pearl) fits two days. Revisit the
budget when Duskhollow's gear exists.

## Survival, gathering and crafting

Energy drains at 0.08/s, plus 0.16/s sprinting and 0.08/s swimming. A mixed expedition (25% sprint, 10% swim) stays
fed for 391 seconds from the starting 80 energy. A five-minute boss costs 24 energy before movement. Food remains
useful without compulsory snacking mid-fight, and hunger still never causes damage. A raw carrot harvest averages
40 energy; a stew, bread or pumpkin pie covers at least five minutes of mixed travel.

Copper/ember veins regrow in 180 seconds, iron in 210 and rare gems in 450. Hand-gathered nodes keep their 120–180
second timings. Watered carrots, wheat and pumpkins take 180/225/300 seconds; dry soil still stops growth and a
new day needs watering again. Expected sale of each harvest plus returned seeds exceeds its seed price modestly,
while cooking makes the harvest more useful than its raw ingredients.

One charcoal now supplies four fuel points; three wood still makes two charcoal. The full Ember core set needs nine
iron ingots and 18 fuel, or nine wood made into charcoal instead of 18 wood burned directly. Individual batches can
waste the remainder of a fuel piece; bulk smelting pools it. First tools and essential food recipes retain their
material costs, so the faster later crafting loop does not delay the opening tutorial.

## Combat decisions and measurement limits

Regular enemy health removes most opening-skill one-shots, while the ogre's health and the thornmole's exposure cycle
avoid making Frostveil a slog. Puffcaps warn for two seconds. The warrior keeps 140 base HP and 20% armor, but its
cleave is 11 damage/6 stamina with 13/s regeneration. The witch now regenerates 13 mana/s as well; her more expensive
skills previously crowded out basic bolts in long encounters. Ranger stats remain unchanged.

Boss health is 6,700 / 8,000 / 8,640 after planet scaling. Mini bosses have 3,360 / 4,224 / 4,440 HP (raised 20% on 2026-10-16, see below; were 2,800 / 3,520 / 3,700). Malgrath's Doom
Blade remains lethal, warns for two seconds, commits its aim partway through, then waits at least 24 seconds after
the move finishes before reuse (previously 14). It is absent from the flying phase. Flying-phase base damage is now
21/8/14/16 for dive/barrage/rain/strafe; the highest scaled single hit is 36.75 before armor. Movement, attack identity,
the 50% transition and its 3.2-second immunity window remain intact. Dive leaves a 2.4-second grounded punish window
(previously 1.6), giving melee a fair opportunity to catch up. All heroes' real basic attacks reach low flight;
high dives remain briefly out of reach of ground effects.

The original report's apparent ranged failure combined unaffordable ultimate retries with deaths that reset the boss,
and wasted mana on out-of-range abilities. These were harness problems. The report now stops immediately on a death,
clears leftover shots/hazards and resets the pet at the new fight location. The phase probe isolates flight collision
without replacing projectile hits with direct damage. Ordinary damage totals still depend on the bot and seed;
HP top-ups are reported, not counted as evidence of a sustainable no-dodge strategy. These automated results need
human comfort/play-feel feedback as more content is added.

## Final seed-1 measurements

Every hero/planet profile passes the written median/mini/boss targets. All big fights ended with zero deaths.
Ordinary damage is handled by the reported HP top-ups; only Doom Blade is actively evaded.

| Planet | Hero | Roster median (s) | Mini boss (s) | Boss (s) | Mini / boss HP top-ups |
| --- | --- | ---: | ---: | ---: | ---: |

| Lanternmoss | knight | 3.2 | 97.5 | 222.0 | 7 / 12 |
| Lanternmoss | ranger | 2.2 | 102.1 | 186.7 | 7 / 15 |
| Lanternmoss | witch | 2.5 | 148.6 | 256.0 | 7 / 20 |
| Emberfall | knight | 3.0 | 122.8 | 234.7 | 6 / 19 |
| Emberfall | ranger | 4.1 | 135.5 | 217.8 | 9 / 12 |
| Emberfall | witch | 3.4 | 147.9 | 244.9 | 9 / 10 |
| Frostveil | knight | 4.6 | 103.2 | 284.8 | 12 / 18 |
| Frostveil | ranger | 4.8 | 96.2 | 213.2 | 9 / 27 |
| Frostveil | witch | 4.9 | 126.3 | 243.3 | 17 / 26 |

- knight: ascension at 50.0% HP; observed transition 3.28 s including hit-stop; 4 Doom warnings, minimum interval 28.0 s; largest observed flying-phase HP loss 29.
- ranger: ascension at 49.8% HP; observed transition 3.28 s including hit-stop; 3 Doom warnings, minimum interval 26.9 s; largest observed flying-phase HP loss 37.
- witch: ascension at 50.0% HP; observed transition 3.29 s including hit-stop; 5 Doom warnings, minimum interval 27.2 s; largest observed flying-phase HP loss 37.

Individual monster types retain tactical differences: the Frostveil warrior takes 11.8 s to chase a Hexlantern,
and some opening wisps fall before 2 s. These are reported outliers, not silently averaged away within a type.
The pacing contract uses the planet?s roster median; each type?s median of three trials remains in the raw data.

[Final raw measurements](../../balance-after.json) include each monster trial summary, big-fight move timestamps,
transition fractions and flying damage. The first six rows came from the full nine-profile report; the three
Frostveil rows were remeasured after its final health/recovery adjustment. [Historical baseline](../../balance-before.json)
was captured during harness repair, before in-range skill selection, Doom evasion and complete fight isolation;
its capped/reset boss runs are not comparable completed-fight times.

## Remeasured with the corrected harness (2026-10-16)

The Frostveil mini boss started reaching the 300 s cap in some reports (bisected to `8dd269c`, 26b, which changed no
combat code). Two harness defects caused it, not the game:

- **An awake planet boss during the trials.** `boot()` in the sims wakes the planet boss by default and again after
  every `goToPlanet`, so Malgrath roamed awake during the monster and mini-boss trials. Whenever he engaged, his arena
  (`BossGate.keepInside`) pulled the hero ~150 m to his lair and the Hydra went home and healed. A player cannot get
  there: a boss only wakes when its conditions are met and the hero comes to its lair. The report now boots sealed
  (`wake: false`), wakes the boss just before its own fight, and throws if the boss is awake during the trials.
- **An ultimate the spot refuses.** Leap Slam needs ground to land on; beside the lakeside Hydra there may be none.
  The bot re-aimed every frame and never attacked (0 casts in 300 s). It now gives the aim up, fights on and retries
  2 s later, and the report throws if an aim stays open for 2 s.

The 26b commit only shifted the seeded random stream, which exposed both. Seeds 1 / 7 (top-ups: mini·boss):

| Planet | Hero | Roster median (s) | Mini boss (s) | Boss (s) | Top-ups |
| --- | --- | ---: | ---: | ---: | ---: |
| Lanternmoss | Warrior | 2.5 / 3.1 | 119.0 / 118.0 | 219.3 / 217.6 | 9·11 / 9·10 |
| Lanternmoss | Ranger | 2.2 / 2.2 | 96.9 / 97.6 | 181.6 / 181.6 | 9·14 / 8·14 |
| Lanternmoss | Witch | 2.4 / 2.4 | 127.3 / 127.2 | 237.8 / 244.0 | 9·18 / 10·19 |
| Emberfall | Warrior | 3.0 / 3.0 | 136.6 / 133.0 | 234.7 / 235.2 | 7·19 / 7·19 |
| Emberfall | Ranger | 3.3 / 3.3 | 97.3 / 97.3 | 186.0 / 186.7 | 9·4 / 9·7 |
| Emberfall | Witch | 3.4 / 3.6 | 137.0 / 167.5 | 245.3 / 245.3 | 11·10 / 8·8 |
| Frostveil | Warrior | 4.3 / 4.3 | 126.5 / 136.7 | 285.6 / 288.2 | 16·18 / 18·19 |
| Frostveil | Ranger | 4.7 / 4.7 | 93.6 / 92.2 | 241.1 / 198.5 | 9·27 / 9·23 |
| Frostveil | Witch | 5.5 / 4.8 | 124.8 / 125.1 | 253.6 / 254.5 | 14·28 / 14·28 |

Every profile is inside its target on both seeds.

**Mini bosses and their leash (resolved the same day).** After the harness fix the Witch's mini-boss times still
swung with the seed (Frost Hydra 174 / 129 / 167 / 283 / 135 s on seeds 1, 2, 3, 4, 7; Emberfall 194 s on seed 1).
Cause: the leash. A mini boss that chases past its short leash (Hydra 18 m, Basilisk 22 m) walked home and healed
to full, once at 155 HP of 3,700. The Witch triggers it most: she fights at about 6 m, inside the Hydra's 6.5 m
bite, and each bite's knockback lets the fight creep outward. A player fighting at that range meets the same reset.
**User decision:** a mini boss now keeps its damage when it gives up a chase, and only heals back once it has been
out of combat for more than 5 s (`COMBAT.leashReturn`, `tests/sim/miniBossLeash.sim.mjs`). Ordinary monsters still
heal on their way home. With the reset gone the Witch's mini bosses settled (Frost Hydra 103-105 s, Emberfall
111-127 s on seeds 1-7), but the Ranger's fell below the 90 s floor (77-83 s; her earlier ~95-111 s had been
inflated by the same resets). Mini-boss health was raised 20% (Hydra 2,800 → 3,360, Basilisk 2,200 → 2,640, Frost
Hydra 3,700 → 4,440); the table above is the result. That historical audit left Old Ironclaw unchanged; the later 27h checkpoint lowers its base HP to 800 and limits
wedges to once per shell (see [Tidewhisper](../world/tidewhisper.md#old-ironclaw-27f)).

Verification: 142 unit tests, all 24 gameplay/audit sims, strict profile target checks, the affected Malgrath
mechanics rerun and the real-WebGL boss/seed-shop checks passed. Boss phase and shop screenshots are under
`docs/screenshots/bosses/balance-flight.jpg` and `docs/screenshots/huds/balance-shop.jpg`.

## Tidewhisper 27h synchronization (2026-10-17)

The [fresh report](../../tidewhisper-balance-20261017.json) measures clean synchronized commit `2c42fce`
against the [accepted October 15 checkpoint](../../tidewhisper-balance.json). Both use level 8, starting equipment,
default pets, counter bots and counted HP top-ups. No gameplay numbers were tuned in this synchronization.
All 18 required checks pass: six regular-roster medians at 2?6 seconds, six Ironclaw fights at 90?180 seconds,
and six Mirelure fights at 180?300 seconds. Individual armored/evasive monsters remain informational.

| Hero | Seed | Roster median: before ? after (s) | Ironclaw: before ? after (s) | Mirelure: before ? after (s) |
| --- | --- | ---: | ---: | ---: |
| Witch | 1 | 3.58 ? 3.58 | 171.6 ? 171.6 | 273.4 ? 273.4 |
| Witch | 7 | 4.77 ? 4.77 | 173.7 ? 174.1 | 276.9 ? 276 |
| Warrior | 1 | 5.55 ? 5.55 | 172.4 ? 172.4 | 288.9 ? 286.6 |
| Warrior | 7 | 5.03 ? 5.03 | 169.5 ? 169.5 | 281.4 ? 284.3 |
| Ranger | 1 | 3.7 ? 3.7 | 155.4 ? 155.4 | 187.8 ? 187.8 |
| Ranger | 7 | 4.47 ? 4.47 | 156 ? 156 | 190.8 ? 190.8 |

The full synchronized pacing simulation also passes all three heroes: level 8 before Tide summon, 281?360 coins
against a 280-coin Tide gear reserve, lighthouse materials within one day and lighthouse plus gear within two days.
This route audit does not replace combat or target-device performance validation.
