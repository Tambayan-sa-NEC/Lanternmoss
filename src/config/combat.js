/* COMBAT TUNING: every balance number for spells and enemies (pets: config/pets.js).
   Rough power ladder per hit: basic attack ~10  <  ability ~20-30  <  ultimate ~70-110 (long cooldown, aimed)
   <  a boss's big telegraphed blow (the Demon Lord's Doom Blade is lethal). */

export const COMBAT = {
  player: { maxHp: 100, maxMana: 100, manaRegen: 11, hpRegen: 5, hpRegenDelay: 6, invuln: 0.7, respawnTime: 2.5,
    safeRadius: 17 },          // enemies never fight within this distance of the village centre
  globalCooldown: 0.12,        // short lockout between any two casts
  inputBuffer: 0.2,            // a press this close to "ready" is queued instead of dropped
  autoAimAngle: 35,            // soft lock-on cone (degrees either side of the camera direction)
  autoAimRange: 20,
  castFaceTime: 0.35,          // seconds the magician keeps facing her target after casting
  spells: {                    // keys come from the skill keybinds (config/controls.js); mouse = left click too; repeat = hold to keep casting
    bolt:     { name: 'Arcane Bolt', mouse: true, repeat: true, color: 0xd49bff,
                cost: 6, cooldown: 0.32, damage: 9, speed: 24, range: 22, radius: 0.3, homing: 5 },
    fireball: { name: 'Fireball', color: 0xff9a4a,
                cost: 22, cooldown: 3.5, damage: 26, speed: 14, range: 20, radius: 0.45, blastRadius: 2.8, blastFalloff: 0.5, knockback: 5 },
    nova:     { name: 'Frost Nova', color: 0x9fe8ff,
                cost: 28, cooldown: 8, damage: 12, radius: 4.5, slow: 0.55, slowTime: 3.5, knockback: 4 },
    blink:    { name: 'Blink', color: 0xbff4ff,
                cost: 15, cooldown: 3, distance: 6.5, invuln: 0.35 },            // evasion: was 5 s
    // ultimate (src/combat/abilities/ultimates.js): aim a spot (target: 'ground'), the meteor lands `delay` s later
    meteor:   { name: 'Meteor', color: 0xff7a3a, ult: true, target: 'ground',
                cost: 40, cooldown: 30, damage: 110, range: 18, radius: 5.5, delay: 1.1, falloff: 0.35, knockback: 9,
                burn: { duration: 3, tick: 0.5, damage: 5 } },                   // the crater keeps burning for a moment
  },
  mark: { bonus: 0.25 },       // monsters a pet has marked (the owl's strike, Scout) take +25% damage from the hero
  enemies: {                   // base stats (planet 1); later planets scale them (config/planets.js). xp = experience for the kill
    goblin:    { ai: 'melee', color: 0x8fcf5a, hp: 30, speed: 4.4, radius: 0.35, height: 1.4, aggro: 11, leash: 16, turnRate: 10,
                 range: 1.3, damage: 5, windup: 0.3, windupTurn: 8, cooldown: 1.1, knockback: 3, lunge: 4, weave: 0.5,
                 hitAndRun: true, fleeBelow: 0.3, fleeTime: 2.2, respawn: 40, xp: 10 },
    ogre:      { ai: 'melee', color: 0xa3b38a, hp: 150, speed: 2.1, radius: 0.85, height: 2.9, aggro: 9, leash: 14, turnRate: 3,
                 range: 2.3, damage: 20, windup: 0.9, windupTurn: 1.5, cooldown: 2.2, knockback: 9,
                 slamRadius: 2.4, slamReach: 1.4, slowResist: 0.5, knockResist: 0.8, respawn: 60, xp: 45 },
    wisp:      { ai: 'ranged', color: 0xb27cff, hp: 22, speed: 3.2, radius: 0.4, height: 1.0, hover: 1.2, aggro: 14, leash: 18,
                 keepDistance: 8, damage: 8, windup: 0.8, cooldown: 2.4, projectileSpeed: 9, projectileHoming: 1.2, respawn: 45, xp: 14 },
    slime:     { ai: 'hopper', color: 0x7fd48a, hp: 40, speed: 3.4, radius: 0.5, height: 0.8, aggro: 9, leash: 14, contact: true,
                 damage: 7, contactCooldown: 1, knockback: 3, hopInterval: 0.9, hopVel: 5.5, splitInto: 'slimeling', splitCount: 2, respawn: 45, xp: 8 },
    slimeling: { ai: 'hopper', color: 0xa8e89a, hp: 12, speed: 4, radius: 0.3, height: 0.45, aggro: 12, leash: 20, contact: true,
                 damage: 4, contactCooldown: 0.8, knockback: 2, hopInterval: 0.6, hopVel: 4.5, respawn: 0, xp: 4 },
    // ---- later planets (behaviours in src/entities/enemies/behaviors) ----
    // telegraph = gets a ground warning disc; cooldown is also the pause after being staggered out of an attack
    puffcap:   { ai: 'bomber', color: 0xff7a9a, hp: 18, speed: 5.0, radius: 0.4, height: 0.9, aggro: 12, leash: 18, turnRate: 8,
                 triggerRange: 2.3, fuse: 1.0, blastRadius: 3.0, damage: 22, knockback: 8, cooldown: 1.2, telegraph: true, respawn: 40, xp: 10 },
    ramhorn:   { ai: 'charger', color: 0x4fa0a8, hp: 70, speed: 3.0, radius: 0.6, height: 1.1, aggro: 14, leash: 22, turnRate: 6,
                 chargeRange: 11, windup: 0.85, chargeSpeed: 15, chargeTime: 0.85, width: 1.2, damage: 16, knockback: 11, cooldown: 2.4,
                 stunTime: 2.2, stunnedDamageBonus: 0.5, knockResist: 0.6, respawn: 50, xp: 22 },   // crashes into scenery => stunned, +50% damage taken
    thornmole: { ai: 'burrower', color: 0xb08a6a, hp: 55, speed: 5.5, radius: 0.45, height: 0.9, aggro: 13, leash: 20, turnRate: 8,
                 windup: 0.75, eruptRadius: 1.9, damage: 14, knockback: 5, exposed: 2.6, cooldown: 1.5, telegraph: true, respawn: 45, xp: 18 },
    hexlantern:{ ai: 'support', color: 0x8fffc0, hp: 40, speed: 3.6, radius: 0.4, height: 1.0, hover: 1.4, aggro: 15, leash: 22,
                 keepDistance: 10, healRadius: 9, heal: 18, healCooldown: 2.5, shieldTime: 4, shieldReduction: 0.5, shieldCooldown: 6,
                 cooldown: 1, respawn: 50, xp: 20 },
    // ---- planet bosses: ai 'boss' + behavior = their own AI kit (src/entities/enemies/behaviors/boss/) ----
    // attacks: windup = warning time; recover = pause after (the punish window); cooldown = extra wait before the next
    // move; reuse = seconds before that same move can be picked again. phases: the last whose `below` (fraction of max HP)
    // is >= current HP is active; title shows on the boss bar, enraged/flying are read by the kit.
    // stunResist = share of a stun shrugged off (bosses are only stunned between attacks); tallHitbox = hit along the body column.
    gloomcap:  { ai: 'boss', behavior: 'gloomcap', name: 'Gloomcap, the Moss King', color: 0xb48cff, capColor: 0x9b6ad6,   // planet 1: the introduction
                 look: { skin: 0x6a4a7a, armor: 0x2e2638, cape: 0x2a1838, horn: 0xe8dcc4, trim: 0xffd36b, eye: 0xffe066, motif: 'moss' },   // src/models/bosses.js
                 hp: 900, speed: 2.6, radius: 1.3, height: 4.6,
                 aggro: 16, leash: 30, turnRate: 3, knockResist: 1, slowResist: 0.8, staggerImmune: true, stunnedDamageBonus: 0.5,
                 telegraph: true, respawn: 0, xp: 250, cooldown: 1.6,
                 attacks: {   // windup = warning time; recover = pause after; cooldown = extra wait before the next attack
                   slam:      { windup: 1.1, range: 4.5, reach: 2.2, radius: 4.2, damage: 22, knockback: 10, recover: 0.9, cooldown: 1.4 },
                   charge:    { windup: 0.9, minRange: 6, speed: 14, distance: 18, width: 1.9, damage: 20, knockback: 12, recover: 1.0, cooldown: 1.8, crashStun: 1.8 },
                   volley:    { windup: 0.8, count: 7, spread: 80, speed: 10, homing: 0.6, damage: 9, recover: 0.6, cooldown: 1.6 },
                   shockwave: { windup: 1.0, speed: 8, maxRadius: 15, width: 1.2, damage: 16, knockback: 6, recover: 0.8, cooldown: 2.0 },   // jump over it
                   summon:    { windup: 1.2, types: ['slimeling', 'slimeling', 'wisp'], max: 4, recover: 0.8, cooldown: 2.6 },
                 },
                 phases: [    // active phase = the last one whose `below` (fraction of max HP) is >= current HP
                   { below: 1.0,  attacks: ['slam', 'charge', 'volley'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.6,  attacks: ['slam', 'charge', 'volley', 'shockwave', 'summon'], speedMul: 1.15, cooldownMul: 0.85 },
                   { below: 0.25, attacks: ['slam', 'charge', 'volley', 'shockwave', 'summon'], speedMul: 1.35, cooldownMul: 0.6 },   // enraged
                 ] },
    pyrrhax:   { ai: 'boss', behavior: 'dragon', name: 'Pyrrhax, the Red Wyrm', color: 0xe0482a, capColor: 0xff8a3a,                 // planet 2
                 look: { scale: 1.25, body: 0xc0392b, belly: 0xf0b060, dark: 0x7a1f1a, horn: 0xf3e6c8, membrane: 0x8a2420, eye: 0xffe066 },   // src/models/dragon.js
                 hp: 1000, speed: 3.2, radius: 1.9, height: 3.6, tallHitbox: true,
                 aggro: 18, leash: 32, turnRate: 2.2, knockResist: 1, slowResist: 0.8, staggerImmune: true, stunResist: 0.6, stunnedDamageBonus: 0.5,
                 telegraph: true, respawn: 0, xp: 320, cooldown: 1.2,
                 attacks: {
                   bite:      { windup: 0.55, range: 4.6, arc: 80, damage: 20, knockback: 8, recover: 0.5, cooldown: 0.6 },
                   tail:      { windup: 0.85, radius: 6, spinTime: 0.4, damage: 18, knockback: 12, recover: 0.8, cooldown: 0.8, reuse: 4 },   // jump over it
                   breath:    { windup: 1.1, minRange: 3, maxRange: 14, length: 13, arc: 46, sweep: 60, sweepEnraged: 95, time: 1.8, tick: 0.3,
                                damage: 9, recover: 1.0, cooldown: 1.2, reuse: 7 },
                   fireballs: { windup: 0.8, minRange: 6, count: 3, countEnraged: 5, gap: 0.4, flight: 1.1, radius: 2.6, spread: 3, damage: 18, knockback: 6,
                                pool: { duration: 3, tick: 0.5, damage: 6 }, recover: 0.8, cooldown: 1.2, reuse: 6 },
                   leap:      { windup: 0.8, minRange: 9, maxRange: 24, height: 7, time: 1.2, radius: 5, damage: 26, knockback: 12, recover: 1.4, cooldown: 1.0, reuse: 8 },
                 },
                 phases: [
                   { below: 1.0, attacks: ['bite', 'tail', 'breath', 'fireballs', 'leap'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.5, title: 'Inferno', enraged: true, attacks: ['bite', 'tail', 'breath', 'fireballs', 'leap'], speedMul: 1.15, cooldownMul: 0.75 },
                 ] },
    malgrath:  { ai: 'boss', behavior: 'demonLord', name: 'Malgrath, the Winged Demon Lord', color: 0xd0305a, capColor: 0xff3a5a,   // planet 3: the finale
                 look: { skin: 0x3a2030, armor: 0x1e1420, cape: 0x2a0e18, horn: 0x2a1a22, trim: 0xd8a040, eye: 0xff4040,
                         motif: 'infernal', weapon: 'greatsword', wings: 0x3a1420, scale: 3.4 },                                         // src/models/bosses.js
                 hp: 1050, speed: 3.0, radius: 1.5, height: 5.4, tallHitbox: true,
                 aggro: 18, leash: 34, turnRate: 3.5, knockResist: 1, slowResist: 0.85, staggerImmune: true, stunResist: 0.7, stunnedDamageBonus: 0.35,
                 telegraph: true, respawn: 0, xp: 450, cooldown: 1.0,
                 flight: { hover: 2.4, high: 7.5, speed: 6.5, orbit: 10 },                   // phase 2 altitude (2.4 is still in reach), dive height, circling
                 transition: { time: 3.2, burstAt: 1.3, radius: 9, push: 14, damage: 8 },   // immune while it lasts; the burst throws the hero clear
                 attacks: {
                   // phase 1, grounded
                   combo:    { windup: 0.55, range: 5, radius: 4.4, arc: 140, reach: 2.2, slamRadius: 3.2, gap: 0.5, damage: 14, finisherDamage: 22, knockback: 6,
                               recover: 0.9, cooldown: 0.8 },
                   fissure:  { windup: 0.9, length: 16, width: 2.4, speed: 18, damage: 20, knockback: 10, recover: 0.8, cooldown: 1.2, reuse: 5 },
                   hellfire: { windup: 0.7, count: 4, radius: 2.6, delay: 1.2, stagger: 0.25, damage: 20, knockback: 6, recover: 0.6, cooldown: 1.2, reuse: 6 },
                   doom:     { windup: 2.0, maxRange: 10, reach: 2.5, radius: 6.5, damage: 999, lethal: true, recover: 2.2, cooldown: 1.2, reuse: 14 },   // ONE-HIT KILL: leave the circle
                   // phase 2, flying
                   dive:     { windup: 1.0, radius: 4.2, time: 0.45, damage: 34, knockback: 14, grounded: 1.6, recover: 0.4, cooldown: 0.9, reuse: 4 },
                   barrage:  { windup: 0.7, waves: 3, count: 5, spread: 60, gap: 0.45, speed: 12, homing: 0.9, damage: 12, recover: 0.6, cooldown: 1.0, reuse: 5 },
                   rain:     { windup: 0.8, count: 9, radius: 2.4, delay: 1.1, stagger: 0.18, scatter: 7, damage: 22, knockback: 5, recover: 0.6, cooldown: 1.2, reuse: 8 },
                   strafe:   { windup: 1.0, length: 22, width: 3, speed: 22, trail: 7, trailDelay: 0.5, damage: 24, knockback: 9, recover: 0.6, cooldown: 1.0, reuse: 7 },
                 },
                 phases: [
                   { below: 1.0, title: 'Grounded', attacks: ['combo', 'fissure', 'hellfire', 'doom'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.5, title: 'Ascended', flying: true, enraged: true, attacks: ['dive', 'barrage', 'rain', 'strafe'], speedMul: 1.2, cooldownMul: 0.8 },
                 ] },
  },
};
