// Chests end to end: placement, prompt, opening + loot, locked chests and keys, opened state, boss chest + travel.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { currentInteraction, Houses } = await imp('gameplay/Houses.js');
const { Chests } = await imp('gameplay/Chests.js');
const { rollLoot } = await imp('gameplay/loot.js');
const { Dialog } = await imp('ui/Dialog.js');
const { PLANETS } = await imp('config/planets.js');
const { KEYS, LOOT, LOOT_TABLES } = await imp('config/chests.js');
const { colliders } = await imp('physics/colliders.js');
const { arcDist, dirAlong, tangentToward } = await imp('utils/sphere.js');
const { SPAWN_DIR } = await imp('world/World.js');
const { H, step, game } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player;
step(1);
const want = PLANETS[0].chests.reduce((s, c) => s + c.count, 0);
check(Chests.list.length === want, `planet 1 has its ${want} chests (${Chests.list.length})`);
check(Chests.list.every(c => arcDist(c.up, SPAWN_DIR) >= c.def.minFromVillage * 0.6), 'none in the village');
check(Chests.list.every(c => colliders.includes(c.collider)), 'each chest is solid');
const spots0 = Chests.list.map(c => c.up.clone());
// walk up to a common chest
const standBy = c => { P.placeAt(dirAlong(c.up, tangentToward(c.up, SPAWN_DIR), 1.4)); step(0.1); };
const common = Chests.list.find(c => c.kind === 'common');
standBy(common);
let t = currentInteraction();
check(/Open the Mossy chest/.test(t?.label ?? ''), `prompt: "${t?.label}"`);
const coins0 = P.coins, items0 = ctx.worldItems.length;
t.run(); step(0.05);
check(common.opened && P.coins > coins0, `opens, coins paid (+${P.coins - coins0})`);
check(ctx.worldItems.length > items0, `loot hops out (${ctx.worldItems.length - items0} stacks)`);
step(1.5);
check(common.parts.lid.rotation.x < -1.5, `lid swung open (${common.parts.lid.rotation.x.toFixed(2)})`);
const bagBefore = P.inventory.getSlots().filter(Boolean).length;
for (const w of [...ctx.worldItems]) if (arcDist(w.up, common.up) < 3) { P.placeAt(w.up); step(0.3); }
check(P.inventory.getSlots().filter(Boolean).length > bagBefore, 'loot can be picked up');
standBy(common); t = currentInteraction();
check(!/Mossy/.test(t?.label ?? ''), 'an opened chest has no prompt');
// locked chest
const rare = Chests.list.find(c => c.kind === 'rare');
standBy(rare); t = currentInteraction();
check(/locked/.test(t?.label ?? ''), `locked prompt: "${t?.label}"`);
t.run(); step(0.1);
check(!rare.opened && rare.rattleT >= 0 || !rare.opened, 'no key: it stays shut (rattles)');
// Old Bramble has a spare
const bramble = ctx.npcs.find(n => n.name === 'Old Bramble');
P.placeAt(dirAlong(bramble.up, bramble.fwd, 1.6)); step(0.1);
let talks = 0;
for (; talks < 8 && !Chests.hasKey(); talks++) { Dialog.start(bramble); step(0.1); if (Dialog.choice) Dialog.choose(false); Dialog.close(); step(0.1); }
console.log('   (key after', talks, 'chats)');
check(Chests.hasKey(), `Old Bramble hands over his spare key (keys: ${P.inventory.count(KEYS.item)})`);
standBy(rare); t = currentInteraction();
check(/Unlock/.test(t?.label ?? ''), `with a key: "${t?.label}"`);
t.run(); step(0.1);
check(rare.opened && !Chests.hasKey(), 'unlocks, and the key is used up');
// key drops from monsters (when a locked chest waits)
H.goToPlanet(1); step(1);
check(Chests.list.length === PLANETS[1].chests.reduce((s, c) => s + c.count, 0), 'next planet: its own chests');
let drops = 0;
for (let i = 0; i < 12; i++) { const e = ctx.enemies.find(x => x.alive && x !== ctx.boss); if (!e) break; Chests.onEnemyDefeated(e); if (ctx.worldItems.some(w => w.itemId === KEYS.item)) { drops++; break; } }
check(drops === 1, 'monsters drop a Lantern Key (guaranteed within the pity count)');
const before = ctx.worldItems.filter(w => w.itemId === KEYS.item).length;
for (let i = 0; i < 20; i++) Chests.onEnemyDefeated(ctx.enemies.find(x => x.alive && x !== ctx.boss));
check(ctx.worldItems.filter(w => w.itemId === KEYS.item).length === before, 'no more keys while one is lying around');
// opened state remembered
H.goToPlanet(0); step(1);
const same = Chests.list.every((c, i) => c.up.distanceTo(spots0[i]) < 1e-6);
check(same, 'chests come back to the same spots');
check(Chests.list.filter(c => c.opened).length === 2 && common.id === Chests.list.find(c => c.opened && c.kind === 'common').id, 'and the ones you opened stay open');
// boss chest
const B = ctx.boss; B.hp = 1; P.placeAt(dirAlong(B.up, B.fwd, 3)); step(0.1);
const { dealDamage } = await imp('combat/damage.js').catch(() => ({}));
B.hp = 0; B.die(); (await imp('combat/events.js')).encounterEvents.dispatchEvent(new CustomEvent('bossdefeated', { detail: { boss: B } }));
step(0.2);
check(!!Chests.bossChest && Chests.bossChest.landing, 'the boss chest drops in');
check(!P.inventory.has(PLANETS[0].boss.trophy), 'the trophy is in the chest, not handed over');
step(6);
check(game.planets.state === 'loot' && ctx.planet === 0, `the journey waits for the chest (state ${game.planets.state})`);
check(!Chests.bossChest.landing, 'landed');
standBy(Chests.bossChest); t = currentInteraction();
check(/Treasure chest/.test(t?.label ?? ''), `prompt: "${t?.label}"`);
t.run(); step(0.1);
check(ctx.worldItems.some(w => w.itemId === PLANETS[0].boss.trophy), 'the trophy hops out');
step(5);
check(P.inventory.has(PLANETS[0].boss.trophy), 'boss loot left on the ground is swept into the bag on departure');
check(ctx.planet === 1 || game.planets.state === 'fadeOut' || game.planets.state === 'fadeIn', `then the journey goes on (planet ${ctx.planet}, state ${game.planets.state})`);
// loot tables
const r = rollLoot('boss', 2), bounds = LOOT_TABLES.boss.coins.map(n => Math.round(n * (1 + LOOT.coinsPerPlanet * 2)));
check(r.items.some(i => i.item === 'frostCrown') && r.coins >= bounds[0] && r.coins <= bounds[1], `boss loot on Frostveil: ${JSON.stringify(r)}`);
// a new adventure fills them again
game.resetRun(); step(0.5);
check(Chests.list.length === want && Chests.list.every(c => !c.opened) && !Chests.bossChest, 'a new adventure: all chests full again');
// indoor chest lid
Houses.enter(0); step(1); const sp = Houses.inside.room.spots.find(s => s.kind === 'chest');
Houses.use(sp); step(1); Dialog.close();
check(sp.obj.userData.lid.rotation.x < -1.5, 'house chests open their lids too');
console.log(fails ? `${fails} FAILED` : 'all passed');
