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

Boss health is 6,700 / 8,000 / 8,640 after planet scaling. Mini bosses have 2,800 / 3,520 / 3,700 HP. Malgrath's Doom
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

[Final raw measurements](balance-after.json) include each monster trial summary, big-fight move timestamps,
transition fractions and flying damage. The first six rows came from the full nine-profile report; the three
Frostveil rows were remeasured after its final health/recovery adjustment. [Historical baseline](balance-before.json)
was captured during harness repair, before in-range skill selection, Doom evasion and complete fight isolation;
its capped/reset boss runs are not comparable completed-fight times.

Verification: 142 unit tests, all 24 gameplay/audit sims, strict profile target checks, the affected Malgrath
mechanics rerun and the real-WebGL boss/seed-shop checks passed. Boss phase and shop screenshots are under
`docs/screenshots/balance-flight.jpg` and `docs/screenshots/balance-shop.jpg`.
