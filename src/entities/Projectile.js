/* Projectiles fly along the surface at a fixed height, like everything else on the planet.
   o: team ('player' hits enemies, otherwise hits the player), up, dir, alt, speed, range, radius, size, color,
      homing + homeTo() (target point or null), onHit(projectile, hitEntityOrNull). */
import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { sparkles } from '../fx/sparkles.js';
import { hitsStatic } from '../physics/colliders.js';
import { disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { damp } from '../utils/math.js';
import { projectTangent, tangentTo, turnToward } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _p = new V3();

export class Projectile {
  constructor(o) {
    Object.assign(this, o); this.up = o.up.clone().normalize(); this.fwd = o.dir.clone(); projectTangent(this.fwd, this.up).normalize();
    this.r = groundHeight(this.up) + o.alt; this.pos = this.up.clone().multiplyScalar(this.r); this.life = o.range / o.speed; this.trailT = 0;
    this.mesh = part(G.ico(o.size, 1), o.color, { glow: true, intensity: 2.8 }); this.mesh.position.copy(this.pos); scene.add(this.mesh);
  }
  /** Returns false once the projectile is spent (hit something or ran out of range). */
  update(dt) {
    if ((this.life -= dt) <= 0) return this.finish(null);
    const home = this.homeTo && this.homeTo();
    if (home) { tangentTo(this.pos, this.up, home, _tv); turnToward(this.fwd, _tv, this.up, damp(this.homing, dt)); }
    _p.copy(this.pos).addScaledVector(this.fwd, this.speed * dt);
    this.up.copy(_p).normalize(); projectTangent(this.fwd, this.up).normalize();
    this.r += (groundHeight(this.up) + this.alt - this.r) * damp(10, dt); this.pos.copy(this.up).multiplyScalar(this.r);
    this.mesh.position.copy(this.pos); this.mesh.rotation.x += dt * 9; this.mesh.rotation.y += dt * 7;
    if ((this.trailT -= dt) < 0) { this.trailT = 0.018; sparkles.emit(this.pos, { count: 1, color: this.color, speed: 0.5, life: 0.35, size: this.size * 1.6 }); }
    if (hitsStatic(this.pos, this.radius)) return this.finish(null);
    const player = ctx.player;
    if (this.team === 'player') { for (const e of ctx.enemies) if (e.alive && e.center().distanceTo(this.pos) < this.radius + e.hitR) return this.finish(e); }
    else if (!player.dead && _tv.copy(player.pos).addScaledVector(player.up, 1).distanceTo(this.pos) < this.radius + 0.55) return this.finish(player);
    return true;
  }
  finish(hit) { this.onHit(this, hit); this.dispose(); return false; }
  dispose() { scene.remove(this.mesh); disposeTree(this.mesh); }
}
