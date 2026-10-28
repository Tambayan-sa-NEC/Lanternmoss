/* BOSS: Mirelure, the Lantern Angler (COMBAT.enemies.mirelure), Tidewhisper's boss in the lagoon lair. She plays in
   three modes (e.mode):
     deep      the lagoon is full: she is under the water and nothing can hit her; only lures show. She lights
               def.lures.count lures around the lagoon (more after the reflood): one real, the rest false. Her breath
               rises as a ring of bubbles every def.lures.breath seconds, and the REAL lure dims in time with it (the
               false ones flicker to their own beat). Strike the real lure and she surfaces under it; strike a false one
               and it bursts in your face. Meanwhile she sends geysers up under the hero.
     surfaced  def.lures.surface seconds above water where the real lure was: open to everything; she bites up close.
     beached   at 50% she swims to the sluice and smashes it (the transition): the lagoon drains through it
               (activeTides().drainLagoon, with the water creeping back over the last def.drain.reflood seconds).
               Stranded on the floor she thrashes, rolls and bites, open to everything, until the water is deep enough
               over her again; then she dives and the lures return.
   Arena ring: crashing surf (ARENA_WALLS.surf). A faint, leaving or a reload resets everything: lures out, lagoon
   refilled, sluice mended.
   Rematch (TODO 31e): she also wears the false lure signature twice, `decoys` while she is deep and `glare` once she is
   up (behaviors/boss/signatures.js); neither is in the campaign fight. */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { clampRange } from '../../../../combat/area.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { arcFX, ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { addTo, G, part } from '../../../../render/meshes.js';
import { scene } from '../../../../render/scene.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { damp } from '../../../../utils/math.js';
import { mr, rng } from '../../../../utils/random.js';
import { arcDist, dirAlong, frameQuat, offsetDir, projectTangent, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { groundHeight, waterAt } from '../../../../world/terrain.js';
import { activeTides } from '../../../../world/mechanics/tides.js';
import { SPAWN_DIR } from '../../../../world/World.js';
import { hideDots, layLane, makeDots, showDisc } from '../telegraphs.js';
import { bossDecal, defineBoss, finish, inWedge } from './core.js';
import { falseLureSignature } from './signatures.js';

const WARN = 0xff4d6d, FOAM = 0xe8fbff, LAMP = 0xffd36b;
const A = (e, id) => e.def.attacks[id];
const _v = new THREE.Vector3(), _c = new THREE.Vector3();
const hints = new Set();
const hint = (key, text) => { if (!hints.has(key)) { hints.add(key); toast(text); } };
const depthAt = d => waterAt(d)?.depth ?? 0;
/** Breath pulse 0..1, peaking on each breath. */
const pulse = (t, period, phase = 0) => Math.pow(Math.max(0, Math.cos(((t / period + phase) % 1) * Math.PI * 2)), 6);

/** Inside the lagoon (def.pool metres around her lair), so she never leaves it. */
const inPool = (e, dir, margin = 3) => clampRange(e.home, dir, e.def.pool - margin);

// ---------------------------------------------------------------- lures (lair objects: COMBAT.enemies.mireLure)
export const mireLure = {
  animate(e) {
    const w = waterAt(e.up); e.hover = (w ? w.level - e.r : 0) - 0.15 + Math.sin(ctx.time * 1.8 + e.seed) * 0.08;
    const boss = e.owner, L = boss?.def.lures, t = ctx.time;
    const dim = e.real && boss ? pulse(t, L.breath) : pulse(t, e.flickerPeriod ?? 1.3, e.flickerPhase ?? 0);
    e.lamp.scale.setScalar(1.15 - 0.75 * dim + e.hitPop * 0.3);
    e.body.rotation.z = Math.sin(t * 1.3 + e.seed) * 0.12;
  },
  onDie(e) {
    const boss = e.owner; if (!boss?.alive) return;
    if (e.real) surface(boss, e);
    else burst(boss, e);
  },
};

function lightLures(e) {
  const L = e.def.lures, count = e.reflooded ? L.countLate : L.count, spots = [];
  for (let i = 0; i < 200 && spots.length < count; i++) {
    const d = offsetDir(e.home, rng() * Math.PI * 2, mr(L.radius[0], L.radius[1]));
    if (depthAt(d) >= 0.8 && spots.every(s => arcDist(s, d) > 4)) spots.push(d);
  }
  const real = Math.floor(rng() * spots.length);
  e.lures = spots.map((d, i) => {
    const l = e.spawnMinion('mireLure', d); l.real = i === real;                                       // temporary, owned by her
    l.flickerPeriod = L.breath * mr(0.55, 0.8); l.flickerPhase = rng();                                      // never in time with her breath
    return l;
  });
  for (const d of spots) sparkles.emit(_c.copy(d).multiplyScalar(waterAt(d)?.level ?? groundHeight(d)), { count: 14, color: LAMP, speed: 1.8, up: d, upBias: 1.2, life: 0.8, size: 0.34 });
  audio.sparkle();
  hint('lures', 'Lantern lights on the lagoon... only one is hers. Watch which one dims when her bubbles rise.');
}
function putOutLures(e) { for (const l of e.lures ?? []) if (l.alive) l.vanish(); e.lures = []; }
function cancelMove(e) {
  if (e.attack) moves[e.attack]?.cancel?.(e);
  e.hideTele(); e.attack = null; e.gape = 0;
}
function dive(e, relightT = 1.2) {
  cancelMove(e); e.mode = 'deep'; e.state = 'chase'; e.cool = Math.max(e.cool, 0.6); e.relightT = relightT;
  splash(e, 30);
}

/** The real lure was struck: she rises under it, open to everything for def.lures.surface seconds. */
function surface(e, lure) {
  putOutLures(e); cancelMove(e); e.mode = 'surfaced'; e.surfaceT = e.def.lures.surface;
  e.up.copy(lure.up); e.pos.copy(e.up).multiplyScalar(e.r); e.fwd.copy(tangentToward(e.up, ctx.player.up));
  e.state = 'chase'; e.cool = Math.max(e.cool, 1.2); e.hidden = false; e.root.visible = true;
  splash(e, 50); audio.roar(); shakeCamera(0.4); emote(e, '!', '#ffd36b');
  hint('surface', 'You struck her real lure! Mirelure surfaces: hit her while she\'s up!');
}
/** A false lure bursts in a stinging flash. */
function burst(e, lure) {
  const b = e.def.lures.burst, level = waterAt(lure.up)?.level ?? null, P = ctx.player;
  ringFX(lure.pos, b.radius, LAMP, 0.5, level); sparkles.emit(lure.center(), { count: 40, color: LAMP, speed: 4, up: lure.up, upBias: 0.8, life: 0.7, size: 0.42 });
  audio.explode();
  if (!P.dead && P.pos.distanceTo(lure.center()) < b.radius + P.radius + 0.6) hurtPlayer(b.damage, lure.pos, b.knockback, { source: e });
  hint('false', 'A false lure! It burst. Her real lure dims in time with her breathing bubbles.');
}

function splash(e, count) {
  const w = waterAt(e.up); sparkles.emit(_c.copy(e.up).multiplyScalar((w?.level ?? groundHeight(e.up)) + 0.2), { count, color: FOAM, speed: 4, up: e.up, upBias: 1.4, life: 0.9, size: 0.45 });
  audio.splash(true);
}

// ---------------------------------------------------------------- the sluice (owned by the fight; mended on reset)
function buildSluice(e) {
  const dir = e.sluiceDir = dirAlong(e.home, tangentToward(e.home, SPAWN_DIR), e.def.sluice.at);
  const g = new THREE.Group(), gate = new THREE.Group();
  g.position.copy(dir).multiplyScalar(groundHeight(dir) - 0.2); frameQuat(dir, tangentToward(dir, e.home), g.quaternion);
  for (const sx of [-1, 1]) addTo(g, part(G.box(0.45, 3.4, 0.45), 0x6a4a2a), [sx * 2.1, 1.7, 0]);
  addTo(g, part(G.box(4.7, 0.4, 0.5), 0x6a4a2a), [0, 3.3, 0]);
  for (let i = 0; i < 5; i++) addTo(gate, part(G.box(3.7, 0.5, 0.22), i % 2 ? 0x8a6a3a : 0x7a5a32), [0, 0.4 + i * 0.55, 0]);
  const wheel = addTo(g, part(new THREE.TorusGeometry(0.5, 0.08, 5, 12), 0x5a4a3a), [0, 3.9, 0.1]);
  g.add(gate); scene.add(g); e.sluice = { group: g, gate, wheel, broken: false };
}
function mendSluice(e) { if (!e.sluice) return; e.sluice.broken = false; e.sluice.gate.visible = true; e.sluice.gate.position.set(0, 0, 0); e.sluice.gate.rotation.set(0, 0, 0); }
function smashSluice(e) {
  const s = e.sluice; s.broken = true; s.gate.visible = false;
  sparkles.emit(s.group.position.clone().addScaledVector(e.sluiceDir, 1.5), { count: 60, color: 0x8a6a3a, speed: 5, up: e.sluiceDir, upBias: 1, life: 1.1, size: 0.5 });
  splash(e, 60); audio.slam(); shakeCamera(0.7);
  const L = e.def.drain; activeTides()?.drainLagoon(L.seconds, L.reflood);
  e.mode = 'beached'; e.drainT = L.seconds;                                                            // the fallback timer without a tide mechanic
  toast('Mirelure smashed the sluice! The lagoon drains: she is beached. Strike before the water creeps back!');
}

// ---------------------------------------------------------------- moves
const moves = {
  geyser: {
    ready: e => e.mode === 'deep',
    weight: () => 3,
    begin(e) { e.geyserAt = ctx.player.up.clone(); audio.charge(); },
    windup(e, dt, k) { e.geyserMark.place(e.geyserAt, null, A(e, 'geyser').radius * (0.4 + 0.6 * k)).opacity = 0.25 + 0.55 * k; },
    fire(e) {
      const a = A(e, 'geyser'), P = ctx.player, at = _c.copy(e.geyserAt).multiplyScalar(Math.max(groundHeight(e.geyserAt), waterAt(e.geyserAt)?.level ?? 0));
      ringFX(at, a.radius, FOAM, 0.5, waterAt(e.geyserAt)?.level ?? null);
      for (let i = 0; i < 3; i++) sparkles.emit(at.clone().addScaledVector(e.geyserAt, i * 1.2), { count: 18, color: FOAM, speed: 3, up: e.geyserAt, upBias: 2.5, life: 0.9, size: 0.5 });
      audio.splash(true); shakeCamera(0.25);
      if (!P.dead && arcDist(P.up, e.geyserAt) < a.radius + P.radius) {
        const hp = P.hp; hurtPlayer(a.damage, at, a.knockback, { source: e });
        if (!P.dead && P.hp < hp) { P.vy = Math.max(P.vy, 9); P.grounded = false; }                       // tossed only by a spout that landed
      }
    },
  },
  bite: {
    ready: (e, dist) => e.mode !== 'deep' && dist <= A(e, 'bite').range + 0.5,
    weight: () => 3,
    begin() { audio.growl(); },
    windup(e, dt, k) { if (k < 0.6) turnToward(e.fwd, e.toP, e.up, damp(4, dt)); e.biteMark.place(e.up, e.fwd, A(e, 'bite').range).opacity = 0.2 + 0.5 * k; e.gape = k; },
    fire(e) {
      const a = A(e, 'bite'), P = ctx.player; e.gape = 0; e.snapT = 0.3;
      arcFX(e.pos, e.up, e.fwd, a.range, a.arc, LAMP); audio.bite();
      if (!P.dead && inWedge(e, e.fwd, P.pos, a.range + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
    },
    cancel(e) { e.gape = 0; },
  },
  thrash: {
    ready: (e, dist) => e.mode === 'beached' && dist <= A(e, 'thrash').radius,
    weight: () => 2,
    begin() { audio.growl(); },
    windup(e, dt, k) { showDisc(e, e.pos, A(e, 'thrash').radius * (0.4 + 0.6 * k), k); },
    fire(e) {
      const a = A(e, 'thrash'), P = ctx.player; e.thrashT = 0.6;
      ringFX(e.pos, a.radius, 0xd8c08a, 0.5); audio.slam(); shakeCamera(0.35);
      if (!P.dead && arcDist(P.up, e.up) < a.radius + P.radius && P.r - groundHeight(P.up) < 1) hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
    },
  },
  roll: {
    ready: (e, dist) => e.mode === 'beached' && dist >= A(e, 'roll').minRange,
    weight: (e, dist) => (dist > 8 ? 2.5 : 1),
    begin(e) { e.laneFrom.copy(e.up); e.rollDir.copy(e.fwd); audio.growl(); },
    windup(e, dt, k) {
      const a = A(e, 'roll');
      if (k < 0.6) { turnToward(e.fwd, e.toP, e.up, damp(8, dt)); e.rollDir.copy(e.fwd); e.laneFrom.copy(e.up); }
      layLane(e.lane, e.laneFrom, e.rollDir, a.distance, a.width, 0.2 + 0.5 * k);
    },
    fire(e) { const a = A(e, 'roll'); e.rollT = a.distance / a.speed; e.hitPlayer = false; hideDots(e.lane); audio.whoosh(); return 'active'; },
    active(e, dt, dist) {
      const a = A(e, 'roll'), P = ctx.player;
      projectTangent(e.rollDir, e.up).normalize(); e.fwd.copy(e.rollDir);
      e.move.copy(tangentToward(e.up, inPool(e, _v.copy(e.pos).addScaledVector(e.rollDir, 2).normalize(), 2)));
      if (!e.hitPlayer && !P.dead && dist < e.radius + P.radius + a.width * 0.5) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback, { source: e }); }
      e.rolling = true;
      if ((e.rollT -= dt) <= 0 || arcDist(e.up, e.home) > e.def.pool - 2.5) { e.rolling = false; finish(e); }
      return a.speed;
    },
    cancel(e) { hideDots(e.lane); e.rolling = false; },
  },
};

// The signature is written once; she only says when it can be worn (her moves already check her own mode).
moves.decoys = { ...falseLureSignature('decoys'), ready: e => e.mode === 'deep' };
moves.glare = { ...falseLureSignature('glare'), ready: e => e.mode !== 'deep' };

export const mirelure = defineBoss({
  moves,
  fallback: (e, dist) => (e.mode === 'deep' ? 'geyser' : e.mode === 'beached' ? (dist < A(e, 'thrash').radius ? 'thrash' : 'roll') : null),
  init(e) {
    e.geyserMark = bossDecal(e, 'disc', WARN, { k: 0.9 }); e.biteMark = bossDecal(e, 'sector', WARN, { arc: THREE.MathUtils.degToRad(e.def.attacks.bite.arc) });
    e.lane = makeDots(e, 14, WARN); e.laneFrom = new THREE.Vector3(); e.rollDir = new THREE.Vector3();
    e.lures = []; buildSluice(e);
  },
  reset(e) {
    putOutLures(e); mendSluice(e); activeTides()?.refloodLagoon();
    Object.assign(e, { mode: 'deep', surfaceT: 0, drainT: 0, reflooded: false, gape: 0, snapT: 0, thrashT: 0, rolling: false, relightT: 1.5 });
  },
  cancel(e) {
    putOutLures(e); e.gape = 0; e.rolling = false;
    if (e.alive && e.mode !== 'deep') { activeTides()?.refloodLagoon(); e.mode = 'deep'; }
  },
  intro() { hint('intro', 'Mirelure hides in the deep water. Only her lantern lures show...'); },
  /** 50%: up she comes, to the sluice, and smashes it. */
  onPhase(e) {
    putOutLures(e); cancelMove(e); e.state = 'transition'; e.mode = 'surfaced'; e.hidden = false; e.root.visible = true; e.smashT = e.def.sluice.smash; e.atSluice = false;
    roar(e); return true;
  },
  transition(e, dt) {
    const target = dirAlong(e.sluiceDir, tangentToward(e.sluiceDir, e.home), 3);
    turnToward(e.fwd, tangentToward(e.up, target), e.up, damp(4, dt));
    if (!e.atSluice) {
      if (arcDist(e.up, target) > 1.5) { e.move.copy(tangentToward(e.up, target)); return e.def.speed * 2.2; }
      e.atSluice = true; audio.growl();
    }
    if ((e.smashT -= dt) <= 0) { smashSluice(e); e.state = 'chase'; e.cool = 1.2; }
    return 0;
  },
  approach(e, dt, dist, ph) {
    if (e.mode === 'surfaced') { turnToward(e.fwd, e.toP, e.up, damp(3, dt)); return 0; }
    const target = inPool(e, ctx.player.up);
    turnToward(e.fwd, tangentToward(e.up, target), e.up, damp(e.def.turnRate * ph.speedMul, dt)); e.move.copy(tangentToward(e.up, target));
    if (e.mode === 'beached') return dist > 3.5 ? e.def.speed * 0.45 * ph.speedMul : 0;                 // flopping on the sand
    return arcDist(e.up, target) > 1 ? e.def.speed * ph.speedMul : 0;
  },
  update(e, dt) {
    const L = e.def.lures, fighting = e.fighting && !e.dormant;
    if (e.mode === 'surfaced' && e.state !== 'transition' && (e.surfaceT -= dt) <= 0) dive(e);
    if (e.mode === 'beached') {
      const drained = activeTides()?.status.lagoonDrained ?? (e.drainT -= dt) > 0;
      if (!drained || depthAt(e.up) >= e.def.diveDepth) { dive(e, 1); e.reflooded = true; toast('The lagoon fills again: Mirelure slips back under, and lights more lures!'); }
    }
    if (e.mode === 'deep' && fighting && !(e.lures?.some(l => l.alive)) && (e.relightT -= dt) <= 0) lightLures(e);
    e.lures = (e.lures ?? []).filter(l => l.alive);
    e.hidden = e.mode === 'deep' && !e.dormant; e.selfCollider.active = !e.hidden && !e.dormant;
    if (!e.dormant) e.root.visible = e.alive && !e.hidden; e.shadow.visible = !e.hidden;
    // breath: a ring of bubbles over her, on the beat the real lure dims to
    if (fighting && e.mode === 'deep' && Math.floor(ctx.time / L.breath) > Math.floor((ctx.time - dt) / L.breath)) {
      const w = waterAt(e.up); if (w) for (let i = 0; i < 8; i++) sparkles.emit(_c.copy(offsetDir(e.up, i * 0.8, 1.4)).multiplyScalar(w.level + 0.1), { count: 2, color: FOAM, speed: 1.2, up: e.up, upBias: 2, life: 0.8, size: 0.36 });
      audio.squish();
    }
    // float at the surface when up; sit on the floor when beached
    const w = waterAt(e.up), floor = groundHeight(e.up);
    const lift = e.mode === 'surfaced' && w ? w.level - 1.6 - e.r : e.mode === 'deep' && w ? floor - 1 - e.r : floor - e.r;
    e.hover += (lift - e.hover) * damp(5, dt);
    if (e.mode === 'beached' && rng() < dt * 3) sparkles.emit(_c.copy(e.pos).addScaledVector(e.up, 0.4), { count: 2, color: 0xd8c08a, speed: 1.5, up: e.up, upBias: 1, life: 0.6, size: 0.32 });
  },
  animate(e, dt) {
    const t = ctx.time, s = Math.min(1, Math.abs(e.speed) / 3);
    e.snapT = Math.max(0, (e.snapT ?? 0) - dt); e.thrashT = Math.max(0, (e.thrashT ?? 0) - dt);
    e.jaw.rotation.x = Math.max(e.gape ?? 0, e.snapT > 0 ? 0.1 : 0.12 + Math.sin(t * 2) * 0.05) * 0.9 * (e.snapT > 0 ? 0.2 : 1);
    e.tail.rotation.y = Math.sin(t * (e.mode === 'beached' ? 9 : 3) + e.seed) * (e.mode === 'beached' ? 0.7 : 0.25 + 0.3 * s);
    e.finL.rotation.y = Math.sin(t * 4) * 0.3; e.finR.rotation.y = -Math.sin(t * 4) * 0.3;
    e.lure.rotation.x = Math.sin(t * 1.5) * 0.08 - (e.state === 'transition' ? 0.2 : 0);
    e.lamp.scale.setScalar(1 + pulse(t, e.def.lures.breath) * 0.3);
    e.body.rotation.z = e.mode === 'beached' ? (e.rolling ? (t * 9) % (Math.PI * 2) : 0.35 + Math.sin(t * 7) * 0.12 * (1 + (e.thrashT > 0 ? 3 : 0))) : 0;
    e.body.scale.setScalar(1 + e.hitPop * 0.04);
  },
  onDie(e) { putOutLures(e); activeTides()?.refloodLagoon(); e.root.visible = true; },
  dispose(e) { putOutLures(e); if (e.sluice) { scene.remove(e.sluice.group); e.sluice.group.traverse(o => o.geometry?.dispose()); } },
});

function roar(e) { emote(e, '!', '#ff4d6d'); audio.roar(); shakeCamera(0.5); toast('Mirelure rises from the lagoon and makes for the sluice!'); }
