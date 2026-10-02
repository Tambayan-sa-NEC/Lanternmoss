/* COMBAT TUNING: every balance number for spells, enemies and the owl. */

export const COMBAT = {
  player: { maxHp: 100, maxMana: 100, manaRegen: 11, hpRegen: 5, hpRegenDelay: 6, invuln: 0.7, respawnTime: 2.5,
    safeRadius: 17 },          // enemies never fight within this distance of the village centre
  globalCooldown: 0.12,        // short lockout between any two casts
  inputBuffer: 0.2,            // a press this close to "ready" is queued instead of dropped
  autoAimAngle: 35,            // soft lock-on cone (degrees either side of the camera direction)
  autoAimRange: 20,
  castFaceTime: 0.35,          // seconds the magician keeps facing her target after casting
  spells: {                    // label = shown on the spell bar; keys = KeyboardEvent.code; mouse = left click; repeat = hold to keep casting
    bolt:     { name: 'Arcane Bolt', label: '1', keys: ['Digit1'], mouse: true, repeat: true, color: 0xd49bff,
                cost: 6, cooldown: 0.32, damage: 9, speed: 24, range: 22, radius: 0.3, homing: 5 },
    fireball: { name: 'Fireball', label: '2/Q', keys: ['Digit2', 'KeyQ'], color: 0xff9a4a,
                cost: 22, cooldown: 3.5, damage: 26, speed: 14, range: 20, radius: 0.45, blastRadius: 2.8, blastFalloff: 0.5, knockback: 5 },
    nova:     { name: 'Frost Nova', label: '3/R', keys: ['Digit3', 'KeyR'], color: 0x9fe8ff,
                cost: 28, cooldown: 8, damage: 12, radius: 4.5, slow: 0.55, slowTime: 3.5, knockback: 4 },
    blink:    { name: 'Blink', label: '4/F', keys: ['Digit4', 'KeyF'], color: 0xbff4ff,
                cost: 15, cooldown: 5, distance: 6.5, invuln: 0.35 },
  },
  owl: { damage: 4, cooldown: 4, range: 11, swoopSpeed: 15, followHeight: 2.4,
         markTime: 4, markBonus: 0.25,   // owl-marked enemies take +25% spell damage
         stagger: 0.5 },                 // a strike interrupts wind-ups and charges
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
    // ---- planet bosses (src/entities/enemies/behaviors/boss.js) ----
    gloomcap:  { ai: 'boss', name: 'Gloomcap, the Moss King', color: 0xb48cff, capColor: 0x9b6ad6, hp: 900, speed: 2.6, radius: 1.3, height: 4.6,
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
  },
};
