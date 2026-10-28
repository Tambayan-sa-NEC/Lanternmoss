/* SHADELING (ai 'lightbound', TODO 30e): a shape that is only a shadow until your light catches it.
   Out in the dusk it is a flat stain sliding over the ground: you can see it coming and it follows you, but nothing
   can hit it -- and, just as importantly, **it cannot hurt you either**. Only where the ground is lit does it stand
   up solid, and only then does it fight. So an unreadable shadow never lands a blow, and the price of fighting one
   is that you must keep it in the light you are carrying.
   What counts as light is whatever makes light on this world (gameplay/OldRoad.js litAt): the village gap, the
   lantern on your belt, the brazier, and every waylamp and moonwell relit on the Old Road (30d). A road you lit is
   therefore a road you can fight on.
   A **burst** of light sends it fleeing. A burst is light that was not there a moment ago, never light you merely
   walked closer to: OldRoad emits 'lightflare' when a waylamp or a moonwell catches, and when an empty lantern is
   refilled. Fire does the same (`def.fleeFire`: the witch's fireball and meteor carry `fire`, and so does an
   Ember-set burn). Every hero has the first counter, since every hero carries a lantern here. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { emote } from '../../../fx/emotes.js';
import { hitMobs, hurtPlayer } from '../../../combat/damage.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { clamp, damp } from '../../../utils/math.js';
import { turnToward } from '../../../utils/sphere.js';
import { OldRoad } from '../../../gameplay/OldRoad.js';
import { gameEvents } from '../../../core/events.js';
import { arcDist } from '../../../utils/sphere.js';

const _p = new THREE.Vector3();

/** How brightly the ground under this shade is lit right now. */
export const lightOn = e => OldRoad.litAt(e.up);
/** Solid, hittable and dangerous: only in light. */
export const bound = e => !!e.bound;

/** Shadow <-> solid. A shadow is flat on the ground, dark, and untargetable (`hidden`, as a burrowed mole is). */
function setBound(e, on) {
  if (e.bound === on) return;
  e.bound = on; e.hidden = !on; e.shadow.visible = !on; e.selfCollider.active = on;
  e.stain.visible = !on; e.solid.visible = on;
  if (on) {
    sparkles.emit(e.center(), { count: 14, color: e.def.boundColor ?? 0xbfa8ff, speed: 2.2, up: e.up, upBias: 0.6, life: 0.6, size: 0.3 });
    if (e.heard) audio.growl();
  }
  if (!on && e.state === 'windup') { e.state = 'chase'; e.cool = e.def.cooldown; e.hideTele(); }   // the light left it: no blow from a shadow
}

/** Driven out: it breaks off and runs, unable to attack, until the timer is out. */
function flee(e, why) {
  const d = e.def;
  if (e.state === 'flee') { e.timer = Math.max(e.timer, d.fleeTime); return; }
  e.state = 'flee'; e.timer = d.fleeTime; e.cool = d.cooldown; e.hideTele();
  emote(e, '!', '#ffe6a0');
  sparkles.emit(e.center(), { count: 18, color: 0xffe6a0, speed: 3, up: e.up, upBias: 0.8, life: 0.7, size: 0.32 });
  if (e.heard) audio.whoosh();
  e.fledFrom = why;
}

/** A light that has just come on (OldRoad 'lightflare'): every shade standing inside it is driven out. Walking
    closer with the same lantern is not a burst and never fires this. */
gameEvents.addEventListener('lightflare', event => {
  const { dir, radius } = event.detail ?? {};
  if (!dir || !(radius > 0)) return;
  for (const e of ctx.enemies) if (e.alive && e.def.ai === 'lightbound' && arcDist(e.up, dir) <= radius) flee(e, 'light');
});

export const lightbound = {
  init(e) { e.lit = 0; e.bound = false; e.fledFrom = null; },
  reset(e) {
    e.lit = lightOn(e); e.bound = null; e.fledFrom = null;
    setBound(e, e.lit >= e.def.bindAt);
  },
  /** Fleeing overrides every state: it runs from the hero, light or no light. */
  steer(e, dt) {
    if (e.state !== 'flee') return undefined;
    if (e.timer <= 0) { e.state = 'chase'; e.fledFrom = null; return undefined; }
    turnToward(e.fwd, e.move.copy(e.toP).negate(), e.up, damp(e.def.turnRate, dt));
    e.move.copy(e.fwd); return e.def.speed * e.def.fleeSpeed;
  },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
        e.move.copy(e.toP);
        // A shadow may follow, but it may not strike: the wind-up only begins where it is solid.
        if (e.bound && dist < d.range && e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; e.hitPlayer = false; if (e.heard) audio.charge(); return 0; }
        return dist > d.range * 0.7 ? d.speed : 0;
      case 'windup': {
        turnToward(e.fwd, e.toP, e.up, damp(d.windupTurn, dt));
        if (e.timer <= 0) strike(e, dist);
        return 0;
      }
      case 'recover':
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  update(e, dt) {
    const now = lightOn(e);
    e.lit += (now - e.lit) * damp(14, dt);                            // a little smoothing, for the look of it
    setBound(e, now >= e.def.bindAt);
    if (e.burn && e.def.fleeFire && e.state !== 'flee') flee(e, 'fire');
  },
  /** A hit that carries fire drives it off, whichever hero landed it (damage.js passes the option through). */
  onHurt(e, o) { if (e.def.fleeFire && (o.fire || o.source === 'burn')) flee(e, 'fire'); },
  animate(e) {
    const t = ctx.time, lift = e.bound ? 1 : 0;
    e.wisps.forEach((w, i) => { w.position.y = 0.5 + Math.sin(t * 2.4 + i * 1.7 + e.seed) * 0.12; w.rotation.y = t * (0.8 + i * 0.3); });
    e.solid.scale.setScalar((1 + e.hitPop * 0.16) * (0.85 + 0.15 * lift));
    e.solid.position.y = e.state === 'windup' ? 0.18 : 0;
    e.eyes.forEach(eye => { eye.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 1.3 + e.seed)); });
    e.stain.rotation.y = t * 0.5;
    e.stain.scale.setScalar(1 + Math.sin(t * 2 + e.seed) * 0.08);
  },
  onDie(e) {
    sparkles.emit(e.center(), { count: 34, color: 0x2a2140, speed: 2.8, up: e.up, upBias: 0.5, life: 0.9, size: 0.38 });
    sparkles.emit(e.center(), { count: 12, color: e.def.boundColor ?? 0xbfa8ff, speed: 3.4, up: e.up, upBias: 1, life: 0.8, size: 0.3 });
    audio.sparkle();
  },
};

function strike(e, dist) {
  const d = e.def, P = ctx.player;
  e.state = 'recover'; e.timer = d.recover; e.cool = d.cooldown; e.hideTele();
  sparkles.emit(_p.copy(e.pos).addScaledVector(e.fwd, 0.6).addScaledVector(e.up, 0.7),
    { count: 12, color: 0x2a2140, speed: 2.4, up: e.up, upBias: 0.4, life: 0.4, size: 0.3 });
  if (e.heard) audio.whoosh();
  if (!e.bound) return;                                               // the light went out mid-swing: a shadow lands nothing
  if (!P.dead && dist < d.range + P.radius) hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
  hitMobs(e, e.pos, d.range, d.damage, { knock: d.knockback });        // TODO 45b
}

/** 0..1 of how lit this shade is, for the checks. */
export const shadeLight = e => clamp(e.lit ?? 0, 0, 1);
