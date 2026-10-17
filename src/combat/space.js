/* Combat coordinates: a planet direction on the surface, a world floor point in a room. Orientation (actor.up)
   stays separate from position. The room context is transient; houses have no combat space and stay peaceful. */
import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { arcDist, dirAlong, slerpDir, tangentToward } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

export const pointOf = actor => actor.space ? actor.space.point(actor) : actor.up;
export const peaceful = () => !!ctx.indoors && !ctx.room;
export const floorHeight = actor => actor.space ? actor.space.origin.y : groundHeight(actor.up);
export const altitude = actor => actor.space ? actor.space.height(actor.pos) : actor.r - groundHeight(actor.up);
export const distance = (a, b) => ctx.room ? ctx.room.distance(a, b) : arcDist(a, b);
export const advance = (a, dir, d) => ctx.room ? ctx.room.advance(a, dir, d) : dirAlong(a, dir, d);
export const toward = (a, b) => ctx.room ? ctx.room.toward(a, b) : tangentToward(a, b);
export const upAt = p => ctx.room ? ctx.room.up : p.clone().normalize();
export const ground = (p, lift = 0, out = new THREE.Vector3()) => ctx.room ? ctx.room.ground(p, lift, out) : out.copy(p).normalize().multiplyScalar(groundHeight(p.clone().normalize()) + lift);
export const interpolate = (a, b, k, out) => ctx.room ? out.lerpVectors(a, b, k) : slerpDir(a, b, k, out);
export const visible = (a, b, radius = 0) => !ctx.room || ctx.room.clear(a, b, radius);
