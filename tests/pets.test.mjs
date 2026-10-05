// Pets: config/pets.js must name real models, abilities, quests, chests and planets, every hero's own pet must exist,
// and the pet keys must not clash with anything else. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTERS } from '../src/config/characters.js';
import { CHEST_KINDS } from '../src/config/chests.js';
import { CRITTER_DEFS } from '../src/config/critters.js';
import { KEYBINDS } from '../src/config/controls.js';
import { PET_CARE, PET_COMMANDS, PET_LEVELS, PET_MOTION, PETS } from '../src/config/pets.js';
import { PLANETS } from '../src/config/planets.js';
import { QUESTS } from '../src/config/quests.js';

const src = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const FLY_MODELS = new Set(['owl', 'wisp', 'whelp']);

test('every pet is complete: body, model, stats, attack, ability', () => {
  const abilities = src('gameplay/petAbilities.js'), icons = src('ui/icons.js');
  for (const [id, p] of Object.entries(PETS)) {
    assert.ok(p.name && p.defaultName && p.blurb && /^#[0-9a-f]{6}$/i.test(p.color), `${id}: name, default name, blurb, colour`);
    assert.ok(p.body === 'fly' ? FLY_MODELS.has(p.model) : p.body === 'walk' && CRITTER_DEFS[p.model], `${id}: ${p.body} body with model ${p.model}`);
    assert.ok(p.hp > 0 && p.attack.damage > 0 && p.attack.cooldown > 0 && p.attack.range > 0, `${id}: hp and attack`);
    assert.ok(p.ability.name && p.ability.text && p.ability.cooldown > 0, `${id}: ability`);
    assert.match(abilities, new RegExp(`\\n  ${p.ability.id}\\(`), `${id}: no handler for ability ${p.ability.id} in gameplay/petAbilities.js`);
    for (const g of [id, p.ability.id]) assert.match(icons, new RegExp(`\\n  ${g}: \``), `ui/icons.js has no glyph for ${g}`);
  }
  assert.equal(new Set(Object.values(PETS).map(p => p.ability.id)).size, Object.keys(PETS).length, 'each pet has its own ability');
});

test('unlocks point at real quests, chest kinds and planets; every hero starts with an unlocked pet', () => {
  for (const [id, p] of Object.entries(PETS)) {
    if (!p.unlock) continue;
    assert.ok(p.unlock.text, `${id}: unlock text (shown on the locked card)`);
    if (p.unlock.quest) assert.ok(QUESTS[p.unlock.quest], `${id}: quest ${p.unlock.quest}`);
    if (p.unlock.chest) assert.ok(CHEST_KINDS[p.unlock.chest], `${id}: chest ${p.unlock.chest}`);
    if (p.unlock.bossChest !== undefined) assert.ok(PLANETS[p.unlock.bossChest], `${id}: planet ${p.unlock.bossChest}`);
    assert.ok(p.unlock.quest || p.unlock.chest || p.unlock.bossChest !== undefined, `${id}: unlocked somehow`);
  }
  for (const [h, c] of Object.entries(CHARACTERS)) assert.ok(PETS[c.companion] && !PETS[c.companion].unlock, `${h}: their own pet ${c.companion} is a starter`);
  assert.ok(Object.values(PETS).filter(p => p.unlock).length >= 3, 'at least three pets to find');
});

test('commands, keys, growth and care numbers make sense', () => {
  assert.deepEqual(Object.keys(PET_COMMANDS), ['follow', 'stay', 'attack', 'passive']);
  const ids = KEYBINDS.map(b => b.id);
  assert.ok(ids.includes('petCommand') && ids.includes('petAbility'), 'the pet keys are remappable actions (clashes: tests/keybinds.test.mjs)');
  assert.ok(PET_LEVELS.damagePerLevel > 0 && PET_LEVELS.hpPerLevel > 0);
  assert.ok(PET_CARE.faintTime > 0 && PET_CARE.regen > 0 && PET_CARE.retaliate >= 0 && PET_CARE.retaliate <= 1 && PET_CARE.nameLength >= 8);
  assert.ok(PET_MOTION.fly.height > 0 && PET_MOTION.walk.runSpeed > PET_MOTION.walk.walkSpeed);
});
