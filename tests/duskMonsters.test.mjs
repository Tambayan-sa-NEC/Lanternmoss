import test from 'node:test';
import assert from 'node:assert/strict';

// Duskhollow's monsters (TODO 30e shadelings and mosslurks, 30f gloomweavers and snuffers) as authored data and
// pure rules: no browser, no scene, no world.
const duskhollow = (await import('../src/config/planets/duskhollow.js')).default;
const { COMBAT } = await import('../src/config/combat.js');
const { BESTIARY_ENTRIES } = await import('../src/config/bestiary.js');
const { MONSTER_DROPS } = await import('../src/config/chests.js');
const { ITEM_DEFINITIONS } = await import('../src/config/items.js');
const { DUSK_ITEMS } = await import('../src/config/duskResources.js');
const { OLD_ROAD } = await import('../src/config/oldRoad.js');
const { releasedEnemyTypes } = await import('../src/config/releasedEnemies.js');
const { PLANET_CATALOG } = await import('../src/config/planets.js');

const ITEMS = new Set([...ITEM_DEFINITIONS, ...DUSK_ITEMS].map(i => i.id));
const { LANTERN } = await import('../src/config/lantern.js');
const LANTERN_MAX = LANTERN.oil.max;
const DUSK = ['shadeling', 'mosslurk', 'gloomweaver', 'snuffer'];
const group = type => duskhollow.roster.find(g => g.type === type);

test('Duskhollow fields the monsters its stages authored, placed where each belongs', () => {
  assert.deepEqual(duskhollow.roster.map(g => g.type), DUSK);
  assert.ok(group('shadeling').groups > 0 && group('shadeling').size > 0, 'shadelings come in groups: the hollows are haunted in packs');
  assert.equal(group('mosslurk').near, 'glowcaps', 'a mimic is only a mimic where there are real caps to hide among');
  assert.ok(group('gloomweaver').groups > 0, 'weavers come in pairs, so their webs overlap');
  assert.ok(group('snuffer').count > 0 && !group('snuffer').near, 'thieves roam the whole world looking for a lit lantern');
  for (const type of DUSK) assert.ok(COMBAT.enemies[type], `${type} has stats`);
});

test('a shadeling is only solid in light, and never hurts what it cannot be hurt by', () => {
  const d = COMBAT.enemies.shadeling;
  assert.equal(d.ai, 'lightbound');
  assert.ok(d.bindAt > 0 && d.bindAt < 1, 'there is a brightness at which it stands up solid');
  assert.ok(d.fleeFire === true && d.fleeTime > 0 && d.fleeSpeed > 1, 'and a burst of light or fire sends it running, faster than it walks');
  assert.ok(d.windup > 0 && d.recover > 0 && d.cooldown > 0, 'its blow is telegraphed and has a cooldown');
  assert.ok(d.damage > 0 && d.range > 0 && d.hp > 0 && d.xp > 0);
});

test('the belt lantern and the Old Road both light brightly enough to bind a shade', async () => {
  const { LANTERN } = await import('../src/config/lantern.js');
  const bind = COMBAT.enemies.shadeling.bindAt;
  // brightness falls from 1 at the light to 0 at the edge of its reach (gameplay/OldRoad.js litAt)
  const at = (metres, radius) => Math.max(0, 1 - metres / radius);
  assert.ok(at(1, LANTERN.light.radius) >= bind, 'a lit lantern binds a shade beside the hero');
  assert.ok(at(1, LANTERN.light.emberRadius) * 0.45 >= bind, 'even an empty lantern binds what comes right up to it');
  assert.ok(at(OLD_ROAD.lamp.light.radius * 0.6, OLD_ROAD.lamp.light.radius) >= bind, 'a relit waylamp holds a pool of fightable ground');
  assert.ok(at(OLD_ROAD.well.light.radius * 0.6, OLD_ROAD.well.light.radius) >= bind, 'and a moonwell a wider one');
});

test('a mosslurk ambush is an ambush, not a free hit', () => {
  const d = COMBAT.enemies.mosslurk;
  assert.equal(d.ai, 'mimic');
  assert.ok(d.pickReach > d.triggerRange, 'you can reach for it from further away than you can blunder into it');
  assert.ok(d.windup > 0 && d.telegraph === true, 'it shows a warning circle before the first bite');
  assert.ok(d.speed < COMBAT.enemies.shadeling.speed, 'and once sprung it is slow enough to back away from');
  assert.ok(d.damage > 0 && d.hp > 0 && d.xp > 0);
});

test('a gloomweaver fences you in with webs, and the webs are objects with their own rules', () => {
  const d = COMBAT.enemies.gloomweaver, w = COMBAT.enemies[d.web.type];
  assert.equal(d.ai, 'weaver');
  assert.ok(d.web.max > 0 && d.web.max <= 6, `a weaver holds a bounded number of webs (${d.web.max})`);
  assert.ok(d.web.every > 0 && d.web.at > 0, 'and spins them on a timer, a little ahead of itself');
  assert.ok(w, 'the web it spins is a real enemy definition');
  assert.equal(w.object, true, 'but an object, not a monster: no page, no drops, no kill counted');
  assert.equal(w.static, true);
  assert.ok(w.mire > 0 && w.mire < 1, `a web slows, it never stops you dead (${w.mire})`);
  assert.ok(w.hp > 0, 'a blade has to cut it');
  assert.ok(w.life > 0, 'and an uncut web rots away, so a hollow cannot silt up');
  const [item, [lo, hi]] = w.silk;
  assert.ok(ITEMS.has(item) && lo >= 1 && hi >= lo, `it leaves real silk: ${item} ${lo}-${hi}`);
  assert.equal(item, 'spiderSilk', 'which is the source this world was missing');
});

test('a snuffer can only take what the tank holds, and always gives back more', () => {
  const d = COMBAT.enemies.snuffer, s = d.steal;
  assert.equal(d.ai, 'thief');
  assert.ok(s.oil > 0 && s.oil < LANTERN_MAX, `one theft is a draught, not the whole tank (${s.oil} of ${LANTERN_MAX})`);
  assert.ok(s.interest > 1, 'catching it is worth more than it took');
  assert.ok(s.escape > 0 && s.speedUp > 1, 'and it runs off quicker than it arrived');
  assert.ok(d.damage < COMBAT.enemies.shadeling.damage, 'it barely fights: the chase is the point');
});

test('the beetle silhouette is one setting, shared by every spider on the world', async () => {
  const { SETTINGS_SCHEMA } = await import('../src/config/settings.js');
  const items = SETTINGS_SCHEMA.flatMap(g => g.items);
  const toggle = items.find(i => i.key === 'roundBeetles');
  assert.ok(toggle, 'the Settings screen offers it');
  assert.equal(toggle.type, 'toggle');
  assert.equal(toggle.default, false, 'off by default: the spiders are the authored look');
  assert.match(toggle.label, /beetle/i);
});

test('fire is named in the spells that carry it, so every flee rule has a source', () => {
  assert.equal(COMBAT.spells.fireball.fire, true);
  assert.equal(COMBAT.spells.meteor.fire, true);
  const others = Object.entries(COMBAT.spells).filter(([id, s]) => s.fire && !['fireball', 'meteor'].includes(id));
  assert.deepEqual(others, [], 'and nothing else claims to be fire');
});

test('every monster has a journal page and leaves something of this world behind', () => {
  for (const type of DUSK) {
    const page = BESTIARY_ENTRIES[type];
    assert.ok(page?.name && page.blurb, `${type} has a page`);
    assert.ok(page.attacks.length >= 1 && page.counters.length >= 2, `${type} says how it attacks and how to beat it`);
    const extra = MONSTER_DROPS.extra[type];
    assert.ok(extra && extra.chance > 0 && extra.chance <= 1, `${type} has a drop chance`);
    for (const [id] of extra.items) assert.ok(ITEMS.has(id), `${type} drops a real item: ${id}`);
    assert.ok(page.drops, `${type}'s page mentions what it leaves`);
  }
  assert.match(BESTIARY_ENTRIES.shadeling.counters.join(' '), /light/i);
  assert.match(BESTIARY_ENTRIES.mosslurk.counters.join(' '), /circle/i);
  assert.match(BESTIARY_ENTRIES.gloomweaver.counters.join(' '), /beetle/i, 'and the weaver page names the accessibility setting');
  assert.match(BESTIARY_ENTRIES.snuffer.counters.join(' '), /interest|back/i);
  assert.equal(BESTIARY_ENTRIES[COMBAT.enemies.gloomweaver.web.type], undefined, 'a web is an object, so it gets no page');
});

test('an unreleased world\'s monsters stay out of the journal\'s goals', () => {
  const types = releasedEnemyTypes(PLANET_CATALOG, COMBAT.enemies);
  for (const type of DUSK) assert.ok(!types.has(type), `${type} belongs to a world no one can visit yet`);
});
