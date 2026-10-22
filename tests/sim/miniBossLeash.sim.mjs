// Mini bosses and their leash (COMBAT.leashReturn): a mini boss that gives up a chase past its leash keeps its damage
// on the way home and at home, so a fight that drifted can be resumed; only after more than miniBossHealDelay seconds
// out of combat does it heal back. Since TODO 45a an ordinary monster has no leash to pass at all: it keeps coming
// instead of walking home, so it never heals itself whole either.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { ENGAGED } = await imp('entities/enemies/states.js');
const { arcDist, dirAlong, offsetDir, tangentToward } = await imp('utils/sphere.js');
const { damageEnemy } = await imp('combat/damage.js');
const { H, game, step } = await boot('witch', { wake: false });
const P = H.player, L = COMBAT.leashReturn;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

const hydra = ctx.enemies.find(e => e.def.miniBoss && e.type === 'hydra');
assert.ok(hydra, 'the Lanternmoss Hydra');
/** Puts `e` past its leash, mid-chase, with the hero beside it, so the next frame gives up the chase. */
const dragOut = e => {
  const out = tangentToward(e.home, game.world.spawnDir).negate(), d = dirAlong(e.home, out, e.def.leash + 1.5);
  e.up.copy(d); e.pos.copy(d).multiplyScalar(e.r); P.placeAt(dirAlong(d, out, 3)); e.state = 'chase'; e.aggro?.();
};
const away = () => P.placeAt(offsetDir(hydra.home, 1, hydra.def.aggro * 3));   // far enough not to re-aggro

// ---- a damaged mini boss gives up the chase: it keeps the damage walking home and once home ---------------------------
// real hits down to 40%, so it grows its heads (each heals it 4%, a designed rule) before anything is measured
const full = hydra.def.hp; P.placeAt(dirAlong(hydra.home, tangentToward(hydra.home, game.world.spawnDir), 6)); hydra.aggro();
while (hydra.hp > full * 0.4) { damageEnemy(hydra, 50, { source: 'pet' }); step(1 / 30); }
step(1); const hurt = hydra.hp;
dragOut(hydra); step(1 / 60); assert.equal(hydra.state, 'return', 'past its leash it gives up the chase');
away(); step(L.miniBossHealDelay - 1);
assert.equal(hydra.hp, hurt, `no healing on the way home (${hydra.hp} / ${full})`);
assert.ok(!ENGAGED.has(hydra.state));
pass(`past its ${hydra.def.leash} m leash the Hydra walks home still at ${hurt} / ${full} HP`);

// ---- re-engaged within the delay, the fight resumes with the damage kept -----------------------------------------------
P.placeAt(dirAlong(hydra.up, tangentToward(hydra.up, game.world.spawnDir), 5)); hydra.aggro(); step(0.5);
assert.ok(ENGAGED.has(hydra.state), 'back in the fight'); assert.ok(hydra.hp <= hurt, 'still damaged');
pass('re-engaged within the delay, the fight resumes from the same health');

// ---- out of combat for longer than the delay, it heals back ------------------------------------------------------------
away(); dragOut(hydra); away(); step(L.miniBossHealDelay - 0.5); const before = hydra.hp;
assert.ok(before < full * 0.5, `still damaged ${L.miniBossHealDelay - 0.5} s after leaving the fight (${before})`);
step(1.5); assert.ok(hydra.hp > before, `healing after ${L.miniBossHealDelay} s out of combat (${before} -> ${Math.round(hydra.hp)})`);
step(6); assert.equal(hydra.hp, full, 'whole again');
pass(`after more than ${L.miniBossHealDelay} s out of combat it heals back to ${full}`);

// ---- ordinary monsters: since 45a they do not walk home at all ----------------------------------------------------------
// The healing-on-the-way-home rule above is a mini boss rule now. An ordinary monster dragged past its old leash keeps
// coming, so it never reaches the 'return' state and never heals itself whole (tests/sim/pursuit.sim.mjs covers the
// chase itself; what matters here is that it does not quietly restore its health instead).
P.placeAt(offsetDir(game.world.spawnDir, 0.4, 40)); step(0.1);
const g = H.spawnEnemy('goblin', 4); g.temporary = true; g.hp = 10; dragOut(g); step(1 / 60);
assert.equal(g.leashed, false, 'an ordinary monster has no leash to pass');
assert.notEqual(g.state, 'return', 'so being dragged past its old leash does not send it home');
away(); step(1);
assert.ok(g.hp <= 10, `and it does not heal on the way (${Math.round(g.hp)} HP)`);
for (let i = 0; i < 600; i++) step(1 / 30);
assert.notEqual(g.state, 'return', 'it is still not going home a long way out');
assert.ok(g.hp <= 10, `and is still hurt (${Math.round(g.hp)} HP): only a mini boss heals its way out of a fight`);
pass('an ordinary goblin no longer walks home or heals itself: it keeps coming (45a)');
