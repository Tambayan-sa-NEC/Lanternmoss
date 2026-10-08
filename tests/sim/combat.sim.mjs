// Targeted combat checks: Doom Blade fairness, the three ultimates (aimed through the real cursor -> ground path),
// Leap Slam landing validation, and the evasion cooldowns.
import { boot, imp } from './lib/boot.mjs';
const THREE = await import('three');
const { arcDist, dirAlong, tangentToward, offsetDir, tangentFrame } = await imp('utils/sphere.js');
const { tryCast, confirmAim, spellState } = await imp('combat/casting.js');
const { aim, updateAiming } = await imp('combat/aiming.js');
const { landable } = await imp('combat/area.js');
const { pointer } = await imp('systems/InputSystem.js');
const { camera } = await imp('render/scene.js');
const { groundHeight, ponds } = await imp('world/terrain.js');
const { colliders } = await imp('physics/colliders.js');
const { addEnemy } = await imp('combat/spawning.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { CHARACTERS } = await imp('config/characters.js');
const { COMBAT } = await imp('config/combat.js');
const { ctx } = await imp('core/context.js');

const { H, step, game } = await boot('witch');
const P = H.player, keys = H.keys;
let fails = 0; const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };
const clearKeys = () => { for (const k in keys) keys[k] = false; };
const hero = id => { applyCharacter(id); P.mana = P.stats.maxMana; };
const revive = () => { if (P.dead) step(COMBAT.player.respawnTime + 0.2); P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; P.invuln = 0; };

/** Aims the way a player now does: turn the hero toward a surface direction (the camera plays no part), and set
    the marker's distance with the wheel once aim mode is on (castAt). */
let wantDist = 0;
function pointAt(dir) { P.fwd.copy(tangentToward(P.up, dir)); wantDist = arcDist(P.up, dir); pointer.over = false; step(0.05); }
function castAt(id) { tryCast(id); if (aim.id) { aim.reach = Math.min(1, wantDist / aim.s.range); updateAiming(); } }

// =================== Doom Blade ===================
H.goToPlanet(2); step(1);
const B = H.boss; B.def.phases[0].attacks = ['doom'];                 // sim only: make him pick the Doom Blade
function doomTrial(label, heroId, react) {
  hero(heroId); revive(); clearKeys();
  B.hp = B.def.hp; B.moveCd = {}; B.cool = 0;
  P.placeAt(dirAlong(B.up, B.fwd, 4)); B.aggro(); B.state = 'chase';
  let started = false, fired = false, t = 0, wasAlive = true;
  step(8, () => {
    t += 1 / 60;
    if (!fired && B.state === 'windup' && B.attack === 'doom') started = true;
    if (started && !fired) { H.cam.fwd.copy(tangentToward(P.up, B.up)); react(1 - B.timer / B.windupTime); }
    if (started && B.state !== 'windup') { fired = true; clearKeys(); }
    if (fired && wasAlive) wasAlive = !P.dead;
  });
  console.log(`   [${label}] doom started ${started}, fired ${fired}, hero alive after the blow: ${wasAlive}, hp ${Math.round(P.hp)}`);
  return { started, fired, alive: wasAlive };
}
let r = doomTrial('stay inside', 'witch', () => {});
check(r.fired && !r.alive, 'Doom Blade kills a hero who stays in the circle (one hit, full HP)');
r = doomTrial('walk out', 'witch', k => { keys.KeyS = true; keys.ShiftLeft = true; });
check(r.fired && r.alive, 'Doom Blade is escapable by simply walking out after the warning starts');
r = doomTrial('knight, Guard up, armor', 'knight', k => { if (k > 0.8 && P.guardT <= 0) tryCast('guard'); });
check(r.fired && !r.alive, 'Guard and armor do not save you from the Doom Blade (it must be dodged)');
r = doomTrial('witch backs off, blinks out late', 'witch', k => { keys.KeyS = k > 0.7; if (k > 0.85 && spellState.cd.blink <= 0) tryCast('blink'); });
check(r.fired && r.alive, 'running back + a late Blink out of the circle saves the witch');
r = doomTrial('ranger evasive leap late', 'ranger', k => { if (k > 0.85 && spellState.cd.leap <= 0) tryCast('leap'); keys.KeyS = k > 0.5; });
check(r.fired && r.alive, 'backing off + a late Evasive Leap saves the ranger');
B.def.phases[0].attacks = ['combo', 'fissure', 'hellfire', 'doom'];
check(COMBAT.enemies.malgrath.attacks.doom.windup >= 1.5, `Doom Blade wind-up is long (${COMBAT.enemies.malgrath.attacks.doom.windup} s)`);
const others = Object.entries(COMBAT.enemies.malgrath.attacks).filter(([k, a]) => k !== 'doom' && a.lethal);
check(others.length === 0, 'only the Doom Blade is lethal; every other attack just hurts');

// =================== ultimates ===================
H.goToPlanet(0); step(1); H.boss?.vanish(); step(0.5);   // borrow the (flat) boss arena as a test field
const field = offsetDir(game.world.lairDir, 1.3, 6);   // the boss arena is flat ground (its boss is sent away below)
function setup(heroId, n = 4, type = 'ogre') {
  for (const e of H.enemies) if (e.temporary || e.type === type) e.vanish();
  step(0.6);
  hero(heroId); if (ctx.companion) { ctx.companion.dispose(); ctx.companion = null; }   // no owl / wolf joining in
  revive(); clearKeys(); spellState.cd = Object.fromEntries(Object.keys(CHARACTERS[heroId].abilities).map(k => [k, 0]));
  P.placeAt(field); const fwd = tangentFrame(field)[0], T = dirAlong(field, fwd, 10);
  const foes = []; for (let i = 0; i < n; i++) foes.push(addEnemy(type, dirAlong(T, tangentFrame(T)[1].applyAxisAngle(T, i * 2 * Math.PI / n), i === 0 ? 0.5 : 2.4)));
  return { T, foes };
}
const hpOf = foes => foes.map(e => Math.round(e.hp));

// ---- Meteor
{
  const { T, foes } = setup('witch'); for (const e of foes) e.stunT = 99;   // hold still for the measurement
  pointAt(T); const mana = P.mana;
  castAt('meteor');
  check(aim.id === 'meteor' && aim.target && arcDist(aim.target, T) < 2.6, `Meteor enters aim mode and the marker sits where the hero faces (on the monster in line) (off by ${aim.target ? arcDist(aim.target, T).toFixed(2) : '-'} )`);
  check(spellState.cd.meteor === 0 && P.mana >= mana - 0.01, 'nothing is paid while aiming');
  const before = hpOf(foes); confirmAim();
  check(spellState.cd.meteor > 25 && aim.id === null, `confirming casts it: cooldown ${spellState.cd.meteor.toFixed(1)} s`);
  step(0.9); const mid = hpOf(foes);
  check(mid.every((h, i) => h === before[i]), 'no damage before the meteor lands (short delay)');
  step(0.4); const after = hpOf(foes);
  const hit = after.filter((h, i) => h < before[i]).length;
  console.log('   meteor hp', before.join(','), '->', after.join(','));
  check(hit >= 3, `Meteor hits several enemies at once (${hit}/${foes.length})`);
  { const best = Math.max(...before.map((h, i) => h - after[i])); check(best >= 100, `centre damage is very high (${best})`); }
}
// ---- Arrow Rain
{
  const { T, foes } = setup('ranger', 3); for (const e of foes) e.stunT = 99;
  const outside = addEnemy('ogre', dirAlong(T, tangentFrame(T)[0], 9)); outside.stunT = 99;
  pointAt(T); castAt('rain'); confirmAim();
  const hits = foes.map(() => 0), last = hpOf(foes); let outsideHit = 0, firstAt = null, t = 0; const o0 = outside.hp;
  step(4.6, () => { t += 1 / 60; foes.forEach((e, i) => { if (Math.round(e.hp) < last[i]) { hits[i]++; firstAt ??= t; } last[i] = Math.round(e.hp); }); });
  outsideHit = o0 - outside.hp;
  console.log('   arrow rain hits per enemy', hits.join(','), 'first at', firstAt?.toFixed(2), 's; outside enemy lost', outsideHit);
  check(hits.every(h => h >= 8), 'Arrow Rain damages every enemy inside repeatedly (>= 8 ticks each over its duration)');
  check(firstAt > 0.2, 'damage is spread over time, not applied instantly');
  check(outsideHit === 0, 'an enemy outside the circle is untouched');
}
// ---- Leap Slam
{
  const { T, foes } = setup('knight', 4);
  pointAt(T); castAt('leapSlam');
  check(aim.id === 'leapSlam' && aim.valid, 'Leap Slam aims at the cluster');
  const start = P.up.clone(), before = hpOf(foes); confirmAim();
  let peak = 0; step(0.75, () => { peak = Math.max(peak, P.r - groundHeight(P.up)); });
  const landed = arcDist(P.up, T), after = hpOf(foes);
  console.log(`   leap: travelled ${arcDist(start, P.up).toFixed(1)}, landed ${landed.toFixed(2)} from the target, peak height ${peak.toFixed(1)}; hp`, before.join(','), '->', after.join(','));
  check(landed < 3 && peak > 3, 'the knight leaps through the air onto the target (the monster in line)');
  check(after.filter((h, i) => h < before[i]).length >= 3, 'the slam damages the enemies around the landing');
  const stunned = foes.filter(e => e.alive && e.stunT > 1);
  check(stunned.length >= 3, `survivors are stunned (${stunned.length} with stunT > 1 s)`);
  check(!P.motion && P.grounded, 'the knight is back on the ground and in control');
}
// ---- Leap Slam: invalid spots
{
  setup('knight', 0);
  const pond = ponds.slice().sort((a, b) => arcDist(a.dir, P.up) - arcDist(b.dir, P.up))[0];
  P.placeAt(dirAlong(pond.dir, tangentFrame(pond.dir)[0], pond.r + 6)); step(0.3);
  pointAt(pond.dir); castAt('leapSlam');
  const snapped = aim.target && landable(aim.target, P.radius + 0.1);
  check(aim.valid && snapped && arcDist(aim.target, pond.dir) > pond.r, 'aiming into a pond snaps the landing to dry ground');
  confirmAim(); step(1);
  check(landable(P.up, P.radius) || arcDist(P.up, pond.dir) > pond.r, 'the knight lands on dry ground, not in the pond');
  const tree = colliders.filter(c => !c.water && c.r < 2).sort((a, b) => arcDist(a.dir, P.up) - arcDist(b.dir, P.up))[0];
  P.placeAt(dirAlong(tree.dir, tangentFrame(tree.dir)[0], 8)); spellState.cd.leapSlam = 0; P.mana = P.stats.maxMana; step(0.3);
  pointAt(tree.dir); castAt('leapSlam');
  check(aim.valid && arcDist(aim.target, tree.dir) > tree.r, 'aiming at a tree/rock snaps the landing beside it');
  confirmAim(); step(1);
  check(arcDist(P.up, tree.dir) >= tree.r + P.radius - 0.05, 'the knight never lands inside scenery');
  spellState.cd.leapSlam = 0; P.mana = P.stats.maxMana;
  const far = dirAlong(P.up, tangentFrame(P.up)[0], 40); pointAt(far); castAt('leapSlam');
  check(arcDist(P.up, aim.target) <= CHARACTERS.knight.abilities.leapSlam.range + 0.01, 'a target past max range is clamped to the range');
  pointer.over = false; tryCast('leapSlam');                         // press again = confirm, also fine
  step(1);
}
// ---- Evasion
{
  const old = { witch: ['blink', 5], ranger: ['leap', 5], knight: ['dash', 4] };
  for (const [id, [ab, was]] of Object.entries(old)) {
    setup(id, 0); step(0.2);
    const s = CHARACTERS[id].abilities[ab];
    tryCast(ab); const cd0 = spellState.cd[ab], pos0 = P.pos.clone(), mana0 = P.mana;
    step(0.5); const inv = P.invuln;
    tryCast(ab); const second = P.mana < mana0 - 0.5;                    // a second cast would have spent its cost again
    step(s.cooldown); P.mana = P.stats.maxMana; const pos1 = P.pos.clone(); tryCast(ab); step(0.1);
    const third = spellState.cd[ab] > s.cooldown - 0.2;
    check(cd0 === s.cooldown && s.cooldown < was, `${CHARACTERS[id].title}: ${s.name} cooldown ${was} s -> ${s.cooldown} s`);
    check(!second && third, `${s.name} still respects its cooldown (blocked at 0.5 s, ready again after ${s.cooldown} s)`);
    check(inv === 0, `${s.name} i-frames are over within 0.5 s (no lasting invulnerability)`);
  }
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
