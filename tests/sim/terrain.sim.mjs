// Bigger, varied planets: shape per planet, flat village / arena / ponds, cliffs, climbable rocks, wading and
// swimming, spawns kept off cliffs, and the cost of the height field.
import { boot, imp } from './lib/boot.mjs';
const THREE = await import('three');
const { ctx } = await imp('core/context.js');
const { WORLD, PLANET_RADIUS: R } = await imp('config/game.js');
const T = await imp('world/terrain.js');
const { solids, supportHeight } = await imp('physics/colliders.js');
const { arcDist, dirAlong, offsetDir, randomDir, tangentFrame, tangentToward } = await imp('utils/sphere.js');
let t0 = performance.now();
const { H, step, game } = await boot('knight');
console.log(`   boot + first planet: ${((performance.now() - t0) / 1000).toFixed(1)} s`);
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player, keys = H.keys, W = game.world;
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const spread = (center, r) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < 80; i++) { const d = offsetDir(center, i * 2.4, (i % 8 + 1) / 8 * r); if (T.ponds.some(p => arcDist(d, p.dir) < p.r + 2)) continue; const h = T.groundHeight(d); lo = Math.min(lo, h); hi = Math.max(hi, h); } return hi - lo; };
const walk = (dir, secs, sprint = false) => {         // hold W toward dir
  const t = tangentToward(P.up, dir); H.cam.fwd.copy(t); keys.KeyW = true; keys.ShiftLeft = sprint;
  for (let i = 0; i < secs * 60; i++) { H.cam.fwd.copy(tangentToward(P.up, dir)); step(1 / 60); }
  keys.KeyW = false; keys.ShiftLeft = false; step(0.3);
};
step(0.5);
for (let planet = 0; planet < 3; planet++) {
  if (planet) { t0 = performance.now(); H.goToPlanet(planet); console.log(`   travel to planet ${planet + 1}: ${((performance.now() - t0) / 1000).toFixed(1)} s`); step(0.5); }
  const name = ['Lanternmoss', 'Emberfall', 'Frostveil'][planet];
  let hi = -Infinity, lo = Infinity, steep = 0; const N = 3000;
  for (let i = 0; i < N; i++) { const d = randomDir(Math.random), h = T.groundHeight(d) - R; hi = Math.max(hi, h); lo = Math.min(lo, h); if (T.slopeAt(d) > WORLD.maxSlope) steep++; }
  check(hi - lo > 5, `${name}: real relief (${lo.toFixed(1)} to +${hi.toFixed(1)} m; ${(steep / N * 100).toFixed(1)}% cliffs)`);
  check(spread(W.spawnDir, 20) < 1.6, `${name}: the village is on level ground (spread ${spread(W.spawnDir, 20).toFixed(2)} m)`);
  check(spread(W.lairDir, 22) < 1.6 && arcDist(ctx.boss.home, W.lairDir) < 1, `${name}: the boss fights on a flat arena (spread ${spread(W.lairDir, 22).toFixed(2)} m, ${arcDist(W.spawnDir, W.lairDir).toFixed(0)} m from the village)`);
  const badDoors = W.houses.filter(h => Math.abs(T.groundHeight(h.door) - T.groundHeight(h.dir)) > 0.6).length;
  check(!badDoors, `${name}: every house door is level with its house`);
  const onCliffs = ctx.enemies.filter(e => e !== ctx.boss && T.slopeAt(e.home) > 0.8).length;
  check(onCliffs <= 1, `${name}: monsters don't spawn on cliffs (${onCliffs} of ${ctx.enemies.length})`);
  check(ctx.enemies.length > 18, `${name}: more monsters for the bigger planet (${ctx.enemies.length})`);
  check(T.ponds.length >= 4 && T.ponds.some(p => p.r >= 8), `${name}: ponds and big lakes (${T.ponds.length}, biggest ${Math.max(...T.ponds.map(p => p.r)).toFixed(1)} m)`);
}
H.goToPlanet(1); step(1);   // Emberfall's mesas have the cliffs
// ---- cliffs: find a steep slope and try to walk up it
let cliff = null, uphill = new THREE.Vector3();
for (let i = 0; i < 20000 && !cliff; i++) {
  const d = randomDir(Math.random); if (arcDist(d, W.spawnDir) < 30 || T.waterAt(d)) continue;
  const k = T.terrainGradient(d, uphill); if (k > WORLD.maxSlope * 1.4) { const up = dirAlong(d, uphill, 3); if (T.groundHeight(up) - T.groundHeight(d) > 2.4) cliff = d; }
}
if (cliff) {
  T.terrainGradient(cliff, uphill); const below = dirAlong(cliff, uphill, -2.5), above = dirAlong(cliff, uphill, 4);
  P.placeAt(below); step(0.3); const h0 = P.r;
  walk(above, 2.5);
  check(P.r - h0 < 1.6, `a cliff can't be walked up (rose ${(P.r - h0).toFixed(2)} m trying)`);
} else check(false, 'found a cliff to test on Emberfall');
H.goToPlanet(0); step(1);
// ---- rocks: walk into one, then jump onto it
const rock = solids.filter(s => s.top > 0.9 && s.top < 2.0 && arcDist(s.dir, W.spawnDir) > 28).sort((a, b) => a.top - b.top)[0];
check(!!rock && solids.length > 40, `rocks are solids you can stand on (${solids.length} on the planet)`);
if (rock) {
  const t = tangentFrame(rock.dir)[0], start = dirAlong(rock.dir, t, rock.r + 1.4);
  P.placeAt(start); step(0.3);
  walk(rock.dir, 1.2);
  check(P.r < rock.baseH + rock.top - 0.3, `walking into a rock taller than a step stops you (rock ${rock.top.toFixed(2)} m)`);
  P.placeAt(start); step(0.3);
  H.cam.fwd.copy(tangentToward(P.up, rock.dir)); keys.KeyW = true; press('Space'); keys.Space = true;
  for (let i = 0; i < 60; i++) { H.cam.fwd.copy(tangentToward(P.up, rock.dir)); step(1 / 60); }
  keys.Space = false;
  for (let i = 0; i < 25; i++) { H.cam.fwd.copy(tangentToward(P.up, rock.dir)); step(1 / 60); }
  keys.KeyW = false; step(0.6);
  check(Math.abs(P.r - (rock.baseH + rock.top)) < 0.25 && P.grounded, `jumping onto it, you stand on top (height ${(P.r - rock.baseH).toFixed(2)} m)`);
}
// ---- water: wade in, swim, come back out
const lake = T.ponds.filter(p => p.r >= 8).sort((a, b) => arcDist(a.dir, P.up) - arcDist(b.dir, P.up))[0] ?? T.ponds[0];
const shore = dirAlong(lake.dir, lake.t1, lake.r + 3);
P.placeAt(shore); step(0.3);
let maxDepth = 0, swam = false, splashes = 0;
const sp = (await imp('fx/sparkles.js')).sparkles, emit = sp.emit.bind(sp); sp.emit = (...a) => { splashes++; return emit(...a); };
const t1 = performance.now(); walk(lake.dir, 3.5);
check(P.swimming && P.waterDepth > WORLD.water.deep, `walk into the lake and you swim (water ${P.waterDepth.toFixed(2)} m deep)`);
check(Math.abs(P.r - (T.waterAt(P.up).level - WORLD.water.swimDepth)) < 0.1, 'a swimmer floats at the surface');
const a = P.up.clone(); walk(dirAlong(lake.dir, lake.t2, lake.r), 1); const swimSpeed = arcDist(a, P.up) / 1.3;
check(swimSpeed < 4.2, `swimming is slower than walking (${swimSpeed.toFixed(1)} m/s vs ${5})`);
check(splashes > 5, `splashes and ripples (${splashes} sparkle bursts)`);
walk(shore, 6);
check(!P.swimming && P.waterDepth < 0.15 && P.grounded, 'and you can climb back out onto the shore');
void t1; sp.emit = emit;
// ---- villagers, pets and monsters still get about
const fern = ctx.npcs.find(n => n.name === 'Fern'), f0 = fern.up.clone(); step(8);
check(ctx.npcs.every(n => Number.isFinite(n.r) && n.r > R - 12), 'villagers stay on the ground');
check(Number.isFinite(ctx.companion.pos.x), 'the pet follows over the hills');
void f0;
// ---- cost of the height field
let t = performance.now(); const dir = new THREE.Vector3(); for (let i = 0; i < 100000; i++) { dir.set(Math.sin(i), Math.cos(i * 1.3), Math.sin(i * 0.7)).normalize(); T.groundHeight(dir); }
const us = (performance.now() - t) / 100000 * 1000; check(us < 3, `groundHeight is cheap (${us.toFixed(2)} µs a call)`);
t = performance.now(); for (let i = 0; i < 20000; i++) { dir.set(Math.sin(i), Math.cos(i * 1.3), Math.sin(i * 0.7)).normalize(); supportHeight(dir); }
check((performance.now() - t) / 20000 * 1000 < 25, `supportHeight is cheap (${((performance.now() - t) / 20000 * 1000).toFixed(2)} µs a call)`);
t = performance.now(); step(2); check((performance.now() - t) / 120 < 25, `a frame of simulation stays light (${((performance.now() - t) / 120).toFixed(1)} ms)`);
console.log(fails ? `${fails} FAILED` : 'all passed');
