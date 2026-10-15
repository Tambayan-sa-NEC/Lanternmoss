// TODO 34 (bounty board): a board near every village square posts the day's three tasks; real defeats, catches and
// harvests on that planet count, bring tasks hand over bag items; claiming pays coins, the planet's material and a rare
// piece now and then; the journal counts claims; progress survives Continue, travel keeps each planet's board, and a new
// day posts a new set.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { emit } = await imp('core/events.js');
const { damageEnemy } = await imp('combat/damage.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { BOUNTIES } = await imp('config/bounties.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { Journal } = await imp('gameplay/Journal.js');
const { BountyUI } = await imp('ui/BountyUI.js');
const { arcDist, dirAlong, tangentToward } = await imp('utils/sphere.js');
const { H, game, step } = await boot('ranger');
const P = H.player, inv = P.inventory, B = H.Bounties;
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.5);

// ---- the board: near the square, clear of the corner, farm, gate, cottage and nodes ------------------------------------
const spawn = game.world.spawnDir, board = B.board;
assert.ok(board, 'Lanternmoss has a board');
const d = arcDist(board.dir, spawn); assert.ok(d >= BOUNTIES.board.distance[0] - 0.01 && d <= BOUNTIES.board.distance[1] + 0.01, `${d}`);
assert.ok(arcDist(board.dir, H.Stations.center) > 4 && arcDist(board.dir, H.Farm.center) > 6 && arcDist(board.dir, H.Portals.gate.dir) > 3);
assert.ok(!H.Gathering.nodes.some(n => arcDist(n.up, board.dir) < 2.5), 'no resource node on the board');
assert.equal(B.list.length, 3); assert.equal(B.state.day, dayClock.day);
pass(`the board stands ${d.toFixed(0)} m from the square, clear of the crafting corner, farm, gate and nodes, with ${B.list.map(b => b.title).join(' / ')}`);

// ---- E at the board opens it (paused); Esc closes -----------------------------------------------------------------
const toBoard = () => { const b = B.board; P.placeAt(dirAlong(b.dir, tangentToward(b.dir, spawn), 1.4)); P.vel.set(0, 0, 0); step(0.05); };
toBoard(); let t = currentInteraction();
assert.equal(t?.label, 'Read the bounty board');
press('KeyE'); step(0.05);
assert.ok(BountyUI.isOpen && ctx.paused && B.list.every(b => BountyUI.root.innerHTML.includes(b.title)));
press('Escape'); step(0.05); assert.ok(!BountyUI.isOpen && !ctx.paused);
pass('E at the board opens the window with today\'s tasks (the world pauses); Esc closes it');

// ---- progress: real kills of the target (not a boss's summons, not elsewhere), catches, harvests, bring in the bag ----
const kill = (type, owner = null) => { const e = H.spawnEnemy(type, 5); e.owner = owner; damageEnemy(e, 1e6); step(0.05); };
const before = B.list.map((b, i) => B.claim(i)); assert.ok(before.every(r => !r.ok), 'nothing claims before it is done');
const half = B.list.map(b => Math.floor(b.count / 2));
B.list.forEach((b, i) => {
  if (b.kind === 'defeat') { kill(b.target, { summoner: true }); assert.equal(B.state.counts[i], 0, 'summons do not count');
    for (let n = 0; n < half[i]; n++) kill(b.target); }
  if (b.kind === 'fish') { emit('fishcaught', { itemId: b.target === 'pondPerch' ? 'goldenKoi' : 'pondPerch' }); for (let n = 0; n < half[i]; n++) emit('fishcaught', { itemId: b.target }); }
  if (b.kind === 'harvest') for (let n = 0; n < half[i]; n++) emit('harvested', { crop: 'carrot' });
  if (b.kind === 'bring') inv.add(b.target, half[i]);
});
B.list.forEach((b, i) => assert.equal(B.progress(i).have, half[i], `${b.title}: ${B.progress(i).have}`));
pass('kills, catches and harvests of the right thing count (summoned helpers and other fish don\'t); bring tasks read the bag');

// ---- Continue keeps the counts --------------------------------------------------------------------------------------
assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(0.1);
B.list.forEach((b, i) => assert.equal(B.progress(i).have, half[i], `after Continue: ${b.title}`));
assert.equal(H.Bounties.board !== null, true);
pass('a save and Continue bring back the same tasks and their progress');

// ---- finish and claim: coins, material, bring items handed over, the journal and its achievement -------------------
B.list.forEach((b, i) => {
  const left = b.count - half[i];
  if (b.kind === 'defeat') for (let n = 0; n < left; n++) kill(b.target);
  if (b.kind === 'fish') for (let n = 0; n < left; n++) emit('fishcaught', { itemId: b.target });
  if (b.kind === 'harvest') for (let n = 0; n < left; n++) emit('harvested', { crop: 'wheat' });
  if (b.kind === 'bring') inv.add(b.target, left + 2);
});
assert.ok(B.list.every((_, i) => B.ready(i)));
toBoard(); assert.equal(currentInteraction()?.label, 'Read the bounty board ★', 'a star when something is ready');
assert.ok(B.board.parts.notes.every(n => n.visible && n.material.color.getHex() === 0xffd36b), 'gold notes');   // (Continue rebuilt the board)
B.list[0].reward.gear = true;                                                             // a rare piece this time
const unlocked0 = new Set(Object.keys(Journal.data.unlocked)), material = game.planets.planet.material, coins0 = P.coins, mat0 = inv.count(material), stat0 = Journal.data.stats.bounties ?? 0;
const bringI = B.list.findIndex(b => b.kind === 'bring'), held0 = bringI >= 0 ? inv.count(B.list[bringI].target) : 0, gear0 = inv.getSlots().filter(s => s && s.props?.rarity).length;
const results = B.list.map((_, i) => B.claim(i));
assert.ok(results.every(r => r.ok), JSON.stringify(results));
const paid = B.list.reduce((n, b) => n + b.reward.coins, 0), got = B.list.reduce((n, b) => n + b.reward.items.reduce((m, [, q]) => m + q, 0), 0);
const { ACHIEVEMENTS } = await imp('config/achievements.js');
const bonus = ACHIEVEMENTS.filter(a => Journal.data.unlocked[a.id] && !unlocked0.has(a.id)).reduce((n, a) => n + (a.reward?.coins ?? 0), 0);   // e.g. a Legendary piece
assert.equal(P.coins - coins0, paid + bonus); const bt = B.list[bringI], bringsMaterial = bt?.target === material;
assert.equal(inv.count(material) - mat0, got - (bringsMaterial ? bt.count : 0), 'the material reward');
if (bt && !bringsMaterial) assert.equal(inv.count(bt.target), held0 - bt.count, 'bring items handed over');
assert.ok(inv.getSlots().filter(s => s && s.props?.rarity).length > gear0 || ctx.worldItems.some(w => w.props?.rarity), 'a rare piece');
assert.equal(Journal.data.stats.bounties - stat0, 3); assert.ok(Journal.data.unlocked.firstBounty, 'Notice Board achievement');
assert.ok(B.list.every((_, i) => !B.claim(i).ok), 'no second claim');
assert.ok(B.board.parts.notes.every(n => !n.visible), 'claimed notes come down');
pass(`claiming paid ${paid} coins, ${got} ${material} and a rare piece; bring items went to the board; journal +3 and "Notice Board"`);

// ---- travel: each planet keeps its own board; coming back finds this one as it was ---------------------------------
const claimed = [...B.state.claimed], set = B.list.map(b => b.id);
game.planets.defeated.add('lanternmoss'); H.goToPlanet('emberfall'); step(0.5);
assert.equal(ctx.planetId, 'emberfall'); assert.ok(B.board && B.list[0].id.startsWith('emberfall:') && B.state.claimed.every(c => !c));
const ember = B.list.findIndex(b => b.kind === 'defeat'); if (ember >= 0) kill(B.list[ember].target);
H.goToPlanet('lanternmoss'); step(0.5);
assert.deepEqual(B.list.map(b => b.id), set); assert.deepEqual(B.state.claimed, claimed);
pass('Emberfall has its own board and set; back home the claimed board is as it was');

// ---- a new day posts a new set --------------------------------------------------------------------------------------
const day = dayClock.day; dayClock.skip(DAY.length, 'test'); step(0.1);
assert.equal(B.state.day, day + 1); assert.ok(B.list.every(b => b.id.startsWith(`lanternmoss:${day + 1}:`)) && B.state.claimed.every(c => !c) && B.state.counts.every(c => c === 0));
assert.ok(B.board.parts.notes.every(n => n.visible && n.material.color.getHex() === 0xfff3d6), 'fresh notes');
pass('the next day posts a fresh set on the board');
console.log('all passed');
