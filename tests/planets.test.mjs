// Planet progression and enemy scaling: config invariants the boss -> next planet loop relies on,
// and the pure stat scaling in src/combat/enemyDefs.js. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT } from '../src/config/combat.js';
import { PLANETS, TRANSITION } from '../src/config/planets.js';
import { scaleEnemyDef } from '../src/combat/enemyDefs.js';

const NEW_AIS = ['bomber', 'charger', 'burrower', 'support'];
const rosterTypes = p => p.roster.map(g => g.type);

test('every planet is complete: seed, palette, roster of known enemies, a boss of ai "boss"', () => {
  assert.ok(PLANETS.length >= 2, 'need at least one planet to travel to');
  for (const p of PLANETS) {
    assert.ok(p.name && Number.isFinite(p.seed) && p.arrival, `${p.name}: name / seed / arrival text`);
    for (const k of ['ground', 'grass', 'meadow', 'sand', 'bed', 'water', 'sky', 'fog']) assert.ok(p.palette[k] !== undefined, `${p.name}: palette.${k}`);
    for (const g of p.roster) {
      assert.ok(COMBAT.enemies[g.type], `${p.name}: unknown enemy ${g.type}`);
      assert.notEqual(COMBAT.enemies[g.type].ai, 'boss', `${p.name}: bosses don't belong in the roster`);
      assert.ok(g.groups ? g.size > 0 : g.count > 0, `${p.name}: ${g.type} needs count, or groups + size`);
    }
    assert.equal(COMBAT.enemies[p.boss.type]?.ai, 'boss', `${p.name}: boss must be an ai 'boss' enemy`);
  }
  assert.equal(new Set(PLANETS.map(p => p.seed)).size, PLANETS.length, 'each planet needs its own seed');
});

test('each planet is harder than the one before', () => {
  for (let i = 1; i < PLANETS.length; i++) {
    const a = PLANETS[i - 1].scale, b = PLANETS[i].scale, name = PLANETS[i].name;
    assert.ok(b.hp > a.hp && b.damage > a.damage, `${name}: hp and damage must go up`);
    assert.ok(b.speed >= a.speed && b.cooldown <= a.cooldown, `${name}: speed must not drop, cooldowns must not grow`);
    const count = p => p.roster.reduce((n, g) => n + (g.groups ? g.groups * g.size : g.count), 0);
    assert.ok(count(PLANETS[i]) >= count(PLANETS[i - 1]), `${name}: at least as many monsters`);
  }
});

test('the new enemy types only appear on later planets, and every one of them appears somewhere', () => {
  const aiOf = t => COMBAT.enemies[t].ai;
  assert.ok(!rosterTypes(PLANETS[0]).some(t => NEW_AIS.includes(aiOf(t))), 'planet 1 keeps the original roster');
  for (const ai of NEW_AIS) assert.ok(PLANETS.slice(1).some(p => rosterTypes(p).some(t => aiOf(t) === ai)), `${ai} is never spawned`);
});

test('every enemy that can be staggered out of an attack has a cooldown (else its recovery timer is NaN)', () => {
  for (const [type, d] of Object.entries(COMBAT.enemies)) if (d.windup || d.fuse || d.ai === 'charger') assert.ok(Number.isFinite(d.cooldown), `${type} needs a cooldown`);
});

test('boss phases start at full health, thresholds descend, attacks exist', () => {
  for (const d of Object.values(COMBAT.enemies).filter(d => d.ai === 'boss')) {
    assert.equal(d.phases[0].below, 1);
    for (let i = 1; i < d.phases.length; i++) assert.ok(d.phases[i].below < d.phases[i - 1].below);
    for (const ph of d.phases) for (const a of ph.attacks) assert.ok(d.attacks[a], `unknown boss attack ${a}`);
    assert.ok(d.staggerImmune && d.knockResist === 1 && !d.respawn, 'bosses are unstaggerable, unpushable and never respawn');
  }
  assert.ok(TRANSITION.outroDelay > 0 && TRANSITION.fadeTime > 0);
});

test('scaleEnemyDef multiplies the scaled stats, nested boss attacks included', () => {
  const base = COMBAT.enemies.gloomcap, s = { hp: 2, damage: 1.5, speed: 1.25, cooldown: 0.5, xp: 3 };
  const d = scaleEnemyDef(base, s);
  assert.equal(d.hp, base.hp * 2);
  assert.equal(d.xp, Math.round(base.xp * 3));
  assert.equal(d.speed, base.speed * 1.25);
  assert.equal(d.attacks.slam.damage, base.attacks.slam.damage * 1.5);
  assert.equal(d.attacks.slam.cooldown, base.attacks.slam.cooldown * 0.5);
  assert.equal(d.attacks.volley.speed, base.attacks.volley.speed * 1.25);
});

test('scaleEnemyDef leaves timing, ranges and phase thresholds alone and never mutates the base table', () => {
  const base = COMBAT.enemies.gloomcap, before = JSON.stringify(base);
  const d = scaleEnemyDef(base, { hp: 2, damage: 2, speed: 2, cooldown: 2, xp: 2 });
  assert.deepEqual(d.phases.map(p => p.below), base.phases.map(p => p.below));
  assert.equal(d.attacks.slam.windup, base.attacks.slam.windup);
  assert.equal(d.attacks.slam.radius, base.attacks.slam.radius);
  assert.deepEqual(d.attacks.summon.types, base.attacks.summon.types);
  assert.equal(d.name, base.name);
  assert.equal(JSON.stringify(base), before);
});

test('scaleEnemyDef returns the base table untouched for a planet with no scaling', () => {
  const goblin = COMBAT.enemies.goblin;
  assert.equal(scaleEnemyDef(goblin, PLANETS[0].scale), goblin);
  const hex = scaleEnemyDef(COMBAT.enemies.hexlantern, PLANETS[2].scale);
  assert.equal(hex.heal, COMBAT.enemies.hexlantern.heal * PLANETS[2].scale.hp);   // healing keeps pace with health
});

test('every planet has a shape of its own: valid terrain parts and cliff / peak colours', () => {
  const shapes = new Set();
  for (const p of PLANETS) {
    const t = p.terrain; assert.ok(t && (t.hills || t.ridges || t.plateaus), `${p.name}: terrain`);
    for (const k of ['hills', 'ridges', 'plateaus']) if (t[k]) assert.ok(t[k].amp > 0 && t[k].freq > 0, `${p.name}: ${k} amp / freq`);
    if (t.plateaus) assert.ok(t.plateaus.step > 0 && t.plateaus.sharp >= 0 && t.plateaus.sharp <= 1, `${p.name}: plateau steps`);
    assert.ok(Number.isInteger(t.lakes ?? 0), `${p.name}: lakes`);
    assert.ok(Number.isInteger(p.palette.cliff) && Number.isInteger(p.palette.peak), `${p.name}: cliff and peak colours`);
    shapes.add(Object.keys(t).filter(k => k !== 'lakes').sort().join('+'));
  }
  assert.ok(shapes.size >= 2, 'planets differ in shape, not just colour');
});
