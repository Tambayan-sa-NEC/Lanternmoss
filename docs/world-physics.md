# Shared planet gravity and water

`src/world/physics.js` holds the active planet's rule values, alongside the existing active terrain field.
`World.generate()` configures them before placement; `World.dispose()` resets them after the mechanic exits.
The original three worlds have no physics overrides, so gravity, pond baselines and generated ids retain their
previous defaults. No expansion world or timed tide module is enabled by this stage.

A planet's optional `physics` config may declare:

| Field | Default | Meaning |
| --- | --- | --- |
| `gravity` | `1` | Positive multiplier on actor acceleration; bounded to 0.05–4. |
| `seaLevel` | `null` | Optional spherical sea surface, in metres from the planet centre. |
| `seaMaxLevel` | Initial sea level | Maximum sea surface reserved before generation, even if the sea starts disabled. |
| `waterOffset` | `0` | Metres added along each pond's normal to its computed baseline plane. |
| `waterMaxOffset` | Initial pond offset | Maximum pond offset reserved before generation. |

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

Fish follow pond centres and hide when the water is too low to cover them. Fishing floats follow the live surface;
a cast ends without rewards if its water recedes. Normal land rosters and wildlife avoid wet spawn sites, including
failed-search fallbacks. Explicit scripted/debug enemy creation remains available; loot retains its fallback so
an earned reward is not discarded when no dry spot exists.

New construction refuses footprints below high water. Existing builds are retained during restore if flooded;
other geometry, occupancy and support checks still apply. Submerged pieces cannot be managed, submerged stations
cannot be used, and submerged plots cannot be tended or grow, including bed-skip growth. Crop/build data remains
intact and growth resumes when the water recedes. Saltwater crop damage, amphibious enemies and tide timing belong
to their owning world stages.

Physics values are derived state, rebuilt from config and the mechanic's existing per-planet snapshot before
population. They are not saved separately. Continue, travel and reset cannot carry another world's rules or sea
meshes into a destination; the old v1 save fixture remains readable. See [mechanic lifecycle and saves](mechanics.md).

Verify with `npm test`, `npm run sim` and `node scripts/world-physics-smoke.mjs`. The development-only fixture
`tests/sim/lib/physicsFixture.mjs` supports full-game/browser checks without a production import; unit tests
exercise the queries and Walker directly.
The browser helper owns port 8105, uses `CHROME` to override Chromium, checks 720p/1080p on the low preset, and
closes its server/browser. Its screenshots go to the OS temporary directory.
