# Duskhollow: twilight terrain and the lantern

## In brief (stages 30a-30c, unreleased)

Duskhollow is the fifth world: deep valleys under a canopy of giant lumen caps, where your lantern decides what you
can see. Stage 30a builds its terrain, its endless dusk, the belt lantern with its Oil bar, and the glowmoss that
lights up in your footprints. Stage 30b fills it in: the canopy itself and the plants under it, glow snails, lantern
bats, crickets and pale blind fish, firefly swarms you catch for lantern oil, and the Moonmoth, whose charm widens
your light. Stage 30c gives it an economy and a sky of its own: lumen ore, ingots and dust, spider silk, the
guarded moonstone vein, lantern oil, shade mushrooms, the craftable Dusk set, spore drift and deep dark, the
dripping caps that water the farm where no rain falls, and a music box theme. The rest of the planned checklist - the economy, Wick and the Old Road (30d),
the four monsters (30e-30f), Grandmother Gloomweaver (30g), Umbra (30h) and campaign release (30i) - is
**not built yet**.

Duskhollow stays `released: false`: it cannot be selected, generated or travelled to in normal play. The checks run
it through a development fixture (`tests/sim/lib/duskhollowFixture.mjs`) that copies this world's content into the
first released world's save and travel slot. That fixture is test-only, is never imported by the game's entry point,
and does not enable anything for players.

![Walking the glowmoss trail under Duskhollow's canopy](../../screenshots/world/duskhollow.jpg)

## Shape and look (30a)

`src/config/planets/duskhollow.js` seeds deep valleys from hills and ridged noise (`terrain.ridges`), so the world is
a set of hollows between high stalk ridges rather than rolling meadows — the checks require more than 12 m between
its lowest and highest ground. The palette is violet rock and dark teal glowmoss under an indigo sky, with the
world's own fog. One lake is carved as usual, and the village, stone circle, farm and outer houses keep their level
ground exactly as on every other world.

The canopy is authored data: `canopy` lists its height and the gaps of starlight, as an angle, a distance and a
radius around the village. Stage 30b grows the caps themselves to match it (below).

## The endless dusk (30a)

The day clock still turns here. It runs as brighter and dimmer dusk instead of day and night: `duskAt()` in
`src/world/mechanics/lantern.js` is brightest at midday and deepest at midnight, and never reaches daylight or full
dark. How much of that dusk reaches the ground depends on the canopy above it:

| Where you stand | Canopy cover | What it looks like |
| --- | --- | --- |
| Under the closed canopy | `LANTERN.canopy.cover` (1) | The full dusk: the deep hollow, where the lantern matters |
| In a gap of starlight | `gapCover` (0.35) | Noticeably brighter; the gaps are landmarks |
| In the village | `villageCover` (0.12) | The world's safe light, bright enough to read at a glance |
| Inside a house | none | Darkness is 0; interiors keep their own light |

Cover times dusk is the darkness handed to the shared [local light](../technical/lighting.md), which dims the sun,
sky and fog but keeps its minimum ambient and the ink outlines. The browser check measures this: on the lowest
quality preset the deepest hollow at midnight still reads at about 90/255 mean ground luminance, and the village gap
at about 205/255. A dark world, never a black screen. A cave keeps its own darkness while you are inside one.

## The belt lantern and the Oil bar (30a)

The lantern hangs from the hero's belt and becomes the light they carry. Its fuel is **Oil**, shown in its own bar
beside Energy; the bar only appears on a world that has a lantern, and the status chip names the light you are
standing in.

- **It burns only while you actually play this world outdoors.** Not indoors, not in a cave, not in a menu or while
  paused, and never over skipped or away time — sleeping through a night cannot empty the tank. A full tank is about
  one adventure day of light.
- **An empty lantern is safe.** It shrinks from a 7.5 m light to a small 2.8 m ember; it never goes out, never
  damages the hero and costs nothing else. Running dry makes the world harder to read, not unfair.
- **Refills** go through `refill(amount)`. The things that will pour oil in — glowcaps, firefly jars and lumen oil —
  arrive with 30b and 30c; `burn(amount)` is there for the Snuffers' theft in 30f.
- **Oil is saved per planet** in the mechanic snapshot (`{ oil }`), so it survives Continue and travelling away and
  back. See [the planet mechanic lifecycle](../technical/planet-mechanics.md).

## Glowmoss footprints (30a)

The carpet of moss lights up where the hero walks: one glowing disc every 1.15 m, fading out over 4.5 s. The whole
trail is a single additive instanced draw call with a hard cap of 24 live prints, and the scenery-density setting
scales that down (the lowest preset draws 8, and 0 % draws none). It is cosmetic only: prints are never printed
while airborne, swimming or indoors, and they change nothing about movement, combat or loot.

## Flora: the canopy and what grows under it (30b)

`src/world/duskFlora.js` plants Duskhollow, and one rule ties it to the light: **a giant lumen cap only grows where
the dusk is at full strength**, so the canopy is solid over the deep hollows and genuinely open over every gap of
starlight and over the village. What you see overhead always matches how dark it is underneath.

| Plant | Where | Notes |
| --- | --- | --- |
| **Lumen cap** | Only under the closed canopy | A pale stalk about 23 m tall under a cap 8 m across, so the canopy hangs about 25 m up, its gills lit from below, with lantern vines hanging from the rim. Not wood: an axe cannot chop it |
| **Glowcap** | Anywhere, gaps included | The small caps you walk under, lit around the rim |
| **Ghost fern** | Anywhere | Pale fronds in clumps |
| **Pale moonflower** | Anywhere | A low stem under a glowing head |

Counts are authored in `flora.canopy` and each one is capped in code, so no quality setting or seed can flood the
world. Glowmoss is the trail you light as you walk (30a) rather than a planted thing.

![Looking up a lumen cap stalk into the lit canopy](../../screenshots/world/duskhollow-canopy.jpg)

## Wildlife (30b)

| Animal | What it does |
| --- | --- |
| **Glow snail** | Creeps along with its shell lit from inside; pulls in and sits still when you come close |
| **Lantern bat** | Hangs in the air under the caps with a lantern on its belly, and flutters off if you walk under it |
| **Dusk cricket** | Chirps and hops away near the ground; you hear it before you see it |
| **Pale blind fish** | Colourless shoals in the glowing pools, with the usual pond behaviour |
| **Moonmoth** (rare) | Wide pale wings; shy like every rare creature, and it leaves the **Moonmoth Wing** |

The Moonmoth Wing is worn in a trinket slot. While it is worn, a lit lantern reaches `LANTERN.charm.radius` times
further (7.5 m becomes 10.5 m); an empty lantern's safe ember is never changed by it. It is a gift only: it is kept
out of random chest loot (`props.giftOnly`), so an unreleased world's charm cannot turn up in a released world.

![The Moonmoth, a glow snail and a firefly swarm around the hero](../../screenshots/critters/duskhollow-wildlife.jpg)

## Firefly swarms and jars (30b)

Swarms of fireflies drift over the hollows. Each one is a soft light and a trickle of particles rather than a crowd
of bodies, so a whole world of them costs no extra draw calls and follows the particle-density setting. Walk up to
one and press `E` to catch it: you get a **Firefly Jar**, and that swarm goes dark for `FIREFLIES.away` seconds
before another settles somewhere else. Using a jar pours 25 oil into the lantern.

How long each caught swarm still has to wait is saved per planet, so Continue cannot relight them and reloading
cannot farm jars. See [adventure saves](../technical/save-format.md). Glowcap and lumen-oil refills arrive with 30c.

## Resources and the lumen chain (30c)

| Found | Where | Becomes |
| --- | --- | --- |
| **Lumen ore** | Lumen veins, with an iron pickaxe | **Lumen ingots** at the forge |
| **Lumen dust** | Shaken loose from the same veins; the world's own material, so it fills its chests | Lumen oil, and every Dusk piece |
| **Glowcap** | Glowcap patches, by hand | Lumen oil at the brewing stand - or tipped straight into the lantern for 10 oil |
| **Moonstone** | One guarded vein, placed behind the mini boss like every rare vein | The Dusk Lantern trinket |
| **Spider silk** | Cut from gloomweaver webs in 30f; until then from chests | The lining of every Dusk piece |

**Lumen oil** is the full flask: it fills a belt lantern to the brim. With firefly jars (30b) and glowcaps, the
world now has three ways to keep the light on, which is what the lantern was always waiting for.

**The Dusk set** (`duskHood`, `duskMantle`, `duskBoots`, `duskLantern`) is forged from lumen ingots, silk and dust,
and reserved by this world's coin budget the way Tidewhisper reserves the Tide set. Its bonuses are about the light
rather than about fighting:

| Pieces | Bonus |
| --- | --- |
| 2 | Your lantern burns 40% slower |
| 3 | Your lantern burns 60% slower and reaches 15% further |

Both reach the lantern through the hero's ordinary set effects (`lanternOil`, `lanternRadius`), so they follow
equipping, unequipping and loading like every other stat.

![Mining a lumen vein under the caps](../../screenshots/activities/duskhollow-lumen.jpg)

## Weather, the dripping caps and the shade crop (30c)

No rain ever falls under the canopy. Duskhollow's sky draws from clear, fog, breezy, **spore drift** (glowing spores
drifting through the hollows) and **deep dark**. The weather itself changes no rules: deep dark only states a number
(`deepDark`, blended 0..1 like any other weather value), and this world's mechanic decides what it means - it
thickens the dusk by `LANTERN.dusk.deepDark` of the light that is left and presses a lit lantern in by
`LANTERN.light.deepDarkShrink`. It still never reaches full dark, and it still costs no health.

The same split holds for the farm. Since no rain falls, the **dripping caps** water every planted plot early in the
day (`LANTERN.drip`): the farm asks the live mechanic for `watersFarm`, rather than any weather kind quietly
standing in for rain. **Shade mushrooms** grow from shade spores and only take where the mechanic says the world
lies in shade, which today is Duskhollow alone; anywhere else the plot refuses them.

Its music is a **music box over low strings** (`musicBox` in `src/config/music.js`), made in code like every other
theme.

## What is checked

| Check | What it proves |
| --- | --- |
| `npm test` (`tests/lantern.test.mjs`) | The dusk curve, canopy cover, deep seeded valleys, the cleaned saved oil field, and that burning, refilling, indoors and skipped time behave — all without a browser, a scene or settings |
| `npm run sim -- duskhollow` | The real world generates with its mechanic; dusk follows the clock and the canopy; the Oil bar and chip render; pause and a night of sleep burn nothing; an empty lantern costs no health; the trail stays bounded; oil survives save, Continue and real portal travel |
| `node scripts/duskhollow-smoke.mjs` | In a real browser on the lowest preset: readable dusk, a brighter village gap, real WASD walking lighting the trail and burning oil, the safe ember, 720p/1080p with nothing overflowing, and zero page and shader errors |
| `npm test` (`tests/duskWildlife.test.mjs`) | The canopy rule, that every authored plant and animal exists and is bounded, the jar's oil effect, and that the charm widens a lit lantern but never the ember |
| `npm run sim -- duskWildlife` | Placement and the no-cap-over-a-gap rule, each animal's reaction, catching a swarm through the real interaction, its saved timer surviving Continue, the Moonmoth's one charm per adventure, and the scenery, particle and light budgets |
| `node scripts/dusk-wildlife-smoke.mjs` | In a real browser: the canopy and animals render, real `E` catches a swarm, really using the jar pours oil, the charm widens the carried light, 720p/1080p, zero errors |
| `npm test` (`tests/duskEconomy.test.mjs`) | Every node, forage and material is real; the lumen chain and Dusk recipes; the set reaching the lantern; deep dark as a number turned into a rule; the drip window and the shade crop |
| `npm run sim -- duskEconomy` | The veins and patches are placed with the music box playing, the chain smelts and brews, the worn set slows the burn, deep dark thickens the dusk and shrinks the light, the caps water the farm with no rain, and shade spores refuse a sunlit world |
| `node scripts/dusk-economy-smoke.mjs` | In a real browser: real `E` mines a lumen vein with the iron pickaxe, the Craft tab lists the chain and the set, a glowcap pours oil, deep dark visibly darkens the hollow while the lit ground stays readable, and real `E` plants shade spores |

## Not built yet

Wick's Old Road and its waylamps, the stalk-house interiors, Shadelings, Gloomweavers, Mosslurks, Snuffers,
Grandmother Gloomweaver, Umbra and the campaign release. No enemy roster is configured, so Duskhollow still fails
the content gate by design. Spider silk has no source in the world until the gloomweavers' webs arrive in 30f, and
the moonstone vein's guard arrives with Grandmother Gloomweaver in 30g, so for now it is simply mineable.
