// Real crafting, discovery, enchanting, meal effects and adventure persistence, without granting recipe knowledge.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { H, game, step } = await boot('knight', { wake: false });
const { ctx } = await imp('core/context.js');
const { RECIPES } = await imp('config/crafting.js');
const { bagCommands } = await imp('gameplay/bagCommands.js');
const { Houses, houseDef } = await imp('gameplay/Houses.js');
const { BuffState, resetBuffs, updateBuffs } = await imp('gameplay/buffs.js');
const { computeStats } = await imp('gameplay/equipment.js');
const { damageEnemy } = await imp('combat/damage.js');
const { Pickups } = await imp('gameplay/pickups.js');
const { dirAlong, tangentToward } = await imp('utils/sphere.js');
const P = H.player, inv = H.inventory, cmd = bagCommands(inv), book = H.RecipeBook;
const recipe = id => RECIPES.find(r => r.id === id);
const at = id => { const s = H.Stations.list.find(s => s.id === id); P.placeAt(dirAlong(s.dir, tangentToward(s.dir, game.world.spawnDir), 1.4)); assert.equal(H.Stations.here(), id); };
const supply = r => { inv.clear(); for (const [id, n] of r.needs) inv.add(id, n); P.coins = 10000; };
const use = id => { inv.add(id, 1); const result = cmd.use(inv.find(id)); assert.ok(result.ok, result.message); };
step(0.2); P.invuln = 1e9;

assert.ok(book.knows('woodAxe') && book.knows('healingPotion') && !book.knows('perchChowder'));
at('pot'); supply(recipe('perchChowder')); const locked = inv.toJSON();
assert.equal(cmd.craft(recipe('perchChowder')).ok, false); assert.deepEqual(inv.toJSON(), locked);
assert.equal(book.favourite('perchChowder'), false);
Houses.goInside(0, houseDef(0)); Houses.use({ kind: 'bookshelf' }); H.Dialog.close();
assert.ok(book.knows('perchChowder') && !book.knows('infusedMoonCharm'));
Houses.use({ kind: 'bookshelf' }); H.Dialog.close(); assert.ok(book.knows('infusedMoonCharm'));
Houses.goOutside(); at('pot'); supply(recipe('perchChowder'));
assert.ok(cmd.craft(recipe('perchChowder')).ok); assert.equal(inv.count('perchChowder'), 1);
book.favourite('perchChowder'); H.InventoryUI.open('craft');
assert.match(H.InventoryUI.craftEl.innerHTML, /Favourites/);
assert.ok(H.InventoryUI.craftEl.innerHTML.indexOf('data-card="perchChowder"') < H.InventoryUI.craftEl.innerHTML.indexOf('data-card="copperIngot"'));
H.InventoryUI.close(); console.log('PASS  essential recipes, bookshelf discoveries, locked craft refusal and favourite pinning');

inv.clear(); const chest = H.Chests.list.find(c => c.kind === 'common'); H.Chests.open(chest);
const scroll = H.worldItems.find(w => w.itemId === 'goldenBanquetScroll'); assert.ok(scroll);
P.placeAt(scroll.up); step(2); assert.equal(inv.count('goldenBanquetScroll'), 1);
assert.ok(cmd.use(inv.find('goldenBanquetScroll')).ok); assert.ok(book.knows('goldenBanquet'));
inv.add('goldenBanquetScroll', 1); assert.equal(cmd.use(inv.find('goldenBanquetScroll')).ok, false); assert.equal(inv.count('goldenBanquetScroll'), 1);
console.log('PASS  chest scrolls are collected and consumed only when they teach a new recipe');

H.Journal.clear(); assert.equal(book.readBestiary('ogre'), null);
const ogre = H.spawnEnemy('ogre', 8); H.Journal.meet('ogre');
assert.match(H.JournalUI.pageHtml('ogre'), /data-learn-recipe disabled/);
damageEnemy(ogre, 10000); step(0.1); assert.ok(H.Journal.data.defeated.ogre);
assert.ok(book.readBestiary('ogre')); assert.ok(book.knows('mossRune'));
at('forge'); supply(recipe('mossRune')); assert.ok(cmd.craft(recipe('mossRune')).ok);
inv.add('emberAxe', 1, { rarity: 'rare' }); const gearSlot = inv.find('emberAxe');
const craftCount = H.Journal.data.stats.crafted;
assert.ok(cmd.enchant(`bag:${gearSlot}`, 'mossRune').ok);
assert.deepEqual(inv.getSlot(gearSlot).props, { rarity: 'rare', enchantment: 'mossRune' });
assert.equal(H.Journal.data.stats.crafted, craftCount, 'enchanting is not a second craft or pickup');
assert.ok(cmd.equip(gearSlot, 'weapon').ok); const mossHp = P.stats.maxHp;
inv.add('emberRune', 2); const noChange = inv.toJSON(); P.placeAt(game.world.spawnDir);
assert.equal(cmd.enchant('worn:weapon', 'emberRune').ok, false); assert.deepEqual(inv.toJSON(), noChange);
at('forge'); assert.ok(cmd.enchant('worn:weapon', 'emberRune').ok);
assert.deepEqual(P.equipment.weapon.props, { rarity: 'rare', enchantment: 'emberRune' });
assert.equal(P.stats.maxHp, mossHp - 12); assert.equal(P.stats.damageBonus, computeStats().damageBonus);
assert.equal(inv.count('emberRune'), 1); assert.equal(cmd.enchant('worn:weapon', 'emberRune').ok, false); assert.equal(inv.count('emberRune'), 1);
assert.ok(cmd.unequip('weapon').ok); const dropSlot = inv.find('emberAxe'); assert.ok(cmd.drop(dropSlot));
const dropped = Pickups.toJSON().find(w => w.itemId === 'emberAxe'); assert.equal(dropped.props.enchantment, 'emberRune');
console.log('PASS  defeated bestiary pages teach runes; enchanting replaces one slot, updates worn stats and survives dropping');

inv.clear(); at('forge'); inv.add('copperOre', 14); inv.add('charcoal', 2);
const beforeBulk = H.Journal.data.stats.crafted;
assert.ok(cmd.craft(recipe('copperIngot'), 'all').ok); assert.equal(inv.count('copperIngot'), 6); assert.equal(inv.count('copperOre'), 2);
assert.equal(H.Journal.data.stats.crafted, beforeBulk + 6, 'bulk output counts toward items-crafted achievements');
inv.clear(); inv.add('wood', 15); assert.ok(cmd.craft(recipe('charcoal'), 'all').ok); assert.equal(inv.count('charcoal'), 10);
inv.clear(); inv.add('glowcap', 15); assert.ok(cmd.craft(recipe('glowTonic'), 5).ok); assert.equal(inv.count('glowTonic'), 5);
assert.equal(cmd.craft(recipe('glowTonic'), 'all').ok, false);
console.log('PASS  Craft x5 and Smelt all use complete batches, including charcoal');

resetBuffs(); inv.clear(); P.energy = 0; use('pumpkinPie'); assert.equal(H.buffs.might, 90);
use('stoneskinTonic'); use('veggieStew'); assert.equal(H.buffs.might, 0); assert.equal(H.buffs.mend, 60); assert.equal(H.buffs.ward, 60);
use('glacialTonic'); use('koiFeast'); updateBuffs(10); use('plumPorridge');
assert.equal(H.buffs.ward, 170, 'replacing a ward meal preserves the longer potion'); assert.equal(H.buffs.mend, 0); assert.equal(H.buffs.swift, 60);
use('infusedMoonCharm'); assert.equal(H.buffs.moon, 90);
const buffsBefore = BuffState.toJSON(), recipesBefore = book.toJSON();
const saved = game.saves.registry.snapshot(ctx.planetId);
assert.ok(game.saves.restore(saved));
assert.deepEqual(book.toJSON(), recipesBefore); assert.deepEqual(BuffState.toJSON(), buffsBefore);
assert.ok(Pickups.toJSON().some(w => w.itemId === 'emberAxe' && w.props.enchantment === 'emberRune'));
console.log('PASS  one meal buff coexists with potions and infused charms; save restoration preserves independent timers, favourites and enchanted loot');

for (const [planet, meal, tonic, enemy, rune] of [[1, 'emberPepperBroth', 'emberTonic', 'ramhorn', 'emberRune'], [2, 'glacialPlumSoup', 'glacialTonic', 'hexlantern', 'frostRune']]) {
  H.goToPlanet(planet); P.invuln = 1e9;
  Houses.goInside(0, houseDef(0)); Houses.use({ kind: 'bookshelf' }); H.Dialog.close(); Houses.goOutside();
  assert.ok(book.knows(meal)); at('pot'); supply(recipe(meal)); assert.ok(cmd.craft(recipe(meal)).ok);
  const c = H.Chests.list.find(c => c.kind === 'common'); H.Chests.open(c);
  assert.ok(H.worldItems.some(w => w.itemId === `${tonic}Scroll`)); use(`${tonic}Scroll`);
  at('brew'); inv.clear(); inv.add('wood', 5); assert.ok(cmd.craft(recipe('springWater'), 5).ok); assert.equal(inv.count('springWater'), 5);
  supply(recipe(tonic)); assert.ok(cmd.craft(recipe(tonic)).ok); assert.equal(inv.count('springWater'), 0);
  const foe = H.spawnEnemy(enemy, 8); damageEnemy(foe, 10000); step(0.1); assert.ok(book.readBestiary(enemy));
  at('forge'); supply(recipe(rune)); assert.ok(cmd.craft(recipe(rune)).ok);
}
assert.ok(book.knows('perchChowder') && book.favourites.has('perchChowder'), 'knowledge travels between worlds');
game.resetRun(); assert.deepEqual(book.toJSON(), { learned: [], favourites: [] }); assert.equal(BuffState.toJSON().meal, null);
assert.ok(book.knows('woodAxe')); console.log('PASS  every world feeds meals, water brewing and rune crafting; a new adventure clears discoveries');
console.log('all passed');
