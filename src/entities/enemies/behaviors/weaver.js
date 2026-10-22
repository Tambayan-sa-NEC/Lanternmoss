/* GLOOMWEAVER (ai 'weaver', TODO 30f): a round, fuzzy spider that strings sticky webs between the stalks and bites
   whatever gets caught in them. It fights like any other biter -- chase, a short wind-up, a bite -- but between
   bites it spins: every `def.web.every` seconds it lays a web `def.web.at` metres ahead of itself, up to
   `def.web.max` of its own alive at once, so a weaver fences you in rather than out-damaging you.
   The webs themselves are objects with their own rules (./web.js): they slow, a blade cuts them, fire burns them,
   and either way they leave this world's only spider silk.
   Accessibility: with `roundBeetles` on (config/settings.js) its model draws the beetle silhouette instead of the
   spider one -- the same switch Grandmother Gloomweaver will use (models/duskMonsters.js). */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { addEnemy } from '../../../combat/spawning.js';
import { hitMobs, hurtPlayer } from '../../../combat/damage.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { damp } from '../../../utils/math.js';
import { dirAlong, turnToward } from '../../../utils/sphere.js';
import { dryGround } from '../../../world/terrain.js';
import { freeOfColliders } from '../../../physics/colliders.js';
import { showSpiderLook } from '../../../models/duskMonsters.js';

const _p = new THREE.Vector3(), _fwd = new THREE.Vector3();

/** The webs this weaver has out right now (a cut one drops off the list by itself). */
const liveWebs = e => (e.webs = (e.webs ?? []).filter(w => w.alive));

/** Lays one web a little ahead of the weaver: straight ahead if the ground there is clear and dry, otherwise a
    little to either side, so a weaver facing a rock still fences the ground it can reach. */
export function spin(e) {
  const W = e.def.web;
  if (liveWebs(e).length >= W.max) return null;
  let at = null;
  for (const turn of [0, 0.7, -0.7, 1.5, -1.5, 2.4, -2.4, 3.14]) {
    const dir = _fwd.copy(e.fwd).applyAxisAngle(e.up, turn);
    const spot = dirAlong(e.up.clone(), dir, W.at);
    if (dryGround(spot, 1) && freeOfColliders(spot, 0.8)) { at = spot; break; }
  }
  if (!at) return null;
  const w = addEnemy(W.type, at);
  e.webs.push(w);
  sparkles.emit(_p.copy(at).multiplyScalar(w.r + 0.5), { count: 14, color: e.def.capColor, speed: 1.6, up: at, upBias: 0.5, life: 0.7, size: 0.3 });
  if (e.heard) audio.sparkle();
  e.spinT = W.every;
  return w;
}

export const weaver = {
  init(e) { e.webs = []; e.spinT = 0; },
  reset(e) { e.webs = []; e.spinT = e.def.web.every * 0.35; },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
        e.move.copy(e.toP);
        if (dist < d.range && e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; if (e.heard) audio.growl(); return 0; }
        return dist > d.range * 0.75 ? d.speed : 0;
      case 'windup':
        turnToward(e.fwd, e.toP, e.up, damp(d.windupTurn, dt));
        if (e.timer <= 0) bite(e, dist);
        return 0;
      case 'recover':
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  /** Spinning happens whatever it is doing, so a weaver you are running from still fences the ground behind you. */
  update(e, dt) {
    if ((e.spinT -= dt) <= 0) { e.spinT = e.def.web.every; if (!ctx.player.dead) spin(e); }
  },
  animate(e, dt) {
    showSpiderLook(e);
    const t = ctx.time, s = Math.abs(e.speed);
    e.body.scale.setScalar(1 + e.hitPop * 0.14);
    e.body.position.y = e.state === 'windup' ? 0.1 : Math.sin(t * 3 + e.seed) * 0.03;
    e.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.phase * 2 + i * 1.05) * (0.18 + Math.min(0.5, s / 5)); });
    e.fangs.forEach((f, i) => { f.rotation.x = e.state === 'windup' ? -0.7 : Math.sin(t * 2 + i) * 0.08; });
    e.eyes.forEach((eye, i) => { eye.scale.setScalar(0.85 + 0.15 * Math.abs(Math.sin(t * 1.4 + i))); });
  },
  onDie(e) {
    sparkles.emit(e.center(), { count: 26, color: e.def.capColor, speed: 2.4, up: e.up, upBias: 0.6, life: 0.8, size: 0.32 });
    audio.sparkle();
  },
};

function bite(e, dist) {
  const d = e.def, P = ctx.player;
  e.state = 'recover'; e.timer = d.recover; e.cool = d.cooldown; e.hideTele();
  sparkles.emit(_p.copy(e.pos).addScaledVector(e.fwd, 0.5).addScaledVector(e.up, 0.4),
    { count: 8, color: d.capColor, speed: 2, up: e.up, upBias: 0.3, life: 0.35, size: 0.26 });
  if (e.heard) audio.whoosh();
  if (!P.dead && dist < d.range + P.radius) hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
  hitMobs(e, e.pos, d.range, d.damage, { knock: d.knockback });        // TODO 45b
}
