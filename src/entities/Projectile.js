/* Projectiles fly along the surface at a fixed height, like everything else on the planet; over the sea (a moving sea
   or lagoon, world/physics.js) the surface is the water, not the sea bed. Ponds keep their original flight.
   o: team ('player' hits enemies, otherwise hits the player), up, dir, alt, speed, range, radius, size, color,
      homing + homeTo() (target point or null), onHit(projectile, hitEntityOrNull),
      shape ('arrow' = an arrow mesh pointing along its flight; default a spinning glowing orb),
      startAlt + altRate (shots fired from the air glide down to `alt`). Homing shots climb toward a target above them
      (a flying boss); the hero's start at, and dip toward, the height of a target below them out on the sea (a Surf
      skipper in the shallows under a beach);
      bosses with def.tallHitbox are hit anywhere along their body column. */
import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { sparkles } from '../fx/sparkles.js';
import { hitsStatic } from '../physics/colliders.js';
import { buildArrow } from '../models/heroes.js';
import { disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { damp } from '../utils/math.js';
import { frameQuat, projectTangent, tangentTo, turnToward } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { seaLevelAt } from '../world/physics.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _p = new V3(), _hu = new V3(), _sea = new V3();
/** Height of the ground, or of the sea over it. */
const surface = d => Math.max(groundHeight(d), seaLevelAt(d) ?? -Infinity);
/** A target point out over the sea (null: the original flight rules apply). */
const overSea = p => { if (!p) return null; const d = _sea.copy(p).normalize(), sea = seaLevelAt(d); return sea !== null && sea > groundHeight(d) ? p : null; };

/** Does a sphere at pos (radius) touch enemy e? Round bodies use their centre; tall / flying bosses a vertical column. */
export function touchesEnemy(e, pos, radius) {
  if (e.center().distanceTo(pos) < radius + e.hitR) return true;
  if (!e.def.tallHitbox) return false;
  const h = pos.length() - e.r;                                    // height above the enemy's feet
  return h > e.hover - radius - 0.8 && h < e.hover + e.height + radius && tangentTo(e.pos, e.up, pos, _hu) < radius + e.hitR;
}

export class Projectile {
  constructor(o) {
    Object.assign(this, o); this.up = o.up.clone().normalize(); this.fwd = o.dir.clone(); projectTangent(this.fwd, this.up).normalize();
    const aimAt = this.team === 'player' && o.startAlt == null ? overSea(this.homeTo?.()) : null;   // the hero aims at a lower target's height
    if (aimAt) { this.alt = Math.min(this.alt, Math.max(0.35, aimAt.length() - surface(_hu.copy(aimAt).normalize()))); this.altRate = Math.max(this.altRate ?? 10, 40); }   // and settles to it fast
    this.r = surface(this.up) + (o.startAlt ?? o.alt); this.pos = this.up.clone().multiplyScalar(this.r); this.life = o.range / o.speed; this.trailT = 0;
    this.mesh = o.shape === 'arrow' ? buildArrow(o.color) : part(G.ico(o.size, 1), o.color, { glow: true, intensity: 2.8 });
    this.mesh.position.copy(this.pos); if (o.shape === 'arrow') frameQuat(this.up, this.fwd, this.mesh.quaternion); scene.add(this.mesh);
  }
  /** Returns false once the projectile is spent (hit something or ran out of range). */
  update(dt) {
    if ((this.life -= dt) <= 0) return this.finish(null);
    const home = this.homeTo && this.homeTo();
    if (home) {
      tangentTo(this.pos, this.up, home, _tv); turnToward(this.fwd, _tv, this.up, damp(this.homing, dt));
      const above = home.length() - surface(_hu.copy(home).normalize());
      if (above > this.alt) this.alt += (Math.min(above, 9) - this.alt) * damp(this.homing * 0.8, dt);
      else if (this.team === 'player' && overSea(home)) this.alt += (Math.max(above, 0.35) - this.alt) * damp(this.homing * 0.8, dt);
    }
    _p.copy(this.pos).addScaledVector(this.fwd, this.speed * dt);
    this.up.copy(_p).normalize(); projectTangent(this.fwd, this.up).normalize();
    this.r += (surface(this.up) + this.alt - this.r) * damp(this.altRate ?? 10, dt); this.pos.copy(this.up).multiplyScalar(this.r);
    this.mesh.position.copy(this.pos);
    if (this.shape === 'arrow') frameQuat(this.up, this.fwd, this.mesh.quaternion); else { this.mesh.rotation.x += dt * 9; this.mesh.rotation.y += dt * 7; }
    if ((this.trailT -= dt) < 0) { this.trailT = 0.018; sparkles.emit(this.pos, { count: 1, color: this.color, speed: 0.5, life: 0.35, size: this.size * 1.6 }); }
    if (hitsStatic(this.pos, this.radius)) return this.finish(null);
    const player = ctx.player;
    if (this.team === 'player') { for (const e of ctx.enemies) if (e.alive && !e.hidden && touchesEnemy(e, this.pos, this.radius)) return this.finish(e); }
    else if (!player.dead && _tv.copy(player.pos).addScaledVector(player.up, 1).distanceTo(this.pos) < this.radius + 0.55) return this.finish(player);
    return true;
  }
  finish(hit) { this.onHit(this, hit); this.dispose(); return false; }
  dispose() { scene.remove(this.mesh); disposeTree(this.mesh); }
}
