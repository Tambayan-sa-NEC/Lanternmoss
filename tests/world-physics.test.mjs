import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { configurePhysics, setPhysics, gravityAt, seaLevel, pondLevel } from '../src/world/physics.js';
import { addPond, computeWaterLevel, dryGround, groundHeight, ponds, setTerrain, waterAt } from '../src/world/terrain.js';
import { Walker } from '../src/physics/Walker.js';
import { addCollider, clearStaticColliders, support } from '../src/physics/colliders.js';
import { WORLD } from '../src/config/game.js';
import { offsetDir } from '../src/utils/sphere.js';
const up = new THREE.Vector3(0, 1, 0), zero = new THREE.Vector3();
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function reset() { configurePhysics(); ponds.length = 0; clearStaticColliders(); setTerrain(null, 1); }

test('planet gravity composes with actor gravity and configuration resets all live rules', () => {
  reset();
  try {
    configurePhysics({ gravity: 0.4, seaLevel: 70, seaMaxLevel: 72, waterOffset: -1, waterMaxOffset: 2 });
    near(gravityAt(up, 15.5 * 0.72), 15.5 * 0.72 * 0.4);
    const w = new Walker(up, 0.4); w.r += 10; w.grounded = false; w.step(zero, 0.1, 24); near(w.vy, -0.96);
    setPhysics({ gravity: 0.8, seaLevel: 72, waterOffset: 2 });
    near(gravityAt(up, 24), 19.2); assert.equal(seaLevel(true), 72);
    setPhysics({ seaLevel: 68, waterOffset: -2 }); assert.equal(seaLevel(true), 72);
    near(pondLevel({ water: 70 }, true), 72);
    configurePhysics(); assert.equal(gravityAt(up, 24), 24); assert.equal(seaLevel(), null);
    assert.equal(pondLevel({ water: 70 }), 70);
  } finally { reset(); }
});

test('invalid physics values default or clamp without producing non-finite forces or surfaces', () => {
  reset();
  try {
    configurePhysics({ gravity: NaN, seaLevel: Infinity, waterOffset: '4', seaMaxLevel: -1000 });
    assert.equal(gravityAt(up, 24), 24); assert.equal(seaLevel(), null); assert.equal(pondLevel({ water: 70 }), 70);
    configurePhysics({ waterMaxOffset: 12 }); setPhysics({ gravity: -9, seaLevel: Infinity, waterOffset: 100 });
    assert.equal(gravityAt(up, 20), 1); assert.equal(seaLevel(), null); assert.equal(pondLevel({ water: 70 }), 82);
    setPhysics({ gravity: NaN }); assert.equal(gravityAt(up, 20), 1);
    assert.throws(() => setPhysics({ gravity: 2, seaLevel: 80 }), /maximum water/); assert.equal(gravityAt(up, 20), 1);
  } finally { reset(); }
});

test('pond surfaces move along their normal; the highest sea/pond surface supplies swimmer support', () => {
  reset();
  try {
    configurePhysics({ waterMaxOffset: 1, seaMaxLevel: 80 });
    const p = addPond(up, 5, 2); computeWaterLevel(p); const original = waterAt(up);
    assert.equal(original.pond, p); near(original.level, p.water);
    const d = offsetDir(up, 0, 2);
    setPhysics({ waterOffset: 0.7 }); near(waterAt(d).level, (p.water + 0.7) / d.dot(p.dir));
    assert.equal(p.water, original.level, 'computed baseline is never overwritten');
    setPhysics({ seaLevel: p.water + 1 }); assert.equal(waterAt(up).pond, null);
    near(support(up).h, waterAt(up).level - WORLD.water.swimDepth);
    setPhysics({ seaLevel: null, waterOffset: -10 }); assert.equal(waterAt(up), null); assert.equal(support(up).h, groundHeight(up));
  } finally { reset(); }
});

test('live flooding is visible to movement immediately and raised dry support does not become swimming', () => {
  reset();
  try {
    configurePhysics({ seaMaxLevel: 80 }); const h = groundHeight(up), w = new Walker(up, 0.4);
    setPhysics({ seaLevel: h + 2 }); w.step(zero, 0.01);
    assert.ok(w.swimming); near(w.r, h + 2 - WORLD.water.swimDepth);
    setPhysics({ seaLevel: h + 3 }); w.step(zero, 0.01); near(w.r, h + 3 - WORLD.water.swimDepth);
    addCollider(up, 2, null, 5); w.r = h + 5; w.grounded = true; w.step(zero, 0.01);
    assert.equal(w.swimming, false); assert.equal(w.waterDepth, 0); near(w.r, h + 5);
    clearStaticColliders(); setPhysics({ seaLevel: null });
    for (let i = 0; i < 120; i++) w.step(zero, 1 / 60);
    assert.equal(w.swimming, false); near(w.r, h);
  } finally { reset(); }
});

test('placement queries reserve declared high water and inspect footprint edges without changing terrain', () => {
  reset();
  try {
    const h = groundHeight(up); configurePhysics({ seaLevel: h - 1, seaMaxLevel: h + 1 });
    assert.equal(dryGround(up), true); assert.equal(dryGround(up, 2, { high: true }), false);
    near(groundHeight(up), h);
    configurePhysics(); const p = addPond(offsetDir(up, 0, 8), 4); computeWaterLevel(p);
    configurePhysics({ waterOffset: -10, waterMaxOffset: 2 });
    assert.equal(dryGround(up), true); assert.equal(dryGround(up, 8, { high: true }), false);
  } finally { reset(); }
});
