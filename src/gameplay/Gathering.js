/* GATHERING (config/resources.js): resource nodes (bushes, herbs, branches, ore veins) and the planet's own trees and
   rocks. E by one (or the held tool's use: right click / its number again) starts a job: the hero faces it and works
   it, swinging the tool (from the hotbar) a few times or picking by hand, then the drops go into the bag and it rests
   until it regrows. Walking away stops the job.
     spawnFor(world, planet)  places the planet's nodes (their own seeded stream: the world's layout doesn't move)
     target()                 the "E Pick / Chop / Mine ..." prompt (src/gameplay/Houses.js currentInteraction)
     work(job)                starts working something (Farm.js uses it for tilling and watering too)
     hotbarTool(kind)         the best tool of a kind on the hotbar ({ def, slot }), or null
   Fishing (./Fishing.js) and farming (./Farm.js) build on these. */
import { PLANETS } from '../config/planets.js';
import { GATHERING_TIPS as TIPS } from '../config/tutorial.js';
import { GATHER, NODE_KINDS, SCENERY } from '../config/resources.js';
import { TOOL_KINDS, HOTBAR } from '../config/items.js';
import { TREE_KINDS } from '../config/flora.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { ResourceNode } from '../entities/ResourceNode.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { freeOfColliders } from '../physics/colliders.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { mulberry32, rng } from '../utils/random.js';
import { arcDist, offsetDir, randomDir, tangentToward, turnToward } from '../utils/sphere.js';
import { damp } from '../utils/math.js';
import { groundHeight, ponds, slopeAt } from '../world/terrain.js';
import { holdTool, releaseTool } from './heldTool.js';
import { Hotbar } from './hotbar.js';
import { ACTION_HANDLERS } from './itemUse.js';
import { grantItem } from './pickups.js';
import { rollDrops, toolCheck, bestTool } from './resourceRules.js';

const CHIPS = { tree: 0x9a6a44, rock: 0xb6aec8 };

export const Gathering = {
  nodes: [], rest: new Map(), job: null, world: null, tipsShown: new Set(), tip: null,

  /** The planet's nodes (after its monsters: rare veins sit by its mini boss). Farm.setup runs first so they avoid it. */
  spawnFor(world, planet, avoid = []) {
    this.clear(); this.world = world;
    const P = PLANETS[planet], res = P.resources; if (!res) return;
    const rng = mulberry32((P.seed ^ 0x5eed51) >>> 0), boss = ctx.enemies.find(e => e.def.miniBoss);
    const place = (kind, near) => {
      const def = NODE_KINDS[kind];
      for (let i = 0; i < 80; i++) {
        const d = near === 'village' ? offsetDir(world.spawnDir, rng() * 6.28, 11 + rng() * 22)
          : near === 'boss' && boss ? offsetDir(boss.home ?? boss.up, rng() * 6.28, 6 + rng() * 9) : randomDir(rng);
        if (near !== 'village' && arcDist(d, world.spawnDir) < 16) continue;
        if (arcDist(d, world.lairDir) < 30 || slopeAt(d) > 0.6 || !freeOfColliders(d, def.r + 0.5)) continue;
        if (ponds.some(p => arcDist(d, p.dir) < p.r + 1.2) || avoid.some(([a, r]) => arcDist(d, a) < r)) continue;
        if (this.nodes.some(n => arcDist(d, n.up) < n.def.r + def.r + 1.5)) continue;
        const node = new ResourceNode(kind, d, this.nodes.length + 1);
        node.id = `${P.id}:node:${this.nodes.length}`; this.nodes.push(node); return;
      }
    };
    for (const [kind, count, near] of res.nodes) for (let i = 0; i < count; i++) place(kind, near);
    for (const [kind, count] of res.rare ?? []) for (let i = 0; i < count; i++) place(kind, 'boss');
  },
  clear() { this.stop(); for (const n of this.nodes) n.dispose(); this.nodes = []; this.rest.clear(); },
  /** A fresh adventure: the first-time tips may show again. */
  resetRun() { this.tipsShown.clear(); this.tip = null; },

  toJSON() {
    return { nodes: this.nodes.map(n => ({ id: n.id, kind: n.kind, dir: n.up.toArray(), regrowT: Math.max(0, n.regrowT) })),
      rest: Object.fromEntries(this.rest), tipsShown: [...this.tipsShown] };
  },
  load(data) {
    this.clear();
    this.nodes = data.nodes.map((saved, i) => {
      const n = new ResourceNode(saved.kind, ctx.player.up.clone().fromArray(saved.dir), i + 1);
      n.id = saved.id; n.regrowT = saved.regrowT;
      if (n.regrowT > 0) { if (n.def.vanish) { n.root.visible = false; if (n.collider) n.collider.active = false; } else n.fruit.visible = false; }
      return n;
    });
    this.rest = new Map(Object.entries(data.rest)); this.tipsShown = new Set(data.tipsShown); this.tip = null;
  },

  /** The best tool of `kind` on the hotbar ({ def, slot }), or null. */
  hotbarTool(kind) {
    const inv = ctx.player.inventory, list = [];
    for (let i = 0; i < HOTBAR.size; i++) { const s = inv.getSlot(i); if (s) list.push({ def: itemRegistry.get(s.itemId), slot: i }); }
    return bestTool(kind, list);
  },
  /** The best tool of `kind` anywhere in the bag (not the hotbar), or null. */
  bagTool(kind) {
    const inv = ctx.player.inventory, list = [];
    for (let i = HOTBAR.size; i < inv.size; i++) { const s = inv.getSlot(i); if (s) list.push({ def: itemRegistry.get(s.itemId), slot: i }); }
    return bestTool(kind, list);
  },
  /** Why the hero can't work something needing `need` ({ tool, tier }), as a sentence, or null when they can. */
  toolProblem(need) {
    if (!need.tool) return null;
    const have = this.hotbarTool(need.tool), check = toolCheck(need, have?.def.tool ?? null), label = TOOL_KINDS[need.tool].label;
    if (check === 'ok') return null;
    if (check === 'weak') return `Your ${have.def.name} can't break this: it needs a stronger ${label.toLowerCase()} (a Copper Pickaxe).`;
    const inBag = this.bagTool(need.tool);
    if (inBag) return `Put your ${inBag.def.name} on the hotbar to use it (bag: click it, then a hotbar slot).`;
    return `You need ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()} for this: craft one in the bag (Craft tab), or buy one from Pim.`;
  },

  /** Every workable thing in reach: [{ dist, label, at, run, tool }] (tool = the kind it needs). */
  candidates(range = 0) {
    const P = ctx.player, out = [], w = this.world;
    for (const n of this.nodes) {
      if (!n.ready) continue;
      const d = arcDist(P.up, n.up) - n.def.r; if (d > GATHER.reach + range) continue;
      const problem = this.toolProblem(n.def), tag = problem ? ` <span class="ctag">(needs ${n.def.tool === 'pick' && toolCheck(n.def, this.hotbarTool('pick')?.def.tool ?? null) === 'weak' ? 'a Copper Pickaxe' : `a ${TOOL_KINDS[n.def.tool].label.toLowerCase()}`})</span>` : '';
      out.push({ dist: d, tool: n.def.tool ?? null, label: `${n.def.verb} the ${n.def.name.toLowerCase()}${tag}`, at: n.top(n.def.look === 'vein' ? 1.5 : 1), run: () => this.work({ node: n }) });
    }
    if (!w) return out;
    const scenery = (list, kind, ok) => {
      const S = SCENERY[kind]; if (!ok) return;
      list.forEach((t, i) => {
        if (kind === 'tree' && TREE_KINDS[t.kind]?.wood === false) return;
        const d = arcDist(P.up, t.dir) - t.r; if (d > S.reach + range) return;
        const key = `${kind}:${i}`, resting = this.rest.has(key), name = kind === 'tree' ? TREE_KINDS[t.kind].name : 'rock';
        out.push({ dist: d + 0.3, tool: S.tool, resting, label: resting ? `The ${name} is resting <span class="ctag">(it grows back)</span>` : `${S.verb} the ${name}`,
          at: t.dir.clone().multiplyScalar(groundHeight(t.dir) + (kind === 'tree' ? 2.2 * t.s : 1.4 * t.s)),
          run: () => (resting ? toast(`This ${name} needs a rest before it gives more. Try another one!`) : this.work({ scenery: kind, index: i, spot: t })) });
      });
    };
    scenery(w.spots?.trees ?? [], 'tree', !!this.hotbarTool('axe'));
    scenery(w.spots?.rocks ?? [], 'rock', !!this.hotbarTool('pick'));
    return out;
  },
  /** The nearest thing E would work here, or null. */
  target() {
    if (this.job) return null;
    let best = null; for (const c of this.candidates()) if (!best || c.dist < best.dist) best = c;
    return best;
  },
  /** The held tool's use (right click / its number again): work the nearest thing it's for. */
  useTool(def) {
    if (this.job) return { ok: false, message: '' };
    const kind = def.tool.kind;
    if (kind === 'axe' || kind === 'pick') {
      const c = this.candidates(0.6).filter(c => c.tool === kind).sort((a, b) => a.dist - b.dist)[0];
      if (!c) return { ok: false, message: kind === 'axe' ? `Walk up to a tree and use the ${def.name} on it.` : `Walk up to a rock or an ore vein and use the ${def.name} on it.` };
      c.run(); return { ok: true, message: '' };
    }
    return TOOL_USES[kind]?.(def) ?? { ok: false, message: `${def.name}: nothing to use it on here.` };
  },

  /** Starts working: { node } | { scenery, index, spot } | { at, need, verb, onDone } (custom: tilling, watering). */
  work(job) {
    const P = ctx.player; if (P.dead || this.job) return;
    const need = job.node?.def ?? (job.scenery ? SCENERY[job.scenery] : job.need);
    const problem = this.toolProblem(need); if (problem) { toast(problem); audio.fizzle?.(); return; }
    const tool = need.tool ? this.hotbarTool(need.tool) : null;
    if (tool) { Hotbar.selected = tool.slot; Hotbar.changedAt = ctx.time; holdTool(P, tool.def); }
    const at = job.node?.up ?? job.spot?.dir ?? job.at;
    P.vel.set(0, 0, 0);                                                // plant your feet
    const extra = tool ? tool.def.tool.tier - (need.tier ?? 1) : 0;   // a better tool than it needs: fewer swings
    this.job = { ...job, need, tool, at: at.clone(), from: P.up.clone(), t: 0, hits: 0, total: need.tool ? Math.max(1, (need.hits ?? 1) - extra) : 1,
      swing: need.tool ? GATHER.swing : GATHER.pick };
  },
  stop() { if (this.job) { this.job = null; releaseTool(ctx.player); } },

  update(dt) {
    if (this.tip && ctx.time >= this.tip.at) { toast(this.tip.text); this.tip = null; }   // after the "+2 Wood" toast
    for (const n of this.nodes) n.update(dt);
    for (const [k, t] of this.rest) { if (t - dt <= 0) this.rest.delete(k); else this.rest.set(k, t - dt); }
    const j = this.job; if (!j) return;
    const P = ctx.player;
    if (P.dead || P.hurtT > 0 || ctx.transitioning || arcDist(P.up, j.from) > GATHER.cancelMove || (j.node && !j.node.ready)) { this.stop(); return; }
    // face it, and swing (or reach down)
    if (arcDist(P.up, j.at) > 0.3) turnToward(P.fwd, tangentToward(P.up, j.at), P.up, damp(14, dt));
    j.t += dt; const k = (j.t % j.swing) / j.swing;
    if (j.need.tool) { P.armR.rotation.x = k < 0.6 ? -2.6 * (k / 0.6) : -2.6 + 2.4 * ((k - 0.6) / 0.4); P.armR.rotation.z = -0.2; }
    else { P.armR.rotation.x = -1.2 * Math.sin(k * Math.PI); P.armL.rotation.x = P.armR.rotation.x; P.squash = Math.max(P.squash, 0.08 * Math.sin(k * Math.PI)); }
    if (j.t < j.swing * (j.hits + 1)) return;
    // a blow lands (or a pick)
    j.hits++; this.impact(j);
    if (j.hits < j.total) return;
    this.finish(j);
  },
  impact(j) {
    const color = j.node?.def.color ?? CHIPS[j.scenery] ?? 0x9a6a44, at = j.node ? j.node.top(0.6) : j.at.clone().multiplyScalar(ctx.player.r + 1);
    sparkles.emit(at, { count: j.need.tool ? 10 : 6, color, speed: 2.2, up: j.at, upBias: 0.7, life: 0.5, size: 0.26 });
    if (j.scenery === 'tree') sparkles.emit(at.clone().addScaledVector(j.at, 2.5), { count: 8, color: 0x7fbf62, speed: 1.4, up: j.at, upBias: -0.3, life: 1, size: 0.3 });
    j.node?.hit();
    const kind = j.need.tool;
    if (kind === 'axe') { audio.noise(0.12, 0.09, 1500); audio.tone(190, 0.1, 'triangle', 0.05); }
    else if (kind === 'pick') { audio.tone(1300 + rng() * 300, 0.09, 'square', 0.025); audio.noise(0.08, 0.06, 3000); }
    else if (kind) audio.noise(0.1, 0.05, 900);
    else audio.plip();
  },
  finish(j) {
    this.job = null; releaseTool(ctx.player);
    if (j.onDone) { j.onDone(); return; }
    const drops = rollDrops(j.need.drops, j.need.extra ?? []);
    for (const [item, n] of drops) grantItem(item, n);
    if (j.node) j.node.deplete(); else this.rest.set(`${j.scenery}:${j.index}`, SCENERY[j.scenery].rest);
    audio.sparkle();
    emit('gathered', { what: j.node?.kind ?? j.scenery, items: drops });
    for (const [item] of drops) {
      const tip = TIPS[item] ?? (itemRegistry.get(item)?.category === 'seed' ? TIPS.seed : null), key = TIPS[item] ? item : 'seed';
      if (tip && !this.tipsShown.has(key)) { this.tipsShown.add(key); emit('gatheringtip', { key }); this.tip = { text: tip, at: ctx.time + 1.6 }; break; }
    }
  },
};

/** Tools whose use isn't a swing at a node (the rod, the hoe, the watering can): registered by Fishing.js and Farm.js. */
export const TOOL_USES = {};

// the bag's / hotbar's Use on a tool
ACTION_HANDLERS.tool = (inv, slot, def) => Gathering.useTool(def);
