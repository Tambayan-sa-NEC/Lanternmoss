// TODO 28b (talent rules, saves and UI) on the test-only fixture tree: points come from levels, learning changes the
// real casts (cost, cooldown) through kit(), Continue and repeated reloads never add points, a tampered save is
// trimmed to what the level earned, Old Bramble's free reset restores the base kit, a new adventure starts empty, and
// with the real (unreleased) tree nothing is offered to players.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
import { installTalentFixture } from './lib/talentFixture.mjs';
const { ctx } = await imp('core/context.js');
const { kit, spellState, resetCooldowns } = await imp('combat/casting.js');
const { CHARACTERS } = await imp('config/characters.js');
const { SAVE_KEY } = await imp('core/save.js');
const { PauseMenu } = await imp('ui/PauseMenu.js');
const { H, game, step } = await boot('witch');
const P = H.player, T = H.Talents, base = CHARACTERS.witch.abilities;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

// ---- unreleased: nothing for players -----------------------------------------------------------------------------------
const bramble = H.npcs.find(n => n.name === 'Old Bramble');
assert.ok(bramble, 'Old Bramble is in the village');
assert.equal(T.open, false); assert.equal(kit(), base);
const { dom } = await imp('ui/dom.js');
PauseMenu.open(); assert.ok(!dom.pause.innerHTML.includes('data-go="talents"'), 'no Talents button while the tree is unreleased'); PauseMenu.close();
assert.equal(T.wizardLine(bramble, () => null), null);
pass('with the real, unreleased tree: no Talents button, no wizard offer, and the base kit');

// ---- the fixture tree: points from levels, learning changes real casts -------------------------------------------------
const fixture = installTalentFixture('witch');
assert.ok(T.open); assert.equal(T.available, 0);
assert.match(T.learn('sharpBolt').message, /Not enough talent points/);
const { xpToNext } = await imp('progression/leveling.js');
const levelTo = n => { while (P.level < n) H.gainXp(xpToNext(P.level) - P.xp); };   // one level at a time
levelTo(4); assert.equal(T.earned, 2);
assert.ok(T.learn('sharpBolt').ok); assert.ok(T.learn('quickNova').ok); assert.equal(T.available, 0);
assert.equal(kit().bolt.damage, base.bolt.damage * 1.15); assert.equal(kit().nova.cooldown, base.nova.cooldown - 1);
resetCooldowns(kit()); P.mana = P.stats.maxMana; H.tryCast('nova'); const novaCd = spellState.cd.nova; assert.equal(novaCd, base.nova.cooldown - 1, 'a real cast uses the talent cooldown');
levelTo(6); assert.ok(T.learn('cheapBolt').ok);
resetCooldowns(kit()); step(0.5); P.mana = 50; H.tryCast('bolt'); assert.equal(P.mana, 50 - (base.bolt.cost - 1), 'a real Arcane Bolt pays the talent cost');
pass(`level 4 earns 2 points, level 6 a third; learned ranks change real casts (Frost Nova ${base.nova.cooldown} -> ${novaCd} s, Arcane Bolt ${base.bolt.cost} -> ${base.bolt.cost - 1} mana)`);

// ---- Continue twice never adds points; a tampered save is trimmed to what the level earned -----------------------------
const learned = { ...T.ranks };
for (let i = 0; i < 2; i++) { assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); step(0.2); }
assert.deepEqual(T.ranks, learned); assert.equal(T.earned, 3); assert.equal(T.available, 0);
const raw = JSON.parse(localStorage.getItem(SAVE_KEY)); raw.systems.talents = { ranks: { sharpBolt: 2, quickNova: 1, cheapBolt: 3, wideFire: 1 } };
localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); assert.ok(game.saves.continue()); step(0.2);
assert.ok(T.spent <= T.earned, `${T.spent} spent of ${T.earned}`); assert.deepEqual(T.ranks, { sharpBolt: 2, quickNova: 1 });
const lvl = P.level; levelTo(lvl + 2); assert.equal(T.available, T.earned - T.spent); assert.equal(T.earned, 4);
pass(`two Save + Continue rounds keep ${JSON.stringify(learned)} and ${T.earned - 1} points; a save claiming 7 points at level 6 loads as 3; the next level-up adds exactly one`);

// ---- Old Bramble resets for free: the base kit is back -----------------------------------------------------------------
const coins = P.coins, spent = T.spent;
H.Dialog.start(bramble); H.Dialog.finishTyping();
assert.match(H.Dialog.text, /unpick them all/); H.Dialog.choose(true);
assert.deepEqual(T.ranks, {}); assert.equal(kit(), base, 'the base table itself'); assert.equal(P.coins, coins, 'free');
assert.equal(T.available, T.earned); assert.match(H.Dialog.text, new RegExp(`${spent} points back`)); H.Dialog.close();
assert.equal(T.wizardLine(bramble, () => null), null, 'nothing to reset: Bramble chats as usual');
pass(`Old Bramble's free reset gave ${spent} points back and restored the base kit`);

// ---- a new adventure starts with nothing learned -----------------------------------------------------------------------
T.learn('sharpBolt'); assert.ok(T.spent > 0);
game.resetRun(); assert.deepEqual(T.ranks, {});
fixture.restore(); assert.equal(T.open, false);
pass('a new adventure starts with no talents');
