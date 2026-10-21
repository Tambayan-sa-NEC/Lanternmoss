/* DUSKHOLLOW'S PLANTS (TODO 30b). The canopy comes first and decides the rest: giant lumen caps grow everywhere
   except the authored gaps of starlight and the village, so the gaps stay open to the sky exactly where
   world/mechanics/lantern.js makes the dusk brighter. Small glowcaps, ghost ferns and pale moonflowers grow
   anywhere, gaps included.
   Fixed caps and seeded placement, like the coast: a cosmetic quality change never resamples this scenery. */
import { G, LM } from '../render/meshes.js';
import { addCollider, freeOfColliders } from '../physics/colliders.js';
import { rand, rr } from '../utils/random.js';
import { arcDist, offsetDir, randomDir } from '../utils/sphere.js';
import { dryGround, slopeAt, surfM } from './terrain.js';
import { placed } from './placement.js';
import { propTree, TREE_KINDS } from './props.js';
import { underCanopy } from './mechanics/lantern.js';

export function scatterDuskFlora(B, flora, spots, canopy = null) {
  const grown = {}, C = flora.canopy;
  const spot = (r, { closed = false, open = false } = {}) => {
    for (let i = 0; i < 500; i++) {
      const d = randomDir();
      if (closed && !underCanopy(d, canopy)) continue;
      if (open && underCanopy(d, canopy)) continue;
      if (!dryGround(d, r) || slopeAt(d) > 0.8 || !freeOfColliders(d, r) || placed.some(p => arcDist(d, p.dir) < r + p.r)) continue;
      placed.push({ dir: d, r }); return d;
    }
    return null;
  };
  const tree = (kind, d, s) => {
    const def = TREE_KINDS[kind];
    propTree(B, surfM(d, rr(0, 6.28), s, -0.1), kind); grown[kind] = (grown[kind] ?? 0) + 1;
    spots.trees.push({ dir: d, kind, s, r: def.r * s });
    addCollider(d, def.r * s, { r: def.cam.r * s, base: def.cam.base * s, top: def.cam.top * s });
  };
  for (let i = 0; i < Math.min(40, C.caps ?? 0); i++) {               // the canopy itself, never over a gap
    const d = spot(4.5, { closed: true }); if (!d) continue;
    tree('lumenCap', d, rr(0.85, 1.2));
  }
  for (let i = 0; i < Math.min(90, C.glowcaps ?? 0); i++) {           // the small caps you walk under, gaps included
    const d = spot(1.4); if (!d) continue;
    tree('glowcap', d, rr(0.8, 1.45));
  }
  B.decorative = true;                                                // ground plants have no gameplay identity
  for (let c = 0; c < Math.min(40, C.ferns ?? 0); c++) {
    const center = spot(0.8); if (!center) continue;
    for (let i = 0; i < 4; i++) {
      const d = offsetDir(center, rr(0, 6.28), rr(0.2, 1.6)); if (!freeOfColliders(d, 0.25)) continue;
      const A = B.at(surfM(d, rr(0, 6.28), rr(0.8, 1.3)));
      for (let k = 0; k < 5; k++) A(G.cone(0.05, rr(0.5, 0.8), 3), 0x9fd8c0, LM((k - 2) * 0.07, 0.3, 0, 0, 0, (k - 2) * 0.2), { outline: false });
    }
  }
  for (let c = 0; c < Math.min(40, C.moonflowers ?? 0); c++) {
    const center = spot(0.7); if (!center) continue;
    for (let i = 0; i < 5; i++) {
      const d = offsetDir(center, rr(0, 6.28), rr(0.2, 1.8)); if (!freeOfColliders(d, 0.22)) continue;
      const A = B.at(surfM(d, rr(0, 6.28), rr(0.85, 1.25)));
      A(G.cyl(0.02, 0.025, 0.34, 4), 0x7fae9a, LM(0, 0.17, 0), { outline: false });
      A(G.ico(0.11, 0), 0xf2ecff, LM(0, 0.36, 0), { glow: true, intensity: rand() < 0.5 ? 2.2 : 1.6 });
    }
  }
  B.decorative = false;
  return grown;
}
