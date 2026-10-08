/* WAYFINDING: the compass strip (top centre) and arrows at the screen edge toward what matters right now.
   Bearings are measured in the hero's tangent plane against the camera heading, which works anywhere on the round
   planet. Points of interest:
     village  always (compass)                               boss     while it lives (compass + edge arrow); while it
                                                                      sleeps, its lair (+ elites carrying sigils)
     goal     the active challenge's next target (compass + edge arrow; CHALLENGE_KINDS[kind].target)
     giver    villagers with a challenge or quest to offer, when no challenge is running (compass)
     quest    the villager your tracked quest needs next (compass + edge arrow)
     chest    a beaten boss's treasure chest until it's opened (compass + edge arrow)
     spotted  monsters a pet's Scout found (compass), scent = the chest a pet's Fetch sniffed out (compass + edge arrow)
     craft, farm  the village's crafting corner and farm, when you're near the village (compass)
   Edge arrows only appear while their target is off-screen or hidden behind the planet. */
import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { settings } from '../core/settings.js';
import { Challenges } from '../gameplay/challenges/Challenges.js';
import { BossGate } from '../gameplay/BossGate.js';
import { Chests } from '../gameplay/Chests.js';
import { Farm } from '../gameplay/Farm.js';
import { Stations } from '../gameplay/Stations.js';
import { petEffects } from '../gameplay/petAbilities.js';
import { Quests } from '../gameplay/quests/Quests.js';
import { cam } from '../systems/CameraSystem.js';
import { clamp } from '../utils/math.js';
import { arcDist, projectTangent, tangentToward } from '../utils/sphere.js';
import { SPAWN_DIR } from '../world/World.js';
import { groundHeight } from '../world/terrain.js';
import { dom } from './dom.js';
import { toScreen } from './hud.js';
import { icon } from './icons.js';

const SPAN = 160;                       // degrees of heading the compass strip shows, centred on the view
const TICK = 15;                        // compass tick spacing (degrees), anchored to the village (north pole)
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _p = new THREE.Vector3();
const DEG = 180 / Math.PI;

/** Signed angle (degrees, + = right) from the view heading to the surface direction `dir`, seen from the hero. */
function bearing(dir) { const t = tangentToward(ctx.player.up, dir); return Math.atan2(t.dot(_r), t.dot(_f)) * DEG; }

function pointsOfInterest() {
  const list = [{ key: 'village', dir: SPAWN_DIR, icon: 'home', label: 'Village', far: true }];
  for (const [key, dir, ic, label] of [['craft', Stations.center, 'craft', 'Crafting'], ['farm', Farm.center, 'sprout', 'Farm']])   // the village's corners
    if (dir && arcDist(dir, ctx.player.up) < 60 && arcDist(dir, ctx.player.up) > 5) list.push({ key, dir, icon: ic, label });
  const B = ctx.boss;
  list.push(...BossGate.waypoints());                                   // the sealed lair, and elites carrying sigils
  for (const e of ctx.enemies) if (e.def.miniBoss && e.alive && arcDist(e.up, ctx.player.up) < 75)   // a mini boss nearby
    list.push({ key: `mini:${e.type}`, dir: e.up, icon: 'boss', label: e.def.name.split(',')[0] });
  if (B && B.alive && !B.dormant) list.push({ key: 'boss', dir: B.up, icon: 'boss', label: B.def.name.split(',')[0], edge: true, far: true, point: B.center() });
  const run = Challenges.run;
  if (run) {
    const d = run.kind.target?.(run);
    if (d) list.push({ key: 'goal', dir: d, icon: 'star', label: run.def.title, edge: true, far: true, point: _p.copy(d).multiplyScalar(groundHeight(d) + 1.2).clone() });
  } else for (const n of ctx.npcs) if (Challenges.availableFor(n) || Quests.offerable(n)) list.push({ key: `giver:${n.name}`, dir: n.up, icon: 'talk', label: n.name });
  const bc = Chests.bossChest;
  if (bc && !bc.opened) list.push({ key: 'chest', dir: bc.up, icon: 'chest', label: 'Treasure', edge: true, far: true, point: bc.top(0.4) });
  petEffects.spotted.forEach((s, i) => list.push({ key: `spotted:${i}`, dir: s.enemy.up, icon: 'eye', label: 'Spotted' }));
  const sc = petEffects.scent;
  if (sc) list.push({ key: 'scent', dir: sc.dir, icon: 'paw', label: 'A chest', edge: true, far: true, point: _p.copy(sc.dir).multiplyScalar(groundHeight(sc.dir) + 1).clone() });
  const qt = Quests.target();                                        // the villager your tracked quest needs next
  if (qt) list.push({ key: 'quest', dir: qt.up, icon: 'quest', label: qt.name, edge: true, far: true, point: _p.copy(qt.pos).addScaledVector(qt.up, qt.height).clone() });
  return list;
}

const marks = new Map();                // key -> { c: compass element, e: edge element }
function markFor(p) {
  let m = marks.get(p.key);
  if (!m) {
    m = { c: document.createElement('div'), e: null };
    m.c.className = `cm ${p.icon}`; m.c.innerHTML = `${icon(p.icon)}<span></span>`; m.c.title = p.label; dom.compassTrack.appendChild(m.c);
    if (p.edge) {
      m.e = document.createElement('div'); m.e.className = `wm ${p.icon}`;
      m.e.innerHTML = `<i class="arrow"></i>${icon(p.icon)}<span></span>`; dom.markers.appendChild(m.e);
    }
    marks.set(p.key, m);
  }
  return m;
}

const ticks = [];
for (let i = 0; i < 360 / TICK; i++) { const t = document.createElement('i'); t.className = i % 6 ? 'tick' : 'tick major'; ticks.push(t); }
let ticksAdded = false;
const _sp = { x: 0, y: 0 };

export function updateWaypoints() {
  const P = ctx.player, show = ctx.started && !P.dead && !ctx.indoors && settings.compass;
  dom.compass.style.display = show ? 'block' : 'none'; dom.markers.style.display = show ? 'block' : 'none';
  if (!show) return;
  if (!ticksAdded) { ticksAdded = true; for (const t of ticks) dom.compassTrack.appendChild(t); }
  _f.copy(cam.fwd); projectTangent(_f, P.up).normalize(); _r.crossVectors(_f, P.up);
  // ticks, anchored to the bearing of the village so they slide as the view turns
  const north = arcDist(P.up, SPAWN_DIR) > 2 ? bearing(SPAWN_DIR) : null;
  ticks.forEach((t, i) => {
    const a = north === null ? null : ((north + i * TICK + 540) % 360) - 180;
    const on = a !== null && Math.abs(a) <= SPAN / 2; t.style.display = on ? 'block' : 'none';
    if (on) t.style.left = `${50 + a / SPAN * 100}%`;
  });
  const seen = new Set();
  for (const p of pointsOfInterest()) {
    seen.add(p.key);
    const m = markFor(p), dist = arcDist(P.up, p.dir), here = dist < 2.5;
    const a = here ? 0 : bearing(p.dir), off = Math.abs(a) > SPAN / 2;
    m.c.style.left = `${50 + clamp(a, -SPAN / 2, SPAN / 2) / SPAN * 100}%`;
    m.c.classList.toggle('off', off); m.c.style.display = 'flex';
    m.c.lastChild.textContent = here || off || !p.far ? '' : `${Math.round(dist)}m`;   // distances only for the main targets
    if (!m.e) continue;
    const visible = here || toScreen(p.point, 0.92, _sp);
    m.e.style.display = visible ? 'none' : 'flex';
    if (visible) continue;
    // on an ellipse inside the screen edge; its lower half stops above the bottom HUD (bars, ability bar, boss bar)
    const rad = a / DEG, ui = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
    const cx = innerWidth / 2, cy = innerHeight * 0.45, rx = innerWidth / 2 - 64, up = cy - 84, down = innerHeight - 200 * ui - cy;
    m.e.style.left = `${cx + Math.sin(rad) * rx}px`; m.e.style.top = `${cy - Math.cos(rad) * (Math.cos(rad) > 0 ? up : down)}px`;
    m.e.firstChild.style.transform = `rotate(${a}deg)`; m.e.lastChild.textContent = `${Math.round(dist)}m`;
  }
  for (const [key, m] of marks) if (!seen.has(key)) { m.c.remove(); m.e?.remove(); marks.delete(key); }
}
