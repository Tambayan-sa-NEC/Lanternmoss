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
import { MINI_BOSS_LOOT } from '../../src/config/chests.js';
import { installTidewhisperCandidate } from './lib/tidewhisperCandidate.mjs';
import { installDuskhollowCandidate } from './lib/duskhollowCandidate.mjs';
const items = new Map(ITEM_DEFINITIONS.map(d => [d.id, d]));
const recipe = id => RECIPES.find(r => r.id === id);
const sell = id => Math.max(1, Math.floor(items.get(id).value * SHOP.sellRate));
const check = (ok, message) => { assert.ok(ok, message); console.log(`PASS  ${message}`); };
const mean = v => Array.isArray(v) ? (v[0] + v[1]) / 2 : v;

// The audit includes the fifth-world candidate with its real id, index and scaling before release.
const tideCandidate = installTidewhisperCandidate();
const duskCandidate = installDuskhollowCandidate();
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
const tide = PLANETS.find(p => p.id === 'tidewhisper');
const dusk = PLANETS.find(p => p.id === 'duskhollow');
duskCandidate.restore(); tideCandidate.restore();

// Tidewhisper materials: washups return once per day (300 s), low-tide nodes are reachable once per day, the black
// pearl bed regrows slower than a visit. Minimum yields only: the lens fits the first day, lens + Tide set two days.
{
  const need = new Map(), add = (id, n) => need.set(id, (need.get(id) ?? 0) + n);
  for (const step of QUESTS.darkLighthouse.steps) if (step.kind === 'collect') add(step.item, step.count);
  const lens = new Map(need);
  for (const id of BALANCE.budgets[3]) { const r = recipe(id); for (const [item, n] of r.needs) add(item, n); add('wood', (r.fuel ?? 0) / FUEL.wood); }
  const daily = new Map(), once = new Map(), low = qty => (Array.isArray(qty) ? qty[0] : qty);
  for (const [kind, count] of [...tide.resources.nodes, ...tide.resources.rare]) {
    const k = NODE_KINDS[kind], into = k.regrow > DAY.length ? once : daily;
    for (const [item, qty] of k.drops) into.set(item, (into.get(item) ?? 0) + low(qty) * count);
  }
  for (const [item, qty] of MINI_BOSS_LOOT.extra.ironclaw) once.set(item, (once.get(item) ?? 0) + qty);
  const yieldOf = (item, days) => (daily.get(item) ?? 0) * days + (once.get(item) ?? 0);
  for (const [item, n] of lens) check(yieldOf(item, 1) >= n, `Tidewhisper lens: ${n} ${item} within one day's minimum yield (${yieldOf(item, 1)})`);
  for (const [item, n] of need) check(yieldOf(item, 2) >= n, `Tidewhisper lens + Tide set: ${n} ${item} within two days' minimum yield (${yieldOf(item, 2)})`);
}

// Duskhollow's full Dusk set: ordinary veins regrow within a day, the guarded moonstone is a first-visit reward,
// and the silk comes from placed forage, Grandmother's fixed drop and two cut webs (minimum one each).
{
  const gear = BALANCE.budgets[4].map(id => recipe(id));
  const need = new Map(), add = (id, n) => need.set(id, (need.get(id) ?? 0) + n);
  for (const r of gear) for (const [id, n] of r.needs) add(id, n);
  const ingots = need.get('lumenIngot');
  add('lumenOre', ingots * recipe('lumenIngot').needs.find(([id]) => id === 'lumenOre')[1]);
  const fuel = ingots * recipe('lumenIngot').fuel + gear.reduce((n, r) => n + (r.fuel ?? 0), 0);
  const charcoal = recipe('charcoal');
  add('wood', Math.ceil(fuel / (FUEL.charcoal * charcoal.qty)) * charcoal.needs.find(([id]) => id === 'wood')[1]);
  const low = qty => Array.isArray(qty) ? qty[0] : qty;
  const nodes = new Map();
  for (const [kind, count] of [...dusk.resources.nodes, ...dusk.resources.rare])
    for (const [id, qty] of NODE_KINDS[kind].drops) nodes.set(id, (nodes.get(id) ?? 0) + low(qty) * count);
  const forage = new Map(dusk.forage.map(({ item, count }) => [item, count]));
  const fixed = new Map(MINI_BOSS_LOOT.extra.grandweaver);
  check((nodes.get('lumenOre') ?? 0) * 3 >= need.get('lumenOre'),
    `Duskhollow: ${need.get('lumenOre')} lumen ore within three minimum-yield vein cycles`);
  check((nodes.get('lumenDust') ?? 0) >= need.get('lumenDust') + recipe('lumenOil').needs.find(([id]) => id === 'lumenDust')[1],
    `Duskhollow: ${need.get('lumenDust')} dust for the set and one refill on the first visit`);
  check((forage.get('spiderSilk') ?? 0) + (fixed.get('spiderSilk') ?? 0) + 2 * low(COMBAT.enemies.gloomweb.silk[1]) >= need.get('spiderSilk'),
    `Duskhollow: ${need.get('spiderSilk')} silk from forage, Grandmother and two cut webs`);
  check((nodes.get('moonstone') ?? 0) + (fixed.get('moonstone') ?? 0) >= need.get('moonstone'),
    'Duskhollow: a guarded moonstone is available on the first visit');
  check((nodes.get('wood') ?? 0) >= need.get('wood'),
    `Duskhollow: ${need.get('wood')} wood fuels the smelting and forging through charcoal`);
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
  // A crop's seeds are either sold in the village shop or foraged on their own world (Duskhollow's shade spores, 30c).
  const stock = SHOP.stock.find(s => s.item === crop.seed), cost = stock?.price ?? Math.round(items.get(crop.seed).value * SHOP.buyMarkup);
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
