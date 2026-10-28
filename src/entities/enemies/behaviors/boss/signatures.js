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
                        across? (the line runs across the hero's path instead of along it) }

   THE DOOM BLADE SIGNATURE (TODO 31d). Frostveil's own threat, and the one Malgrath has always carried: the killing
   blow. A huge circle is marked and pulses while the blade is raised, filling up as the blow nears; anyone still
   inside when it falls **dies outright** (armor and Guard do not help, only leaving the circle or a dodge's
   i-frames). The whole of it is the wind-up, which is why it is fair: the circle is on the ground from the first
   frame, the blow lands where the circle is, and the blade stays buried afterwards for a long punish window.
   `commit` is the fraction of the wind-up it keeps aiming for; after that the circle is fixed and running out of
   it is the only answer. `onHero` moves the circle onto the hero instead of planting it in front of the boss, so
   it hunts you while it aims rather than being sidestepped.
   Worn by Malgrath three times - the campaign's `doom` in front of him, and his rematch's `reckoning` (grounded,
   hunting) and `eclipse` (dropped from the air in the ascended phase) - and exported for Nyxra with the rest.
   The wearer needs nothing of its own: the signature makes and owns its decals the first time it runs.

     def.attacks[id]: { windup, recover, cooldown, reuse?, maxRange (how far off it can start), radius, damage,
                        lethal, reach? (how far in front of the boss the circle is planted), commit? (0..1 of the
                        wind-up spent aiming, default 0.45), onHero? (the circle sits on the hero while it aims) }

   THE FALSE LURE SIGNATURE (TODO 31e). Tidewhisper's own threat, and Mirelure's: a light that is not what it
   seems. A ring of decoy lanterns is lit at once, every one of them false, each marked on the ground with the circle
   it will burst over. Left alone they all burst when the wind-up ends and sting anyone inside; but they are real
   objects, so a blow pops one early, which makes a ranged hero's answer different from a melee hero's (pop it from
   outside the circle, or simply keep out of it). The ring is laid so the way out is always open: the lamps are
   spaced further apart than two of their own circles are wide, and the middle of a ring around the hero is safe
   ground, so it punishes running blindly rather than standing still. `around` rings the boss instead of the hero.
   Worn by Mirelure's rematch twice (`decoys` around the hero while she is under, `glare` around herself once she is
   up) and exported for Nyxra with the rest.
   The lamps are the `falseLure` object (COMBAT.enemies.falseLure, behaviour below); the signature makes and owns the
   ground marks the first time it runs, and puts out any lamp still lit if the fight is cancelled.

     def.attacks[id]: { windup, recover, cooldown, reuse?, count, spread (metres from the centre to each lamp),
                        radius (its burst), damage, knockback, around? (ring the boss, not the hero) } */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { playerInArea } from '../../../../combat/area.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { addHazard, Blast, Zone } from '../../../../combat/hazards.js';
import { groundPoint, hitStop, ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { arcDist, dirAlong, offsetDir, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { damp } from '../../../../utils/math.js';
import { mpick, rng } from '../../../../utils/random.js';
import { dryGround, waterAt } from '../../../../world/terrain.js';
import { bossDecal, keepInArena, predictHero, shortName } from './core.js';

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


const WARN = 0xff4d6d, DOOM = 0xff1a3a;

/** The circle this move owns: made the first time it runs, so any boss can wear the signature as it is. */
function doomTele(e, id) {
  return (e.doomTele ??= {})[id] ??= {
    disc: bossDecal(e, 'disc', WARN, { k: 0.9 }),
    edge: bossDecal(e, 'ring', DOOM, { k: 1.9, lift: 0.14 }),
    fill: bossDecal(e, 'disc', DOOM, { k: 1.1, lift: 0.16 }),
    at: new THREE.Vector3(),
  };
}

/** Builds the Doom Blade move. `id` is the key it lives under in the kit's moves and in def.attacks. */
export function doomSignature(id) {
  return {
    ready: (e, dist) => dist <= e.def.attacks[id].maxRange,
    weight: e => (e.hp / e.def.hp < 0.9 ? 2 : 0.4),
    begin(e) {
      const t = doomTele(e, id);
      t.at.copy(e.def.attacks[id].onHero && !ctx.player.dead ? ctx.player.up : dirAlong(e.up, e.fwd, e.def.attacks[id].reach ?? 2.5));
      audio.doomCharge(); emote(e, '!', '#ff1a3a');
      if (!e.doomWarned) { e.doomWarned = true; toast(`${shortName(e)} raises the Doom Blade! Get out of the circle!`); }
    },
    windup(e, dt, k) {
      const a = e.def.attacks[id], t = doomTele(e, id);
      if (k < (a.commit ?? 0.45)) {                                    // aims, then commits: after this it is fixed
        turnToward(e.fwd, e.toP, e.up, damp(3, dt));
        t.at.copy(a.onHero && !ctx.player.dead ? ctx.player.up : dirAlong(e.up, e.fwd, a.reach ?? 2.5));
      }
      const pulse = Math.abs(Math.sin(ctx.time * (5 + 12 * k)));
      t.disc.place(t.at, e.fwd, a.radius).opacity = 0.16 + 0.3 * k;
      t.edge.place(t.at, e.fwd, a.radius).opacity = 0.5 + 0.5 * pulse;
      t.fill.place(t.at, e.fwd, Math.max(0.1, a.radius * k)).opacity = 0.2 + 0.25 * k;   // fills up as the blow nears
      if (e.sword && rng() < dt * 40) sparkles.emit(e.sword.getWorldPosition(_line), { count: 2, color: DOOM, speed: 1.5, up: e.up, upBias: 1, life: 0.5, size: 0.55 });
      if (k > 0.5 && playerInArea(t.at, a.radius)) shakeCamera(0.06 + 0.1 * k);          // the ground trembles under you
    },
    fire(e) {
      const a = e.def.attacks[id], t = doomTele(e, id), c = groundPoint(t.at, 0);
      ringFX(c, a.radius, DOOM, 0.7); ringFX(c, a.radius * 0.6, 0xffffff, 0.45); ringFX(c, a.radius * 1.4, 0x3a0a14, 0.9);
      sparkles.emit(groundPoint(t.at, 0.5), { count: 80, color: DOOM, speed: 6, up: t.at, upBias: 0.8, life: 1.1, size: 0.6 });
      sparkles.emit(groundPoint(t.at, 0.5), { count: 40, color: 0xffe0e8, speed: 4, up: t.at, upBias: 1.2, life: 0.8, size: 0.5 });
      shakeCamera(0.9); hitStop(0.12); audio.doomSlam();
      if (playerInArea(t.at, a.radius)) hurtPlayer(a.damage, c, 16, { lethal: a.lethal !== false, source: e });
    },
  };
}

/** Where a Doom Blade circle is right now, for the checks: the ground that kills, while it is still only marked. */
export const doomCircleOf = (e, id) => (e.doomTele?.[id] ? { at: e.doomTele[id].at.clone(), radius: e.def.attacks[id].radius } : null);


const LAMP = 0xffd36b, FOAM = 0xe8fbff;
let lureHint = false;

/** Where this ring's lamps will be lit: evenly round the hero (or the boss), turned to a random angle. */
export function lureSpots(e, a) {
  const centre = a.around || ctx.player.dead ? e.up : ctx.player.up, turn = rng() * Math.PI * 2, out = [];
  for (let i = 0; i < a.count; i++) out.push(keepInArena(e, offsetDir(centre, turn + i / a.count * Math.PI * 2, a.spread)));
  return out;
}

/** The ground marks this move owns, one disc and one rim per lamp: made the first time it runs. */
function lureTele(e, id, count) {
  const marks = (e.lureTele ??= {})[id] ??= [];
  while (marks.length < count) marks.push({ disc: bossDecal(e, 'disc', LAMP, { k: 0.8, surface: true }), edge: bossDecal(e, 'ring', LAMP, { k: 1.7, lift: 0.14, surface: true }) });   // over water they sit on the water, so the whole circle can be read
  return marks;
}

/** A lamp bursts: a stinging flash over the circle it was marked with, to whoever is still inside it. */
function lampBurst(boss, lamp, a) {
  const level = waterAt(lamp.up)?.level ?? null;
  ringFX(lamp.pos, a.radius, LAMP, 0.5, level); ringFX(lamp.pos, a.radius * 0.55, FOAM, 0.35, level);
  sparkles.emit(lamp.center(), { count: 36, color: LAMP, speed: 4, up: lamp.up, upBias: 0.8, life: 0.7, size: 0.42 });
  audio.explode();
  if (playerInArea(lamp.up, a.radius)) hurtPlayer(a.damage, lamp.pos, a.knockback, { source: boss });
}

/** The decoy lantern: bobs on the water, flickers faster the nearer it is to bursting, and bursts if it is struck. */
export const falseLure = {
  animate(e) {
    if (e.alive && !e.owner?.alive) { e.vanish(); return; }          // its boss is gone (a rematch called off): so is the light
    const w = waterAt(e.up); e.hover = (w ? w.level - e.r : 0) - 0.15 + Math.sin(ctx.time * 1.8 + e.seed) * 0.08;
    const k = e.lureK ?? 0, beat = Math.abs(Math.sin(ctx.time * (5 + 14 * k)));
    e.lamp.scale.setScalar(1.1 - 0.6 * beat * (0.4 + 0.6 * k) + e.hitPop * 0.3);
    e.body.rotation.z = Math.sin(ctx.time * 1.3 + e.seed) * 0.12;
  },
  onDie(e) {
    const boss = e.owner, a = boss?.def.attacks[e.lureId];
    if (boss?.alive && a) lampBurst(boss, e, a);                    // popped early: it goes off where it floats
  },
};

/** Builds the false lure move. `id` is the key it lives under in the kit's moves and in def.attacks. */
export function falseLureSignature(id) {
  const putOut = e => { for (const l of e.decoys ?? []) if (l.alive) l.vanish(); e.decoys = []; };
  return {
    begin(e) {
      const a = e.def.attacks[id];
      putOut(e);                                                       // never two rings at once, whatever interrupted the last
      e.decoys = lureSpots(e, a).map((d, i) => { const l = e.spawnMinion('falseLure', d); l.lureId = id; l.lureSlot = i; l.lureK = 0; return l; });
      for (const l of e.decoys) sparkles.emit(l.center(), { count: 12, color: LAMP, speed: 1.6, up: l.up, upBias: 1.2, life: 0.8, size: 0.34 });
      audio.sparkle();
      if (!lureHint) { lureHint = true; toast('More lantern lights... every one of these is false. Keep out of their circles, or pop them from afar.'); }
    },
    windup(e, dt, k) {
      const a = e.def.attacks[id], lamps = (e.decoys ?? []).filter(l => l.alive), marks = lureTele(e, id, a.count);
      turnToward(e.fwd, e.toP, e.up, damp(3, dt));
      marks.forEach((m, i) => {
        const l = lamps.find(x => x.lureSlot === i);
        if (!l) { m.disc.hide(); m.edge.hide(); return; }             // a popped lamp takes its circle with it
        l.lureK = k;
        m.disc.place(l.up, null, a.radius).opacity = 0.14 + 0.26 * k;
        m.edge.place(l.up, null, a.radius).opacity = 0.5 + 0.5 * Math.abs(Math.sin(ctx.time * (6 + 10 * k)));
      });
    },
    fire(e) {
      const a = e.def.attacks[id];
      for (const l of (e.decoys ?? []).filter(x => x.alive)) { lampBurst(e, l, a); l.vanish(); }
      e.decoys = [];
      if (e.heard) audio.growl();
    },
    cancel: putOut,
  };
}

/** The lamps lit right now, for the checks: where each is and how far its burst reaches. */
export const lampsOf = (e, id) => (e.decoys ?? []).filter(l => l.alive).map(l => ({ lamp: l, at: l.up.clone(), radius: e.def.attacks[id].radius }));
