/* ANCHOR STRAND (ai 'anchor', TODO 30g): one of the three cables holding Grandmother Gloomweaver up in her canopy.
   An object, not a monster (COMBAT.enemies.gloomAnchor, object: true, static: true): no bestiary page, no drops, no
   coins, no kill counted, and you walk straight through it.
   **It cannot be cut, only burnt.** A blade glances off a cable this thick (`refuses`), so there are exactly two
   ways to take one down, and every hero has one of them:
     a lit belt lantern   held within `def.reach`, it chars through over `def.burnTime` seconds. Every hero carries
                          one, and an empty lantern will not do it, so the oil you have been keeping matters here.
     a hit carrying fire  the witch's Fireball or Meteor, or an Ember-set burn: one touch and the strand is gone.
   The grandmother watches her own anchors (behaviors/boss/grandweaver.js); this module only burns them. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { arcDist } from '../../../utils/sphere.js';
import { clamp } from '../../../utils/math.js';
import { activeLantern } from '../../../world/mechanics/lantern.js';

const EMBER = 0xff9a4a, _p = new THREE.Vector3();

/** How far through this strand the fire has eaten, 0..1. For the kit, the HUD and the checks. */
export const charOf = e => clamp(e.char ?? 0, 0, 1);
/** Is the hero holding a lit lantern close enough to be burning this strand right now? */
export function burning(e) {
  const lamp = activeLantern(), P = ctx.player;
  return !!lamp?.status.lit && !!P && !ctx.indoors && !P.dead && arcDist(P.up, e.up) <= e.def.reach;
}

export const anchor = {
  init(e) { e.char = 0; },
  reset(e) { e.char = 0; e.selfCollider.active = false; },      // you walk through a strand, you do not bump into it
  /** A blade only frays it: nothing but fire takes a cable this thick. */
  refuses(e, o) { return !(o?.fire || o?.source === 'burn'); },
  /** Fire takes a whole strand at once, wherever it came from. */
  onHurt(e, o) {
    if (!(o?.fire || o?.source === 'burn') || !e.alive) return;
    e.char = 1; e.burnt = true; e.hp = 0; e.die();
  },
  animate(e, dt) {
    const d = e.def;
    if (e.alive && burning(e)) {
      e.char = clamp(e.char + dt / d.burnTime, 0, 1);
      if ((e.sparkT = (e.sparkT ?? 0) - dt) <= 0) {
        e.sparkT = 0.09;
        sparkles.emit(_p.copy(e.up).multiplyScalar(e.r + 0.6 + e.char * d.height * 0.8),
          { count: 1, color: EMBER, speed: 0.8, up: e.up, upBias: 1.4, life: 0.5, size: 0.28 });
      }
      if (e.char >= 1) { e.hp = 0; e.die(); return; }
    }
    e.strand.scale.y = 1 - e.char * 0.9;                        // it shrinks back up the stalk as it chars
    e.ember.visible = e.char > 0;
    e.ember.position.y = d.height * (1 - e.char);
    e.ember.scale.setScalar(0.7 + 0.5 * Math.sin(ctx.time * 9 + e.seed) * (e.char > 0 ? 1 : 0));
    e.body.scale.setScalar(1 + e.hitPop * 0.08);
    e.hitPop = Math.max(0, e.hitPop - dt * 6);
  },
  onDie(e) {
    sparkles.emit(_p.copy(e.up).multiplyScalar(e.r + e.def.height * 0.5),
      { count: 22, color: EMBER, speed: 2.4, up: e.up, upBias: 1.1, life: 0.8, size: 0.34 });
    audio.sparkle();
  },
};
