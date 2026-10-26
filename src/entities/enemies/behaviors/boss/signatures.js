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
                        of following the hero) } */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { addHazard, Blast } from '../../../../combat/hazards.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { arcDist, offsetDir, turnToward } from '../../../../utils/sphere.js';
import { damp } from '../../../../utils/math.js';
import { rng } from '../../../../utils/random.js';
import { dryGround } from '../../../../world/terrain.js';
import { keepInArena, predictHero } from './core.js';

const THORN = 0x6a8a3a, TIP = 0xb48cff;

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
