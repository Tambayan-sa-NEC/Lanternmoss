// Combat config invariants: one aimed ultimate per hero, the power ladder, evasion cooldowns, and the three bosses
// (each planet its own boss and AI; the Demon Lord's two phases and single, telegraphed lethal blow). Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITY_TEXT, CHARACTERS } from '../src/config/characters.js';
import { COMBAT } from '../src/config/combat.js';
import { PLANETS } from '../src/config/planets.js';
import { scaleEnemyDef } from '../src/combat/enemyDefs.js';

const BOSS_KITS = ['gloomcap', 'dragon', 'demonLord'];   // src/entities/enemies/behaviors/boss/

test('ability ids are unique across heroes (they share one CAST table)', () => {
  const ids = Object.values(CHARACTERS).flatMap(c => Object.keys(c.abilities));
  assert.equal(new Set(ids).size, ids.length);
});

test('every ability has a tooltip description, and no description is orphaned', () => {
  const ids = Object.values(CHARACTERS).flatMap(c => Object.keys(c.abilities));
  for (const id of ids) assert.ok(ABILITY_TEXT[id]?.length > 10, `${id}: needs ABILITY_TEXT`);
  for (const id of Object.keys(ABILITY_TEXT)) assert.ok(ids.includes(id), `ABILITY_TEXT.${id}: no such ability`);
});

test('every hero has exactly one ultimate: ground-targeted, on 5/G, with range, radius and a long cooldown', () => {
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const ults = Object.values(c.abilities).filter(s => s.ult);
    assert.equal(ults.length, 1, `${id}: one ultimate`);
    const u = ults[0];
    assert.equal(u.target, 'ground', `${id}: ultimates are aimed on the ground`);
    assert.equal(u.slot, 5, `${id}: the ultimate is the fifth skill`);
    assert.deepEqual(u.keys, ['KeyG'], 'on the skill 5 key (G by default)');
    assert.ok(u.range > u.radius && u.radius >= 4, `${id}: a large area within reach`);
    assert.ok(u.cooldown >= 20 && u.cost > 0, `${id}: limited by cooldown and cost`);
  }
});

test('power ladder: basic < ability < ultimate (an ultimate deals several times a normal ability)', () => {
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const list = Object.values(c.abilities), basic = list.find(s => s.mouse), ult = list.find(s => s.ult);
    const normal = Math.max(...list.filter(s => !s.mouse && !s.ult && s.damage).map(s => s.damage));
    const ultTotal = ult.duration && ult.tick ? ult.damage * Math.floor(ult.duration / ult.tick) : ult.damage;
    assert.ok(basic.damage < normal, `${id}: basic ${basic.damage} < ability ${normal}`);
    assert.ok(ultTotal >= normal * 3, `${id}: ultimate ${ultTotal} >= 3x ability ${normal}`);
  }
  const rain = CHARACTERS.ranger.abilities.rain;
  assert.ok(rain.duration >= 3 && rain.tick < rain.duration / 5, 'Arrow Rain is a sustained area, many ticks');
  assert.ok(COMBAT.spells.meteor.delay > 0.5 && COMBAT.spells.meteor.delay < 2, 'Meteor lands after a short delay');
  const slam = CHARACTERS.knight.abilities.leapSlam;
  assert.ok(slam.landing && slam.stun > 1 && slam.range >= 10, 'Leap Slam: long leap, valid landing, AoE stun');
});

test('evasion cooldowns are shorter than before but never zero, and i-frames stay brief', () => {
  const evasion = [[COMBAT.spells.blink, 5], [CHARACTERS.ranger.abilities.leap, 5], [CHARACTERS.knight.abilities.dash, 4]];
  for (const [s, was] of evasion) {
    assert.ok(s.cooldown < was && s.cooldown >= 2, `${s.name}: ${was} s -> ${s.cooldown} s`);
    const iframes = s.invuln ?? s.time;
    assert.ok(iframes < s.cooldown / 4, `${s.name}: invulnerable for a small share of its cooldown`);
  }
});

test('each planet has its own boss type and AI; planet 1 keeps Gloomcap', () => {
  const bosses = PLANETS.map(p => COMBAT.enemies[p.boss.type]);
  assert.equal(PLANETS[0].boss.type, 'gloomcap');
  assert.equal(new Set(PLANETS.map(p => p.boss.type)).size, PLANETS.length);
  assert.deepEqual(bosses.map(b => b.behavior), BOSS_KITS);
});

test('every boss attack has a warning, a recovery and a cooldown', () => {
  for (const d of Object.values(COMBAT.enemies).filter(d => d.ai === 'boss')) {
    for (const [id, a] of Object.entries(d.attacks)) {
      assert.ok(a.windup >= 0.5, `${d.name} ${id}: wind-up long enough to read (${a.windup})`);
      assert.ok(a.recover >= 0 && a.cooldown >= 0, `${d.name} ${id}: recover + cooldown`);
    }
    assert.ok(d.stunResist === undefined || (d.stunResist > 0 && d.stunResist < 1), `${d.name}: stunResist is a fraction`);
  }
});

test('the dragon fights with fire, melee sweeps and mobility', () => {
  const D = COMBAT.enemies.pyrrhax;
  for (const m of ['bite', 'tail', 'breath', 'fireballs', 'leap']) assert.ok(D.attacks[m], `dragon ${m}`);
  assert.ok(D.attacks.leap.minRange > D.attacks.bite.range, 'leaps only from afar, bites up close');
  assert.ok(D.phases.at(-1).enraged && D.phases.at(-1).below <= 0.5);
});

test('the Demon Lord: grounded then flying phase with different moves, one telegraphed lethal blow', () => {
  const M = COMBAT.enemies.malgrath, [p1, p2] = M.phases;
  assert.equal(M.phases.length, 2);
  assert.ok(!p1.flying && p2.flying && p2.below <= 0.5, 'phase 2 = flying, at half health or lower');
  assert.equal(p1.attacks.filter(a => p2.attacks.includes(a)).length, 0, 'the two phases share no attacks');
  const lethal = Object.entries(M.attacks).filter(([, a]) => a.lethal);
  assert.equal(lethal.length, 1, 'exactly one lethal attack');
  const [id, doom] = lethal[0];
  assert.ok(p1.attacks.includes(id), 'the lethal blow belongs to the grounded phase');
  assert.ok(doom.windup >= 1.5 && doom.reuse >= 10, 'long wind-up, not spammed');
  assert.ok(M.transition.time > M.transition.burstAt && M.flight.hover < 4.5, 'transition plays out; flying height stays in reach');
});

test('scaled per planet, each boss hits harder than the last (difficulty from attacks, not just health)', () => {
  const peak = p => {
    const d = scaleEnemyDef(COMBAT.enemies[p.boss.type], p.scale);
    return Math.max(...Object.values(d.attacks).filter(a => !a.lethal && a.damage).map(a => Math.max(a.damage, a.finisherDamage ?? 0)));
  };
  const peaks = PLANETS.map(peak);
  for (let i = 1; i < peaks.length; i++) assert.ok(peaks[i] > peaks[i - 1], `planet ${i + 1} boss peak hit ${peaks[i]} > ${peaks[i - 1]}`);
  const hp = PLANETS.map(p => COMBAT.enemies[p.boss.type].hp);
  assert.ok(Math.max(...hp) / Math.min(...hp) < 1.5, 'base boss health stays in the same range');
});
