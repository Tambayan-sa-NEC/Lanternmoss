/* CAVES (TODO 29b, config/dungeons.js): a cave's rooms and corridors built far below the planet (beyond the camera's
   reach from it, like house interiors far above), from a layout (src/world/caveLayout.js). Local frame: x across,
   y up, z toward the camera; the walls facing the camera (+z) stay low, a dollhouse cut-away, so the hero is always
   visible. Lanterns are local-light sources (render/lighting.js): the cave is dark apart from them and the hero.
   buildCave(layout, colors, lantern) -> { root, rects, layout, toWorld(x, z, y), dispose() }. `lantern` is the
   cave's own light colour (29f: CAVES[].lantern), defaulting to the shared one. */
import * as THREE from 'three';
import { CAVE, ROOM_KIT } from '../config/dungeons.js';
import { LocalLights } from '../render/lighting.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { floorRects } from './caveLayout.js';

const V3 = THREE.Vector3;
/** Where caves are built: thousands of units below the planet (whose camera far plane is 1500). */
export const CAVE_ORIGIN = new V3(0, -3000, 0);
export const CAVE_UP = new V3(0, 1, 0);
const LOW = 0.55, THICK = 0.4;   // the cut-away walls' height; wall thickness

export function buildCave(layout, colors, lantern = CAVE.lantern.color) {
  const root = new THREE.Group(); root.position.copy(CAVE_ORIGIN); scene.add(root);
  const rects = floorRects(layout), H = CAVE.wallHeight, gap = CAVE.corridor;
  const lights = [], toWorld = (x, z, y = 0, out = new V3()) => out.set(x, y, z).add(CAVE_ORIGIN);
  for (const r of rects) {                                          // floors: rooms, then the corridors a shade darker
    const w = r.x1 - r.x0, d = r.z1 - r.z0, c = r.corridor ? new THREE.Color(colors.floor).multiplyScalar(0.85).getHex() : colors.floor;
    addTo(root, part(G.box(w, 0.2, d), c, { outline: false }), [(r.x0 + r.x1) / 2, -0.1, (r.z0 + r.z1) / 2]);
  }
  /** A wall along x (from x0 to x1 at z) or along z, minus a doorway gap centred on `door` when given. */
  const wall = (along, a0, a1, at, height, door = null) => {
    const spans = door === null ? [[a0, a1]] : [[a0, door - gap / 2], [door + gap / 2, a1]];
    for (const [s0, s1] of spans) {
      if (s1 - s0 < 0.05) continue;
      const len = s1 - s0, mid = (s0 + s1) / 2;
      const geo = along === 'x' ? G.box(len, height, THICK) : G.box(THICK, height, len);
      addTo(root, part(geo, colors.wall), along === 'x' ? [mid, height / 2, at] : [at, height / 2, mid]);
    }
  };
  for (const r of layout.rooms) {
    const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
    wall('x', x0, x1, z0, H, r.doors.n ? r.x : null);                // the far (north) wall
    wall('x', x0, x1, z1, LOW, r.doors.s || r.n === 0 ? r.x : null); // near (south): low; the entrance's mouth is a gap
    wall('z', z0, z1, x0, H, r.doors.w ? r.z : null);
    wall('z', z0, z1, x1, H, r.doors.e ? r.z : null);
    const k = ROOM_KIT[r.kind].lanterns, inset = 1.1;               // lanterns: corners first, then the far wall's middle
    const spots = [[x0 + inset, z0 + inset], [x1 - inset, z0 + inset], [x0 + inset, z1 - inset], [x1 - inset, z1 - inset], [r.x, z0 + inset]];
    for (const [lx, lz] of spots.slice(0, k)) {
      addTo(root, part(G.cyl(0.07, 0.09, 1.6, 6), colors.wall), [lx, 0.8, lz]);
      addTo(root, part(G.ico(0.18, 0), colors.accent, { glow: true, intensity: 2.6 }), [lx, 1.75, lz]);
      lights.push(LocalLights.add({ at: toWorld(lx, lz, 1.75), radius: CAVE.lantern.radius, color: lantern, intensity: CAVE.lantern.intensity, outdoor: false }));
    }
  }
  for (const r of rects) if (r.corridor) {                          // corridor side walls
    if (r.x1 - r.x0 > r.z1 - r.z0) { wall('x', r.x0, r.x1, r.z0, H); wall('x', r.x0, r.x1, r.z1, LOW); }
    else { wall('z', r.z0, r.z1, r.x0, H); wall('z', r.z0, r.z1, r.x1, H); }
  }
  // the mouth: daylight spilling in at the entrance's open south side, and a worn patch to stand on to leave
  const m = layout.mouth;
  addTo(root, part(G.box(gap, 0.04, 1.1), 0xfff0c8, { glow: true, intensity: 1.4 }), [m.x, 0.02, m.z + 0.25]);
  const back = new THREE.Mesh(new THREE.SphereGeometry(240, 16, 10), new THREE.MeshBasicMaterial({ color: 0x0c0a12, side: THREE.BackSide, fog: false }));
  back.renderOrder = -5; root.add(back);
  return {
    root, rects, layout, toWorld,
    dispose() { for (const h of lights) h.remove(); lights.length = 0; scene.remove(root); disposeTree(root); back.geometry.dispose(); back.material.dispose(); },
  };
}
