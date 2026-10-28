/* TODO 25a: a cottage and its furnishings in fixed indoor spots (TODO 35 added the pet basket). Outdoor/free placement
   belongs to 25b. */
export const HOME = { houseIndex: 6, sign: { x: -2.3, z: 1.4 }, reach: 1.8, petBed: { x: -2.6, z: -2.3 } };
export const FURNISHINGS = {
  homeBed: { name: 'Patchwork Bed', kind: 'bed', art: 'homeBed', color: 0x8fb8ff,
    description: 'A bed for your cottage. Sleep here to recover and wake at morning.', needs: [['wood', 8], ['sweetleaf', 4]], station: 'workbench', x: 3, z: -2.2, r: 1 },
  homeTable: { name: 'Round Wooden Table', kind: 'table', art: 'homeTable', color: 0xb0703a,
    description: 'A little table and stools for your cottage.', needs: [['wood', 4], ['stone', 2]], station: 'workbench', x: 2.1, z: 0.7, r: 0.85 },
  homeRug: { name: 'Rosewoven Rug', kind: 'rug', art: 'homeRug', color: 0xe07a8a,
    description: 'A soft woven rug for the centre of your cottage.', needs: [['sweetleaf', 6], ['moonberry', 2]], x: 0, z: 0.9, r: 0 },
  homeLamp: { name: 'Cottage Lantern', kind: 'lamp', art: 'homeLamp', color: 0xffd36b,
    description: 'A warm lantern to brighten your cottage.', needs: [['wood', 3], ['copperIngot', 1], ['glowcap', 2]], station: 'workbench', x: 3.5, z: 1.7, r: 0.3 },
  homePlant: { name: 'Potted Sweetleaf', kind: 'plant', art: 'homePlant', color: 0x6fbf6a,
    description: 'A cheerful potted plant for your cottage.', needs: [['sweetleaf', 3], ['stone', 2]], x: -3.5, z: -0.3, r: 0.4 },
  // TODO 35: your pet curls up here while you are home, and heals (config/pets.js PET_BED)
  petBed: { name: 'Pet Basket', kind: 'petBed', art: 'petBed', color: 0xc98a4a,
    description: 'A cushioned basket for your cottage. Your pet naps in it while you are home, and heals.', needs: [['wood', 4], ['sweetleaf', 4]], station: 'workbench', x: HOME.petBed.x, z: HOME.petBed.z, r: 0.55 },
};
