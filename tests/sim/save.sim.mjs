// Real systems and world reconstruction, beyond the pure format tests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { cleanState, SAVE_KEY, AUTOSAVE_SECONDS, parseSave } = await imp('core/save.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { QUESTS } = await imp('config/quests.js');
const { Houses, houseDef } = await imp('gameplay/Houses.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { Equipment } = await imp('gameplay/equipment.js');
const { RareGifts } = await imp('entities/wildlife/wildlife.js');
const { CRITTER_DEFS } = await imp('config/critters.js');
const { CombatState } = await imp('combat/casting.js');
const { Pickups, spawnWorldItem } = await imp('gameplay/pickups.js');
const { encounterEvents } = await imp('combat/events.js');
const canonical = data => JSON.parse(JSON.stringify(data, (_, v) => typeof v === 'number' ? Math.round(v * 1e8) / 1e8 : v));
const equal = (a, b, message) => assert.deepEqual(canonical(a), canonical(b), message);
const snapshot = () => game.saves.registry.snapshot(H.planetId, '2026-10-09T00:00:00.000Z');

// Populate every owned system before checking load(toJSON(state)).
Object.assign(H.player, { level: 4, xp: 19, coins: 237, hp: 87, mana: 51, energy: 37, lastHurt: 6 }); ctx.time = 44;
H.inventory.add('wood', 12); H.inventory.add('moonberry', 3); H.Hotbar.selected = 2; H.Hotbar.cd = 0.5;
const gear = H.items.all().find(d => d.equip?.hero === 'witch' && d.equip.slot === 'weapon');
Equipment.load(cleanState('equipment', { weapon: { itemId: gear.id, props: { rarity: 'rare' } } }));
H.Pets.unlocked.add('fox'); H.Pets.active = 'fox'; H.Pets.names.fox = 'Ember'; H.Pets.mode = 'stay';
H.Pets.hpFor = 'fox'; H.Pets.hp = 48; H.Pets.stayDir = H.player.up.clone(); H.Pets.abilityCd = 7;
const qid = Object.keys(QUESTS)[0]; Object.assign(Quests.st(qid), { status: 'active', n: 2, readyAt: 11 }); Quests.tracked = qid;
Object.assign(H.Challenges.state('fireflyCatch'), { attempts: 3, wins: 1, losses: 2, best: 18, readyAt: 60, reaction: 'success' });
H.npcs[0].nextLine(); dayClock.t = 120; dayClock.day = 3; H.buffs.might = 30;
Houses.opened.add('lanternmoss:0'); Houses.lore['lanternmoss:0'] = 1; Houses.ovenDay['lanternmoss:0'] = 3; Houses.teaAt = 21;
const rare = Object.values(CRITTER_DEFS).find(c => c.rare?.gift).rare.gift; RareGifts.load([rare]);
CombatState.load(cleanState('combat', { meteor: 18 }));
Object.assign(H.Farm.plots[0].s, { tilled: true, crop: 'carrot', growth: 0.45, watered: true }); H.Farm.day = 3;
H.Gathering.nodes[0].regrowT = 75; H.Gathering.rest.set('tree:0', 23); H.Gathering.tipsShown.add('wood');
H.Chests.opened.add(H.Chests.list[0].id); H.Chests.list[0].opened = true; H.Chests.sinceKey = 5;
H.BossGate.seals[0]?.vanish(); H.BossGate.hinted.add('Old Bramble');
spawnWorldItem('wood', 7, H.player.up, { props: { rarity: 'rare' }, pickupDelay: 0.7, stepAway: true });
const expected = snapshot();
for (const [key, system] of game.saves.registry.entries) {
  const state = cleanState(key, system.toJSON(), H.player.charId);
  system.load(structuredClone(state));
  equal(cleanState(key, system.toJSON(), H.player.charId), state, `${key} runtime round-trip`);
}
console.log('PASS  every registered runtime system round-trips populated state');

// Continue must preserve values even though planet generation heals/rebuilds the hero.
assert.ok(game.saves.save().ok);
const deviceJournal = JSON.stringify(H.Journal.data);
H.player.level = 1; H.player.coins = 0; H.inventory.clear(); H.Pets.reset(); H.buffs.might = 0;
assert.ok(game.saves.continue());
equal(snapshot(), expected, 'full adventure round-trip');
assert.equal(JSON.stringify(H.Journal.data), deviceJournal, 'Continue never grants journal rewards');
assert.equal(H.player.hp, 87); assert.equal(H.player.mana, 51);
console.log('PASS  Continue rebuilds the world and restores adventure, survival, story and vitals');

// Active collect, race and defeat runs resume without another attempt or reward.
for (const id of ['fireflyCatch', 'lanternDash', 'wispTrial']) {
  const def = H.CHALLENGES[id]; assert.ok(def, id);
  const npc = H.npcs.find(n => n.name === def.giver);
  H.Challenges.start(id, npc); H.Challenges.run.t = 4;
  const before = cleanState('challenges', H.Challenges.toJSON());
  const coins = H.player.coins; assert.ok(game.saves.save().ok); assert.ok(game.saves.continue());
  equal(cleanState('challenges', H.Challenges.toJSON()), before, `${id} active run`);
  assert.equal(H.player.coins, coins); H.Challenges.cancel();
}
console.log('PASS  all three challenge kinds resume without replaying rewards');

Houses.goInside(1, houseDef(1)); Houses.inside.x = 0.4; Houses.inside.z = -0.3; Houses.placeHero();
assert.ok(game.saves.save().ok); assert.ok(game.saves.continue());
assert.equal(Houses.inside.index, 1); assert.equal(Houses.inside.x, 0.4); assert.equal(ctx.indoors, houseDef(1).name);
Houses.reset(); H.player.placeAt(game.world.spawnDir);
console.log('PASS  Continue restores an interior and its hero controller');

const firstFarm = H.Farm.toJSON(); H.goToPlanet('emberfall');
assert.equal(H.planetId, 'emberfall'); assert.equal(game.saves.store.read().data.planetId, 'emberfall', 'arrival autosaves');
H.Farm.plots[0].s.tilled = true; const secondFarm = H.Farm.toJSON();
H.goToPlanet('lanternmoss'); equal(H.Farm.toJSON(), firstFarm, 'first planet plots retained');
H.goToPlanet('emberfall'); equal(H.Farm.toJSON(), secondFarm, 'second planet plots retained');
console.log('PASS  arrival autosave and separate planet snapshots survive return trips');

// Save after boss cleanup, before the treasure is opened. It must remain lootable.
H.wakeBoss(); ctx.boss.vanish(); encounterEvents.dispatchEvent(new CustomEvent('bossdefeated', { detail: { boss: ctx.boss } })); H.planets.update(0.1);
assert.ok(game.saves.store.read().data.systems.progression.defeated.includes('emberfall'));
assert.ok(game.saves.continue()); assert.equal(H.planets.state, 'loot'); assert.ok(!ctx.boss.alive);
assert.ok(H.Chests.bossChest && !H.Chests.bossChest.opened);
H.Chests.open(H.Chests.bossChest);
const loot = Pickups.toJSON().filter(w => w.bossLoot); assert.ok(loot.length);
assert.ok(game.saves.save().ok); assert.ok(game.saves.continue());
equal(Pickups.toJSON().filter(w => w.bossLoot), loot, 'uncollected boss rewards survive');
assert.ok(H.Chests.bossChest.opened);
console.log('PASS  boss autosave restores beaten boss, treasure and uncollected loot');

H.player.coins = 314; game.saves.timer = 0; game.saves.update(0.1);
assert.equal(game.saves.store.read().data.systems.player.coins, 314); assert.equal(game.saves.timer, AUTOSAVE_SECONDS);
H.player.coins = 315; __fire('pagehide'); assert.equal(game.saves.store.read().data.systems.player.coins, 315);
H.PauseMenu.open(); H.PauseMenu.handlers.onSave(); assert.ok(game.saves.store.read().ok);
H.PauseMenu.handlers.onQuit(); assert.equal(ctx.started, false); assert.equal(H.MainMenu.screen, 'title');
H.MainMenu.act('continue'); assert.equal(H.player.coins, 315);
console.log('PASS  interval, page exit, manual Save, quit and Continue share the slot');

const original = localStorage.getItem(SAVE_KEY);
assert.equal((await game.saves.importFile({ size: 9, text: async () => '{broken' })).ok, false);
assert.equal(localStorage.getItem(SAVE_KEY), original);
const fixture = parseSave(readFileSync(new URL('../fixtures/save-v1.json', import.meta.url), 'utf8'));
assert.ok(fixture.ok); assert.ok(game.saves.importData(fixture.data)); assert.equal(H.player.level, 4);
const diskWrite = localStorage.setItem; localStorage.setItem = () => { throw new Error('quota'); };
H.PauseMenu.open(); assert.equal(H.PauseMenu.handlers.onQuit(), false); assert.ok(ctx.started && H.PauseMenu.isOpen);
localStorage.setItem = diskWrite; H.PauseMenu.close();
console.log('PASS  old fixture imports; damaged imports and failed quit-save preserve current state');
console.log('all passed');
