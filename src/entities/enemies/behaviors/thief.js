/* SNUFFER (ai 'thief', TODO 30f): a little hooded thief that wants what is in your lantern. It darts in, takes
   `def.steal.oil` out of the tank (the lantern mechanic's own burn(), so the Oil bar and its saved value move
   together), and runs off with it, quicker than it came (`speedUp`) for `escape` seconds.
   **Catch it and you get it back with interest**: a snuffer carrying oil pours `oil * interest` into the lantern
   when it goes down, so chasing one down is always worth more than the oil it took. It can be robbed again and
   again, and each theft is only as big as the tank still holds -- an empty lantern has nothing to steal, so a
   snuffer can never leave the hero worse off than empty.
   It barely fights: its touch costs a little, and everything else about it is the chase. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { toast } from '../../../ui/toast.js';
import { damp } from '../../../utils/math.js';
import { turnToward } from '../../../utils/sphere.js';
import { activeLantern } from '../../../world/mechanics/lantern.js';

const OIL = 0xffc06a, _p = new THREE.Vector3();

/** What this snuffer is carrying, for the checks and for what it gives back. */
export const carried = e => e.stolen ?? 0;

export const thief = {
  init(e) { e.stolen = 0; e.fleeT = 0; },
  reset(e) { e.stolen = 0; e.fleeT = 0; },
  /** Running off with the loot overrides every state: it does not stop to fight. */
  steer(e, dt) {
    if ((e.fleeT -= dt) <= 0) return undefined;
    turnToward(e.fwd, e.move.copy(e.toP).negate(), e.up, damp(e.def.turnRate, dt));
    e.move.copy(e.fwd);
    if (ctx.time % 0.3 < dt) sparkles.emit(e.center(), { count: 1, color: OIL, speed: 0.6, up: e.up, upBias: 1.2, life: 0.6, size: 0.26 });
    return e.def.speed * e.def.steal.speedUp;
  },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
        e.move.copy(e.toP);
        if (dist < d.range && e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; if (e.heard) audio.charge(); return 0; }
        return dist > d.range * 0.7 ? d.speed : 0;
      case 'windup':
        turnToward(e.fwd, e.toP, e.up, damp(d.windupTurn, dt));
        if (e.timer <= 0) snatch(e, dist);
        return 0;
      case 'recover':
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  animate(e, dt) {
    const t = ctx.time, s = Math.abs(e.speed);
    e.body.scale.setScalar(1 + e.hitPop * 0.14);
    e.body.rotation.x = e.state === 'windup' ? -0.3 : e.fleeT > 0 ? 0.25 : 0;
    e.hood.rotation.z = Math.sin(t * 2.2 + e.seed) * 0.08;
    e.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.phase * 2.2 + i * Math.PI) * Math.min(0.9, 0.2 + s / 5); });
    e.flask.visible = e.stolen > 0;
    e.flask.scale.setScalar(e.stolen > 0 ? 1 : 0.001);
    e.flask.position.y = 0.42 + Math.sin(t * 4 + e.seed) * 0.03;
  },
  /** Beaten while carrying: the lantern gets its oil back, and more than it lost. */
  onDie(e) {
    const taken = e.stolen; e.stolen = 0;
    sparkles.emit(e.center(), { count: 20, color: e.def.capColor, speed: 2.2, up: e.up, upBias: 0.6, life: 0.7, size: 0.3 });
    if (taken <= 0) return;
    const back = activeLantern()?.refill(taken * e.def.steal.interest) ?? 0;
    if (back > 0) { toast(`The snuffer's flask bursts: +${Math.round(back)} oil.`); audio.sparkle(); }
  },
};

/** The theft itself: only ever as much as the tank actually holds. */
function snatch(e, dist) {
  const d = e.def, P = ctx.player, lamp = activeLantern();
  e.state = 'recover'; e.timer = d.recover; e.cool = d.cooldown; e.hideTele();
  if (e.heard) audio.whoosh();
  if (P.dead || dist > d.range + P.radius) return;
  hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
  const took = lamp?.burn(d.steal.oil) ?? 0;
  if (took <= 0) return;                                              // nothing in the tank: nothing to run off with
  e.stolen += took; e.fleeT = d.steal.escape;
  emote(e, '!', '#ffc06a');
  sparkles.emit(_p.copy(P.pos).addScaledVector(P.up, 1), { count: 16, color: OIL, speed: 2.4, up: P.up, upBias: 0.6, life: 0.7, size: 0.3 });
  toast(`A snuffer makes off with ${Math.round(took)} oil!`);
}
