// Malgrath's real transition and projectile/cleave hit path, at each hero's normal fighting distance.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { H, step } = await boot('witch');
const { applyCharacter } = await imp('gameplay/characters.js');
const { offsetDir, tangentToward } = await imp('utils/sphere.js');
const { tryCast, resetCooldowns, kit } = await imp('combat/casting.js');
const { updateAim } = await imp('combat/targeting.js');
const { damageEnemy } = await imp('combat/damage.js');
const { encounterEvents } = await imp('combat/events.js');
const { COMBAT } = await imp('config/combat.js');
const { ctx } = await imp('core/context.js');
const check = (ok, message) => { assert.ok(ok, message); console.log(`PASS  ${message}`); };
for (const hero of ['witch', 'knight', 'ranger']) {
  H.goToPlanet(2); step(1); applyCharacter(hero);
  const B = H.boss, P = H.player;
  for (const e of ctx.enemies) if (e !== B) e.vanish();
  P.placeAt(offsetDir(B.home, 0.2, 8)); B.aggro(); P.invuln = 100;
  B.hp = B.def.hp * 0.5 + 1; step(1 / 60);
  check(B.bossPhase === 0, `${hero}: still grounded above half HP`);
  damageEnemy(B, 1); step(1 / 60);
  check(B.bossPhase === 1 && B.state === 'transition' && B.invulnerable, `${hero}: ascends exactly at half HP`);
  const health = B.hp; damageEnemy(B, 100); step(1);
  check(B.hp === health, `${hero}: transition rejects damage`);
  step(B.def.transition.time);
  check(B.flying && !B.invulnerable && B.hover > 1.5, `${hero}: transition ends and low flight is vulnerable`);
  // Keep low flight still for the hit-path probe; do not substitute direct damage for actual hero attacks.
  B.state = 'chase'; B.cool = 100; B.def = { ...B.def, flight: { ...B.def.flight, speed: 0 } };
  const distance = hero === 'knight' ? 2.4 : 8;
  P.placeAt(offsetDir(B.up, 0.3, distance)); ctx.companion.setVisible(false);
  let hits = 0;
  const onHit = e => { if (e.detail.enemy === B && e.detail.source === 'player' && B.hover > 1.5) hits++; };
  encounterEvents.addEventListener('enemyhit', onHit);
  resetCooldowns(kit());
  step(3, () => {
    P.invuln = 10; P.mana = P.stats.maxMana;
    P.fwd.copy(tangentToward(P.up, B.up)); updateAim();
    tryCast({ witch: 'bolt', knight: 'slash', ranger: 'shot' }[hero]);
  });
  encounterEvents.removeEventListener('enemyhit', onHit);
  check(hits >= 2 && B.hp < health, `${hero}: ${hits} real basic attacks hit the flying boss`);
  ctx.companion.setVisible(true);
  const max = Math.max(...Object.entries(B.def.attacks).filter(([id]) => id !== 'doom')
    .map(([, a]) => a.damage ?? 0));
  check(max < P.stats.maxHp, `${hero}: a flying-phase hit (${max}) is survivable at base health (${P.stats.maxHp})`);
}
check(COMBAT.enemies.malgrath.attacks.doom.reuse >= 24 && COMBAT.enemies.malgrath.attacks.doom.windup >= 2,
  'Doom Blade has a two-second warning and at least 24 seconds of reuse cooldown');
console.log('All balance phase checks passed.');
