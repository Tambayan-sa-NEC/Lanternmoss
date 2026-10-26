/* REUSABLE BOSS SIGNATURES (TODO 31b): moves written once and worn by more than one encounter.
   A signature is a factory: call it with the numbers a particular boss wants and it returns a move object in the
   shape the boss framework expects ({ ready?, weight?, begin?, windup?, fire }), ready to drop into a kit's
   `moves`. The move reads its own tuning from `e.def.attacks[id]`, like every other move, so a kit can tune it
   without touching this file.

   THE THORN SIGNATURE. Lanternmoss's own threat, from its thorn seals to the thorns that close a boss arena:
   patches of ground are marked, and a moment later thorns burst out of them. Standing on one when it erupts hurts
   and holds the hero in the briars (`root` seconds, the same "cannot act" timer Old Ironclaw's bell uses), so it
   punishes standing still rather than being unavoidable: the marks are on the ground for the whole wind-up.
   Worn by Gloomcap's rematch (a crown of thorns around itself) and the Hydra's (thorns thrown out along the lake
   shore), and exported for Nyxra on the Lantern Moon (TODO 32), who borrows the five main bosses' signatures.

     def.attacks[id]: { windup, recover, cooldown, reuse?, count, radius, spread, damage, knockback, root,
                        lead? (seconds of the hero's run to aim ahead of), around? (patches ring the boss instead
                        of following the hero) }

   THE DRAGONFIRE SIGNATURE (TODO 31c). Emberfall's own threat: a line of ground is marked across the fight, and
   then it burns. Unlike the thorns it does not strike once and let go - it **stays**, as a wall of fire that keeps
   the ground for `duration` seconds - so it is area denial rather than a hit, and the answer is to move through it
   rather than to stand somewhere else. It is never a cage: one segment of every wall is left unlit, and that gap
   is marked like the rest of the lane for the whole wind-up, so there is always a way through in plain sight.
   Worn by Pyrrhax's rematch twice (a long wall thrown across the arena, and a short one scorched under the hero)
   and by the Basilisk's once (a line of burning venom), and exported for Nyxra with the rest.

     def.attacks[id]: { windup, recover, cooldown, reuse?, segments (how many along the line), spacing (metres
                        between them), radius, damage, tick, duration, lead? (aim ahead of the hero's run),
                        across? (the line runs across the hero's path instead of along it) } */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { addHazard, Blast, Zone } from '../../../../combat/hazards.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { arcDist, dirAlong, offsetDir, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { damp } from '../../../../utils/math.js';
import { mpick, rng } from '../../../../utils/random.js';
import { dryGround } from '../../../../world/terrain.js';
import { keepInArena, predictHero } from './core.js';

const THORN = 0x6a8a3a, TIP = 0xb48cff;
const _line = new THREE.Vector3();

/** Where this volley's thorns will come up: a ring around the boss, or a spread around where the hero is running. */
function thornSpots(e, a) {
  const out = [];
  if (a.around) {
    for (let i = 0; i < a.count; i++) out.push(offsetDir(e.up, (i + 0.5) / a.count * Math.PI * 2, a.spread));
    return out;
  }
  const aim = predictHero(a.lead ?? 0.5);
  out.push(aim.clone());
  for (let i = 1; i < a.count; i++) out.push(offsetDir(aim, rng() * Math.PI * 2, a.spread * (0.5 + 0.5 * rng())));
  return out;
}

/** The hero caught in a thorn patch is held in it for a moment: the same timer the bell's daze uses. */
export function rootHero(seconds) {
  const P = ctx.player;
  if (P.dead || !(seconds > 0)) return false;
  P.petrifyT = Math.max(P.petrifyT ?? 0, seconds); P.vel.set(0, 0, 0);
  sparkles.emit(P.pos.clone().addScaledVector(P.up, 0.4), { count: 14, color: THORN, speed: 1.6, up: P.up, upBias: 0.8, life: 0.7, size: 0.32 });
  return true;
}

/** Builds the thorn move. `id` is the key it lives under in the kit's moves and in def.attacks. */
export function thornSignature(id) {
  return {
    begin(e) {
      const a = e.def.attacks[id];
      e.thornAt = thornSpots(e, a).map(d => keepInArena(e, d));
      if (e.heard) audio.charge();
    },
    windup(e, dt, k) {
      turnToward(e.fwd, e.toP, e.up, damp(3, dt));
      if (k < 0.35 || (e.thornT = (e.thornT ?? 0) - dt) > 0) return;
      e.thornT = 0.08;
      for (const at of e.thornAt ?? []) sparkles.emit(at.clone().multiplyScalar(e.r), { count: 1, color: THORN, speed: 0.5, up: at, upBias: 1.1, life: 0.5, size: 0.26 });
    },
    fire(e) {
      const a = e.def.attacks[id];
      for (const at of e.thornAt ?? []) {
        if (!dryGround(at, 0.6)) continue;
        addHazard(new Blast({ owner: e, team: 'enemy', center: at, radius: a.radius, delay: Math.max(0.25, a.windup * 0.35),
          damage: a.damage, knock: a.knockback, color: THORN, warnColor: TIP, shake: 0.2, sound: 'slam',
          onImpact: b => {
            sparkles.emit(b.point, { count: 18, color: THORN, speed: 2.4, up: b.center, upBias: 1.2, life: 0.8, size: 0.34 });
            if (!ctx.player.dead && arcDist(ctx.player.up, b.center) < a.radius + ctx.player.radius) rootHero(a.root);
          } }));
      }
      e.thornAt = null;
      if (e.heard) audio.growl();
    },
  };
}

const FIRE = 0xff6a2a, EMBER = 0xffb03d;

/** Where this wall's segments will burn: a line through a point, with one segment left out as the way through. */
export function firePath(e, a) {
  const aim = predictHero(a.lead ?? 0.4);
  const along = tangentToward(aim, e.up);                              // the line the hero and the boss share
  const dir = _line.copy(along);
  if (a.across) dir.applyAxisAngle(aim, Math.PI / 2);                  // ...or straight across it
  const half = (a.segments - 1) / 2, gap = 1 + Math.floor(rng() * Math.max(1, a.segments - 2));
  const out = [];
  for (let i = 0; i < a.segments; i++) {
    const spot = dirAlong(aim.clone(), dir, (i - half) * a.spacing);
    out.push({ at: keepInArena(e, spot), lit: i !== gap });            // one segment is the gap: never a cage
  }
  return out;
}

/** Builds the dragonfire move. `id` is the key it lives under in the kit's moves and in def.attacks. */
export function dragonfireSignature(id) {
  return {
    begin(e) {
      const a = e.def.attacks[id];
      e.firePath = firePath(e, a);
      if (e.heard) audio.charge();
    },
    windup(e, dt, k) {
      turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      if (k < 0.2 || (e.fireT = (e.fireT ?? 0) - dt) > 0) return;
      e.fireT = 0.07;
      // every segment is marked, the gap included: the way through is as plain as the wall
      for (const seg of e.firePath ?? []) sparkles.emit(seg.at.clone().multiplyScalar(e.r + 0.2),
        { count: 1, color: seg.lit ? mpick([FIRE, EMBER]) : 0xfff0c0, speed: 0.4, up: seg.at, upBias: 0.8, life: 0.45, size: seg.lit ? 0.3 : 0.2 });
    },
    fire(e) {
      const a = e.def.attacks[id];
      for (const seg of e.firePath ?? []) {
        if (!seg.lit || !dryGround(seg.at, 0.6)) continue;
        addHazard(new Zone({ owner: e, team: 'enemy', center: seg.at, radius: a.radius, duration: a.duration,
          tick: a.tick, damage: a.damage, color: FIRE, rain: 'embers' }));
      }
      e.firePath = null;
      if (e.heard) audio.explode();
    },
  };
}

/** The segments a wall would lay right now, for the checks: how many burn, and that one is always a way through. */
export const firewallOf = (e, id) => firePath(e, e.def.attacks[id]);

