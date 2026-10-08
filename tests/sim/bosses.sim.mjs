// Boss fight scenarios: a bot kites / brawls each planet's boss while we log moves, states, damage and phases.
import { boot, imp } from './lib/boot.mjs';
const THREE = await import('three');
const { arcDist, tangentToward, offsetDir } = await imp('utils/sphere.js');
const { tryCast } = await imp('combat/casting.js');
const { ENGAGED } = await imp('entities/enemies/states.js');

const hero = process.argv[2] || 'witch', planetArg = process.argv[3];
const { H, step } = await boot(hero);
const basic = { witch: 'bolt', knight: 'slash', ranger: 'shot' }[hero];
const keys = H.keys;
let fails = 0; const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };

function fight(planet, { secs = 90, dists = [4, 8, 14], godmode = true, forceHp = [], label = '' } = {}) {
  if (planet !== H.planet) H.goToPlanet(planet);
  step(1.2);
  const B = H.boss, P = H.player;
  // stand the hero 9 units from the lair so the boss engages
  P.placeAt(offsetDir(B.home, 0.3, 9));
  const log = { moves: {}, hits: {}, states: {}, maxState: {}, phases: [], errors: [], transition: null, flyingHover: [] };
  let inTrans = false, last = { state: B.state, attack: null, t: 0 }, t = 0, lastHp = P.hp, wasInv = false, immuneHits = 0, bossHpBefore = B.hp;
  step(secs, dt => {
    t += 1 / 60;
    // ---- bot steering: keep a distance that cycles through `dists`, circle the boss, attack it
    const D = dists[Math.floor(t / 7) % dists.length], d = arcDist(P.up, B.up);
    if (!P.dead && B.alive && !ENGAGED.has(B.state) && t - (log.reengaged ?? -9) > 3) { log.reengaged = t; P.placeAt(offsetDir(B.home, Math.random() * 6.28, 6)); }   // a player walks back in
    H.cam.fwd.copy(tangentToward(P.up, arcDist(P.up, B.home) > 10 ? B.home : B.up));                                          // and doesn't drag the fight off its arena
    for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space']) keys[k] = false;
    if (d > D + 1) keys.KeyW = true; else if (d < D - 1) keys.KeyS = true;
    keys[Math.floor(t / 3) % 2 ? 'KeyA' : 'KeyD'] = true;
    if (B.alive) tryCast(basic);
    for (const f of forceHp) if (!f.done && t >= f.at && ENGAGED.has(B.state)) { f.done = true; B.hp = Math.min(B.hp, B.def.hp * f.frac); }
    // ---- logging
    if (B.state === 'return' && last.state !== 'return') console.log(`   -> boss left the fight at ${t.toFixed(1)}s: ${arcDist(B.up, B.home).toFixed(1)} from home (leash ${B.def.leash}), hero ${arcDist(P.up, B.up).toFixed(1)} away, dead ${P.dead}, last move ${last.attack}/${last.state}`);
    if (B.state !== last.state || B.attack !== last.attack) {
      const dur = t - last.t; const key = last.state + (last.state === 'windup' || last.state === 'active' ? ':' + last.attack : '');
      log.maxState[key] = Math.max(log.maxState[key] ?? 0, dur);
      if (B.state === 'windup') log.moves[B.attack] = (log.moves[B.attack] ?? 0) + 1;
      if (B.state === 'transition' && !log.transition) log.transition = { at: +t.toFixed(1), hpFrac: +(B.hp / B.def.hp).toFixed(2) };
      last = { state: B.state, attack: B.attack, t };
    }
    if (log.phases[log.phases.length - 1] !== B.bossPhase) log.phases.push(B.bossPhase);
    if (B.state === 'transition') { if (inTrans && B.hp < bossHpBefore) immuneHits++; inTrans = true; } else inTrans = false;   // skip the frame it starts (the crossing hit)
    bossHpBefore = B.hp;
    if (B.flying && B.state === 'chase') log.flyingHover.push(B.hover);
    if (P.hp < lastHp) { const src = B.attack ?? '?'; log.hits[src] = (log.hits[src] ?? 0) + 1; }
    if (godmode && P.hp < P.stats.maxHp * 0.5 && !P.dead) P.hp = P.stats.maxHp;
    if (P.dead) log.deaths = (log.deaths ?? 0) + (lastHp > 0 ? 1 : 0);
    lastHp = P.hp;
    if (!B.alive) return;
  });
  console.log(`\n=== ${label || B.def.name} (${hero}) ===`);
  console.log('moves started:', JSON.stringify(log.moves));
  console.log('hero hit during:', JSON.stringify(log.hits));
  console.log('longest stint per state:', JSON.stringify(Object.fromEntries(Object.entries(log.maxState).map(([k, v]) => [k, +v.toFixed(2)]))));
  console.log('hero deaths (Doom Blade only kills):', log.deaths ?? 0);
  console.log('phases seen:', log.phases.join(' -> '), '| transition:', JSON.stringify(log.transition), '| boss hp', Math.round(B.hp), '/', Math.round(B.def.hp), 'alive', B.alive);
  return { B, log, immuneHits };
}

// 1) planet 1: Gloomcap still runs its five moves and phases
if (!planetArg || planetArg === '0') {
  const { log } = fight(0, { secs: 80, forceHp: [{ at: 30, frac: 0.55 }, { at: 55, frac: 0.2 }] });
  check(['slam', 'charge', 'volley', 'shockwave', 'summon'].every(m => log.moves[m]), 'Gloomcap uses slam, charge, volley, shockwave and summon');
  check(log.phases.join() === '0,1,2', 'Gloomcap goes through its three phases');
  check(Object.entries(log.maxState).every(([k, v]) => !ENGAGED.has(k.split(':')[0]) || k === 'chase' || v < 6), 'no Gloomcap state lasts longer than 6 s (except chasing)');
}
// 2) planet 2: the dragon
if (!planetArg || planetArg === '1') {
  const { B, log } = fight(1, { secs: 160, dists: [3, 8, 16, 5], forceHp: [{ at: 60, frac: 0.48 }] });   // the leap is rare: 1-2 a fight
  check(B.def.behavior === 'dragon' && B.type === 'pyrrhax', 'planet 2 boss is the red dragon');
  check(['bite', 'tail', 'breath', 'fireballs', 'leap'].every(m => log.moves[m]), 'dragon uses bite, tail, breath, fireballs and leap');
  check(['bite', 'breath', 'fireballs', 'leap'].filter(m => log.hits[m]).length >= 3, 'at least three different dragon moves landed on the hero');
  check(log.phases.join() === '0,1', 'dragon enters Inferno below 50%');
  check(Object.entries(log.maxState).every(([k, v]) => !ENGAGED.has(k.split(':')[0]) || k === 'chase' || v < 6), 'no dragon state lasts longer than 6 s (except chasing)');
  check(B.hover === 0 || B.state === 'active', 'dragon is back on the ground when not leaping');
}
// 3) planet 3: the demon lord, both phases
if (!planetArg || planetArg === '2') {
  const { B, log, immuneHits } = fight(2, { secs: 130, dists: [3, 7, 12], forceHp: [{ at: 55, frac: 0.5 }] });
  check(B.def.behavior === 'demonLord' && B.type === 'malgrath', 'planet 3 boss is the Winged Demon Lord');
  const p1 = ['combo', 'fissure', 'hellfire', 'doom'], p2 = ['dive', 'barrage', 'rain', 'strafe'];
  check(p1.every(m => log.moves[m]), 'phase 1 uses combo, fissure, hellfire and doom');
  check(log.transition && log.transition.hpFrac <= 0.5, `transition triggers at <= 50% HP (${JSON.stringify(log.transition)})`);
  check(immuneHits === 0, 'immune (no damage taken) during the transition');
  check(p2.every(m => log.moves[m]), 'phase 2 uses dive, barrage, rain and strafe');
  const avgHover = log.flyingHover.reduce((s, h) => s + h, 0) / Math.max(1, log.flyingHover.length);
  check(log.flyingHover.length > 0 && avgHover > 1.5, `flies in phase 2 (average hover while circling ${avgHover.toFixed(2)})`);
  check(Object.entries(log.maxState).every(([k, v]) => !ENGAGED.has(k.split(':')[0]) || k === 'chase' || v < 6), 'no demon lord state lasts longer than 6 s (except chasing)');
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
