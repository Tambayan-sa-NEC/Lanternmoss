/* THE FARM (config/resources.js FARM, CROPS): a fenced patch of plots a short walk from each village square. E at a
   plot does what it needs next:
     wild      till it (a hoe on the hotbar: two swings)
     tilled    plant seeds (the held seeds, or the first in the bag)
     planted   water it (a watering can on the hotbar; rain and snow water every plot) - a crop only grows on a day
               it's been watered, and a new day dries the soil again
     ripe      harvest it by hand (the plot stays tilled for the next seeds)
   Each planet keeps its own plots for the adventure (state[planet]); crops grow while you play on that planet. */
import * as THREE from 'three';
import { DAY } from '../config/day.js';
import { PLANETS } from '../config/planets.js';
import { CROPS, FARM } from '../config/resources.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { buildCrop, buildFarmFrame, buildPlot, SOIL_COLORS } from '../models/resources.js';
import { freeOfColliders } from '../physics/colliders.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist, matrixAt, offsetDir, tangentToward } from '../utils/sphere.js';
import { isFree } from '../world/placement.js';
import { groundHeight, slopeAt } from '../world/terrain.js';
import { dayClock } from './dayClock.js';
import { Gathering, TOOL_USES } from './Gathering.js';
import { Hotbar } from './hotbar.js';
import { ACTION_HANDLERS } from './itemUse.js';
import { grantItem } from './pickups.js';
import { rollDrops, cropStage, growthFor } from './resourceRules.js';

const V3 = THREE.Vector3;
const newPlot = () => ({ tilled: false, crop: null, growth: 0, watered: false });

export const Farm = {
  state: {},            // planet index -> [plot state] for this adventure
  plots: [],            // this planet's plots: { dir, s (state), parts (model), stage }
  frame: null, center: null, world: null, day: 0,

  /** Lays out this planet's farm (before the resource nodes, which keep clear of it). Returns [dir, radius] to avoid. */
  setup(world, planet) {
    this.clear(); this.world = world; this.day = dayClock.day;
    const spawn = world.spawnDir, [cols, rows] = FARM.grid, sp = FARM.spacing;
    const w = cols * sp + 0.8, d = rows * sp + 0.8, rad = Math.hypot(w, d) / 2 + 0.8;
    // the first level, open spot round the square (deterministic: the same planet always puts it in the same place)
    let c = null;
    for (let ring = FARM.distance[0]; ring <= FARM.distance[1] && !c; ring += 1.5) for (let a = 0; a < 6.28 && !c; a += 0.21) {
      const at = offsetDir(spawn, a + (PLANETS[planet].seed % 7) * 0.9, ring);
      if (!isFree(at, rad) || !freeOfColliders(at, rad + 0.5) || slopeAt(at) > 0.3) continue;
      if ([0, 1.57, 3.14, 4.71].some(b => slopeAt(offsetDir(at, b, rad * 0.8)) > 0.35)) continue;
      c = at;
    }
    if (!c) return null;
    this.center = c;
    const fwd = tangentToward(c, spawn), side = new V3().crossVectors(fwd, c).normalize(), up = c;
    this.frame = buildFarmFrame(w, d); this.frame.matrixAutoUpdate = false; this.frame.matrix.copy(matrixAt(c.clone().multiplyScalar(groundHeight(c) - 0.05), c, fwd)); scene.add(this.frame);
    const saved = this.state[PLANETS[planet].id] ??= Array.from({ length: cols * rows }, newPlot);
    let k = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const pos = c.clone().multiplyScalar(groundHeight(c)).addScaledVector(side, (i - (cols - 1) / 2) * sp).addScaledVector(fwd, (j - (rows - 1) / 2) * sp - 0.2);
      const dir = pos.normalize(), parts = buildPlot();
      parts.root.matrixAutoUpdate = false; parts.root.matrix.copy(matrixAt(dir.clone().multiplyScalar(groundHeight(dir) - 0.06), dir, fwd)); scene.add(parts.root);
      const plot = { dir, s: saved[k++], parts, stage: -1, up };
      this.plots.push(plot); this.look(plot);
    }
    return [c, rad + 1];
  },
  clear() {
    for (const p of this.plots) { scene.remove(p.parts.root); disposeTree(p.parts.root); p.parts.soil.dispose(); }
    if (this.frame) { scene.remove(this.frame); disposeTree(this.frame); }
    this.plots = []; this.frame = null; this.center = null;
  },
  resetRun() { this.state = {}; },

  toJSON() { return { day: this.day, plots: structuredClone(this.state[ctx.planetId] ?? []) }; },
  load(data) {
    this.day = data.day; this.state[ctx.planetId] = structuredClone(data.plots);
    this.plots.forEach((p, i) => { p.s = this.state[ctx.planetId][i]; p.stage = -1; this.look(p); });
  },

  /** Soil colour, weeds, furrows and the crop model for a plot's state. */
  look(p) {
    const s = p.s, pr = p.parts;
    pr.weeds.visible = !s.tilled; pr.furrows.visible = s.tilled;
    pr.soil.color.setHex(!s.tilled ? SOIL_COLORS.wild : s.watered ? SOIL_COLORS.wet : SOIL_COLORS.dry);
    const stage = s.crop ? cropStage(s.growth) : -1;
    if (stage !== p.stage) {
      p.stage = stage;
      for (const ch of [...pr.crop.children]) { pr.crop.remove(ch); disposeTree(ch); }
      if (s.crop) pr.crop.add(buildCrop(CROPS[s.crop].look, stage));
    }
  },
  /** The plot within reach, or null. */
  plotHere() {
    const P = ctx.player; let best = null, bd = FARM.reach;
    for (const p of this.plots) { const d = arcDist(P.up, p.dir); if (d < bd) { bd = d; best = p; } }
    return best ? { plot: best, dist: bd } : null;
  },
  /** Seeds to plant: the held stack if it's seeds, else the first seeds in the bag. { slot, def } or null. */
  seeds() {
    const inv = ctx.player.inventory, held = Hotbar.heldDef();
    if (held?.category === 'seed') return { slot: Hotbar.selected, def: held };
    for (let i = 0; i < inv.size; i++) { const st = inv.getSlot(i), def = st && itemRegistry.get(st.itemId); if (def?.category === 'seed') return { slot: i, def }; }
    return null;
  },

  /** The E prompt for the plot in reach. */
  target() {
    if (Gathering.job) return null;
    const h = this.plotHere(); if (!h) return null;
    const { plot: p, dist } = h, s = p.s, at = p.dir.clone().multiplyScalar(groundHeight(p.dir) + 1.2);
    const need = (what, tag) => `${what} <span class="ctag">(${tag})</span>`;
    let label, run;
    if (!s.tilled) { label = Gathering.hotbarTool('hoe') ? 'Till the soil' : need('Till the soil', 'needs a hoe'); run = () => this.till(p); }
    else if (!s.crop) { const sd = this.seeds(); label = sd ? `Plant ${sd.def.name}` : need('Plant seeds', 'none in the bag'); run = () => this.plant(p, sd); }
    else if (s.growth >= 1) { label = `Harvest the ${CROPS[s.crop].name}`; run = () => this.harvest(p); }
    else if (!s.watered) { label = Gathering.hotbarTool('can') ? `Water the ${CROPS[s.crop].name}` : need(`${CROPS[s.crop].name}: thirsty`, 'a watering can, or rain'); run = () => this.water(p); }
    else { label = `${CROPS[s.crop].name}: growing <span class="ctag">(${Math.floor(s.growth * 100)}%)</span>`; run = () => toast("It's watered for today. It grows while you play: come back later!"); }
    return { dist, label, at, run };
  },

  till(p) {
    if (p.s.tilled) return;
    Gathering.work({ at: p.dir, need: { tool: 'hoe', tier: 1, hits: 2 }, onDone: () => {
      p.s.tilled = true; this.look(p); audio.noise(0.15, 0.08, 700);
      sparkles.emit(p.dir.clone().multiplyScalar(groundHeight(p.dir) + 0.3), { count: 16, color: 0x9a6a44, speed: 1.8, up: p.dir, upBias: 0.8, life: 0.6, size: 0.3 });
    } });
  },
  plant(p, sd = this.seeds()) {
    if (!p.s.tilled || p.s.crop) return;
    if (!sd) { toast('You have no seeds. Pim sells them, and you sometimes find some picking sweetleaf.'); return; }
    ctx.player.inventory.removeFromSlot(sd.slot, 1);
    Object.assign(p.s, { crop: sd.def.props.crop, growth: 0 });
    if (this.raining()) p.s.watered = true;
    this.look(p); audio.plip();
    sparkles.emit(p.dir.clone().multiplyScalar(groundHeight(p.dir) + 0.3), { count: 12, color: 0x7fd07a, speed: 1.2, up: p.dir, upBias: 1, life: 0.6, size: 0.26 });
    toast(p.s.watered ? `Planted ${sd.def.name}. The rain will water them.` : `Planted ${sd.def.name}. Now water them!`);
  },
  water(p) {
    if (!p.s.crop || p.s.watered) return;
    Gathering.work({ at: p.dir, need: { tool: 'can', tier: 1, hits: 1 }, onDone: () => {
      p.s.watered = true; this.look(p); audio.splash(false);
      sparkles.emit(p.dir.clone().multiplyScalar(groundHeight(p.dir) + 0.9), { count: 22, color: 0x9fe8ff, speed: 1.6, up: p.dir, upBias: -0.5, life: 0.6, size: 0.26 });
    } });
  },
  harvest(p) {
    const s = p.s; if (!s.crop || s.growth < 1) return;
    const crop = s.crop, drops = rollDrops(CROPS[crop].harvest);
    for (const [item, n] of drops) grantItem(item, n);
    Object.assign(s, { crop: null, growth: 0, watered: false }); this.look(p);
    audio.sparkle(); emit('harvested', { crop });
    sparkles.emit(p.dir.clone().multiplyScalar(groundHeight(p.dir) + 0.6), { count: 24, color: CROPS[crop].look.fruit, speed: 2, up: p.dir, upBias: 1, life: 0.8, size: 0.3 });
  },

  /** Time skipped (sleeping): every watered crop on this planet grows that much. */
  growBy(seconds) {
    for (const p of this.plots) if (p.s.crop && p.s.watered) { p.s.growth = Math.min(1, p.s.growth + growthFor(p.s.crop, seconds, DAY.length)); this.look(p); }
  },
  raining() { const w = this.world?.weather; return !!w && FARM.rainWaters.includes(w.kind) && (w.k ?? 1) > 0.5; },
  update(dt) {
    if (!ctx.started || !this.plots.length) return;
    if (dayClock.day !== this.day) { this.day = dayClock.day; for (const p of this.plots) { p.s.watered = false; this.look(p); } }   // a new day: the soil dries
    const rain = this.raining();
    for (const p of this.plots) {
      const s = p.s; if (!s.crop) continue;
      if (rain && !s.watered && s.growth < 1) { s.watered = true; this.look(p); }
      if (s.watered && s.growth < 1) {
        s.growth = Math.min(1, s.growth + growthFor(s.crop, dt, DAY.length));
        if (cropStage(s.growth) !== p.stage) {
          this.look(p);
          if (s.growth >= 1) sparkles.emit(p.dir.clone().multiplyScalar(groundHeight(p.dir) + 0.8), { count: 10, color: 0xfff08a, speed: 1, up: p.dir, upBias: 1, life: 0.8, size: 0.26 });
        }
      }
    }
  },
};

TOOL_USES.hoe = def => {
  const h = Farm.plotHere(); if (!h) return { ok: false, message: `Use the ${def.name} at a plot in the farm by the village.` };
  if (h.plot.s.tilled) return { ok: false, message: 'This plot is already tilled.' };
  Farm.till(h.plot); return { ok: true, message: '' };
};
TOOL_USES.can = def => {
  const h = Farm.plotHere(); if (!h) return { ok: false, message: `Use the ${def.name} at a planted plot in the farm by the village.` };
  if (!h.plot.s.crop) return { ok: false, message: 'Nothing is planted here yet.' };
  if (h.plot.s.watered) return { ok: false, message: 'This plot is already watered for today.' };
  Farm.water(h.plot); return { ok: true, message: '' };
};
ACTION_HANDLERS.plant = (inv, slot, def) => {
  const h = Farm.plotHere(); if (!h) return { ok: false, message: `Plant the ${def.name} at a tilled plot in the farm by the village.` };
  if (!h.plot.s.tilled) return { ok: false, message: 'Till the soil with a hoe first.' };
  if (h.plot.s.crop) return { ok: false, message: 'Something is already growing here.' };
  Farm.plant(h.plot, { slot, def }); return { ok: true, message: '' };
};
