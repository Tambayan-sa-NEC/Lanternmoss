import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { settings } from '../core/settings.js';
import { RENDER } from '../config/render.js';

const gates = new WeakMap(), pos = new THREE.Vector3();
/** A render-only parent; root visibility, animations, colliders and AI remain owned by the actor. */
export function cullActors(camera) {
  const distance = RENDER.actorDistance[settings.quality] ?? RENDER.actorDistance.high;
  for (const actors of [ctx.npcs, ctx.critters, ctx.birds, ctx.enemies]) for (const actor of actors) {
    const root = actor.root; if (!root || root.isMesh) continue;
    let gate = gates.get(root);
    if (!gate) { gate = new THREE.Group(); gates.set(root, gate); root.add(gate); }
    // Outfit changes may attach fresh children to the root between frames.
    if (root.children.length > 1) for (const child of [...root.children]) if (child !== gate) gate.add(child);
    root.updateWorldMatrix(true, false);
    pos.setFromMatrixPosition(root.matrixWorld);
    gate.visible = pos.distanceTo(camera.position) <= distance || (ctx.player && pos.distanceTo(ctx.player.pos) <= 24);
  }
}
