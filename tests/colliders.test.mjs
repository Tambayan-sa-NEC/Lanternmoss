import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { addCollider, clearStaticColliders, removeCollider, resolveCollisions } from '../src/physics/colliders.js';
import { groundHeight } from '../src/world/terrain.js';
import { offsetDir } from '../src/utils/sphere.js';

const up = new THREE.Vector3(0, 1, 0);
const at = dir => dir.clone().multiplyScalar(groundHeight(dir));

test('static collision lookup skips distant scenery and keeps contacts across cells and rebuilds', () => {
  clearStaticColliders();
  try {
    const near = addCollider(up, 1);
    const far = Array.from({ length: 80 }, (_, i) => addCollider(offsetDir(up.clone().negate(), i * 2.4, 4), 1));
    assert.ok(resolveCollisions(at(up), 0.5, null), 'the nearby trunk pushes a walker out');
    let reads = 0;
    const x = far[0].dir.x;
    Object.defineProperty(far[0].dir, 'x', { configurable: true, get() { reads++; return x; } });
    assert.ok(resolveCollisions(at(up), 0.5, null));
    assert.equal(reads, 0, 'a nearby walker does not inspect the opposite side of the planet');
    removeCollider(near);
    assert.equal(resolveCollisions(at(up), 0.5, null), null, 'removed scenery leaves no stale contact');

    clearStaticColliders();
    const edge = new THREE.Vector3(0.19, Math.sqrt(1 - 0.19 ** 2), 0);
    const across = new THREE.Vector3(0.21, Math.sqrt(1 - 0.21 ** 2), 0);
    addCollider(edge, 1.2);
    assert.ok(resolveCollisions(at(across), 0.5, null), 'adjacent lookup cells retain a real overlap');
    clearStaticColliders();
    const large = addCollider(up, 15);
    assert.ok(resolveCollisions(at(offsetDir(up, 0, 10)), 0.5, null), 'large colliders use the full-list fallback');
    removeCollider(large);
  } finally { clearStaticColliders(); }
});
