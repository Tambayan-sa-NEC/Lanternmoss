/* BOSS: Umbra, the Moth of the Last Light (COMBAT.enemies.umbra), Duskhollow's boss. One rule drives the whole
   fight: **she dives at the brightest light there is**, and on this world the brightest light is usually the one on
   your own belt.
     the bait   `lanterns.count` tall arena lanterns stand round the lair. Press E beside one with a lit belt
                lantern and it catches, for a little oil (behaviors/arenaLamp.js). A lit arena lantern is brighter
                than yours, so it is what she comes for.
     the crash  a dive into a lit lantern ends with her in the ground: `crash.stun` seconds stunned and open to
                everything, which is the damage window. A dive with nothing lit comes at the hero instead, and only
                hurts - so the fight is about keeping something brighter than yourself burning.
     the snuff  her wingbeat (gust) puts every arena lantern out and takes `snuff.oil` from your tank. In the dark
                that leaves, shadelings come out of the hollows (up to `snuff.maxShades`), and a snuffed lantern
                needs a moment before it can be lit again.
     drinking   from 50% she drinks light: each feed drains one arena lantern **for good**, leaving one usable bait
                lantern so the crash counter remains possible. The scales she sheds press the hero's light in
                (`feed.fog` seconds at `feed.blind`).
   Arena ring: pale moonfire (ARENA_WALLS.moonfire). Trophy: the Dusk Crown.
   Nothing here can leave the hero unable to act: an empty lantern still lights nothing, but she is still beatable -
   a crashed moth is crashed whether or not you can see her, and the ring keeps her in with you. */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { addEnemy } from '../../../../combat/spawning.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { Projectile } from '../../../Projectile.js';
import { ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { clamp, damp } from '../../../../utils/math.js';
import { mr, rng } from '../../../../utils/random.js';
import { arcDist, dirAlong, offsetDir, projectTangent, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { dryGround, groundHeight } from '../../../../world/terrain.js';
import { freeOfColliders } from '../../../../physics/colliders.js';
import { activeLantern } from '../../../../world/mechanics/lantern.js';
import { drain, isLit, snuff } from '../arenaLamp.js';
import { layLane, makeDots } from '../telegraphs.js';
import { defineBoss, finish, keepInArena, roar } from './core.js';

const MOTH = 0xe8e0ff, _p = new THREE.Vector3(), _d = new THREE.Vector3(), _aim = new THREE.Vector3();
const A = (e, id) => e.def.attacks[id];

/** Her arena lanterns that are still standing. */
export const lampsOf = e => (e.lamps = (e.lamps ?? []).filter(l => l.alive));
/** The ones burning right now: what she comes for instead of the hero. */
export const litLamps = e => lampsOf(e).filter(isLit);
/** Crashed in the ground, stunned and open. */
export const isCrashed = e => (e.crashT ?? 0) > 0;

/** The brightest light in the arena: a burning arena lantern if there is one, else the hero's own belt lantern. */
export function brightest(e) {
  const lit = litLamps(e);
  if (lit.length) {
    let best = lit[0];
    for (const l of lit) if (arcDist(l.up, e.up) < arcDist(best.up, e.up)) best = l;
    return { at: best.up, lamp: best };
  }
  const lamp = activeLantern();
  return { at: ctx.player.up, lamp: null, hero: true, dim: !lamp?.status.lit };
}

/** Puts her lanterns up around the lair, once, when the fight begins. */
function raiseLamps(e) {
  const L = e.def.lanterns;
  for (const l of lampsOf(e)) l.vanish?.();
  e.lamps = [];
  for (let i = 0; i < L.count; i++) {
    const turn = (i + 0.5) / L.count * Math.PI * 2;
    let at = null;
    for (const r of [L.at, L.at * 0.85, L.at * 1.15]) {
      const d = offsetDir(e.home, turn, r);
      if (dryGround(d, 1.2) && freeOfColliders(d, 1)) { at = d; break; }
    }
    const lamp = addEnemy(L.type, at ?? offsetDir(e.home, turn, L.at));
    lamp.boss = e; e.lamps.push(lamp);
  }
  return e.lamps;
}

/** The wingbeat: every arena lantern out, oil out of the tank, and shadelings out of the dark. */
function snuffAll(e) {
  const S = e.def.snuff;
  let out = 0;
  for (const l of lampsOf(e)) if (snuff(l)) out++;
  const took = activeLantern()?.burn(S.oil) ?? 0;
  e.shades = (e.shades ?? []).filter(s => s.alive);
  for (let i = e.shades.length; i < Math.min(S.maxShades, e.shades.length + S.shades); i++) {
    const d = offsetDir(e.home, rng() * 6.28, mr(7, 13));
    if (!dryGround(d, 1)) continue;
    e.shades.push(addEnemy(S.type, d));
  }
  if (out || took) toast('Umbra beats her wings: the lights go out.');
  return { out, took };
}

/** Her moveset, named so the checks can start one the way the framework does (startMove below). */
const MOVES = {
  /** The dive: at the nearest burning arena lantern, or at the hero when nothing is lit. */
    dive: {
      ready: e => !isCrashed(e),
      // A lit bait is the player's deliberate counter: she answers it with the dive before snuffing it.
      weight: e => litLamps(e).length ? 3 : 1,
      begin(e) {
        const target = brightest(e);
        e.diveAt = target.lamp ?? null;
        e.diveTo = target.at.clone();
        e.diveFrom.copy(e.up);
        emote(e, '!', target.lamp ? '#ffd36b' : '#ff4d6d');
        if (e.heard) audio.charge();
      },
      windup(e, dt, k) {
        const to = e.diveTo ?? ctx.player.up;
        if (k < 0.65) { e.diveTo = (e.diveAt ? e.diveAt.up : ctx.player.up).clone(); e.diveFrom.copy(e.up); }
        e.diveDir.copy(tangentToward(e.diveFrom, to));
        layLane(e.lane, e.diveFrom, e.diveDir, arcDist(e.diveFrom, to) + 2, A(e, 'dive').width, 0.2 + 0.6 * k);
      },
      fire(e) {
        const a = A(e, 'dive'), to = e.diveTo ?? ctx.player.up;
        e.hideTele();
        e.up.copy(to); e.r = groundHeight(e.up); e.pos.copy(e.up).multiplyScalar(e.r + e.hover);
        shakeCamera(0.5); if (e.heard) audio.whoosh();
        if (e.diveAt && isLit(e.diveAt)) {                               // into the lantern: she crashes
          crash(e, e.diveAt);
          return;
        }
        // nothing brighter than the hero: the dive comes at them, and only hurts
        if (!ctx.player.dead && arcDist(e.up, ctx.player.up) < a.width + ctx.player.radius)
          hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
        sparkles.emit(e.center(), { count: 22, color: MOTH, speed: 3, up: e.up, upBias: 0.4, life: 0.7, size: 0.36 });
      },
    },
    /** The wingbeat: a ring of wind that puts every light out and calls shadelings from the dark. */
    gust: {
      ready: e => !isCrashed(e) && !litLamps(e).length,
      windup(e, dt, k) {
        e.tele.visible = true; e.tele.position.copy(e.up).multiplyScalar(groundHeight(e.up) + 0.06);
        e.tele.scale.setScalar(A(e, 'gust').radius * (0.4 + 0.6 * k)); e.tele.material.opacity = 0.2 + 0.5 * k;
      },
      fire(e) {
        const a = A(e, 'gust');
        e.hideTele(); ringFX(e.pos, a.radius, MOTH, 0.7); shakeCamera(0.45);
        if (!ctx.player.dead && arcDist(e.up, ctx.player.up) < a.radius + ctx.player.radius)
          hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
        snuffAll(e);
        if (e.heard) audio.nova();
      },
    },
    /** A fan of blinding scales. */
    scales: {
      ready: e => !isCrashed(e) && !litLamps(e).length,
      fire(e) {
        const a = A(e, 'scales');
        for (let i = 0; i < a.count; i++) {
          const spread = THREE.MathUtils.degToRad(a.spread), turn = a.count > 1 ? -spread / 2 + spread * i / (a.count - 1) : 0;
          _d.copy(e.fwd).applyAxisAngle(e.up, turn);
          ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir: _d.clone(), alt: 2.2, speed: a.speed,
            range: 20, radius: 0.4, size: 0.3, color: MOTH, homing: a.homing,
            homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
            onHit: (p, hit) => {
              sparkles.emit(p.pos, { count: 12, color: MOTH, speed: 2, life: 0.5, size: 0.3 });
              if (hit === ctx.player) hurtPlayer(a.damage, p.pos, 0, { source: e });
            } }));
        }
        if (e.heard) audio.wispShot();
      },
    },
    /** From 50%: she drinks a lantern dry and sheds the scales that blind you. */
    drink: {
      ready: e => !isCrashed(e) && e.bossPhase >= 1,
      weight: e => (litLamps(e).length ? 1.5 : 1),
      windup(e, dt, k) {
        e.body.scale.setScalar(1 + 0.12 * k);
        if (k > 0.5 && (e.drinkT = (e.drinkT ?? 0) - dt) <= 0) {
          e.drinkT = 0.06;
          sparkles.emit(e.center(), { count: 2, color: MOTH, speed: 1.2, up: e.up, upBias: -0.6, life: 0.6, size: 0.3 });
        }
      },
      fire(e) {
        const F = e.def.feed;
        e.body.scale.setScalar(1);
        // Preserve one bait lantern: the fight's crash window must remain reachable after repeated feeds.
        const available = lampsOf(e).filter(l => !l.drained);
        const lit = litLamps(e), victim = available.length > 1 ? (lit[0] ?? available[0]) : null;
        for (let i = 0; i < F.drains && victim; i++) { drain(victim); e.drank++; break; }
        e.fogT = F.fog;
        toast(victim ? 'Umbra drinks a lantern dry: the ring is darker now.' : 'Umbra drinks the dark itself.');
        ringFX(e.pos, 6, 0x2f2746, 0.7); if (e.heard) audio.roar();
      },
    },
};

export const umbra = defineBoss({
  init(e) {
    e.lamps = []; e.shades = []; e.crashT = 0; e.fogT = 0; e.drank = 0;
    e.lane = makeDots(e, 10, MOTH);
    e.diveFrom = new THREE.Vector3(); e.diveDir = new THREE.Vector3(); e.diveAt = null;
  },
  reset(e) {
    for (const l of e.lamps ?? []) l.vanish?.();
    for (const s of e.shades ?? []) if (s.alive) s.vanish();
    e.lamps = []; e.shades = []; e.crashT = 0; e.fogT = 0; e.drank = 0; e.diveAt = null;
    if (ctx.player) ctx.player.blindK = 1;
  },
  intro(e) { toast('Light a lantern in the ring: she dives at the brightest light she can find.'); },

  /** She circles her lair, keeping her height; crashed, she lies where she fell. */
  approach(e, dt, dist, phase) {
    if (isCrashed(e)) return 0;
    turnToward(e.fwd, e.toP, e.up, damp(e.def.turnRate, dt));
    e.move.copy(e.toP);
    return dist > 7 ? e.def.speed * phase.speedMul : e.def.speed * 0.4 * phase.speedMul;
  },
  recovering(e, dt) { return isCrashed(e) ? 0 : (turnToward(e.fwd, e.toP, e.up, damp(2, dt)), 0); },
  fallback(e) { return 'dive'; },
  moves: MOVES,

  /** Crashed, every blow lands and lands harder; in the air she is still perfectly hittable, just hard to reach. */
  damageScale(e) { return isCrashed(e) ? 1 + (e.def.stunnedDamageBonus ?? 0) : 1; },

  update(e, dt) {
    const F = e.def.feed;
    // her lanterns go up the moment she wakes, not while she sleeps in a sealed lair
    if (!lampsOf(e).length && !e.dormant && e.alive) raiseLamps(e);
    if (isCrashed(e)) {
      e.crashT -= dt;
      e.hover = Math.max(0, e.hover - dt * 8);
      if (e.crashT <= 0) { e.hover = e.def.hover; e.state = 'chase'; e.cool = 0.6; roar(e, false); }
    } else if (e.state !== 'windup' || e.attack !== 'dive') {
      e.hover += (e.def.hover - e.hover) * damp(3, dt);
    }
    // the fog of scales: it follows the hero and presses their own light in (world/mechanics/lanternView.js)
    e.fogT = Math.max(0, (e.fogT ?? 0) - dt);
    if (ctx.player) ctx.player.blindK = e.fogT > 0 ? F.blind : 1;
    if (e.fogT > 0 && ctx.player && (e.fogSparkT = (e.fogSparkT ?? 0) - dt) <= 0) {
      e.fogSparkT = 0.08;
      sparkles.emit(_p.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1.2),
        { count: 2, color: 0x6a608f, speed: 0.5, up: ctx.player.up, upBias: 0.4, life: 0.9, size: 0.34 });
    }
    e.shades = (e.shades ?? []).filter(s => s.alive);
  },

  animate(e, dt) {
    const t = ctx.time, crashed = isCrashed(e);
    e.body.scale.setScalar(1 + e.hitPop * 0.1);
    e.body.rotation.x = crashed ? 0.5 : e.state === 'windup' && e.attack === 'dive' ? -0.4 : 0;
    const beat = crashed ? 0.08 : 1;
    e.wings.forEach((w, i) => {
      const side = i % 2 ? 1 : -1;
      w.rotation.z = side * (0.25 + beat * 0.55 * Math.sin(t * (crashed ? 2 : 7) + i));
      w.rotation.y = side * 0.12 * Math.sin(t * 2 + i);
    });
    e.antennae.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (0.5 + 0.12 * Math.sin(t * 1.6 + i)); });
    e.eyes.forEach(eye => { eye.scale.setScalar(crashed ? 0.6 : 0.9 + 0.1 * Math.sin(t * 1.3)); });
  },

  cancel(e) { e.hideTele(); },
  onDie(e) {
    for (const l of lampsOf(e)) l.vanish?.();
    for (const s of e.shades ?? []) if (s.alive) s.vanish();
    e.lamps = []; e.shades = []; e.crashT = 0; e.fogT = 0; e.hover = 0;
    if (ctx.player) ctx.player.blindK = 1;
  },
  dispose(e) {
    for (const l of e.lamps ?? []) l.vanish?.();
    e.lamps = []; if (ctx.player) ctx.player.blindK = 1;
  },
});

/** Into the lantern she goes: the light bursts, and she is in the ground and open. */
function crash(e, lamp) {
  const c = e.def.crash;
  snuff(lamp);
  e.crashT = c.stun; e.state = 'recover'; e.timer = c.stun; e.cool = c.stun + 0.4;
  e.hideTele();
  ringFX(e.pos, c.radius, 0xffd36b, 0.8); shakeCamera(0.7); audio.roar();
  sparkles.emit(e.center(), { count: 40, color: 0xffd36b, speed: 3.4, up: e.up, upBias: 0.5, life: 1, size: 0.42 });
  toast('Umbra crashes into the lantern! Hit her while she is down.');
  if (!ctx.player.dead && arcDist(e.up, ctx.player.up) < c.radius + ctx.player.radius)
    hurtPlayer(c.damage, e.pos, c.knockback, { source: e });
}

/** Starts one of her moves now, exactly as the framework does (begin, then the wind-up): the checks drive the fight
    through this rather than reaching into the state machine, so what they exercise is what plays. */
export function startMove(e, id) {
  const a = e.def.attacks[id]; if (!a) return false;
  e.attack = e.lastAttack = id; e.state = 'windup';
  e.windupTime = e.timer = a.windup;
  MOVES[id].begin?.(e, arcDist(e.up, ctx.player.up));
  return true;
}
