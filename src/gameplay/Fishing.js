/* FISHING (config/resources.js FISHING): with a rod on the hotbar, E at the edge of a pond or lake casts the float.
   Wait for a bite (the float dips, a "!" pops up), press E (or click) to start reeling, then press again while the
   swinging needle is in the green zone. Rarer fish have a smaller zone and a quicker needle. Walking off, getting
   hit, or waiting too long lets the fish go.
   States: cast (the float flies out) -> wait -> bite -> reel -> (caught / got away). */
import * as THREE from 'three';
import { FISHING } from '../config/resources.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { buildFloat } from '../models/resources.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist, dirAlong, frameQuat, tangentToward, turnToward } from '../utils/sphere.js';
import { damp } from '../utils/math.js';
import { ponds } from '../world/terrain.js';
import { Gathering, TOOL_USES } from './Gathering.js';
import { holdTool, releaseTool } from './heldTool.js';
import { Hotbar } from './hotbar.js';
import { grantItem } from './pickups.js';
import { catchFeel, inZone, needleAt, rollCatch } from './resourceRules.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export const Fishing = {
  s: null,              // the cast in progress: { stage, pond, dir, float, line, t, biteAt, fish, feel, centre, from }
  meter: null,          // the reeling meter's elements (built on first use)

  get active() { return !!this.s; },
  /** The pond whose edge the hero stands at (or wades in), or null. */
  pondHere() {
    const P = ctx.player;
    for (const p of ponds) { const d = arcDist(P.up, p.dir) - p.r; if (d < FISHING.reach && d > -2.5) return p; }
    return null;
  },
  /** The E prompt: while fishing, what E does next; otherwise "Fish here" at a pond with a rod on the hotbar. */
  target() {
    const s = this.s;
    if (s) {
      const label = s.stage === 'bite' ? 'Reel it in!' : s.stage === 'reel' ? 'Stop the needle in the green!' : 'Waiting for a bite... <span class="ctag">(reel in)</span>';
      return { dist: 0, label, at: s.float.position.clone().addScaledVector(s.dir, 0.8), run: () => this.press() };
    }
    if (!Gathering.hotbarTool('rod') || Gathering.job) return null;
    const p = this.pondHere(); if (!p) return null;
    const P = ctx.player;
    return { dist: Math.max(0, arcDist(P.up, p.dir) - p.r) + 0.2, label: p.r >= FISHING.lakeRadius ? 'Fish in the lake' : 'Fish in the pond',
      at: P.pos.clone().addScaledVector(P.up, 2.4), run: () => this.start(p) };
  },

  start(pond) {
    const P = ctx.player, rod = Gathering.hotbarTool('rod');
    if (!rod) { toast(Gathering.toolProblem({ tool: 'rod', tier: 1 })); return; }
    Hotbar.selected = rod.slot; Hotbar.changedAt = ctx.time; holdTool(P, rod.def);
    // the float lands a little way into the water, toward the middle
    const toMid = arcDist(P.up, pond.dir), edge = Math.max(0, toMid - pond.r);
    const dir = dirAlong(P.up, tangentToward(P.up, pond.dir), Math.min(toMid - 0.4, edge + FISHING.cast));
    const float = buildFloat(); scene.add(float);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x3a2340 }));
    line.frustumCulled = false; scene.add(line);
    this.s = { stage: 'cast', pond, dir, float, line, t: 0, biteAt: FISHING.bite[0] + Math.random() * (FISHING.bite[1] - FISHING.bite[0]), from: P.up.clone(), surf: pond.water / dir.dot(pond.dir) };
    P.fwd.copy(tangentToward(P.up, dir)); audio.whoosh?.();
  },
  /** E or a click while fishing. */
  press() {
    const s = this.s; if (!s) return;
    if (s.stage === 'cast' || s.stage === 'wait') { this.end('You reel in early: nothing yet. Wait for the float to dip!'); return; }
    if (s.stage === 'bite') { s.stage = 'reel'; s.t = 0; s.fish = rollCatch(ctx.planet, s.pond.r >= FISHING.lakeRadius); s.feel = catchFeel(s.fish); s.centre = 0.25 + Math.random() * 0.5; this.showMeter(true); audio.blip(); return; }
    if (s.stage === 'reel') {
      if (inZone(needleAt(s.t, s.feel.sweeps), s.centre, s.feel.zone)) this.caught();
      else this.end('Splash! It wriggled free. Press when the needle is in the green.');
    }
  },
  caught() {
    const s = this.s, def = itemRegistry.get(s.fish);
    grantItem(s.fish, 1); audio.sparkle(); audio.splash(true);
    sparkles.emit(s.float.position, { count: 26, color: 0x9fe8ff, speed: 3, up: s.dir, upBias: 1, life: 0.8, size: 0.32 });
    emote(ctx.player, def.rarity === 'common' ? 'star' : 'heart', '#ffb03d');
    emit('fishcaught', { itemId: s.fish });
    this.end(`Caught ${/^[AEIOU]/.test(def.name) ? 'an' : 'a'} ${def.name}!${def.rarity !== 'common' ? ' What a catch!' : ''}`);
  },
  end(message = '') {
    const s = this.s; if (!s) return;
    scene.remove(s.float, s.line); disposeTree(s.float); s.line.geometry.dispose(); s.line.material.dispose();
    this.s = null; this.showMeter(false); releaseTool(ctx.player);
    if (message) toast(message);
  },

  update(dt) {
    const s = this.s; if (!s) return;
    const P = ctx.player;
    if (P.dead || P.hurtT > 0 || ctx.transitioning || arcDist(P.up, s.from) > 1.2) { this.end(P.hurtT > 0 ? 'Ouch! The fish got away.' : 'You pack up the rod.'); return; }
    s.t += dt;
    turnToward(P.fwd, tangentToward(P.up, s.dir), P.up, damp(10, dt));
    P.armR.rotation.x = -1.25 + (s.stage === 'reel' ? Math.sin(ctx.time * 18) * 0.12 : 0); P.armR.rotation.z = -0.15;
    // the float: an arc out to the water, then bobbing (a bite pulls it under)
    let lift = 0;
    if (s.stage === 'cast') {
      const k = Math.min(1, s.t / 0.5); _a.copy(P.up).lerp(s.dir, k).normalize();
      lift = Math.sin(k * Math.PI) * 2.2; s.float.position.copy(_a).multiplyScalar(s.surf + lift);
      if (k >= 1) { s.stage = 'wait'; s.t = 0; audio.plip(); sparkles.emit(s.float.position, { count: 10, color: 0xe8fbff, speed: 1.2, up: s.dir, upBias: 0.9, life: 0.5, size: 0.26 }); }
    } else {
      const dip = s.stage === 'bite' ? -0.12 - Math.abs(Math.sin(s.t * 14)) * 0.12 : Math.sin(s.t * 2.4) * 0.03;
      s.float.position.copy(s.dir).multiplyScalar(s.surf + dip);
    }
    frameQuat(s.stage === 'cast' ? _a : s.dir, P.fwd, s.float.quaternion);
    // the line: from the rod's tip (or the hand) to the float
    if (P.heldTool) { P.heldTool.updateMatrixWorld(true); _b.set(-0.15, -0.1, 0).applyMatrix4(P.heldTool.matrixWorld); }
    else _b.copy(P.pos).addScaledVector(P.up, 1.7).addScaledVector(P.fwd, 0.8);
    const pa = s.line.geometry.attributes.position; pa.setXYZ(0, _b.x, _b.y, _b.z); pa.setXYZ(1, s.float.position.x, s.float.position.y, s.float.position.z); pa.needsUpdate = true;
    if (s.stage === 'wait' && s.t >= s.biteAt) {
      s.stage = 'bite'; s.t = 0; emote(P, '!', '#ff6b9a'); audio.splash(false); audio.tone(980, 0.12, 'triangle', 0.05);
      sparkles.emit(s.float.position, { count: 14, color: 0xe8fbff, speed: 1.8, up: s.dir, upBias: 1, life: 0.5, size: 0.28 });
    } else if (s.stage === 'bite' && s.t > FISHING.react) this.end('Too slow: it swam off with the bait!');
    else if (s.stage === 'reel') {
      if (s.t > FISHING.meter.time) this.end('It slipped the hook. Press when the needle is in the green!');
      else this.drawMeter(needleAt(s.t, s.feel.sweeps));
    }
  },

  // ---- the reeling meter (DOM)
  showMeter(on) {
    if (!this.meter) {
      const el = document.createElement('div'); el.id = 'fishmeter';
      el.innerHTML = '<div class="fm-title">Reel it in!</div><div class="fm-bar"><i></i><b></b></div><div class="fm-hint"></div>';
      document.body.appendChild(el); this.meter = { el, zone: el.querySelector('i'), needle: el.querySelector('b'), hint: el.querySelector('.fm-hint') };
    }
    const m = this.meter; m.el.classList.toggle('show', on);
    if (on) {
      const s = this.s; m.zone.style.left = `${(s.centre - s.feel.zone / 2) * 100}%`; m.zone.style.width = `${s.feel.zone * 100}%`;
      m.hint.innerHTML = '<kbd>E</kbd> or click when the needle is in the green';
    }
  },
  drawMeter(x) { this.meter.needle.style.left = `${x * 100}%`; },
};

TOOL_USES.rod = def => {
  if (Fishing.active) { Fishing.press(); return { ok: true, message: '' }; }
  const p = Fishing.pondHere(); if (!p) return { ok: false, message: `Stand at the edge of a pond or lake to fish with the ${def.name}.` };
  Fishing.start(p); return { ok: true, message: '' };
};
