/* Ground-level modular shelters. Floors sharing a root use one tangent plane and 4 m grid. */
export const STRUCTURE = { size: 4, floorTop: 0.18, wallHeight: 2.6, roofRise: 1, span: 2, maxFoundationGap: 0.65, snapReach: 3 };
export const STRUCTURE_ITEMS = {
  timberFloor: { name: 'Timber Floor', description: 'Start a foundation on level ground, or snap another floor beside it.', art: 'floor', color: 0xc89060,
    needs: [['wood', 8], ['stone', 4]], station: 'workbench', radius: 2.95, solid: 0, height: 0.18, structure: 'floor' },
  timberWall: { name: 'Timber Wall', description: 'A full wall. Rotate to choose an edge of a placed floor.', art: 'wall', color: 0xeacb9c,
    needs: [['wood', 6], ['stone', 2]], station: 'workbench', radius: 2.05, solid: 0.14, height: 2.6, structure: 'wall' },
  timberDoorway: { name: 'Timber Doorway', description: 'An open doorway you can walk through. Snaps to a floor edge.', art: 'doorway', color: 0xb0703a,
    needs: [['wood', 6]], station: 'workbench', radius: 2.05, solid: 0.14, height: 2.6, structure: 'doorway' },
  timberWindow: { name: 'Timber Window Wall', description: 'A wall with a glowing window. Snaps to a floor edge.', art: 'windowWall', color: 0x8fd8ff,
    needs: [['wood', 6], ['glowcap', 2]], station: 'workbench', radius: 2.05, solid: 0.14, height: 2.6, structure: 'window' },
  timberRoof: { name: 'Shingled Roof', description: 'Cover a floor with walls on two opposite edges. Cuts away while you walk inside.', art: 'roof', color: 0x9b83c8,
    needs: [['wood', 8], ['sweetleaf', 4]], station: 'workbench', radius: 2.95, solid: 0, height: 1, structure: 'roof' },
};
