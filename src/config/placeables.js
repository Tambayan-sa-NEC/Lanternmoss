/* Outdoor placeables (25b) and modular structures (25c).
   radius reserves ground; solid is the movement/camera footprint, zero for ground coverings. */
import { FURNISHINGS } from './home.js';
import { STRUCTURE_ITEMS } from './structures.js';

export const BUILDING = { limit: 256, reach: 2.6, range: 8, grid: 1, storageSlots: 24, maxSlope: 0.28, maxRelief: 0.4 };
export const PLACEABLES = {
  ...STRUCTURE_ITEMS,
  ...Object.fromEntries(Object.entries(FURNISHINGS).map(([id, f]) => [id, { ...f,
    radius: { bed: 1.25, table: 1.35, rug: 1.6, lamp: 0.35, plant: 0.48, petBed: 0.7 }[f.kind],
    solid: { bed: 1.05, table: 1.15, rug: 0, lamp: 0.3, plant: 0.45, petBed: 0.6 }[f.kind],
    height: { bed: 0.9, table: 1.05, rug: 0.1, lamp: 1.9, plant: 1, petBed: 0.45 }[f.kind], furniture: f.kind }])),   // (a pet basket outdoors is only decoration: pets rest in the cottage)
  gardenFence: { name: 'Garden Fence', description: 'A wooden rail fence. Rotate it before placing.', art: 'fence', color: 0xb0703a,
    needs: [['wood', 3]], station: 'workbench', radius: 0.95, solid: 0.2, height: 0.85, fence: true },
  stonePath: { name: 'Stepping Stone', description: 'A walk-through path tile for your garden.', art: 'path', color: 0xe2cfbd,
    needs: [['stone', 2]], radius: 0.48, solid: 0, height: 0.1 },
  storageChest: { name: 'Storage Chest', description: 'Stores 24 stacks. Empty it before picking it up.', art: 'storage', color: 0xb0703a,
    needs: [['wood', 8], ['copperIngot', 1]], station: 'workbench', radius: 0.65, solid: 0.6, height: 0.9, storage: true },
  portableWorkbench: { name: 'Garden Workbench', description: 'A workbench you can place outside.', art: 'workbench', color: 0xb0703a,
    needs: [['wood', 12], ['stone', 4]], station: 'workbench', radius: 1.25, solid: 0.85, height: 1.6, crafting: 'workbench' },
  portableForge: { name: 'Garden Forge', description: 'Smelt, craft and enchant beside your own forge.', art: 'forge', color: 0xff9a54,
    needs: [['stone', 12], ['copperIngot', 4]], station: 'forge', radius: 1.4, solid: 1, height: 2, crafting: 'forge' },
  portablePot: { name: 'Garden Cooking Pot', description: 'Cook meals at your own garden pot.', art: 'pot', color: 0xc8804a,
    needs: [['stone', 6], ['copperIngot', 2], ['wood', 4]], station: 'workbench', radius: 1.2, solid: 0.8, height: 1.8, crafting: 'pot' },
  portableBrew: { name: 'Garden Brewing Stand', description: 'Brew tonics at your own garden stand.', art: 'brew', color: 0xc8a8ff,
    needs: [['wood', 8], ['copperIngot', 2], ['glowcap', 3]], station: 'workbench', radius: 1.2, solid: 0.8, height: 1.7, crafting: 'brew' },
  farmPlot: { name: 'Farm Plot', description: 'A garden plot. Till, plant and water it with your usual tools.', art: 'plot', color: 0x9a6a44,
    needs: [['wood', 4], ['stone', 2]], radius: 1.03, solid: 0, height: 0.2, farm: true },
};
export const BUILDING_ITEMS = Object.fromEntries(Object.entries(PLACEABLES).filter(([id]) => !Object.hasOwn(FURNISHINGS, id)));
