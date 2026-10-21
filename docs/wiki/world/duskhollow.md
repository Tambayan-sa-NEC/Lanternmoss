# Duskhollow: twilight terrain and the lantern

## In brief (stage 30a, unreleased)

Duskhollow is the fifth world: deep valleys under a canopy of giant lumen caps, where your lantern decides what you
can see. Stage 30a builds its terrain, its endless dusk, the belt lantern with its Oil bar, and the glowmoss that
lights up in your footprints. Everything else on the planned checklist — the flora and wildlife (30b), the economy,
weather and music (30c), Wick and the Old Road (30d), the four monsters (30e–30f), Grandmother Gloomweaver (30g),
Umbra (30h) and campaign release (30i) — is **not built yet**.

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

The canopy itself is authored data rather than geometry at this stage: `canopy` lists its height and the gaps of
starlight, as an angle, a distance and a radius around the village. The giant caps, lantern vines and the rest of
the flora that will hang over those hollows arrive with 30b; until then the gaps are what the light reads.

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

## What is checked

| Check | What it proves |
| --- | --- |
| `npm test` (`tests/lantern.test.mjs`) | The dusk curve, canopy cover, deep seeded valleys, the cleaned saved oil field, and that burning, refilling, indoors and skipped time behave — all without a browser, a scene or settings |
| `npm run sim -- duskhollow` | The real world generates with its mechanic; dusk follows the clock and the canopy; the Oil bar and chip render; pause and a night of sleep burn nothing; an empty lantern costs no health; the trail stays bounded; oil survives save, Continue and real portal travel |
| `node scripts/duskhollow-smoke.mjs` | In a real browser on the lowest preset: readable dusk, a brighter village gap, real WASD walking lighting the trail and burning oil, the safe ember, 720p/1080p with nothing overflowing, and zero page and shader errors |

## Not built yet

Flora and wildlife, firefly jars, the lumen economy, spore drift and deep dark, the music box, Wick's Old Road and
its waylamps, Shadelings, Gloomweavers, Mosslurks, Snuffers, Grandmother Gloomweaver, Umbra and the campaign
release. The canopy has no models yet, and no enemy roster is configured, so Duskhollow still fails the content gate
by design. The `deepDark` share in `src/config/lantern.js` is reserved for the 30c weather and does nothing today.
