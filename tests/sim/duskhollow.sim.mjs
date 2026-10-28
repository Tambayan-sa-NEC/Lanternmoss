// TODO 30a (twilight terrain and lantern): the unreleased Duskhollow terrain generates with its lantern mechanic; the
// endless dusk follows the day clock and the canopy, the village gap stays safe light and a house turns the dusk off;
// the belt lantern becomes the hero's carried light, burns only while you actually play outdoors, survives pause,
// time skips, saves, Continue and real portal travel, and an empty lantern only shrinks to a safe ember; the glowmoss
// trail is bounded and the lowest quality preset stays readable.
import assert from 'node:assert/strict';
import { installDuskhollowFixture } from './lib/duskhollowFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskhollowFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { ctx } = await imp('core/context.js');
const { LANTERN } = await imp('config/lantern.js'), { RENDER } = await imp('config/render.js');
const { canopyCover, canopyLayout, duskAt, activeLantern } = await imp('world/mechanics/lantern.js');
const { groundHeight } = await imp('world/terrain.js');
const { offsetDir } = await imp('utils/sphere.js');
const { setSetting } = await imp('core/settings.js');
const { Houses } = await imp('gameplay/Houses.js');
const { dom } = await imp('ui/dom.js');
const W = game.world, P = H.player, Ls = H.LocalLights;
const instance = () => H.Mechanics.active.instance;
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const pass = m => console.log(`PASS  ${m}`);
const layout = canopyLayout(W.planet.canopy, W.spawnDir);
const deepDir = offsetDir(W.spawnDir, 1.75, 160);
const atPhase = f => { const target = f * DAY.length; dayClock.skip((target - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); };

try {
  H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

  // ---- the world generates with its mechanic, deep valleys and a lit hero ------------------------------------------
  assert.equal(H.Mechanics.id, 'lantern'); assert.equal(activeLantern(), instance());
  const heights = Array.from({ length: 240 }, (_, i) => groundHeight(offsetDir(W.spawnDir, i * 2.399963, Math.acos(1 - 2 * (i + 0.5) / 240) * 72)));
  assert.ok(Math.max(...heights) - Math.min(...heights) > 12, 'deep valleys under the canopy');
  assert.ok(H.Gathering.nodes.length > 0 && H.Farm.plots.length === 6, 'the village site still supports farm and nodes');
  assert.ok(Ls.heroLight, 'the hero carries the belt lantern');
  near(Ls.heroLight.source.radius, instance().status.radius);
  assert.ok(Math.abs(Ls.heroLight.source.radius - LANTERN.light.radius) < LANTERN.light.radius * LANTERN.light.flicker + 1e-6);
  assert.ok(P.body.children.some(o => o.isGroup), 'the lantern hangs from the hero');
  pass('Duskhollow generates deep valleys with the lantern mechanic; the belt lantern is the hero\'s carried light');

  // ---- the endless dusk: the day clock turns, the canopy decides, the village and a house are safe light ------------
  P.placeAt(deepDir); step(0.2);
  atPhase(0.5); step(0.2); const bright = instance().status.darkness;
  atPhase(0); step(0.2); const dark = instance().status.darkness;
  assert.ok(dark > bright + 0.05, `the night must be dimmer than the day (${bright} -> ${dark})`);
  assert.ok(bright > 0 && dark < 1, 'never full daylight and never pitch dark');
  near(dark, canopyCover(deepDir, layout) * duskAt(dayClock.day * 0 + (dayClock.day - 1) * DAY.length + dayClock.t).level, 1e-3);
  near(Ls.darkness, dark); assert.ok(Ls.uniforms.uLocalMin.value >= RENDER.localLight.minAmbient);
  P.placeAt(W.spawnDir); step(0.2);
  assert.ok(instance().status.darkness < dark * 0.5, 'the village gap is the safe light');
  assert.equal(instance().status.label, 'Village light');
  P.placeAt(layout.gaps[0].dir); step(0.2); assert.equal(instance().status.label, 'Starlight gap');
  P.placeAt(deepDir); step(0.2);
  Houses.enter(0); step(1.5); assert.ok(Houses.inside);
  assert.equal(instance().status.darkness, 0); assert.equal(Ls.darkness, 0);
  const indoorOil = instance().status.oil; step(1); near(instance().status.oil, indoorOil, 1e-6);
  Houses.leave(); step(1.5); assert.ok(instance().status.darkness > 0);
  pass('the dusk brightens and dims with the day clock, the village gap and a house stay safe light, and indoors burns no oil');

  // ---- the Oil bar and the status chip ------------------------------------------------------------------------------
  step(0.3);
  assert.ok(dom.oilBar.classList.contains('show'), 'the Oil bar is shown on a lantern world');
  assert.ok(dom.hud.innerHTML.includes('Lantern'), dom.hud.innerHTML);
  pass('the Oil bar appears beside Energy and the lantern chip renders');

  // ---- oil burns only while you play; pause and skipped time never empty the tank -----------------------------------
  instance().refill(LANTERN.oil.max);
  const full = instance().status.oil; step(2);
  const burned = full - instance().status.oil;
  near(burned, LANTERN.oil.burn * 2, 0.05);
  const held = instance().status.oil;
  ctx.paused = true; step(2); near(instance().status.oil, held); ctx.paused = false;
  dayClock.skip(DAY.length, 'sleep'); step(0.1);
  assert.ok(instance().status.oil > held - LANTERN.oil.burn * 0.2, 'sleeping through a night must not empty the tank');
  pass('oil burns at its configured rate while playing, and neither pause nor a night of sleep drains it');

  // ---- an empty lantern is safe: a smaller glow, no damage ----------------------------------------------------------
  instance().burn(LANTERN.oil.max);
  const hp = P.hp; step(2);
  assert.equal(instance().status.lit, false); assert.equal(P.hp, hp, 'the dark never hurts');
  assert.ok(Ls.heroLight.source.radius <= LANTERN.light.emberRadius + 1e-6 && Ls.heroLight.source.radius > 0, 'a safe ember remains');
  assert.ok(dom.oilBar.classList.contains('out'));
  assert.equal(instance().refill(LANTERN.oil.refillStep), LANTERN.oil.refillStep); step(0.1);
  assert.ok(instance().status.lit && Ls.heroLight.source.radius > LANTERN.light.emberRadius);
  pass('an empty lantern only shrinks to a safe ember, never damages, and one refill lights it again');

  // ---- the trail is bounded, and the lowest quality preset stays readable --------------------------------------------
  const walk = metres => { for (let i = 0; i < metres; i++) { P.placeAt(offsetDir(deepDir, 0.4, 2 + i)); step(1 / 60); } };
  walk(40); assert.ok(W.lantern.prints > 0 && W.lantern.prints <= LANTERN.foot.max, `prints ${W.lantern.prints}`);
  setSetting('quality', 'low'); step(0.2);
  const lowCap = Math.floor(LANTERN.foot.max * 0.35);
  walk(40); assert.ok(W.lantern.prints <= lowCap, `low preset trail ${W.lantern.prints} > ${lowCap}`);
  assert.ok(Ls.darkness < 1 && Ls.uniforms.uLocalMin.value > 0 && Ls.heroLight, 'the lowest preset keeps a lit, readable hero');
  setSetting('quality', 'high'); step(0.2);
  pass('the glowmoss trail stays within its pool and shrinks with the quality preset, which stays readable');

  // ---- per-planet saves, Continue and real travel ---------------------------------------------------------------------
  instance().burn(LANTERN.oil.max); instance().refill(37);
  const saved = instance().status.oil;
  assert.ok(H.saves.save().ok);
  instance().burn(20); near(instance().status.oil, saved - 20, 1e-6);               // spend it, then Continue must bring it back
  assert.ok(H.saves.continue()); step(0.3);
  near(instance().status.oil, saved, LANTERN.oil.burn * 0.5);
  assert.equal(H.Mechanics.id, 'lantern');
  H.inventory.add('wayfarerKey', 2);
  const travel = id => { P.placeAt(H.Portals.gate.dir); assert.ok(H.Portals.travel(id)); step(2); assert.equal(ctx.planetId, id); };
  travel('emberfall');
  assert.equal(H.Mechanics.id, null); assert.equal(activeLantern(), null); assert.equal(Ls.darkness, 0); assert.equal(Ls.heroLight, null);
  dayClock.skip(DAY.length * 2, 'sleep');
  travel('lanternmoss'); step(0.3);
  assert.equal(H.Mechanics.id, 'lantern');
  const back = instance().status.oil;                                               // the tank returns as it was, less the seconds actually played
  assert.ok(Math.abs(back - saved) < LANTERN.oil.burn * 4 && back !== LANTERN.oil.start, `oil came back as ${back}, saved ${saved}`);
  assert.ok(Ls.heroLight, 'the lantern comes back with the world');
  assert.equal(game.planets.canTravelTo('duskhollow'), false, 'the actual unfinished world stays outside campaign travel');
  pass('oil is saved per planet and survives Continue; travel takes the dusk, the lantern and its light away and brings them back');

  const sources = Ls.count;
  W.dispose(); assert.equal(Ls.darkness, 0); assert.ok(Ls.count <= sources, 'disposal leaves no stray light sources');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
