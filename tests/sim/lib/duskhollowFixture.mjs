/* Unreleased Duskhollow terrain, canopy, lantern, wildlife and economy in an original save/travel slot (30a-30c).
   Development only: it borrows the first released world's identity so the real `duskhollow` entry and its
   released: false flag are never touched, and it is never imported by production code. */
import { PLANETS } from '../../../src/config/planets.js';
import duskhollow from '../../../src/config/planets/duskhollow.js';
export function installDuskhollowFixture() {
  const p = PLANETS[0], original = { ...p };
  Object.assign(p, structuredClone(duskhollow), { id: original.id, released: true, act: original.act,
    roster: [], boss: { ...original.boss, summon: { level: 16 } }, miniBosses: [], forage: [], chests: [],
    resources: structuredClone(duskhollow.resources),                // the real 30c nodes, veins and guarded vein
    village: original.village ?? null, npcs: { locals: [], arrivals: {} }, houses: {}, outfit: null,
    wildlife: structuredClone(duskhollow.wildlife),                  // the real 30b animals, swarms and pale fish
  });
  return { restore() { for (const key of Object.keys(p)) delete p[key]; Object.assign(p, original); } };
}
