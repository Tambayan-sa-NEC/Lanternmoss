// Claiming, actual crafts/transactions, indoor collisions, own-bed rest and portal/save lifecycle.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { Houses, currentInteraction } = await imp('gameplay/Houses.js');
const { HOME, FURNISHINGS } = await imp('config/home.js');
const { RECIPES } = await imp('config/crafting.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { NEEDS } = await imp('config/survival.js');
const { parseSave } = await imp('core/save.js');
const { useItemInSlot } = await imp('gameplay/itemUse.js');
const home = H.Home, P = H.player, inv = H.inventory;
const stand = (x, z) => { Object.assign(Houses.inside, { x, z, vx: 0, vz: 0 }); Houses.placeHero(); P.vel.set(0, 0, 0); };
const sign = () => stand(HOME.sign.x, HOME.sign.z + 0.85);
const enter = () => { P.placeAt(home.cottage.door); const t = currentInteraction(); assert.match(t.label, /cottage/); t.run(); step(1); assert.equal(Houses.inside.index, HOME.houseIndex); sign(); };
const leave = () => { H.HomeUI.close(); H.InventoryUI.close(); Houses.leave(); step(1); assert.equal(ctx.indoors, null); };
const travel = id => { P.placeAt(H.Portals.gate.dir); assert.ok(H.Portals.travel(id)); step(2); assert.equal(ctx.planetId, id); };
assert.equal(game.world.houses.length, 7); assert.equal(home.cottage.kind, 'cottage');
assert.equal(home.claim().ok, false); inv.add('homeBed', 1);
const bedQty = inv.count('homeBed'); assert.equal(useItemInSlot(inv, inv.find('homeBed')).ok, true); H.Building.cancel(); assert.equal(inv.count('homeBed'), bedQty); inv.remove('homeBed', 1);
enter(); assert.equal(Houses.inside.room.spots.some(s => s.kind === 'bed'), false);
assert.match(currentInteraction().label, /Claim/); currentInteraction().run(); assert.ok(H.HomeUI.isOpen && ctx.paused);
const clock = ctx.time; step(4); assert.equal(ctx.time, clock);
assert.ok(home.claim().ok); assert.equal(home.claim().ok, false); assert.equal(ctx.indoors, 'Your cottage');
H.HomeUI.key('Escape'); assert.equal(ctx.paused, false);
assert.ok(H.saves.store.read().data.planets.lanternmoss.home.claimed);
assert.ok(H.saves.continue()); assert.equal(Houses.inside.index, 6); assert.equal(home.state.claimed, true);
console.log('PASS  vacant cottage is separate; E/sign/claim pauses correctly, rejects outside placement and autosaves ownership through Continue');

leave(); inv.clear();
const bench = H.Stations.list.find(s => s.id === 'workbench'); P.placeAt(bench.dir);
for (const f of Object.values(FURNISHINGS)) for (const [id, n] of f.needs) inv.add(id, n);
for (const id of Object.keys(FURNISHINGS)) { assert.ok(H.InventoryUI.commands.craft(RECIPES.find(r => r.id === id), 1).ok, id); assert.equal(inv.count(id), 1); }
enter(); inv.move(inv.find('homeBed'), 0); H.Hotbar.selected = 0; assert.ok(H.Hotbar.use().ok);
for (const id of Object.keys(FURNISHINGS).filter(id => id !== 'homeBed')) { assert.ok(home.place(id).ok); assert.equal(inv.count(id), 0); }
assert.equal(home.state.furniture.length, 5); assert.equal(Houses.inside.room.obstacles.length, 4);
inv.add('homeTable', 1); assert.equal(home.place('homeTable').ok, false); assert.equal(inv.count('homeTable'), 1);
const x = Houses.inside.x, z = Houses.inside.z; assert.ok(H.saves.save().ok); assert.ok(H.saves.continue());
assert.equal(home.state.furniture.length, 5); assert.equal(Houses.inside.x, x); assert.equal(Houses.inside.z, z);
assert.equal(Houses.inside.room.obstacles.length, 4);
console.log('PASS  all five actual recipes craft at the workbench; bag/hotbar placement consumes exactly one, rejects duplicates and restores geometry/collisions');

inv.clear(); inv.add('glowStaff', inv.size); assert.equal(inv.freeSlots(), 0);
assert.equal(home.remove('homeBed').ok, false); assert.ok(home.state.furniture.includes('homeBed'));
inv.removeFromSlot(0); assert.ok(home.remove('homeBed').ok); assert.equal(inv.count('homeBed'), 1);
stand(FURNISHINGS.homeBed.x, FURNISHINGS.homeBed.z); assert.equal(home.place('homeBed').ok, false); assert.equal(inv.count('homeBed'), 1);
sign(); assert.ok(useItemInSlot(inv, inv.find('homeBed')).ok); assert.equal(inv.count('homeBed'), 0); inv.clear();
stand(FURNISHINGS.homeBed.x, FURNISHINGS.homeBed.z); step(0.1);
assert.ok(Math.hypot(Houses.inside.x - 3, Houses.inside.z + 2.2) >= 1.34, 'bed blocks movement');
stand(0, 0.9); step(0.1); assert.ok(Math.hypot(Houses.inside.x, Houses.inside.z - 0.9) < 0.1, 'rug is walk-through');
console.log('PASS  full-bag removal and overlapping placement are refused atomically; taking/replacing furniture returns the item and updates collisions');

dayClock.t = DAY.length * 0.8; const day = dayClock.day;
Object.assign(P, { hp: 10, mana: 5, energy: 7 }); stand(1.5, -1.7);
assert.match(currentInteraction().label, /bed/); currentInteraction().run(); step(1.2);
assert.equal(dayClock.day, day + 1); assert.equal(dayClock.phase, 'morning'); assert.equal(P.hp, P.stats.maxHp);
assert.equal(P.mana, P.stats.maxMana); assert.ok(P.energy > NEEDS.max - 0.1); assert.equal(ctx.transitioning, false);
assert.equal(H.saves.store.read().data.systems.dayClock.day, day + 1);
Object.assign(P, { hp: 10, mana: 5, energy: 7 }); currentInteraction().run(); step(1.2);
assert.ok(P.hp >= 10 + P.stats.maxHp * 0.4); assert.ok(P.mana >= 5 + P.stats.maxMana * 0.4); assert.ok(P.energy >= 46.9);
console.log('PASS  own bed sleeps to morning with HP/resource/energy recovery, daytime naps recover partially and rest autosaves after the fade');

Houses.opened.add('lanternmoss:0'); Houses.lore['lanternmoss:2'] = 1; Houses.ovenDay['lanternmoss:1'] = 3;
assert.ok(H.saves.save().ok); assert.ok(H.saves.continue());
assert.ok(Houses.opened.has('lanternmoss:0')); assert.equal(Houses.lore['lanternmoss:2'], 1); assert.equal(Houses.ovenDay['lanternmoss:1'], 3);
const original = home.toJSON(); leave(); H.planets.defeated.add('lanternmoss'); travel('emberfall');
assert.deepEqual(home.toJSON(), { claimed: false, furniture: [] }); enter(); assert.ok(home.claim().ok);
inv.add('homePlant', 1); assert.ok(home.place('homePlant').ok); assert.ok(H.saves.save().ok); assert.ok(H.saves.continue());
assert.deepEqual(home.state.furniture, ['homePlant']); assert.equal(Houses.inside.index, 6);
leave(); travel('lanternmoss'); assert.deepEqual(home.toJSON(), original); enter(); assert.equal(Houses.inside.room.obstacles.length, 4);
leave(); travel('emberfall'); assert.deepEqual(home.state.furniture, ['homePlant']);
assert.ok(H.npcs.some(n => n.name === 'Cinder')); assert.equal(game.world.houses.length, 7);
console.log('PASS  portal round trips and indoor Continue retain separate planet homes; pre-existing house chest/lore/oven state survives');

H.planets.defeated.add('emberfall'); travel('frostveil'); assert.equal(home.state.claimed, false);
assert.equal(home.cottage.kind, 'cottage'); assert.ok(H.npcs.some(n => n.name === 'Tuva'));
enter(); assert.ok(home.claim().ok); inv.add('homeBed', 1); assert.ok(home.place('homeBed').ok);
P.dead = true; Houses.use(Houses.inside.room.spots.find(s => s.kind === 'bed')); assert.equal(Houses.fade, null); P.dead = false;
leave(); travel('lanternmoss'); assert.deepEqual(home.toJSON(), original);
console.log('PASS  Frostveil also has an independent cottage without replacing Tuva; a fainted hero cannot sleep');

const fixture = parseSave(readFileSync(new URL('../fixtures/save-v1.json', import.meta.url), 'utf8')); assert.ok(fixture.ok);
assert.ok(H.saves.importData(fixture.data)); assert.deepEqual(home.toJSON(), { claimed: false, furniture: [] });
game.resetRun(); assert.deepEqual(home.toJSON(), { claimed: false, furniture: [] }); assert.equal(game.saves.registry.planets.lanternmoss, undefined);
assert.equal(game.world.houses.length, 7); assert.equal(ctx.planetId, 'lanternmoss');
console.log('PASS  legacy imports add no free furnishings; fresh adventures clear ownership/decorations and leave exactly one cottage');
console.log('all passed');
