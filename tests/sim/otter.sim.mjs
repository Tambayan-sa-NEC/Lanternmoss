// TODO 27i: the unreleased Tidewhisper candidate alone exposes the otter and its bounded pearl dive.
import assert from 'node:assert/strict';
import { installTidewhisperCandidate } from './lib/tidewhisperCandidate.mjs';
const fixture = installTidewhisperCandidate();
const { boot, imp } = await import('./lib/boot.mjs');
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { emit } = await imp('core/events.js');
const { Pets } = await imp('gameplay/Pets.js');
const { PETS, availablePetIds } = await imp('config/pets.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { dryGround } = await imp('world/terrain.js');
const { CharacterSelect } = await imp('ui/CharacterSelect.js');
try {
  H.Tutorial.skip(); H.player.invuln = 1e9; Pets.command('passive');
  assert.ok(availablePetIds().includes('otter'), 'candidate exposes otter');
  assert.ok(!Pets.unlocked.has('otter') && !Pets.choose('otter'), 'otter starts locked');
  emit('questcomplete', { id: 'humStones' });
  assert.ok(!Pets.unlocked.has('otter'), 'another quest cannot unlock it');
  emit('questcomplete', { id: 'darkLighthouse' });
  assert.ok(Pets.unlocked.has('otter'), 'relighting the lighthouse unlocks the otter');
  for (const hero of ['witch', 'knight', 'ranger']) {
    CharacterSelect.pick(hero); assert.ok(Pets.choose('otter', true), `${hero} selects the otter`);
    assert.equal(ctx.companion.petId, 'otter'); assert.equal(ctx.companion.kind, 'otter');
  }
  assert.equal(ctx.planetId, 'lanternmoss');
  assert.equal(Pets.useAbility(), false, 'Pearl Dive cannot yield on another world');
  H.goToPlanet(3); step(.2); assert.equal(ctx.planetId, 'tidewhisper');
  dayClock.t = .9 * DAY.length; step(.2);
  const beds = H.Gathering.nodes.filter(n => n.kind === 'clamBed' && !dryGround(n.up));
  assert.ok(beds.length >= PETS.otter.ability.perDay + 1, 'submerged ordinary clam beds exist');
  const pearlCount = () => H.inventory.count('pearl') + ctx.worldItems.filter(w => w.itemId === 'pearl').reduce((n,w) => n+w.quantity,0);
  const start = pearlCount();
  for (let i = 0; i < PETS.otter.ability.perDay; i++) {
    H.player.placeAt(beds[i].up); ctx.companion.snapToHero(); Pets.abilityCd = 0;
    assert.ok(Pets.useAbility(), `dive ${i + 1} succeeds`);
    assert.ok(ctx.companion.diveT > 0, 'the otter visibly plunges at the chosen bed');
    assert.ok(beds[i].regrowT > 0, 'used clam bed rests');
    assert.equal(pearlCount(), start + i + 1, 'exactly one pearl is granted');
  }
  H.player.placeAt(beds[2].up); Pets.abilityCd = 0;
  assert.equal(Pets.useAbility(), false, 'daily cap refuses another pearl');
  assert.equal(pearlCount(), start + PETS.otter.ability.perDay);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(.1);
  assert.equal(ctx.planetId, 'tidewhisper'); assert.equal(Pets.id, 'otter');
  assert.equal(Pets.divesToday, PETS.otter.ability.perDay, 'Continue restores daily count');
  assert.equal(pearlCount(), start + PETS.otter.ability.perDay, 'Continue duplicates no pearls');
  H.goToPlanet(0); step(.1); H.goToPlanet(3); step(.1);
  assert.equal(Pets.id, 'otter'); assert.equal(Pets.divesToday, PETS.otter.ability.perDay, 'travel retains the otter and cap');
  dayClock.skip(DAY.length, 'test'); step(.1); Pets.abilityCd = 0;
  const freshBed = H.Gathering.nodes.find(n => n.kind === 'clamBed' && n.regrowT <= 0 && !dryGround(n.up));
  assert.ok(freshBed, 'a fresh submerged bed is available the next day');
  H.player.placeAt(freshBed.up); assert.ok(Pets.useAbility(), 'new day opens one new dive');
  assert.equal(Pets.divesToday, 1);
  game.resetRun(); assert.ok(!Pets.unlocked.has('otter') && Pets.divesToday === 0, 'new adventure clears unlock and dive ledger');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
