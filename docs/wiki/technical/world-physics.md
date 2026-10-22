# Shared planet gravity and water

`src/world/physics.js` holds the active planet's rule values, alongside the existing active terrain field.
`World.generate()` configures them before placement; `World.dispose()` resets them after the mechanic exits.
The original three worlds have no physics overrides, so gravity, pond baselines and generated ids retain their
previous defaults. The registered Tidewhisper tide module is exercised through a development fixture; no expansion
world is enabled for campaign travel. See [Tidewhisper terrain and tides](../world/tidewhisper.md).

A planet's optional `physics` config may declare:

| Field | Default | Meaning |
| --- | --- | --- |
| `gravity` | `1` | Positive multiplier on actor acceleration; bounded to 0.05–4. |
| `seaLevel` | `null` | Optional spherical sea surface, in metres from the planet centre. |
| `seaMaxLevel` | Initial sea level | Maximum sea surface reserved before generation, even if the sea starts disabled. |
| `waterOffset` | `0` | Metres added along each pond's normal to its computed baseline plane. |
| `waterMaxOffset` | Initial pond offset | Maximum pond offset reserved before generation. |
| `waterRegions` | `[]` | At most four distinct spherical local water regions: id, unit direction, arc radius, initial level and maximum level. |

Sea levels are bounded to the current planet radius ±24 metres and pond offsets to ±12 metres. Non-finite or
non-numeric values use safe defaults/current values. Live setters refuse a level above the declared maximum,
without partially applying other fields. Declare the full envelope in config before generation; changing it
with the current tide phase would shift resource ids and invalidate saved deltas.

Mechanics use their environment's world:

```js
// Config reserves the maximum water before placement:
const planet = { physics: { gravity: 0.45, seaLevel: 69, seaMaxLevel: 71, waterMaxOffset: 1 } };

// enter/update/advance applies rules derived from the mechanic's own saved state:
environment.world.physics.set({ gravity: 0.45, seaLevel: 70, waterOffset: 0.6 });
```

The shared queries are:

- `gravityAt(dir, acceleration)`: multiply the actor's acceleration once. Player rise/fall tuning and Moon-Hop's
  existing rise multiplier remain in the player; the Walker composes the planet multiplier afterward. NPCs,
  enemies, pets and ground wildlife use the same Walker query.
- `seaLevel(high?)` and `pondLevel(pond, high?)`: live surfaces or the declared maximum. `pond.water` remains its
  computed baseline; its live `center` is synchronized with the water mesh before actors and fish update.
- `seaLevelAt(dir, high?)`: the local region level where present, otherwise the ocean level. Regional directions
  are normalized; radii are positive and at most 40 m. Set levels through `world.physics.set({ regions: { id: level } })`.
  Unknown ids, non-finite levels and levels outside the declared envelope are refused before other fields change.
- `waterAt(dir, { high? })` in `terrain.js`: return the highest wet surface, its depth over terrain and the pond
  (or `null` for the sea). A surface less than 0.05 m over ground is dry.
- `dryGround(dir, radius, { high? })`: test the centre and moving-water footprint edges. Callers keep their
  original pond margins. Static placement, resources, village farms and new builds reserve high water; runtime
  movement, landing and land spawns read current water.

Walker support floats swimmers at the live surface. Water depth is measured at the body's feet, so a dry rock
or floor above flooded terrain does not become swimming, and a jump over water is not slowed while airborne.
Raised water affects movement on the current frame. `World.syncPhysics()` updates pond meshes and lazily creates
one sea sphere with a shader variant sharing palette/time uniforms; ordinary worlds allocate no sea mesh/material.
The sea uses world-space ripples/glints rather than a pond's circular foam edge, and clips against terrain through the
normal depth test and is hidden when disabled. Both are disposed with the world.
Local regions use matching spherical caps while the ocean shader masks their footprints, keeping drained lagoons
consistent with movement. Sea colors distinguish shallow water using the baked ground height. All meshes share
the water animation clock and palette, with independent live-level uniforms; world disposal owns their cleanup.

Fish follow pond centres and hide when the water is too low to cover them. Fishing floats follow the live surface;
a cast ends without rewards if its water recedes. Normal land rosters and wildlife avoid wet spawn sites, including
failed-search fallbacks. Explicit scripted/debug enemy creation remains available; loot retains its fallback so
an earned reward is not discarded when no dry spot exists.

New construction refuses footprints below high water. Existing builds are retained during restore if flooded;
other geometry, occupancy and support checks still apply. Submerged pieces cannot be managed, submerged stations
cannot be used, and submerged plots cannot be tended or grow, including bed-skip growth. Crop/build data remains
intact and growth resumes when the water recedes. Tide timing is implemented in 27a; saltwater crop damage and
amphibious enemies belong to their owning content stages.

Physics values are derived state, rebuilt from config and the mechanic's existing per-planet snapshot before
population. They are not saved separately. Continue, travel and reset cannot carry another world's rules or sea
meshes into a destination; the old v1 save fixture remains readable. See [mechanic lifecycle and saves](planet-mechanics.md).

Verify with `npm test`, `npm run sim` and `node scripts/world-physics-smoke.mjs`. The development-only fixture
`tests/sim/lib/physicsFixture.mjs` supports full-game/browser checks without a production import; unit tests
exercise the queries and Walker directly.
The browser helper owns port 8105, uses `CHROME` to override Chromium, checks 720p/1080p on the low preset, and
closes its server/browser. Its screenshots go to the OS temporary directory.
