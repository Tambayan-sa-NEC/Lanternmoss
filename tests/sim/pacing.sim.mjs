// Configuration audit: first-visit XP and coin ledger, using the same scaling/rounding as gameplay.
import assert from 'node:assert/strict';
import { BALANCE } from '../../src/config/balance.js';
import { COMBAT } from '../../src/config/combat.js';
import { PLANETS } from '../../src/config/planets.js';
import { QUESTS } from '../../src/config/quests.js';
import { RECIPES, FUEL } from '../../src/config/crafting.js';
import { COINS, SHOP } from '../../src/config/shop.js';
import { CHEST_KINDS, LOOT, LOOT_TABLES } from '../../src/config/chests.js';
import { ITEM_DEFINITIONS } from '../../src/config/items.js';
import { WORLD } from '../../src/config/game.js';
import { ELITE } from '../../src/config/bossSummon.js';
import { CROPS, NODE_KINDS } from '../../src/config/resources.js';
import { DAY } from '../../src/config/day.js';
import { NEEDS } from '../../src/config/survival.js';
import { addXp } from '../../src/progression/leveling.js';
import { scaleEnemyDef } from '../../src/combat/enemyDefs.js';
import { rollLoot } from '../../src/gameplay/loot.js';
import { mulberry32 } from '../../src/utils/random.js';
const items = new Map(ITEM_DEFINITIONS.map(d => [d.id, d]));
const recipe = id => RECIPES.find(r => r.id === id);
const sell = id => Math.max(1, Math.floor(items.get(id).value * SHOP.sellRate));
const check = (ok, message) => { assert.ok(ok, message); console.log(`PASS  ${message}`); };
const mean = v => Array.isArray(v) ? (v[0] + v[1]) / 2 : v;

for (const hero of ['witch', 'knight', 'ranger']) {
  let state = { level: 1, xp: 0 };
  for (const [p, planet] of PLANETS.entries()) {
    const route = BALANCE.route[p], def = type => scaleEnemyDef(COMBAT.enemies[type], planet.scale);
    let killXp = 0, monsterCoins = 0;
    for (const [elite, kills] of [[false, route.kills], [true, route.elites ?? {}]]) {
      for (const [type, count] of Object.entries(kills)) {
        const e = def(type), xp = elite ? Math.round(e.xp * ELITE.xp) : e.xp;
        const available = type === 'thornSeal' ? planet.boss.summon.seals.count : planet.roster.filter(g => g.type === type)
          .reduce((n, g) => n + (g.groups ? Math.round(g.groups * WORLD.rosterScale) * g.size : Math.round(g.count * WORLD.rosterScale)), 0);
        check(count <= available, `${hero}/${planet.name}: ${count} ${type} kills fit a first visit`);
        killXp += xp * count;
        if (!e.object) monsterCoins += Math.max(1, Math.round(xp * COINS.perXp)) * count;
      }
    }
    const questXp = route.quests.reduce((n, id) => n + (QUESTS[id].reward.xp ?? 0), 0);
    state = addXp(state.level, state.xp, killXp + questXp);
    check(state.level >= BALANCE.levels[p] && state.level <= BALANCE.levels[p] + 1,
      `${hero}/${planet.name}: level ${state.level} before summon (${killXp} kill + ${questXp} quest XP), no respawns`);
    const questCoins = route.quests.reduce((n, id) => n + QUESTS[id].reward.coins, 0);
    const chests = [...planet.chests, { kind: 'boss', count: 1 }];
    const bounds = [0, 1].map(end => questCoins + chests.reduce((n, c) => n + c.count *
      Math.round(LOOT_TABLES[CHEST_KINDS[c.kind].loot].coins[end] * (1 + LOOT.coinsPerPlanet * p)), 0));
    const budget = BALANCE.budgets[p].reduce((n, id) => n + (recipe(id).coins ?? 0), 0);
    check(bounds[0] >= budget && bounds[1] <= budget * 1.3,
      `${hero}/${planet.name}: chests + quests ${bounds.join('–')} coins fund one ${budget}-coin set (under 1.3 sets)`);
    // Vary loot luck, not just the analytic endpoints, including the mandatory boss chest.
    let sellMin = Infinity, sellMax = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const rng = mulberry32(seed); let cash = questCoins, resale = 0;
      for (const chest of chests) for (let i = 0; i < chest.count; i++) {
        const loot = rollLoot(CHEST_KINDS[chest.kind].loot, p, rng, hero); cash += loot.coins;
        resale += loot.items.reduce((n, stack) => n + (items.get(stack.item).value ? sell(stack.item) * stack.qty : 0), 0);
      }
      assert.ok(cash >= bounds[0] && cash <= bounds[1]);
      sellMin = Math.min(sellMin, resale); sellMax = Math.max(sellMax, resale);
    }
    console.log(`INFO  ${hero}/${planet.name}: route monsters +${monsterCoins}, selling every chest item +${sellMin}–${sellMax} (100 seeds; sacrifices supplies/gear)`);
    state = addXp(state.level, state.xp, def(planet.boss.type).xp);
  }
}

for (const stock of SHOP.stock) {
  const buy = stock.price ?? Math.max(1, Math.round(items.get(stock.item).value * SHOP.buyMarkup));
  check(buy > sell(stock.item), `${stock.item}: buying ${buy} > selling ${sell(stock.item)}`);
}
const rate = NEEDS.drain + 0.25 * NEEDS.sprint + 0.1 * NEEDS.swim;
const fedSeconds = (NEEDS.start - NEEDS.hungry.below * NEEDS.max) / rate;
check(fedSeconds >= 360 && fedSeconds <= 480, `mixed expedition stays fed ${Math.round(fedSeconds)} s before food`);
check(NEEDS.start - BALANCE.seconds.boss[1] * NEEDS.drain > NEEDS.hungry.below * NEEDS.max,
  'a five-minute boss does not exhaust a fed hero');
for (const [id, crop] of Object.entries(CROPS)) {
  const seconds = crop.days * DAY.length;
  check(seconds >= 150 && seconds <= 300, `${id}: ${seconds} s of watered growth, one village loop`);
  const energy = crop.harvest.reduce((n, [item, qty]) => n + mean(qty) * (items.get(item).use?.find(e => e.effect === 'energy')?.amount ?? 0), 0);
  const output = crop.harvest.reduce((n, [item, qty]) => n + mean(qty) * sell(item), 0);
  const stock = SHOP.stock.find(s => s.item === crop.seed), cost = stock.price ?? Math.round(items.get(crop.seed).value * SHOP.buyMarkup);
  check(output > cost, `${id}: expected harvest/returned-seed sale ${output} > seed ${cost}`);
  console.log(`INFO  ${id}: raw harvest ${energy} energy offsets ${(energy / rate).toFixed(0)} s mixed travel`);
}
for (const id of ['veggieStew', 'sunBread', 'pumpkinPie']) {
  const energy = items.get(id).use.find(e => e.effect === 'energy').amount;
  check(energy / rate >= 300, `${id}: one cooked portion covers at least a five-minute mixed expedition`);
}
check(NODE_KINDS.copperVein.regrow <= 210 && NODE_KINDS.ironVein.regrow <= 240, 'ore returns within a village loop');
check(NODE_KINDS.amethystVein.regrow >= BALANCE.seconds.boss[1], 'rare gems remain slower than ordinary ore');
const ingots = BALANCE.budgets[0].filter(id => !items.get(id).tool).reduce((n, id) => n + recipe(id).needs.filter(([item]) => item === 'ironIngot').reduce((s, [, qty]) => s + qty, 0), 0);
const fuel = ingots * recipe('ironIngot').fuel, batches = Math.ceil(fuel / (FUEL.charcoal * recipe('charcoal').qty));
const wood = batches * recipe('charcoal').needs.find(([item]) => item === 'wood')[1];
check(wood <= 9 && wood < Math.ceil(fuel / FUEL.wood), `Ember core set: ${ingots} iron ingots, ${fuel} fuel, ${wood} wood via charcoal`);
console.log('All pacing checks passed. This is a route/configuration audit; combat timings are measured by balance.sim.mjs.');
