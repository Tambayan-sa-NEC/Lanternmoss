/* Challenge activities. Data for each challenge lives in CHALLENGES (src/config/challenges.js). */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { addEnemy } from '../../combat/spawning.js';
import { fxMaterial } from '../../fx/combatFx.js';
import { sparkles } from '../../fx/sparkles.js';
import { freeOfColliders } from '../../physics/colliders.js';
import { glowMat } from '../../render/materials.js';
import { disposeTree, G, part } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { mr, rng } from '../../utils/random.js';
import { arcDist, dirAlong, frameQuat, offsetDir, projectTangent, tangentFrame, tangentTo, tangentToward } from '../../utils/sphere.js';
import { groundHeight, ponds } from '../../world/terrain.js';

const _tv = new THREE.Vector3();

/** Random free ground spots around an anchor direction (clear of colliders, ponds and each other). */
function spotsAround(anchor, n, minArc, maxArc, clearance) {
  const out = [];
  for (let i = 0; out.length < n && i < n * 60; i++) { const d = offsetDir(anchor, rng() * Math.PI * 2, mr(minArc, maxArc));
    if (!freeOfColliders(d, clearance) || ponds.some(p => arcDist(d, p.dir) < p.r + 0.8) || out.some(o => arcDist(o, d) < 2)) continue;
    out.push(d); }
  return out;
}

/** The surface direction among `dirs` nearest the hero (for waypoints), or null. */
function nearestToHero(dirs) {
  let best = null, bd = Infinity;
  for (const d of dirs) { const a = arcDist(ctx.player.up, d); if (a < bd) { bd = a; best = d; } }
  return best;
}

/* Activity kinds. A kind is { start(run), update(run, dt) -> 'success' | 'fail' | null, progress(run) -> string, cleanup(run),
   target(run) -> surface direction of where to go next (the HUD's compass and edge arrows), or null }.
   Timeouts, fainting and wandering off are handled by the core, so kinds only describe the activity itself.
   cleanup() must remove everything start() created; it runs on every outcome. */
export const CHALLENGE_KINDS = {
  /** Pick up glowing items scattered around the giver. params: count, minRadius, radius, color, size, height, drift?, label */
  collect: {
    toJSON(run) { return { items: run.items.map(it => ({ dir: it.d.toArray(), got: it.got })) }; },
    start(run, saved = null) { const p = run.def.params; run.got = 0;
      const points = saved ? saved.items.map(it => new THREE.Vector3().fromArray(it.dir)) : spotsAround(run.anchor, p.count, p.minRadius ?? 2, p.radius, 0.6);
      run.items = points.map((d, i) => {
        const m = part(G.ico(p.size ?? 0.2, 1), p.color, { glow: true, intensity: 2.6 }); scene.add(m);
        m.position.copy(d).multiplyScalar(groundHeight(d) + (p.height ?? 1));
        const got = saved?.items[i].got ?? false;
        if (got) { run.got++; scene.remove(m); disposeTree(m); }
        return { d, m, seed: rng() * 6.28, got }; }); },
    update(run, dt) { const p = run.def.params;
      for (const it of run.items) { if (it.got) continue;
        if (p.drift && tangentTo(ctx.player.pos, ctx.player.up, it.m.position, _tv) < 5) {                     // shy items float away from you, but stay inside the play area
          const away = projectTangent(tangentToward(ctx.player.up, it.d), it.d).normalize();
          const nd = dirAlong(it.d, arcDist(it.d, run.anchor) > p.radius + 2 ? tangentToward(it.d, run.anchor) : away, p.drift * dt);
          if (freeOfColliders(nd, 0.4) && !ponds.some(q => arcDist(nd, q.dir) < q.r + 0.5)) it.d.copy(nd); }
        it.m.position.copy(it.d).multiplyScalar(groundHeight(it.d) + (p.height ?? 1) + Math.sin(ctx.time * 2.5 + it.seed) * 0.2); it.m.rotation.y += dt * 2;
        if (rng() < dt * 3) sparkles.emit(it.m.position, { count: 1, color: p.color, speed: 0.4, life: 0.6, size: 0.25 });
        if (tangentTo(ctx.player.pos, ctx.player.up, it.m.position, _tv) < 1.3) { it.got = true; run.got++; scene.remove(it.m); disposeTree(it.m);
          sparkles.emit(it.m.position, { count: 18, color: p.color, speed: 2.2, up: ctx.player.up, upBias: 0.6, life: 0.7, size: 0.32 });
          audio.tone(880 + run.got * 110, 0.3, 'sine', 0.05); } }
      return run.got >= run.items.length ? 'success' : null; },
    progress: run => `${run.got} / ${run.items.length} ${run.def.params.label}`,
    cleanup(run) { for (const it of run.items) if (!it.got) { scene.remove(it.m); disposeTree(it.m); } },
    target: run => nearestToHero(run.items.filter(it => !it.got).map(it => it.d)),
  },
  /** Run through glowing rings in order, laid out in a loop around the giver. params: count, radius, color */
  race: {
    toJSON(run) { return { idx: run.idx, items: run.rings.map(r => ({ dir: r.d.toArray() })) }; },
    start(run, saved = null) { const p = run.def.params, base = rng() * Math.PI * 2; run.idx = saved?.idx ?? 0;
      const pts = saved ? saved.items.map(it => new THREE.Vector3().fromArray(it.dir)) : [];
      for (let i = 0; !saved && i < p.count; i++) for (let k = 0; k < 30; k++) {
        const d = offsetDir(run.anchor, base + i / p.count * Math.PI * 2 + mr(-0.25, 0.25), mr(p.radius * 0.7, p.radius));
        if (freeOfColliders(d, 1.6) && !ponds.some(q => arcDist(d, q.dir) < q.r + 1.5)) { pts.push(d); break; } }
      run.rings = pts.map((d, i) => { const m = part(new THREE.TorusGeometry(1.3, 0.12, 6, 20), p.color, { glow: true, intensity: 0.9 });
        m.position.copy(d).multiplyScalar(groundHeight(d) + 1.5); frameQuat(d, tangentToward(d, pts[i + 1] || run.anchor), m.quaternion);
        scene.add(m); if (i < run.idx) { scene.remove(m); disposeTree(m); } return { d, m }; });
      run.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14, 8, 1, true), fxMaterial(p.color, 0.9)); scene.add(run.beacon); },
    update(run) { const p = run.def.params, ring = run.rings[run.idx];
      if (!ring) return 'success';
      ring.m.material = glowMat(p.color, 2.6); ring.m.scale.setScalar(1 + Math.sin(ctx.time * 6) * 0.06);
      run.beacon.position.copy(ring.d).multiplyScalar(groundHeight(ring.d) + 7); frameQuat(ring.d, tangentFrame(ring.d)[0], run.beacon.quaternion);
      if (tangentTo(ctx.player.pos, ctx.player.up, ring.m.position, _tv) < 1.5) {
        sparkles.emit(ring.m.position, { count: 30, color: p.color, speed: 3, up: ring.d, upBias: 0.4, life: 0.7, size: 0.36 });
        audio.tone(523 * Math.pow(1.12, run.idx), 0.35, 'triangle', 0.06); scene.remove(ring.m); disposeTree(ring.m); run.idx++; }
      return run.idx >= run.rings.length ? 'success' : null; },
    progress: run => `Ring ${Math.min(run.idx + 1, run.rings.length)} / ${run.rings.length}`,
    cleanup(run) { for (const r of run.rings.slice(run.idx)) { scene.remove(r.m); disposeTree(r.m); }
      scene.remove(run.beacon); run.beacon.geometry.dispose(); run.beacon.material.dispose(); },
    target: run => run.rings[run.idx]?.d ?? null,
  },
  /** Defeat summoned enemies (uses the combat system). params: spawn { type: count }, minRadius, radius */
  defeat: {
    toJSON(run) { return { foes: run.foes.map(e => ({ type: e.type, dir: e.up.toArray(), hp: e.hp, alive: e.alive })) }; },
    start(run, saved = null) { const p = run.def.params; run.foes = [];
      const foes = saved ? saved.foes.filter(f => Object.hasOwn(p.spawn, f.type)) : Object.entries(p.spawn).flatMap(([type, n]) =>
        spotsAround(run.anchor, n, p.minRadius ?? 4, p.radius ?? 8, 1).map(d => ({ type, dir: d.toArray(), alive: true })));
      for (const foe of foes) { const { type } = foe, d = new THREE.Vector3().fromArray(foe.dir);
        const e = addEnemy(type, d); e.temporary = true; e.aggro(); run.foes.push(e);
        if (saved) { e.hp = Math.min(e.def.hp, foe.hp); if (!foe.alive) e.vanish(); }
        sparkles.emit(e.center(), { count: 24, color: e.def.color, speed: 2.5, up: e.up, upBias: 0.8, life: 0.8, size: 0.36 }); } },
    update: run => (run.foes.every(e => !e.alive) ? 'success' : null),
    progress: run => `${run.foes.filter(e => !e.alive).length} / ${run.foes.length} defeated`,
    cleanup(run) { for (const e of run.foes) { if (!e.alive) continue;     // banish leftovers so nothing lingers after a fail
      e.alive = false; e.dispose(); const i = ctx.enemies.indexOf(e); if (i >= 0) ctx.enemies.splice(i, 1); } },
    target: run => nearestToHero(run.foes.filter(e => e.alive).map(e => e.up)),
  },
};
