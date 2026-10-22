/* STICKY WEB (ai 'web', TODO 30f): what a Gloomweaver leaves strung between the stalks. An object, not a monster:
   no bestiary page, no drops, no coins, no kill counted (COMBAT.enemies.gloomweb, object: true, static: true).
   It does one thing while it stands -- whoever walks into it wades (`def.mire`, a share of walking speed, through
   the hero's `mireK`) -- and it is removed two ways: **a blade** cuts it, which is any ordinary blow, and **fire**
   burns it away in one, through the `fire` hit option the witch's Fireball and Meteor carry. Either way it leaves
   **spider silk**, which is this world's only source of it.
   A web also rots: it is gone after `def.life` seconds, so a hollow can never silt up with old webs.
   A static object never reaches Enemy.update's think/update path, so everything here hangs off animate(), which is
   the one hook a static object does get every frame. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { damp } from '../../../utils/math.js';
import { arcDist } from '../../../utils/sphere.js';
import { mr } from '../../../utils/random.js';
import { spawnWorldItem } from '../../../gameplay/pickups.js';

const _p = new THREE.Vector3();

/** Every frame the hero starts free, and each web they stand in presses the slow back down (Game.update calls this
    before the enemies animate). Nothing else writes `mireK`, so a cut web releases the hero immediately. */
export function clearMire() { if (ctx.player) ctx.player.mireK = 1; }

/** How slow the hero is right now, 0..1 of walking speed (1 = free). For the HUD and the checks. */
export const mireOn = player => player?.mireK ?? 1;

export const web = {
  init(e) { e.spun = 0; e.burnt = false; },
  reset(e) {
    e.spun = ctx.time; e.burnt = false;
    e.selfCollider.active = false;      // you walk into a web, you do not bump into it: the slow is the whole obstacle
  },
  /** Fire burns a web away where a blade has to cut it. */
  onHurt(e, o) {
    if (!(o.fire || o.source === 'burn') || !e.alive) return;
    e.burnt = true; e.hp = 0;
    sparkles.emit(e.center(), { count: 24, color: 0xff9a4a, speed: 2.6, up: e.up, upBias: 0.9, life: 0.7, size: 0.34 });
  },
  animate(e, dt) {
    const d = e.def;
    if (ctx.player && !ctx.indoors && arcDist(ctx.player.up, e.up) < d.radius)
      ctx.player.mireK = Math.min(ctx.player.mireK ?? 1, d.mire);      // the stickiest web the hero stands in wins
    const sag = 1 + Math.sin(ctx.time * 1.1 + e.seed) * 0.03;
    e.sheet.scale.set(1, sag, 1);
    e.sheet.material.opacity = 0.42 + 0.1 * Math.sin(ctx.time * 0.8 + e.seed);
    e.body.scale.setScalar(1 + e.hitPop * 0.1);
    if (d.life > 0 && ctx.time - e.spun > d.life) { e.hp = 0; e.die(); }   // old webs rot away
    e.hitPop = Math.max(0, e.hitPop - dt * 6);
  },
  /** Cut or burnt, it leaves the silk it was made of: the only source of it in the world. */
  onDie(e) {
    const [item, [lo, hi]] = e.def.silk;
    const n = Math.round(mr(lo, hi + 0.49));
    if (n > 0) spawnWorldItem(item, n, e.up);
    sparkles.emit(_p.copy(e.center()), { count: 18, color: e.def.color, speed: 2, up: e.up, upBias: 0.5, life: 0.6, size: 0.3 });
    audio.sparkle();
    if (ctx.player) ctx.player.mireK = 1;
  },
  dispose(e) { if (ctx.player) ctx.player.mireK = 1; },
};
