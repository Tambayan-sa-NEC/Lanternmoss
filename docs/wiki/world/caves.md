# Caves (TODO 29)

Each main planet will have a cave entered from the surface: a few rooms with monsters, chests and ore found nowhere
else, ending in a guardian (the plan is in [TODO.md](../../../TODO.md), stages 29b-29g). **Status: 29b (layout and
traversal) is built; the caves are unreleased.** No cave mouth appears on any planet until 29f releases the original
worlds' caves, and there is no combat, loot or puzzle inside yet.

## Layout (29b)

A cave is built from a kit of rooms (`ROOM_KIT` in `src/config/dungeons.js`): `entrance` (always first), `hall`,
`chamber` and `end` (the room deepest from the entrance). Rooms sit on a grid, 16 m apart, joined by 2.6 m corridors.
A seeded walk from the entrance adds one room at a time next to an existing one, so the rooms form a tree: every room
is reachable, there are no loops, and the entrance keeps its south side free for the mouth.

The seed is the planet's own, so a planet always builds the same cave. Room ids are `${cave.id}:r${n}`, numbered in
generation order (for example `lanternmoss-cave:r0` is always Mossroot Hollow's entrance). Later stages save progress
against these ids.

| Planet | Cave | Rooms |
| --- | --- | --- |
| Lanternmoss | Mossroot Hollow | 5-7 |
| Emberfall | Cinder Warren | 6-8 |
| Frostveil | Rimeglass Grotto | 6-8 |

Each cave has its own floor, wall and lantern colours. The pure rules (layout, walkable floor, which room a point is
in) are `src/world/caveLayout.js`; the 3D rooms are `src/world/caves.js`.

## Inside a cave

- **The surface mouth.** Each planet works out its mouth spot 34-60 m from the village square, clear of the farm,
  crafting corner, gate, bounty board and resource nodes. It is placed after everything else, so no saved position
  moves for it. Only a released cave shows its rocky arch and the "Enter ..." prompt.
- **Walking.** The rooms are built far below the planet. The hero walks their flat floor with the usual movement keys,
  under the same following camera as house interiors, with walls cut low on the camera's side. Walls stop the hero;
  doorways are the corridor's width.
- **The dark.** A cave is fully dark ([local light](../technical/lighting.md), darkness 1). The hero carries a light
  and each room's lanterns light the rest; the minimum ambient keeps the outlines readable.
- **Like a house, for now.** No abilities and no monsters inside, and the pet waits outside. Fights come in 29c.
- **Leaving.** Step back onto the bright patch at the mouth, or press **E** there ("Leave the cave"). You come out at
  the surface mouth, facing away from it.
- **Never stranded.** Fainting inside takes the hero out at once; the usual respawn brings them home to the village.
  Travelling to another world or starting a new adventure leaves the cave too. A save made inside records the surface
  mouth, so Continue never starts underground (keeping the indoor position is 29d).

![Inside a cave: lantern light and the hero's own light in the dark](../../screenshots/world/cave.jpg)

## Verification

- `node --test tests/caveLayout.test.mjs`: the same seed gives the same rooms, ids, kinds and doors; every room is
  reachable and doors pair up; room counts stay in range and rooms never overlap; a walker can cross every link and
  stand at the mouth, and walls stop it (all three caves, ten seeds).
- `node tests/sim/caves.sim.mjs`: mouth spots on all three worlds, none shown while unreleased; the same seeded cave
  in the game; real movement keys through every room; a wall holds; leaving by the mouth and by E; Continue after a
  save inside starts at the mouth; fainting inside and travelling leave cleanly.
- `node scripts/caves-smoke.mjs` (Edge, port 8124): real keys from room to room under the following camera, readable
  dark at 720p and 1080p, real E at the mouth leaves, zero page or shader errors. It retakes the shot above.
