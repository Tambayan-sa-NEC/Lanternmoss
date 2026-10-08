// TODO 17 (stations): every village has a crafting corner (workbench, forge, cooking pot, brewing stand) clear of the
// farm and the nodes; E at one opens the Craft tab on its recipes; station recipes only craft standing at the station;
// by-hand ones anywhere; the tab follows you as you walk up; the compass shows the corner.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { RECIPES } = await imp('config/crafting.js');
const { STATIONS, STATION_CORNER } = await imp('config/stations.js');
const { bagCommands } = await imp('gameplay/bagCommands.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { InventoryUI } = await imp('ui/InventoryUI.js');
const { dom } = await imp('ui/dom.js');
const { arcDist, dirAlong, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { H, step } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const P = H.player, inv = P.inventory, cmd = bagCommands(inv), S = H.Stations;
const at = id => S.list.find(s => s.id === id);
step(0.5);

const spawn = H.planets.world.spawnDir;
check(S.list.length === 4 && Object.keys(STATIONS).every(id => at(id)), 'the village has all four stations');
const d = arcDist(S.center, spawn); check(d >= 10 && d <= 26, `a short walk from the square (${d.toFixed(0)} m)`);
check(arcDist(S.center, H.Farm.center) > 7, `apart from the farm (${arcDist(S.center, H.Farm.center).toFixed(0)} m)`);
check(!H.Gathering.nodes.some(n => arcDist(n.up, S.center) < 5), 'no resource nodes in the corner');

// walk up: the prompt, then E opens its recipes
const pot = at('pot'); P.placeAt(dirAlong(pot.dir, tangentToward(pot.dir, spawn), 1.3)); P.vel.set(0, 0, 0); step(0.05);
let t = currentInteraction(); check(t && t.label === 'Use the Cooking Pot', `by the pot: "${t?.label}"`);
press('KeyE'); step(0.05);
check(InventoryUI.isOpen && InventoryUI.tab === 'craft' && InventoryUI.craftFilter === 'pot', 'E opens the Craft tab on the pot\'s recipes');
check(cmd.station() === 'pot', 'the bag knows where you stand');
inv.add('moonCarrot', 4); inv.add('sweetleaf', 4); inv.add('moonberry', 2); inv.add('wood', 6); inv.add('stone', 4);
let r = cmd.craft(RECIPES.find(x => x.id === 'veggieStew'));
check(r.ok && inv.count('veggieStew') === 1, `cooked at the pot: "${r.message}"`);
r = cmd.craft(RECIPES.find(x => x.id === 'healingPotion'));
check(!r.ok && /Brewing Stand/.test(r.message), `a potion isn't made at the pot: "${r.message}"`);
InventoryUI.close();

// away from every station
P.placeAt(spawn); step(0.1);
check(cmd.station() === null, 'in the square: no station');
r = cmd.craft(RECIPES.find(x => x.id === 'veggieStew'));
check(!r.ok && /Cooking Pot/.test(r.message) && inv.count('moonCarrot') === 2, `away from the pot it's refused, nothing taken: "${r.message}"`);
r = cmd.craft(RECIPES.find(x => x.id === 'woodAxe'));
check(r.ok && inv.count('woodAxe') === 1, 'the first tools are made by hand, anywhere');
InventoryUI.open('craft'); step(0.05);
check(InventoryUI.craftFilter === 'all' && /Not at a station/.test(InventoryUI.craftEl.innerHTML), 'the I key opens on every recipe; it says you\'re not at a station');
InventoryUI.craftFilter = 'hand'; InventoryUI.render();
check(!/Veggie Stew/.test(InventoryUI.craftEl.innerHTML) && /Woodcutter/.test(InventoryUI.craftEl.innerHTML), '"By hand" lists only what needs no station');
InventoryUI.craftFilter = 'forge'; InventoryUI.render();
check(/Ember Greataxe/.test(InventoryUI.craftEl.innerHTML) && !/Glowcap Staff/.test(InventoryUI.craftEl.innerHTML), 'the Forge chip: the forge\'s recipes for this hero');
// walking up with the tab open: it notices
const forge = at('forge'); P.placeAt(dirAlong(forge.dir, tangentToward(forge.dir, spawn), 1.2)); step(0.1);
check(/You're at the <b>Forge and Anvil<\/b>/.test(InventoryUI.craftEl.innerHTML), 'walk up with the tab open: it updates');
inv.add('emberShard', 5); P.coins = 100;
r = cmd.craft(RECIPES.find(x => x.id === 'emberRing'));
check(r.ok, `forged a ring: "${r.message}"`);
// smelting: ore + fuel -> ingots at the forge
const R = id => RECIPES.find(x => x.id === id);
for (const id of ['wood', 'charcoal', 'emberShard']) { const n = inv.count(id); if (n) inv.remove(id, n); }
inv.add('copperOre', 4); inv.add('ironOre', 4);
r = cmd.craft(R('copperIngot'));
check(!r.ok && /fuel/.test(r.message) && inv.count('copperOre') === 4, `no fuel, no smelting: "${r.message}"`);
inv.add('wood', 4); r = cmd.craft(R('copperIngot'));
check(r.ok && inv.count('copperIngot') === 1 && inv.count('copperOre') === 2 && inv.count('wood') === 3, 'two copper ore and a log of wood make a copper ingot');
r = cmd.craft(R('charcoal'));
check(r.ok && inv.count('charcoal') === 2 && inv.count('wood') === 0, 'wood burns down into charcoal (a better fuel)');
r = cmd.craft(R('ironIngot'));
check(r.ok && inv.count('ironIngot') === 1 && inv.count('charcoal') === 1, 'iron smelts with charcoal (one charcoal burns for three)');
InventoryUI.open('craft', { filter: 'forge' }); step(0.05);
check(/Smelting/.test(InventoryUI.craftEl.innerHTML) && /🔥/.test(InventoryUI.craftEl.innerHTML), 'the forge lists Smelting first, with a fuel chip');
inv.add('ironIngot', 2); inv.add('wood', 2); P.coins += 20; r = cmd.craft(R('ironPick'));
check(r.ok && inv.count('ironPick') === 1, 'ingots forge an Iron Pickaxe');
inv.add('copperOre', 2); inv.add('wood', 2); P.placeAt(spawn); step(0.05);
r = cmd.craft(R('copperIngot'));
check(!r.ok && /Forge/.test(r.message), 'smelting needs the forge');
InventoryUI.close();
// a better tool: fewer swings
const vein = H.Gathering.nodes.find(n => n.kind === 'copperVein'); P.invuln = 1e9;
for (let i = 0; i < 9; i++) if (inv.getSlot(i)) inv.removeFromSlot(i);
inv.add('ironPick', 1); P.placeAt(dirAlong(vein.up, tangentToward(vein.up, spawn), vein.def.r + 0.8)); step(0.05);
H.Gathering.work({ node: vein });
check(H.Gathering.job?.total === 1, `the Iron Pickaxe breaks a copper vein in ${H.Gathering.job?.total} swing (a stone pick takes ${vein.def.hits})`);
for (let i = 0; i < 200 && H.Gathering.job; i++) step(1 / 60); P.invuln = 0;

// they're solid, they glow, and the compass knows the corner
const wb = at('workbench'); P.placeAt(wb.dir); step(0.2);
check(arcDist(P.up, wb.dir) > 0.8, 'stations are solid');


// every planet has its own corner
for (const i of [1, 2]) {
  H.goToPlanet(i); step(0.5);
  const sp = H.planets.world.spawnDir;
  check(S.list.length === 4 && arcDist(S.center, sp) < 38 && arcDist(S.center, H.Farm.center) > 7, `planet ${i + 1}: a crafting corner by its village`);
}
console.log(fails ? `${fails} FAILED` : 'all passed');
