/* CAVES (TODO 29): a cave per main planet, entered from the surface, built from a kit of rooms joined from a seed
   (layout rules: src/world/caveLayout.js; the 3D rooms: src/world/caves.js; entering, walking and leaving:
   src/gameplay/Dungeons.js). Caves are dark: the shared local light (render/lighting.js) lights them.
     CAVE      shared rules
       cell        the grid step between room centres (m); rooms sit on a grid, joined by corridors
       corridor    a corridor's width (m), and so each doorway's
       wallHeight  how tall the walls are drawn (m)
       darkness    the local-light darkness inside (1 = fully dark: the hero's light and the lanterns show the way)
       lantern     each room's lanterns: their light radius (m), colour and strength
       mouthReach  how near the cave mouth (m) "Leave the cave" is offered; stepping back onto it also leaves
       entrance    where a planet's cave mouth stands on the surface: distance from the village square (m) and the
                   clearance it needs (m)
     ROOM_KIT  the room pieces: w x d (m) of floor, and how many lanterns stand in it. `entrance` starts every cave,
               `end` is its farthest room, `hall` and `chamber` fill the rest (picked by the seed).
     CAVES     per planet: id (stable: room ids derive from it), name, released (the surface mouth only appears for
               a released cave; 29f releases the original worlds' caves), seed salt, rooms [min, max] and colours.
   Room ids are `${cave.id}:r${n}`, numbered in generation order, so the same planet always builds the same cave. */
export const CAVE = {
  cell: 16, corridor: 2.6, wallHeight: 3.4, darkness: 1,
  lantern: { radius: 6.5, color: 0xffc77a, intensity: 1.1 },
  mouthReach: 1.6,
  entrance: { distance: [34, 60], clearance: 3 },
};

export const ROOM_KIT = {
  entrance: { w: 8, d: 8, lanterns: 2 },
  hall: { w: 9, d: 7, lanterns: 2 },
  chamber: { w: 12, d: 11, lanterns: 3 },
  end: { w: 13, d: 13, lanterns: 4 },
};

export const CAVES = {
  lanternmoss: { id: 'lanternmoss-cave', name: 'Mossroot Hollow', released: false, salt: 0x3a7e, rooms: [5, 7],
    colors: { floor: 0x55604a, wall: 0x3f4639, accent: 0x9fe08a } },
  emberfall: { id: 'emberfall-cave', name: 'Cinder Warren', released: false, salt: 0x51c3, rooms: [6, 8],
    colors: { floor: 0x6a4a3a, wall: 0x4a3028, accent: 0xff9a5a } },
  frostveil: { id: 'frostveil-cave', name: 'Rimeglass Grotto', released: false, salt: 0x2bf1, rooms: [6, 8],
    colors: { floor: 0x5a6a7a, wall: 0x3e4a58, accent: 0xbfe8ff } },
};
