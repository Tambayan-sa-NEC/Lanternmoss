// TODO 16: energy (drains, food fills it, hungry = slower healing and sprint, never fatal), food / potion buffs,
// gathering (by hand, axe on trees, pickaxe on rocks and veins, tool tiers, regrowing, rare veins by the mini boss),
// fishing (cast, bite, the reeling meter), the farm (till, plant, water, grow, rain, new day, harvest), and the
// equipment side (head / feet / two trinkets / vanity drawn on the hero).
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { NEEDS } = await imp('config/survival.js');
const { DAY } = await imp('config/day.js');
const { FISHING } = await imp('config/resources.js');
const { damageEnemy, hurtPlayer } = await imp('combat/damage.js');
const { bagCommands } = await imp('gameplay/bagCommands.js');
const { buffs } = await imp('gameplay/buffs.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { Journal } = await imp('gameplay/Journal.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { InventoryUI } = await imp('ui/InventoryUI.js');
const { dom } = await imp('ui/dom.js');
const { arcDist, dirAlong, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { ponds } = await imp('world/terrain.js');
const { H, step, game } = await boot('witch');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const P = H.player, inv = P.inventory, cmd = bagCommands(inv), G = H.Gathering, F = H.Farm, Fi = H.Fishing;
const near = (dir, m) => { P.placeAt(dirAlong(dir, tangentFrame(dir)[0], m)); P.vel.set(0, 0, 0); P.fwd.copy(tangentToward(P.up, dir)); };
const finishJob = () => { for (let i = 0; i < 400 && G.job; i++) step(1 / 60); };
const clearHotbar = () => { for (let i = 0; i < 9; i++) if (inv.getSlot(i)) inv.removeFromSlot(i); };
step(0.5);

// ---------------- energy
check(Math.abs(P.energy - NEEDS.start) < 1, `a new adventure starts at ${NEEDS.start} energy`);
let e0 = P.energy; step(10); const walkDrain = e0 - P.energy;
check(walkDrain > 0.5 && walkDrain < 2, `it drains slowly (${walkDrain.toFixed(2)} in 10 s)`);
P.energy = 50; e0 = P.energy; H.keys.KeyW = true; H.keys.ShiftLeft = true; step(10); H.keys.KeyW = false; H.keys.ShiftLeft = false;
check(e0 - P.energy > walkDrain * 2, `sprinting drains it faster (${(e0 - P.energy).toFixed(2)})`);
P.energy = NEEDS.max * 0.2; step(0.1);
check(P.regenK === NEEDS.hungry.regen && P.sprintK === NEEDS.hungry.sprint && dom.enBar.classList.contains('low'), 'hungry: half healing, a slower sprint, the bar pulses');
P.energy = 0; step(0.1);
check(P.regenK === 0 && !P.dead && P.hp > 0, 'empty: no healing, but it never hurts');
inv.add('honeyBun', 1); P.hp = P.stats.maxHp; let r = cmd.use(inv.find('honeyBun'));
check(r.ok && P.energy >= 29, `food fills it, even at full health (honey bun: ${P.energy.toFixed(0)})`);
P.energy = NEEDS.max; inv.add('moonberry', 1); r = cmd.use(inv.find('moonberry'));
check(!r.ok, 'a snack is not wasted when full and healthy');
P.energy = 5; hurtPlayer(9999); step(12);
check(!P.dead && P.energy >= NEEDS.afterFaint - 2, `fainting wakes you with some energy (${P.energy.toFixed(0)})`);

// ---------------- food and potion buffs
inv.add('pumpkinPie', 1); P.energy = 20; cmd.use(inv.find('pumpkinPie'));
const foe = H.spawnEnemy('goblin', 4); foe.hp = 1000; step(0.05);
damageEnemy(foe, 10); const mighty = 1000 - foe.hp; buffs.might = 0; foe.hp = 1000; damageEnemy(foe, 10); const plain = 1000 - foe.hp;
check(mighty > plain, `Pumpkin Pie: Mighty hits harder (${plain} -> ${mighty})`);
inv.add('stoneskinTonic', 1); cmd.use(inv.find('stoneskinTonic')); P.invuln = 0; let hp = P.hp; hurtPlayer(20); const warded = hp - P.hp;
buffs.ward = 0; P.invuln = 0; hp = P.hp; hurtPlayer(20); const bare = hp - P.hp;
check(warded < bare && buffs.ward === 0, `Stoneskin: blows hurt less (${bare} -> ${warded})`);
foe.vanish(); P.hp = P.stats.maxHp;
inv.add('veggieStew', 1); cmd.use(inv.find('veggieStew')); P.hp = 30; P.lastHurt = ctx.time; step(1);
check(buffs.mend > 0 && P.hp > 31, `Veggie Stew: Mending heals even right after a hit (${P.hp.toFixed(1)})`);
check([...dom.status.children].some(c => /mend/.test(c.className) && c.style.display === 'flex'), 'the buff shows in the status row');
P.hp = P.stats.maxHp;

// ---------------- gathering by hand (no monster interrupts the jobs)
P.invuln = 1e9;
const nodes = G.nodes, kinds = new Set(nodes.map(n => n.kind));
check(nodes.length > 60 && ['branches', 'pebbles', 'sweetleaf', 'moonberryBush', 'glowcaps', 'copperVein', 'amethystVein'].every(k => kinds.has(k)), `Lanternmoss grows its nodes (${nodes.length}: ${[...kinds].join(', ')})`);
const village = nodes.filter(n => arcDist(n.up, H.planets.world.spawnDir) < 36);
check(['branches', 'pebbles', 'sweetleaf'].every(k => village.some(n => n.kind === k)), 'wood, stone and herbs a short walk from the square');
const hydra = ctx.enemies.find(e => e.type === 'hydra'), gems = nodes.filter(n => n.def.rare);
check(gems.length && gems.every(n => arcDist(n.up, hydra.home) < 18), 'the rare amethyst veins sit by the Hydra');
const br = nodes.find(n => n.kind === 'branches'); near(br.up, 1.0); step(0.05);
let t = currentInteraction();
check(t && /Gather the fallen branches/.test(t.label), `E by fallen branches: "${t?.label}"`);
const wood0 = inv.count('wood'); press('KeyE'); finishJob();
check(inv.count('wood') > wood0 && !br.root.visible, `gathered: +${inv.count('wood') - wood0} wood, the branches are gone for now`);
step(2); check(/Craft a Woodcutter/.test(document.getElementById('toast').textContent), 'a first-time tip says what wood is for');
br.regrowT = 0.05; step(0.2); check(br.ready && br.root.visible, 'and they turn up again later');
const bush = nodes.find(n => n.kind === 'moonberryBush'); near(bush.up, 1.4); step(0.05); const mb = inv.count('moonberry');
press('KeyE'); finishJob();
check(inv.count('moonberry') >= mb + 2 && bush.root.visible && !bush.fruit.visible, 'a picked bush keeps its leaves; the berries regrow');

// ---------------- tools: axe, pickaxe, tiers
clearHotbar();
const tree = H.planets.world.spots.trees.find(s => s.kind === 'oak' || s.kind === 'blossom');
near(tree.dir, tree.r + 0.6); step(0.05);
check(!currentInteraction() || !/Chop/.test(currentInteraction().label), 'no axe on the hotbar: trees offer nothing');
inv.add('woodAxe', 1); step(0.05);
check(inv.find('woodAxe') < 9, 'a new tool lands on the hotbar');
t = currentInteraction(); check(t && /^Chop the/.test(t.label), `with an axe: "${t?.label}"`);
const w1 = inv.count('wood'); press('KeyE'); step(0.2);
check(G.job && P.heldTool && Hotbar().selected === inv.find('woodAxe'), 'swinging: the axe is held (and selected on the hotbar)');
finishJob();
check(inv.count('wood') >= w1 + 2 && !P.heldTool, `chopped: +${inv.count('wood') - w1} wood`);
t = currentInteraction(); check(t && /resting/.test(t.label), 'the tree rests before it gives more');
function Hotbar() { return H.Hotbar; }
const vein = nodes.find(n => n.kind === 'copperVein'); near(vein.up, vein.def.r + 0.8); step(0.05);
t = currentInteraction(); check(t && /needs a pickaxe/.test(t.label), `a vein without a pick: "${t?.label.replace(/<[^>]+>/g, '')}"`);
inv.add('stonePick', 1); step(0.05); const cu = inv.count('copperOre');
press('KeyE'); finishJob();
check(inv.count('copperOre') > cu && !vein.fruit.visible, `mined copper (+${inv.count('copperOre') - cu})`);
const gem = gems[0]; hydra.vanish?.(); near(gem.up, gem.def.r + 0.8); step(0.05); press('KeyE'); step(0.1);
check(!G.job && /Copper Pickaxe/.test(document.getElementById('toast').textContent), `a gem vein needs a better pick: "${document.getElementById('toast').textContent}"`);
inv.add('copperPick', 1); press('KeyE'); finishJob();
check(inv.count('amethyst') === 1, 'the Copper Pickaxe gets the amethyst out');
// right click with the held pickaxe works the nearest rock
const rock = H.planets.world.spots.rocks[3]; near(rock.dir, rock.r + 0.5); step(0.05); H.Hotbar.selected = inv.find('copperPick');
const st0 = inv.count('stone'); H.Hotbar.use(); finishJob();
check(inv.count('stone') > st0, 'using the held pickaxe mines the rock in front');
const j0 = Journal.data.stats.gathered;
check(j0 >= 5, `the journal counts it (${j0} gathered)`);

// ---------------- fishing
const pond = ponds.find(p => p.r < 6);
near(pond.dir, pond.r + 0.8); step(0.05);
check(!currentInteraction() || !/Fish/.test(currentInteraction().label), 'no rod: no fishing');
inv.add('fishingRod', 1); step(0.05); t = currentInteraction();
check(t && /Fish in the pond/.test(t.label), `with a rod at the edge: "${t?.label}"`);
press('KeyE'); step(0.7);
check(Fi.active && Fi.s.stage === 'wait' && arcDist(Fi.s.dir, pond.dir) < pond.r, 'the float lands in the water');
Fi.s.biteAt = 0; step(0.05);
check(Fi.s.stage === 'bite', 'a bite! (the float dips)');
press('KeyE'); step(0.02);
check(Fi.s?.stage === 'reel' && Fi.meter.el.classList.contains('show'), 'E starts reeling: the meter shows');
// press when the needle sits in the zone
const s = Fi.s, want = s.centre, per = 1 / s.feel.sweeps; s.t = want * per; Fi.press();
const fishIds = FISHING.catches[0].map(c => c[0]), caught = fishIds.reduce((n, id) => n + inv.count(id), 0);
check(caught === 1 && !Fi.active && !P.heldTool, `caught: ${fishIds.filter(id => inv.count(id)).join(', ')}`);
near(pond.dir, pond.r + 0.8); press('KeyE'); step(0.7); Fi.s.biteAt = 0; step(0.05); press('KeyE'); step(0.02);
Fi.s.t = ((Fi.s.centre + 0.5) % 1) / Fi.s.feel.sweeps; if (Math.abs(((Fi.s.centre + 0.5) % 1) - Fi.s.centre) < Fi.s.feel.zone) Fi.s.t += 0.3 / Fi.s.feel.sweeps;
Fi.press();
check(!Fi.active && fishIds.reduce((n, id) => n + inv.count(id), 0) === 1, 'outside the green: it wriggles free');
press('KeyE'); step(0.7); Fi.s.biteAt = 0; step(0.05); step(FISHING.react + 0.2);
check(!Fi.active, 'too slow after a bite: it swims off');
press('KeyE'); step(0.3); H.keys.KeyS = true; step(0.6); H.keys.KeyS = false;
check(!Fi.active, 'walking off packs the rod away');
check(Journal.data.stats.fish === 1, 'the journal counts the catch');

// ---------------- the farm
check(F.plots.length === 6 && arcDist(F.center, H.planets.world.spawnDir) < 26, `a 6-plot farm by the village (${arcDist(F.center, H.planets.world.spawnDir).toFixed(0)} m out)`);
check(!nodes.some(n => arcDist(n.up, F.center) < 4), 'no nodes on the farm');
H.setWeather('clear'); step(0.1);
const plot = F.plots[0]; near(plot.dir, 0.3); P.placeAt(plot.dir); step(0.05);
t = currentInteraction(); check(t && /Till the soil.*needs a hoe/.test(t.label), `a wild plot: "${t?.label.replace(/<[^>]+>/g, '')}"`);
clearHotbar(); inv.add('hoe', 1); inv.add('wateringCan', 1); step(0.05);
press('KeyE'); finishJob();
check(plot.s.tilled && plot.parts.furrows.visible && !plot.parts.weeds.visible, 'the hoe tills it (furrows, no weeds)');
Quests.start('firstHarvest'); step(0.1);
check(inv.count('carrotSeeds') === 4, 'Pim\'s farming quest hands over carrot seeds');
t = currentInteraction(); check(t && /Plant Moon Carrot Seeds/.test(t.label), `then: "${t?.label}"`);
press('KeyE'); step(0.05);
check(plot.s.crop === 'carrot' && inv.count('carrotSeeds') === 3 && !plot.s.watered, 'planted (one seed packet used)');
step(5); check(plot.s.growth === 0, 'dry soil: nothing grows');
press('KeyE'); finishJob();
check(plot.s.watered && plot.parts.soil.color.getHex() === 0x6a4430, 'watered (the soil darkens)');
step(20); const g20 = plot.s.growth;
check(g20 > 0.05 && g20 < 0.2, `it grows while watered (${(g20 * 100).toFixed(0)}% in 20 s)`);
dayClock.day++; step(0.1);
check(!plot.s.watered, 'a new day dries the soil');
H.setWeather('rain'); step(8);
check(plot.s.watered, 'rain waters it');
H.setWeather('clear');
plot.s.growth = 0.999; step(1);
check(plot.stage === 3, 'ripe');
t = currentInteraction(); check(t && /Harvest the Moon Carrot/.test(t.label), `"${t?.label}"`);
press('KeyE'); step(0.05);
check(inv.count('moonCarrot') >= 2 && !plot.s.crop && plot.s.tilled, `harvested ${inv.count('moonCarrot')} carrots; the plot stays tilled`);
check(Journal.data.stats.harvests === 1, 'the journal counts the harvest');
// sleeping through the night grows watered crops
const p2 = F.plots[1]; Object.assign(p2.s, { tilled: true, crop: 'wheat', growth: 0, watered: true });
F.growBy(DAY.length); step(0.05);
check(p2.s.growth > 0.9, `a night's sleep: watered wheat grows (${(p2.s.growth * 100).toFixed(0)}%)`);

P.invuln = 0;
// ---------------- the equipment side
for (const id of ['mossHood', 'wanderBoots', 'lanternPendant', 'emberRing', 'strawHat', 'leafCape']) inv.add(id, 1);
const stats0 = { ...P.stats };
for (const id of ['mossHood', 'wanderBoots', 'lanternPendant', 'emberRing']) cmd.use(inv.find(id));
check(P.equipment.head?.itemId === 'mossHood' && P.equipment.feet?.itemId === 'wanderBoots', 'a hood on the head, boots on the feet');
check(P.equipment.charm?.itemId === 'lanternPendant' && P.equipment.charm2?.itemId === 'emberRing', 'two trinkets at once');
check(P.stats.maxHp > stats0.maxHp && P.stats.moveSpeed > 0 && P.stats.damageBonus > 0, 'their stats add up');
const stats1 = JSON.stringify(P.stats);
cmd.use(inv.find('strawHat')); cmd.use(inv.find('leafCape'));
check(P.vanityHat && P.hat && !P.hat.visible && P.vanityCape && P.capeKids.every(k => !k.visible), 'the straw hat replaces the witch hat; the leaf cape her cape');
check(JSON.stringify(P.stats) === stats1, 'vanity changes nothing but the look');
r = cmd.equip(inv.find('emberRing') >= 0 ? inv.find('emberRing') : inv.add('frostLocket', 1) && inv.find('frostLocket'), 'head');
check(!r.ok && /doesn't go there/.test(r.message), `a trinket won't go on your head: "${r.message}"`);
inv.add('frostLocket', 1); r = cmd.equip(inv.find('frostLocket'), 'charm2');
check(r.ok && P.equipment.charm2.itemId === 'frostLocket' && inv.find('emberRing') >= 0, 'dropped on the second trinket slot: swaps with what was there');
cmd.unequip('hat'); check(!P.vanityHat && P.hat.visible, 'taking the hat off brings the witch hat back');
H.CharacterSelect.pick('knight'); step(0.05); H.CharacterSelect.pick('witch'); step(0.05);
InventoryUI.open(); step(0.05);
check(Object.keys(InventoryUI.gearEls).length === 8 && InventoryUI.gearEls.hat.classList.contains('vanity'), 'the bag shows the equipment side (8 worn slots, 2 of them vanity)');
InventoryUI.close();

// ---------------- other planets
H.goToPlanet(1); step(0.5);
check(G.nodes.some(n => n.kind === 'pepperBush') && G.nodes.some(n => n.kind === 'ironVein') && G.nodes.some(n => n.kind === 'opalVein') && F.plots.length === 6, 'Emberfall: pepper bushes, iron and opal veins, its own farm');
H.goToPlanet(2); step(0.5);
check(G.nodes.some(n => n.kind === 'plumBush') && G.nodes.some(n => n.kind === 'frostFlowers') && G.nodes.some(n => n.kind === 'diamondVein'), 'Frostveil: snow plums, frost flowers, diamond veins');
console.log(fails ? `${fails} FAILED` : 'all passed');
