/* Unreleased Tidewhisper terrain in an original save/travel slot. All borrowed actors/items are test-only. */
import { PLANETS } from '../../../src/config/planets.js';
import tidewhisper from '../../../src/config/planets/tidewhisper.js';
export function installTideFixture() {
  const p=PLANETS[0], original={...p};
  Object.assign(p,structuredClone(tidewhisper),{id:original.id,released:true,act:original.act,music:'cozy',
    roster:[],boss:{...original.boss,summon:{level:16}},miniBosses:[],forage:[],chests:[],
    flora:{trees:{oak:1},treeCount:0,grass:0.4,tallCount:0,meadow:0.2},weather:{clear:1},
    wildlife:{critters:[],birds:0,flocks:0},resources:{nodes:[['branches',8,'village'],['pebbles',6,'village'],['sweetleaf',4]],rare:[]}});
  return { restore(){for(const key of Object.keys(p))delete p[key];Object.assign(p,original);} };
}
