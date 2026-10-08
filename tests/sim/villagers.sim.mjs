// Villagers end to end: schedules, sleep, dialogue reactions + portraits, coins, the shop, a full quest, planet locals.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { Dialog } = await imp('ui/Dialog.js');
const { dom } = await imp('ui/dom.js');
const { ShopUI } = await imp('ui/ShopUI.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { damageEnemy } = await imp('combat/damage.js');
const { addEnemy } = await imp('combat/spawning.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const { DAY } = await imp('config/day.js');
const { H, step, game } = await boot('witch');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player, npc = name => ctx.npcs.find(n => n.name === name);
const setTime = id => { dayClock.t = (DAY.phases.find(p => p.id === id).from + 0.02) * DAY.length; };
const talk = n => { Dialog.close(); Dialog.start(n); return Dialog.text; };
const choose = yes => Dialog.choose(yes);
const kill = type => { const e = addEnemy(type, offsetDir(P.up, 1, 30)); e.hp = 1; damageEnemy(e, 999); };
step(1);
// ---- schedules
const away = n => arcDist(n.up, n.placeNow().dir) - n.placeNow().wander;
check(ctx.npcs.length === 4 && ctx.npcs.every(n => away(n) < 2), 'four villagers, each at their morning spot');
setTime('noon'); step(40);
const moved = ctx.npcs.map(n => `${n.name} ${away(n).toFixed(1)}`).join(', ');
check(ctx.npcs.every(n => away(n) < 2.5), `everyone walked to their afternoon spot (${moved})`);
setTime('night'); step(30);
if (ctx.npcs.filter(n => n.asleep).length < 3) console.log('   ', ctx.npcs.map(n => `${n.name} ${n.state} ${away(n).toFixed(1)}`).join(', '));
check(ctx.npcs.filter(n => n.asleep).length >= 3, `at night they sleep (${ctx.npcs.filter(n => n.asleep).map(n => n.name).join(', ')})`);
// ---- sleeping villager + closed shop
const { nearestNPC } = await imp('entities/npc/NPC.js'); const { shopLineFor } = await imp('ui/ShopUI.js');
P.placeAt(npc('Pim').up); step(0.1);
check(npc('Pim').asleep && !npc('Pim').root.visible && nearestNPC(P, ctx.npcs) !== npc('Pim'), 'Pim sleeps inside his bakery at night (not talkable outdoors)');
check(/closed/.test(shopLineFor(npc('Pim')).t), 'and the shop is closed');
P.placeAt(npc('Fern').up); step(0.1);
const nightLine = talk(npc('Fern'));
check(/^\*yawn\*/.test(nightLine), `waking Fern by her pond: "${nightLine.slice(0, 50)}..."`);
check(dom.dlgFace.innerHTML.includes('<svg'), 'a portrait is drawn in the dialogue box');
Dialog.close();
// ---- morning: reactions, shop
setTime('morning'); step(40); P.placeAt(npc('Old Bramble').up); step(0.1);
P.inventory.add('lanternKey', 1);   // (so his spare-key line for locked chests doesn't come up here)
const first = talk(npc('Old Bramble')); Dialog.close(); const offer = talk(npc('Old Bramble')); choose(false); Dialog.close();
const later = talk(npc('Old Bramble')); Dialog.close();
check(/spellcaster/.test(first) && /stones/i.test(offer) && !/spellcaster/.test(later), 'Bramble reacts to the witch once, then offers his quest; the reaction never repeats');
{ const { Journal } = await imp('gameplay/Journal.js'); Journal.data.unlocked.firstBlood = 1; } P.coins = 0; const goblin = addEnemy('goblin', offsetDir(P.up, 1, 30)); goblin.hp = 1; damageEnemy(goblin, 999);
check(P.coins === 3, `a goblin is worth 3 coins (got ${P.coins})`);
P.coins = 100; P.placeAt(npc('Pim').up); step(0.1);
const greet = talk(npc('Pim'));
check(/bakery/.test(greet) && Dialog.choice, 'Pim greets with the shop first (offers come after "Just chatting")');
choose(true); check(ShopUI.isOpen && ctx.inventoryOpen, 'the shop opens (abilities paused)');
const buns = P.inventory.count('honeyBun');
ShopUI.onClick({ target: { closest: () => ({ dataset: { buy: 'honeyBun' } }) } });
check(P.inventory.count('honeyBun') === buns + 1 && P.coins === 88, `buying a honey bun costs 12 (coins ${P.coins})`);
ShopUI.onClick({ target: { closest: () => ({ dataset: { sell: 'honeyBun' } }) } });
check(P.coins === 92, `selling it back gives 4 (coins ${P.coins})`);
P.placeAt(offsetDir(npc('Pim').up, 0.5, 12)); step(0.2);
check(!ShopUI.isOpen, 'walking away closes the shop');
// ---- a full quest: The Humming Stones
P.placeAt(npc('Old Bramble').up); Quests.st('humStones').readyAt = 0; step(0.1);
let t = talk(npc('Old Bramble')); check(/stones/i.test(t) && Dialog.choice, 'Bramble offers his quest again later'); choose(true);
check(Quests.st('humStones').status === 'active' && Quests.trackerInfo()?.text.includes('Glowcap'), 'quest accepted and tracked');
const before = P.coins, capsBefore = P.inventory.count('glowcap');
P.inventory.add('glowcap', 4); step(0.5);
check(Quests.step('humStones').kind === 'deliver', 'collecting the glowcaps ticks the step off');
check(Quests.target() === npc('Old Bramble'), 'the compass points back to Bramble');
t = talk(npc('Old Bramble')); Dialog.close();
check(P.inventory.count('glowcap') === capsBefore && Quests.step('humStones').kind === 'defeat', `delivering hands the glowcaps over (${capsBefore} -> ${P.inventory.count('glowcap')})`);
for (let i = 0; i < 3; i++) kill('wisp');
check(Quests.step('humStones').kind === 'talk', 'three wisps calmed');
t = talk(npc('Old Bramble')); Dialog.close();
check(Quests.st('humStones').status === 'done' && P.coins >= before + 40 && P.inventory.count('moonHopCharm') >= 1, `quest complete: coins ${before} -> ${P.coins}, charm in the bag`);
// ---- planets: locals and outfits
P.placeAt(npc('Lio').up); talk(npc('Lio')); if (/other worlds|music/i.test(Dialog.text)) choose(true); Dialog.close();   // Lio's offer (spans planets), accepted if he offers
H.goToPlanet(1); step(1);
check(npc('Cinder') && ctx.npcs.length === 5, 'Emberfall has its own villager, Cinder');
check(ctx.npcs.filter(n => !n.def.local).every(n => n.outfit), 'the travellers dress for Emberfall');
P.placeAt(npc('Cinder').up); step(0.1); t = talk(npc('Cinder')); choose(true);
check(Quests.st('dragonForge').status === 'active', "Cinder's quest accepted");
H.goToPlanet(2); step(1);
check(!npc('Cinder') && npc('Tuva') && ctx.npcs.length === 5, 'leaving Emberfall: Cinder stays behind, Tuva lives on Frostveil');
check(Quests.st('dragonForge').status === 'dropped', "Cinder's unfinished quest is dropped when you leave");
check(Quests.st('songsAfar').status === 'active' && Quests.step('songsAfar').item === 'frostPetal', `Lio's quest skipped the Emberfall part you missed and moved on to Frostveil (step ${Quests.st('songsAfar').step})`);
console.log(fails ? `${fails} FAILED` : 'all passed');
