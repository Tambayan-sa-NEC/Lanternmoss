// TODO 29a (shared local light): the toon shader patch lands in the real three.js toon shader (and in the sway and kelp
// materials, which have their own patches) with one cache key; on the surface (darkness 0) nothing changes; in the dark
// the sun and sky dim to the floor, the hero carries a light and the nearest sources get the shader spots; the real
// point lights switch on and off together (0 or 4, never one by one), stay off indoors (where the interior keeps its one
// light), and sources go away with their owners and on travel.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { boot, imp } from './lib/boot.mjs';
const { patchLocalLight, LocalLights } = await imp('render/lighting.js');
const { RENDER } = await imp('config/render.js');
const { toonMat, toonVC } = await imp('render/materials.js');
const { kelpVC } = await imp('render/coastalWind.js');
const { dirAlong } = await imp('utils/sphere.js');
const { Houses } = await imp('gameplay/Houses.js');
const { H, game, step } = await boot('witch');
const P = H.player, Ls = H.LocalLights, LL = RENDER.localLight;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);
assert.equal(Ls, LocalLights);

// ---- the patch lands in the real toon shader, for every toon material, with one program cache key ----------------------
const toon = THREE.ShaderLib.toon, sh = { uniforms: {}, vertexShader: toon.vertexShader, fragmentShader: toon.fragmentShader };
patchLocalLight(sh);
assert.match(sh.vertexShader, /vLocalWorld = \(modelMatrix \* localW\)\.xyz;/, 'the world position is passed on');
assert.match(sh.fragmentShader, /outgoingLight \+= diffuseColor\.rgb \* localAcc \* uLocalStrength;\s*outgoingLight = max\(/, 'light radii and the minimum ambient');
assert.ok(sh.fragmentShader.indexOf('localAcc') < sh.fragmentShader.indexOf('#include <opaque_fragment>'), 'before the output');
for (const k of ['uLocalPos', 'uLocalCol', 'uLocalCount', 'uLocalStrength', 'uLocalMin', 'uLocalBands']) assert.equal(sh.uniforms[k], Ls.uniforms[k], `${k} is shared`);
const mats = [toonMat(0x123456), toonVC, toonMat(0x123456).clone()];
for (const m of mats) { assert.equal(m.onBeforeCompile, patchLocalLight); assert.equal(m.customProgramCacheKey(), 'local-light'); }
const kelp = { uniforms: {}, vertexShader: toon.vertexShader, fragmentShader: toon.fragmentShader }; kelpVC.onBeforeCompile(kelp);
assert.match(kelp.fragmentShader, /localAcc/); assert.match(kelp.vertexShader, /uCoastalTime/);
let sway = null; game.world.objects.forEach(o => o.traverse?.(c => { if (!sway && c.material?.customProgramCacheKey?.() === 'sway-local') sway = c.material; }));
assert.ok(sway, 'the swaying grass uses the chained patch');
const swaySh = { uniforms: {}, vertexShader: toon.vertexShader, fragmentShader: toon.fragmentShader }; sway.onBeforeCompile(swaySh);
assert.match(swaySh.fragmentShader, /localAcc/); assert.match(swaySh.vertexShader, /uWind/);
pass('the patch lands before the toon output in the real three.js shader; every toon material, clones, grass and kelp share it and one cache key');

// ---- the surface is unchanged: darkness 0 ---------------------------------------------------------------------------
step(0.1); const sun0 = game.world.sun.intensity, hemi0 = game.world.hemi.intensity;
assert.equal(Ls.uniforms.uLocalStrength.value, 0); assert.equal(Ls.heroLight, null);
// ---- the dark: the sun and sky dim to the floor, the hero carries a light, the nearest sources get the spots ------------
const base = Ls.count;
const far = Array.from({ length: 12 }, (_, i) => Ls.add({ at: dirAlong(P.up, new THREE.Vector3(1, 0, 0).cross(P.up).normalize(), 3 + i * 3).multiplyScalar(P.r + 1), radius: 4 }));
Ls.setDarkness(1); step(0.1);
assert.ok(Math.abs(game.world.sun.intensity - sun0 * LL.dimFloor) < 0.05 && Math.abs(game.world.hemi.intensity - hemi0 * LL.dimFloor) < 0.05, 'dimmed to the floor');
assert.equal(Ls.uniforms.uLocalStrength.value, 1); assert.ok(Ls.heroLight, 'the hero carries a light');
assert.equal(Ls.uniforms.uLocalCount.value, LL.spots, 'the spots are full');
const p0 = Ls.uniforms.uLocalPos.value[0]; assert.ok(new THREE.Vector3(p0.x, p0.y, p0.z).distanceTo(P.pos) < 2, 'the hero light is the nearest');
const used = Ls.uniforms.uLocalPos.value.map(v => new THREE.Vector3(v.x, v.y, v.z).distanceTo(P.pos));
assert.ok(used.every((d, i) => i === 0 || d >= used[i - 1] - 1e-6), 'nearest first'); assert.ok(used.at(-1) < 25, 'the far ones wait');
Ls.setDarkness(0); step(0.1);
assert.equal(Ls.heroLight, null); assert.equal(Ls.uniforms.uLocalStrength.value, 0);
assert.ok(Math.abs(game.world.sun.intensity - sun0) < 0.05, 'back to normal daylight');
pass(`in the dark the sun and sky dim to ${LL.dimFloor * 100}%, the hero carries a light and the ${LL.spots} nearest of ${far.length + 1} sources get the spots; back at darkness 0 nothing remains`);

// ---- real point lights: all on or all off, at most four, off indoors ---------------------------------------------------
const lamps = Array.from({ length: 6 }, (_, i) => Ls.add({ at: dirAlong(P.up, P.fwd, 2 + i).multiplyScalar(P.r + 1.5), radius: 5, real: true }));
step(0.1);
assert.equal(Ls.pool.length, LL.realLights); assert.ok(Ls.pool.every(l => l.visible)); assert.equal(Ls.litPointLights(), LL.realLights);
assert.equal(Ls.pool.filter(l => l.intensity > 0).length, LL.realLights, 'the four nearest lamps are lit');
lamps.slice(1).forEach(h => h.remove()); step(0.1);
assert.ok(Ls.pool.every(l => l.visible), 'one lamp left: the pool stays on (no recompile)'); assert.equal(Ls.pool.filter(l => l.intensity > 0).length, 1);
lamps[0].remove(); step(0.1);
assert.ok(Ls.pool.every(l => !l.visible), 'no lamp: all off together'); assert.equal(Ls.litPointLights(), 0);
const lamp = Ls.add({ at: dirAlong(P.up, P.fwd, 2).multiplyScalar(P.r + 1.5), radius: 5, real: true });
Houses.enter(0); step(1.5); assert.ok(Houses.inside, 'inside a house');
assert.ok(Ls.pool.every(l => !l.visible), 'indoors the pool is off'); assert.ok(Ls.litPointLights() <= LL.realLights, `${Ls.litPointLights()} lit indoors`);
Houses.leave(); step(1.5); lamp.remove();
pass('real point lights switch on and off together (0 or 4), light the nearest lamps, and stay off indoors where the interior keeps its own');

// ---- sources go away with their owners and on travel -------------------------------------------------------------------
far.forEach(h => h.remove()); assert.equal(Ls.count, base);
H.goToPlanet(1); step(1); H.goToPlanet(0); step(1);
assert.equal(Ls.count, base, 'travel leaves no stray sources'); assert.ok(Ls.litPointLights() <= LL.realLights);
pass('sources are removed with their owners; travel leaves none behind');
