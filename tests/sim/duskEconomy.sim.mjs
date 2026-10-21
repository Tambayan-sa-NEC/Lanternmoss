// TODO 30c (resources, weather and music): Duskhollow's veins and glowcap patches are placed and worked with the real
// tools, the lumen chain smelts and brews, the Dusk set is forged and makes the lantern last, the deep dark thickens
// the dusk and presses the light in as a rule of the world rather than a side effect of its weather, the dripping caps
// water the farm where no rain falls, shade spores only take here, and the music box plays.
import assert from 'node:assert/strict';
import { installDuskhollowFixture } from './lib/duskhollowFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskhollowFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { LANTERN } = await imp('config/lantern.js');
const { CROPS, SHADE_CROP_REFUSAL } = await imp('config/resources.js');
const { useItemInSlot } = await imp('gameplay/itemUse.js');
const { equipFromSlot } = await imp('gameplay/equipment.js');
const { bagCommands } = await imp('gameplay/bagCommands.js');
const { RECIPES } = await imp('config/crafting.js');
const { dirAlong, tangentToward } = await imp('utils/sphere.js');
const { audio } = await imp('systems/AudioSystem.js');
const { Farm } = await imp('gameplay/Farm.js');
const { itemRegistry } = await imp('items/ItemRegistry.js');
const W = game.world, P = H.player, inv = H.inventory;
const lamp = () => H.Mechanics.active.instance;
const pass = m => console.log(`PASS  ${m}`);
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const nodesOf = kind => H.Gathering.nodes.filter(n => n.kind === kind);
const cmd = bagCommands(inv);
const atStation = id => { const s = H.Stations.list.find(s => s.id === id); P.placeAt(dirAlong(s.dir, tangentToward(s.dir, W.spawnDir), 1.4)); assert.equal(H.Stations.here(), id, `standing at the ${id}`); };
const make = id => { const r = RECIPES.find(x => x.result === id); atStation(r.station); return cmd.craft(r); };
const atPhase = f => { const target = f * DAY.length; dayClock.skip((target - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); };

try {
  H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

  // ---- the world's own nodes -------------------------------------------------------------------------------------
  const veins = nodesOf('lumenVein'), caps = nodesOf('glowcaps'), moonstone = nodesOf('moonstoneVein');
  assert.ok(veins.length > 0 && caps.length > 0 && moonstone.length > 0, `lumen veins ${veins.length}, glowcaps ${caps.length}, moonstone ${moonstone.length}`);
  assert.equal(audio.theme, W.planet.music, 'its own music box theme is playing');
  assert.equal(Farm.raining(), false, 'no rain falls under the canopy');
  pass(`${veins.length} lumen veins, ${caps.length} glowcap patches and a guarded moonstone vein are placed, with the ${audio.theme} theme`);

  // ---- the lumen chain: ore -> ingot, glowcaps -> oil, ore+silk -> the Dusk set -------------------------------------
  inv.add('lumenOre', 6); inv.add('glowcap', 6); inv.add('lumenDust', 6); inv.add('spiderSilk', 9); inv.add('moonstone', 1);
  inv.add('wood', 20); P.coins = 500;
  assert.ok(make('lumenIngot').ok, 'lumen ore smelts');
  assert.ok(inv.count('lumenIngot') >= 1 && inv.count('lumenOre') === 4);
  assert.ok(make('lumenOil').ok, 'glowcaps and dust press into oil');
  lamp().burn(LANTERN.oil.max);
  const pours = id => { const before = lamp().status.oil; assert.ok(useItemInSlot(inv, inv.find(id)).ok, `use ${id}`); return lamp().status.oil - before; };
  near(pours('glowcap'), 10); near(pours('lumenOil'), LANTERN.oil.max - 10);
  assert.ok(lamp().status.oil === LANTERN.oil.max, 'a flask fills the tank to the brim, never past it');
  pass('ore smelts into lumen ingots, glowcaps and dust brew into lumen oil, and both pour into the lantern');

  // ---- the Dusk set makes a tank last ------------------------------------------------------------------------------
  inv.add('lumenIngot', 9); inv.add('lumenDust', 9); inv.add('spiderSilk', 9);
  for (const piece of ['duskHood', 'duskMantle', 'duskBoots']) assert.ok(make(piece).ok, `forge ${piece}`);
  const burnOver = seconds => { lamp().refill(LANTERN.oil.max); const before = lamp().status.oil; step(seconds); return before - lamp().status.oil; };
  const plain = burnOver(2);
  for (const piece of ['duskHood', 'duskMantle']) assert.ok(equipFromSlot(inv, inv.find(piece)).ok, `wear ${piece}`);
  const two = burnOver(2);
  assert.ok(equipFromSlot(inv, inv.find('duskBoots')).ok, 'wear duskBoots');
  const three = burnOver(2);
  assert.ok(two < plain * 0.75 && three < two, `the set slows the burn (${plain.toFixed(2)} -> ${two.toFixed(2)} -> ${three.toFixed(2)})`);
  const wide = lamp().status.radius;
  assert.ok(wide > LANTERN.light.radius, `three pieces reach further (${wide.toFixed(2)} m)`);
  pass(`the worn Dusk set slows the burn from ${plain.toFixed(2)} to ${three.toFixed(2)} oil per two seconds and reaches ${wide.toFixed(1)} m`);

  // ---- the deep dark is this world's rule, not its weather's -------------------------------------------------------
  H.setWeather('clear'); W.weather.timer = 1e9; step(0.5);
  const clear = { dark: lamp().status.darkness, radius: lamp().status.radius, light: W.sun.intensity };
  H.setWeather('deepDark', true); W.weather.timer = 1e9; step(0.5);
  const deep = { dark: lamp().status.darkness, radius: lamp().status.radius };
  assert.ok(deep.dark > clear.dark + 0.05, `the dusk thickens (${clear.dark.toFixed(2)} -> ${deep.dark.toFixed(2)})`);
  assert.ok(deep.radius < clear.radius, 'and the lantern is pressed in');
  assert.ok(deep.dark < 1 && H.LocalLights.uniforms.uLocalMin.value > 0, 'never pitch dark');
  near(H.LocalLights.darkness, deep.dark, 1e-6);
  assert.equal(Farm.raining(), false, 'the deep dark waters nothing');
  H.setWeather('sporeDrift', true); step(0.3);
  assert.ok(W.weather.now.spores > 0 && lamp().status.deepDark === 0, 'spore drift drifts spores and leaves the dusk alone');
  H.setWeather('clear', true); step(0.3);
  pass(`deep dark thickens the dusk ${clear.dark.toFixed(2)} -> ${deep.dark.toFixed(2)} and shrinks the lantern, through the mechanic alone`);

  // ---- the dripping caps water the farm ------------------------------------------------------------------------------
  inv.add('shadeSpores', 4); inv.add('wateringCan', 1);
  const plot = Farm.plots[0];
  atPhase(0.5); step(0.3);
  assert.equal(lamp().status.watersFarm, false, 'the caps are dry by the afternoon');
  plot.s.tilled = true; Farm.look(plot);                                            // tilled, as the hoe leaves it
  Farm.plant(plot, { slot: inv.find('shadeSpores'), def: itemRegistry.get('shadeSpores') });
  assert.equal(plot.s.crop, 'shade', 'shade spores take under the caps');
  assert.equal(plot.s.watered, false, 'and are thirsty in the afternoon');
  atPhase(LANTERN.drip.from + 0.02); step(0.5);
  assert.equal(lamp().status.watersFarm, true);
  assert.equal(plot.s.watered, true, 'the dripping caps water the plot without any rain');
  assert.equal(Farm.raining(), false, 'and it never rained');
  pass('the dripping caps water the farm early in the day, where no rain ever falls');

  // ---- shade crops are a rule of the world ----------------------------------------------------------------------------
  H.inventory.add('wayfarerKey', 2);
  P.placeAt(H.Portals.gate.dir); assert.ok(H.Portals.travel('emberfall')); step(2);
  assert.equal(ctx.planetId, 'emberfall'); assert.equal(H.Mechanics.id, null);
  const away = Farm.plots[0];
  away.s.tilled = true; away.s.crop = null;
  Farm.plant(away, { slot: inv.find('shadeSpores'), def: itemRegistry.get('shadeSpores') });
  assert.equal(away.s.crop, null, SHADE_CROP_REFUSAL);
  assert.equal(Farm.shaded(), false, 'a sunlit world is no place for them');
  assert.ok(CROPS.shade.shade, 'the crop itself declares it');
  P.placeAt(H.Portals.gate.dir); assert.ok(H.Portals.travel('lanternmoss')); step(2);
  assert.equal(H.Mechanics.id, 'lantern'); assert.equal(Farm.shaded(), true);
  assert.equal(Farm.plots[0].s.crop, 'shade', 'the planted mushrooms were waiting here');
  pass('shade spores take only where the world says it lies in shade, and the planted plot survives the round trip');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
