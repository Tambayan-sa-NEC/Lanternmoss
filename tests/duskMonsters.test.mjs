import test from 'node:test';
import assert from 'node:assert/strict';

// Duskhollow's monsters (TODO 30e shadelings and mosslurks, 30f gloomweavers and snuffers, 30g Grandmother
// Gloomweaver, 30h Umbra) as authored data and pure rules: no browser, no scene, no world.
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

test('the grandmother hangs on strands that only burn, and comes down three times', () => {
  const d = COMBAT.enemies.grandweaver, a = d.anchors, strand = COMBAT.enemies[a.type];
  assert.equal(d.miniBoss, true); assert.equal(d.ai, 'boss'); assert.equal(d.behavior, 'grandweaver');
  assert.equal(a.count, 3, 'three anchor strands, as the design asks');
  assert.ok(a.hang > 4, `she hangs out of reach (${a.hang} m)`);
  assert.ok(a.drop > 0 && a.dazed > 0, 'she falls, then lies open for a moment');
  assert.ok(strand?.object === true && strand.static === true, 'a strand is an object, not a monster');
  assert.ok(strand.reach > 0 && strand.burnTime > 0, 'and it burns, by lantern, over a time');
  assert.equal(strand.hp, 1, 'its health is nominal: nothing but fire ever takes it');
  // one round per phase: the set she starts on, and one at each threshold
  assert.equal(d.phases.length, 3);
  assert.deepEqual(d.phases.map(p => p.below), [1, 0.6, 0.3]);
  for (const p of d.phases) assert.ok(p.attacks.every(id => d.attacks[id]), `${p.title ?? 'first web'} names real moves`);
  assert.ok(d.phases[0].attacks.includes('weave') && d.phases[0].attacks.includes('bite'),
    'she threatens from the air and on the ground from the start');
  assert.equal(d.attacks.weave.damage, 0, 'the web she drops is the threat, not the dropping of it');
  assert.ok(d.attacks.spit.slow > 0 && d.attacks.spit.slowTime > 0, 'and her silk leaves you wading');
});

test('she guards the moonstone vein, and leaves her own keepsake', async () => {
  const { NODE_KINDS } = await import('../src/config/resources.js');
  const { MINI_BOSS_LOOT } = await import('../src/config/chests.js');
  assert.equal(NODE_KINDS.moonstoneVein.guardedBy, 'grandweaver', 'the rare vein waits behind her, not behind a regular weaver');
  assert.equal(NODE_KINDS.moonstoneVein.rare, true, 'so the rare placement puts it beside her');
  assert.deepEqual(duskhollow.miniBosses.map(m => m.type), ['grandweaver']);
  for (const [item] of MINI_BOSS_LOOT.extra.grandweaver) assert.ok(ITEMS.has(item), `her keepsake is a real item: ${item}`);
  assert.ok(MINI_BOSS_LOOT.extra.grandweaver.some(([item]) => item === 'moonstone'), 'including a moonstone of her own');
});

test('Umbra dives at the brightest light, and the bait is something every hero can light', async () => {
  const d = COMBAT.enemies.umbra, L = d.lanterns, bait = COMBAT.enemies[L.type];
  assert.equal(d.ai, 'boss'); assert.equal(d.behavior, 'umbra');
  assert.ok(!d.miniBoss, 'she is the planet boss, not a mini boss');
  assert.ok(d.hover > 2, `she fights from the air (${d.hover} m)`);
  assert.ok(L.count >= 3, `enough bait to keep relighting (${L.count})`);
  assert.ok(L.oil > 0, 'lighting one costs oil, so it is a decision');
  assert.ok(L.relight > 0, 'and a snuffed one needs a moment');
  assert.ok(bait?.object === true && bait.static === true, 'an arena lantern is an object, not a monster');
  assert.ok(bait.light.radius > 0 && bait.light.intensity > 0, 'and it really is a light');
  // the crash is the damage window, and it has to be worth it
  assert.ok(d.crash.stun > 2, `she lies stunned long enough to punish (${d.crash.stun}s)`);
  assert.ok(d.stunnedDamageBonus > 0, 'and takes extra damage while she is down');
  // the wingbeat, and what it leaves behind
  assert.ok(d.snuff.oil > 0 && d.snuff.shades > 0 && d.snuff.maxShades >= d.snuff.shades, 'the wingbeat is bounded');
  assert.equal(COMBAT.enemies[d.snuff.type].ai, 'lightbound', 'and what comes out of the dark is a shadeling');
  // drinking the light
  assert.ok(d.feed.drains > 0 && d.feed.fog > 0 && d.feed.blind > 0 && d.feed.blind < 1, 'a feed drains a lantern and fogs the hero');
  assert.deepEqual(d.phases.map(p => p.below), [1, 0.5], 'she starts drinking at half health');
  assert.ok(!d.phases[0].attacks.includes('drink') && d.phases[1].attacks.includes('drink'));
  for (const p of d.phases) assert.ok(p.attacks.every(id => d.attacks[id]), `${p.title} names real moves`);
});

test('her lair, her ring and her crown', async () => {
  const { ARENA_WALLS } = await import('../src/config/bossSummon.js');
  const boss = duskhollow.boss;
  assert.equal(boss.type, 'umbra');
  assert.deepEqual(boss.summon, { level: 11, quest: 'oldRoad' }, "the gate Wick's quest opens");
  assert.ok(ARENA_WALLS[boss.arena.wall], `the ring is a real wall kind (${boss.arena.wall})`);
  assert.equal(boss.arena.wall, 'moonfire', 'pale moonfire, as the design asks');
  assert.equal(boss.trophy, 'duskCrown');
  assert.ok(ITEMS.has('duskCrown'), 'and the Dusk Crown is a real item');
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
  const granny = BESTIARY_ENTRIES.grandweaver;
  assert.ok(granny?.lore && granny.blurb, 'the mini boss has her page and her story');
  assert.match(granny.counters.join(' '), /burn/i, 'which says to burn the strands');
  assert.match(granny.counters.join(' '), /beetle/i, 'and names the accessibility setting too');
  assert.equal(BESTIARY_ENTRIES[COMBAT.enemies.grandweaver.anchors.type], undefined, 'a strand is an object, so it gets no page');
  const moth = BESTIARY_ENTRIES.umbra;
  assert.ok(moth?.lore && moth.blurb, 'the boss has her page and her story');
  assert.match(moth.counters.join(' '), /arena lantern/i, 'which says to light the bait');
  assert.match(moth.counters.join(' '), /crash/i, 'and names the damage window');
  assert.equal(BESTIARY_ENTRIES[COMBAT.enemies.umbra.lanterns.type], undefined, 'an arena lantern is an object, so it gets no page');
  assert.equal(BESTIARY_ENTRIES[COMBAT.enemies.gloomweaver.web.type], undefined, 'a web is an object, so it gets no page');
});

test('an unreleased world\'s monsters stay out of the journal\'s goals', () => {
  const types = releasedEnemyTypes(PLANET_CATALOG, COMBAT.enemies);
  for (const type of DUSK) assert.ok(!types.has(type), `${type} belongs to a world no one can visit yet`);
});
