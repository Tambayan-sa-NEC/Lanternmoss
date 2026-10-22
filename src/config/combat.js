/* COMBAT TUNING: every balance number for spells and enemies (pets: config/pets.js).
   Rough power ladder per hit: basic attack ~10  <  ability ~20-30  <  ultimate ~70-110 (long cooldown, aimed)
   <  a boss's big telegraphed blow (the Demon Lord's Doom Blade is lethal). */

export const COMBAT = {
  player: { maxHp: 100, maxMana: 100, manaRegen: 13, hpRegen: 5, hpRegenDelay: 6, invuln: 0.7, respawnTime: 2.5,
    safeRadius: 17 },          // enemies never fight within this distance of the village centre
  globalCooldown: 0.12,        // short lockout between any two casts
  inputBuffer: 0.2,            // a press this close to "ready" is queued instead of dropped
  autoAimAngle: 40,            // soft lock-on cone (degrees either side of where the hero faces; the camera doesn't aim)
  autoAimRange: 20,
  castFaceTime: 0.35,          // seconds the magician keeps facing her target after casting
  // A monster that gives up a chase walks home healing `heal` of its health per second, and is whole once home. A mini
  // boss keeps its damage on the way: it only starts healing once it has been out of combat for more than
  // `miniBossHealDelay` seconds, so a fight that drifts past its short leash can be resumed.
  // Who still gives up (TODO 45a, Enemy.leashed): a mini boss during its earlier forms, and a main boss. An ordinary
  // monster never does - it keeps coming until the hero is safe, faints, travels or starts again - so its `aggro` is
  // only how far away it first notices the hero, and its `leash` applies to wandering and to the forms above.
  leashReturn: { heal: 0.3, miniBossHealDelay: 5 },
  // Monsters fighting each other (TODO 45b, src/combat/damage.js). Only lesser monsters feud: a lesser monster's
  // attack also lands on any other lesser monster caught in the same blow, and the one that is hit turns on its
  // attacker. A mini boss's or main boss's attack never damages a lesser monster, and no monster hurts itself.
  // damage: how much of the blow a monster takes compared with the hero (1 = the same).
  // forget: seconds a provoked monster keeps after its attacker before it goes back to hunting the hero.
  // arc: a swipe only catches monsters roughly in front (cosine of the half-angle; 0 = a full half-circle).
  // earshot: a brawl further than this from the hero is neither heard nor felt - monsters now attack away from the
  // hero, which they never used to do, and a fight across the valley should not thump in your ears.
  mobFeud: { damage: 1, forget: 8, arc: 0.3, earshot: 30 },
  spells: {                    // keys come from the skill keybinds (config/controls.js); mouse = left click too; repeat = hold to keep casting
    bolt:     { name: 'Arcane Bolt', mouse: true, repeat: true, color: 0xd49bff,
                cost: 6, cooldown: 0.32, damage: 9, speed: 24, range: 22, radius: 0.3, homing: 5 },
    // fire: this blow is a burst of flame. Duskhollow's Shadelings flee it (behaviors/lightbound.js); nothing else reads it yet
    fireball: { name: 'Fireball', color: 0xff9a4a, fire: true,
                cost: 22, cooldown: 3.5, damage: 26, speed: 14, range: 20, radius: 0.45, homing: 0, blastRadius: 2.8, blastFalloff: 0.5, knockback: 5 }, // homing: turn strength; 0 flies straight
    nova:     { name: 'Frost Nova', color: 0x9fe8ff,
                cost: 28, cooldown: 8, damage: 12, radius: 4.5, slow: 0.55, slowTime: 3.5, knockback: 4 },
    blink:    { name: 'Blink', color: 0xbff4ff,
                cost: 15, cooldown: 3, distance: 6.5, invuln: 0.35 },            // evasion: was 5 s
    // ultimate (src/combat/abilities/ultimates.js): aim a spot (target: 'ground'), the meteor lands `delay` s later
    meteor:   { name: 'Meteor', color: 0xff7a3a, ult: true, target: 'ground', fire: true,
                cost: 40, cooldown: 30, damage: 110, range: 18, radius: 5.5, delay: 1.1, falloff: 0.35, knockback: 9,
                burn: { duration: 3, tick: 0.5, damage: 5 } },                   // the crater keeps burning for a moment
  },
  mark: { bonus: 0.25 },       // monsters a pet has marked (the owl's strike, Scout) take +25% damage from the hero
  enemies: {                   // base stats (planet 1); later planets scale them (config/planets.js). xp = experience for the kill
    goblin:    { ai: 'melee', color: 0x8fcf5a, hp: 90, speed: 4.4, radius: 0.35, height: 1.4, aggro: 11, leash: 16, turnRate: 10,
                 range: 1.3, damage: 5, windup: 0.3, windupTurn: 8, cooldown: 1.1, knockback: 3, lunge: 4, weave: 0.5,
                 hitAndRun: true, fleeBelow: 0.3, fleeTime: 2.2, respawn: 40, xp: 10 },
    ogre:      { ai: 'melee', color: 0xa3b38a, hp: 110, speed: 2.1, radius: 0.85, height: 2.9, aggro: 9, leash: 14, turnRate: 3,
                 range: 2.3, damage: 20, windup: 0.9, windupTurn: 1.5, cooldown: 2.2, knockback: 9,
                 slamRadius: 2.4, slamReach: 1.4, slowResist: 0.5, knockResist: 0.8, respawn: 60, xp: 45 },
    wisp:      { ai: 'ranged', color: 0xb27cff, hp: 80, speed: 3.2, radius: 0.4, height: 1.0, hover: 1.2, aggro: 14, leash: 18,
                 keepDistance: 8, damage: 8, windup: 0.8, cooldown: 2.4, projectileSpeed: 9, projectileHoming: 1.2, respawn: 45, xp: 14 },
    slime:     { ai: 'hopper', color: 0x7fd48a, hp: 95, speed: 3.4, radius: 0.5, height: 0.8, aggro: 9, leash: 14, contact: true,
                 damage: 7, contactCooldown: 1, knockback: 3, hopInterval: 0.9, hopVel: 5.5, splitInto: 'slimeling', splitCount: 2, respawn: 45, xp: 8 },
    slimeling: { ai: 'hopper', color: 0xa8e89a, hp: 12, speed: 4, radius: 0.3, height: 0.45, aggro: 12, leash: 20, contact: true,
                 damage: 4, contactCooldown: 0.8, knockback: 2, hopInterval: 0.6, hopVel: 4.5, respawn: 0, xp: 4 },
    // ---- later planets (behaviours in src/entities/enemies/behaviors) ----
    // telegraph = gets a ground warning disc; cooldown is also the pause after being staggered out of an attack
    puffcap:   { ai: 'bomber', color: 0xff7a9a, hp: 90, speed: 5.0, radius: 0.4, height: 0.9, aggro: 12, leash: 18, turnRate: 8,
                 triggerRange: 2.3, fuse: 2.0, blastRadius: 3.0, damage: 22, knockback: 8, cooldown: 1.2, telegraph: true, respawn: 40, xp: 10 },
    ramhorn:   { ai: 'charger', color: 0x4fa0a8, hp: 90, speed: 3.0, radius: 0.6, height: 1.1, aggro: 14, leash: 22, turnRate: 6,
                 chargeRange: 11, windup: 0.85, chargeSpeed: 15, chargeTime: 0.85, width: 1.2, damage: 16, knockback: 11, cooldown: 2.4,
                 stunTime: 2.2, stunnedDamageBonus: 0.5, knockResist: 0.6, respawn: 50, xp: 22 },   // crashes into scenery => stunned, +50% damage taken
    thornmole: { ai: 'burrower', color: 0xb08a6a, hp: 40, speed: 5.5, radius: 0.45, height: 0.9, aggro: 13, leash: 20, turnRate: 8,
                 windup: 0.75, eruptRadius: 1.9, damage: 14, knockback: 5, exposed: 3.2, cooldown: 1.0, telegraph: true, respawn: 45, xp: 18 },
    hexlantern:{ ai: 'support', color: 0x8fffc0, hp: 75, speed: 3.6, radius: 0.4, height: 1.0, hover: 1.4, aggro: 15, leash: 22,
                 keepDistance: 10, healRadius: 9, heal: 18, healCooldown: 2.5, shieldTime: 4, shieldReduction: 0.5, shieldCooldown: 6,
                 cooldown: 1, respawn: 50, xp: 20 },
    // ---- Tidewhisper (TODO 27e): sea monsters that read the live tide (behaviours: armoured, drifter, amphibian) ----
    // turnRate here is a capped turn speed (rad/s); guardArc = half-angle (degrees) of the front plate that refuses hits
    shellback: { ai: 'armoured', color: 0x2f7f86, hp: 120, speed: 2.4, radius: 0.75, height: 1.1, aggro: 10, leash: 16, turnRate: 1.5,
                 guardArc: 65, range: 2.2, reach: 1.3, pinchRadius: 1.3, windup: 0.55, damage: 9, knockback: 5, cooldown: 1.6,
                 knockResist: 0.7, slowResist: 0.3, telegraph: true, respawn: 50, xp: 20 },
    // drift = m/s carried by the tide at its fastest (tideRate m/s of rise or fall); floatDepth = least water it floats in
    jellybell: { ai: 'drifter', color: 0x9fe8ff, hp: 60, speed: 1.5, radius: 0.5, height: 1.0, aggro: 10, leash: 18, turnRate: 3,
                 pulseRange: 2.6, pulseRadius: 3.0, reachUp: 1.4, windup: 1.0, damage: 8, knockback: 4, cooldown: 2.6,
                 floatDepth: 0.45, sink: 0.2, drift: 0.9, tideRate: 0.0157, crawlSpeed: 0.8, telegraph: true, respawn: 45, xp: 14 },
    // hideDepth = water deep enough to lurk unseen (untargetable); fenceDepth = shallowest water it stays in by choice
    surfSkipper:{ ai: 'amphibian', color: 0x7f9a5c, hp: 70, speed: 3.6, swimSpeed: 4.2, radius: 0.45, height: 0.8, aggro: 14, leash: 22,
                 turnRate: 8, ambushRange: 6.5, windup: 0.6, leapSpeed: 12, leapTime: 0.55, leapLift: 7, width: 1.1, damage: 11, knockback: 7,
                 exposed: 1.8, cooldown: 2.0, fenceDepth: 0.3, hideDepth: 0.9, respawn: 45, xp: 18 },
    // ---- Duskhollow (TODO 30e): monsters the lantern decides the rules of (behaviours: lightbound, mimic)
    // A Shadeling is only a shadow where the ground is dark: untargetable, and unable to attack, so an unreadable
    // monster can never land a blow. bindAt = how brightly lit (gameplay/OldRoad.js litAt, 0..1) the ground must be
    // for it to stand up solid. A light that actually comes on inside its reach drives it off (OldRoad 'lightflare'),
    // and so does fire when fleeFire is set. boundColor tints its eyes and the wisps around its head.
    shadeling: { ai: 'lightbound', color: 0x241c38, boundColor: 0xbfa8ff, hp: 70, speed: 3.9, radius: 0.42, height: 1.5,
                 aggro: 15, leash: 22, turnRate: 7, range: 1.6, damage: 10, windup: 0.5, windupTurn: 6, recover: 0.5,
                 cooldown: 1.5, knockback: 4, bindAt: 0.12, fleeFire: true, fleeTime: 3.2, fleeSpeed: 1.3,
                 respawn: 45, xp: 20 },
    // A Mosslurk is scenery until something reaches for it: triggerRange = walking this close springs it anyway;
    // pickReach = how close the "Pick the glowcap patch" prompt appears. The wind-up and its warning circle are what
    // keep the ambush fair.
    mosslurk:  { ai: 'mimic', color: 0x6a4a7a, capColor: 0x9ff0ff, hp: 105, speed: 2.6, radius: 0.5, height: 1.1,
                 aggro: 7, leash: 14, turnRate: 5, range: 1.8, damage: 13, windup: 0.6, windupTurn: 5, recover: 0.7,
                 cooldown: 1.8, knockback: 6, triggerRange: 1.2, pickReach: 2.2, knockResist: 0.4, telegraph: true,
                 respawn: 55, xp: 24 },
    // ---- Duskhollow (TODO 30f): the spinners and the thieves
    // A Gloomweaver strings sticky webs between the stalks and bites what walks into them. Its `web` block tunes the
    // webs it spins: `max` live at once per weaver, `every` seconds between spinnings, `at` metres ahead of it,
    // `type` the web object below. The accessibility toggle `roundBeetles` (config/settings.js) draws every spider
    // on this world as a round beetle instead, the regular ones and the mini boss alike (models/duskMonsters.js).
    gloomweaver:{ ai: 'weaver', color: 0x5a4a78, capColor: 0xd8c0ff, hp: 95, speed: 3.2, radius: 0.5, height: 1.0,
                 aggro: 13, leash: 20, turnRate: 6, range: 1.7, damage: 11, windup: 0.45, windupTurn: 6, recover: 0.5,
                 cooldown: 1.6, knockback: 5, web: { max: 3, every: 6, at: 4.5, type: 'gloomweb' },
                 respawn: 50, xp: 22 },
    // A sticky web: an object, not a monster. It slows whoever stands in it (`mire`, a share of walking speed) and is
    // cut by a blade or burnt away by fire, leaving `silk`. `fire` = a hit carrying fire destroys it outright.
    gloomweb:  { ai: 'web', object: true, static: true, name: 'Sticky web', color: 0xd8c0ff, hp: 8, speed: 0,
                 radius: 1.5, height: 0.6, aggro: 0, leash: 99, respawn: 0, xp: 0,
                 knockResist: 1, slowResist: 1, staggerImmune: true,
                 mire: 0.45, silk: ['spiderSilk', [1, 2]], life: 240 },
    // A Snuffer darts in, steals `oil` from the belt lantern and runs off with it. Catch it and the lantern gets it
    // back with interest (`interest`); `escape` is how long it keeps running before it settles down again.
    snuffer:   { ai: 'thief', color: 0x3b3356, capColor: 0xffc06a, hp: 55, speed: 4.6, radius: 0.35, height: 0.95,
                 aggro: 16, leash: 24, turnRate: 9, range: 1.4, damage: 4, windup: 0.35, windupTurn: 9, recover: 0.4,
                 cooldown: 2.6, knockback: 2, steal: { oil: 18, interest: 1.5, escape: 6, speedUp: 1.35 },
                 respawn: 45, xp: 18 },
    // ---- mini bosses (TODO 15): out in the wilds, optional; the boss framework drives them (miniBoss: no beacon,
    //      no planet progression; their own loot). Where they live: PLANETS[i].miniBosses
    hydra:     { ai: 'boss', behavior: 'hydra', miniBoss: true, name: 'The Hydra, Terror of the Lake', color: 0x3f9a8a, capColor: 0x6fe0c8,
                 hp: 3360, speed: 1.6, radius: 1.5, height: 3.6, aggro: 14, leash: 18, turnRate: 2.2,
                 knockResist: 1, slowResist: 0.6, staggerImmune: true, stunResist: 0.5, stunnedDamageBonus: 0.3, telegraph: true, respawn: 0, xp: 160, cooldown: 1.3,
                 attacks: {
                   bite:  { windup: 0.65, range: 6.5, arc: 70, damage: 16, knockback: 6, recover: 0.6, cooldown: 0.6 },
                   spit:  { windup: 0.8, minRange: 4, count: 3, spread: 50, speed: 9, homing: 0.5, damage: 9, recover: 0.5, cooldown: 1.2, reuse: 3 },
                   sweep: { windup: 1.0, radius: 7, arc: 200, damage: 14, knockback: 9, recover: 0.9, cooldown: 1.0, reuse: 5 },
                 },
                 phases: [   // heads: how many necks are up (it grows one at each threshold)
                   { below: 1.0, heads: 3, attacks: ['bite', 'spit'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.66, heads: 4, title: 'Four heads', attacks: ['bite', 'spit', 'sweep'], speedMul: 1.1, cooldownMul: 0.9 },
                   { below: 0.33, heads: 5, title: 'Five heads', attacks: ['bite', 'spit', 'sweep'], speedMul: 1.2, cooldownMul: 0.75 },
                 ] },
    basilisk:  { ai: 'boss', behavior: 'basilisk', miniBoss: true, name: 'The Basilisk, Stone-Gazer', color: 0x5a7a3a, capColor: 0xfff066,
                 hp: 2640, speed: 3.4, radius: 1.1, height: 2.0, aggro: 15, leash: 22, turnRate: 3.5,
                 knockResist: 1, slowResist: 0.6, staggerImmune: true, stunResist: 0.5, stunnedDamageBonus: 0.3, telegraph: true, respawn: 0, xp: 170, cooldown: 1.1,
                 attacks: {   // gaze: anyone FACING it when its eyes flare is turned to stone for `petrify` seconds (turn away!)
                   gaze:  { windup: 1.5, range: 20, damage: 12, petrify: 1.8, recover: 1.2, cooldown: 1.2, reuse: 7 },
                   whip:  { windup: 0.8, radius: 4.8, damage: 15, knockback: 10, recover: 0.7, cooldown: 0.8 },
                   lunge: { windup: 0.75, minRange: 5, distance: 12, speed: 16, width: 1.8, damage: 18, knockback: 9, recover: 0.9, cooldown: 1.0, reuse: 3 },
                   spit:  { windup: 0.7, count: 5, spread: 70, speed: 11, homing: 0.3, damage: 8, recover: 0.5, cooldown: 1.0, reuse: 4 },
                 },
                 phases: [
                   { below: 1.0, attacks: ['gaze', 'whip', 'lunge'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.5, title: 'Enraged', attacks: ['gaze', 'whip', 'lunge', 'spit'], speedMul: 1.2, cooldownMul: 0.8 },
                 ] },
    // ---- Duskhollow (TODO 30g). Grandmother Gloomweaver hangs in a canopy of her own web on three anchor strands,
    // where nothing can touch her: `anchors` is how many go up each time (`type` the object below, `at` metres out
    // around her, `hang` metres she hangs above the ground, `drop` seconds she takes to fall once the last one burns,
    // `dazed` seconds she lies open after landing). She re-anchors at every phase change but the last, so the fight
    // is three rounds of burn-the-anchors and fight-her-down. She wears the same spider/beetle pair as her
    // grandchildren (config/settings.js roundBeetles), and she guards the moonstone vein (config/resources.js).
    grandweaver:{ ai: 'boss', behavior: 'grandweaver', miniBoss: true, name: 'Grandmother Gloomweaver, Keeper of the Moonstone',
                 color: 0x4a3c68, capColor: 0xe8d0ff, hp: 760, speed: 2.4, radius: 1.4, height: 2.2, aggro: 15, leash: 22, turnRate: 2.4,
                 knockResist: 1, slowResist: 0.6, staggerImmune: true, stunResist: 0.5, stunnedDamageBonus: 0.3,
                 telegraph: true, respawn: 0, xp: 175, cooldown: 1.2,
                 anchors: { count: 3, type: 'gloomAnchor', at: 6.5, hang: 6, drop: 1.1, dazed: 2.4 },
                 attacks: {
                   weave: { windup: 1.0, reach: 9, damage: 0, recover: 0.7, cooldown: 1.0, reuse: 4 },      // drops a web where you stand
                   spit:  { windup: 0.8, count: 3, spread: 46, speed: 10, homing: 0.4, damage: 10, slow: 0.45, slowTime: 2.5, recover: 0.6, cooldown: 1.0, reuse: 3 },
                   bite:  { windup: 0.6, range: 4.0, arc: 80, damage: 15, knockback: 7, recover: 0.7, cooldown: 0.8 },
                   sweep: { windup: 0.95, radius: 5.5, arc: 220, damage: 13, knockback: 10, recover: 0.9, cooldown: 1.0, reuse: 5 },
                 },
                 phases: [   // each threshold sends her back up the stalks to spin a fresh set of anchors
                   { below: 1.0, attacks: ['weave', 'spit', 'bite'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.6, title: 'Second web', attacks: ['weave', 'spit', 'bite', 'sweep'], speedMul: 1.1, cooldownMul: 0.9 },
                   { below: 0.3, title: 'Last web', attacks: ['weave', 'spit', 'bite', 'sweep'], speedMul: 1.2, cooldownMul: 0.78 },
                 ] },
    // An anchor strand: an object holding her up. A blade will not cut a cable of this thickness - it has to burn.
    // Any lit belt lantern held within `reach` burns one down over `burnTime` seconds (so every hero can), and a hit
    // that carries fire takes it in one (so the witch can do it from across the clearing).
    gloomAnchor:{ ai: 'anchor', object: true, static: true, name: 'Anchor strand', color: 0xe8d0ff, hp: 1, speed: 0,
                 radius: 0.6, height: 6, aggro: 0, leash: 99, respawn: 0, xp: 0,
                 knockResist: 1, slowResist: 1, staggerImmune: true, reach: 2.6, burnTime: 2.6 },
    // Tidewhisper (TODO 27f). faceArc = half-angle (degrees) of the front that can be hurt; everywhere else is the bell,
    // which only rings (bellRing: a shockwave after `delay`, at most once per `cooldown`; stun = seconds dazed).
    // guarded = damage share while tucked in its shell; openBonus = extra while out of it (swap) or wedged in the sand
    ironclaw:  { ai: 'boss', behavior: 'ironclaw', miniBoss: true, name: 'Old Ironclaw, Keeper of the Pearl Beds', color: 0xc8913a, capColor: 0xffc86a,
                 hp: 800, speed: 2.2, radius: 1.5, height: 2.8, aggro: 13, leash: 20, turnRate: 2.4,
                 knockResist: 1, slowResist: 0.6, staggerImmune: true, stunResist: 0.5, stunnedDamageBonus: 0.3, telegraph: true, respawn: 0, xp: 180, cooldown: 1.2,
                 faceArc: 70, guarded: 0.6, openBonus: 0.4, wedge: 5, swap: 5.5, swapSpeed: 0.6,
                 bellRing: { delay: 0.45, speed: 9, maxRadius: 9, width: 1.2, damage: 7, stun: 1.0, cooldown: 3 },
                 attacks: {
                   pinch:  { windup: 0.7, range: 4.2, arc: 80, damage: 12, knockback: 7, recover: 0.7, cooldown: 0.8 },
                   charge: { windup: 0.9, minRange: 4, speed: 13, distance: 14, width: 2.0, damage: 14, knockback: 11, recover: 0.9, cooldown: 1.2, reuse: 4 },
                   toll:   { windup: 1.0, speed: 8, maxRadius: 12, width: 1.2, damage: 10, knockback: 5, stun: 0.8, recover: 1.0, cooldown: 1.2, reuse: 6 },
                 },
                 phases: [   // each threshold: out of the shell (the kit's onPhase), then a new one
                   { below: 1.0, attacks: ['pinch', 'charge'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.66, title: 'Second shell', attacks: ['pinch', 'charge', 'toll'], speedMul: 1.1, cooldownMul: 0.9 },
                   { below: 0.33, title: 'Last shell', attacks: ['pinch', 'charge', 'toll'], speedMul: 1.2, cooldownMul: 0.8 },
                 ] },
    // ---- lair seals and lures: objects, not monsters (object: true = no bestiary page, drops, coins or kill counts; static = never moves)
    mireLure:  { ai: 'mireLure', object: true, static: true, name: 'Lantern lure', color: 0xffd36b, hp: 1, speed: 0, radius: 0.45, height: 1.5,
                 aggro: 0, leash: 99, respawn: 0, xp: 0, knockResist: 1, slowResist: 1, staggerImmune: true },   // Mirelure's: one real, the rest false
    thornSeal: { ai: 'seal', object: true, static: true, name: 'Thorn Seal', color: 0xb48cff, hp: 90, speed: 0, radius: 0.75, height: 2.6,
                 aggro: 0, leash: 99, respawn: 0, xp: 12, knockResist: 1, slowResist: 1, staggerImmune: true },
    // ---- planet bosses: ai 'boss' + behavior = their own AI kit (src/entities/enemies/behaviors/boss/) ----
    // attacks: windup = warning time; recover = pause after (the punish window); cooldown = extra wait before the next
    // move; reuse = seconds before that same move can be picked again. phases: the last whose `below` (fraction of max HP)
    // is >= current HP is active; title shows on the boss bar, enraged/flying are read by the kit.
    // stunResist = share of a stun shrugged off (bosses are only stunned between attacks); tallHitbox = hit along the body column.
    // planet 4 (TODO 27g). pool = the lagoon's radius (she never leaves it); lures: count (countLate after the reflood),
    // radius range from the lair, breath = seconds between her breaths (the real lure dims on each), surface = seconds
    // up after the real lure is struck, burst = a false lure's flash. drain: the sluice break's drain and its creeping
    // reflood (seconds); diveDepth = water over her that ends the beaching
    mirelure:  { ai: 'boss', behavior: 'mirelure', name: 'Mirelure, the Lantern Angler', color: 0x3d5a78, capColor: 0xffd36b,
                 hp: 3250, speed: 3.0, radius: 2.4, height: 3.2, aggro: 20, leash: 34, turnRate: 2.2,
                 knockResist: 1, slowResist: 0.8, staggerImmune: true, stunResist: 0.6, stunnedDamageBonus: 0.3,
                 telegraph: true, respawn: 0, xp: 220, cooldown: 1.2, pool: 18, diveDepth: 1.0,
                 lures: { count: 3, countLate: 4, radius: [5, 12], breath: 1.8, surface: 7, burst: { radius: 3, damage: 12, knockback: 6 } },
                 sluice: { at: 16.5, smash: 2.4 }, drain: { seconds: 45, reflood: 22 },
                 attacks: {
                   geyser: { windup: 1.2, radius: 2.6, damage: 14, knockback: 8, recover: 0.4, cooldown: 1.8, reuse: 3 },
                   bite:   { windup: 0.7, range: 5.5, arc: 80, damage: 18, knockback: 8, recover: 0.8, cooldown: 0.8 },
                   thrash: { windup: 0.9, radius: 5.5, damage: 14, knockback: 10, recover: 0.8, cooldown: 0.8, reuse: 4 },
                   roll:   { windup: 1.0, minRange: 5, speed: 10, distance: 14, width: 3.0, damage: 19, knockback: 12, recover: 1.0, cooldown: 1.0, reuse: 5 },
                 },
                 phases: [   // the moves themselves check her mode (deep / surfaced / beached)
                   { below: 1.0, title: 'Lantern lights', attacks: ['geyser', 'bite', 'thrash', 'roll'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.5, title: 'Beached', attacks: ['geyser', 'bite', 'thrash', 'roll'], speedMul: 1.15, cooldownMul: 0.85 },
                 ] },
    gloomcap:  { ai: 'boss', behavior: 'gloomcap', name: 'Gloomcap, the Moss King', color: 0xb48cff, capColor: 0x9b6ad6,   // planet 1: the introduction
                 look: { skin: 0x6a4a7a, armor: 0x2e2638, cape: 0x2a1838, horn: 0xe8dcc4, trim: 0xffd36b, eye: 0xffe066, motif: 'moss' },   // src/models/bosses.js
                 hp: 6700, speed: 2.6, radius: 1.3, height: 4.6,
                 aggro: 16, leash: 30, turnRate: 3, knockResist: 1, slowResist: 0.8, staggerImmune: true, stunnedDamageBonus: 0.5,
                 telegraph: true, respawn: 0, xp: 80, cooldown: 1.6,
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
                 hp: 5000, speed: 3.2, radius: 1.9, height: 3.6, tallHitbox: true,
                 aggro: 18, leash: 32, turnRate: 2.2, knockResist: 1, slowResist: 0.8, staggerImmune: true, stunResist: 0.6, stunnedDamageBonus: 0.5,
                 telegraph: true, respawn: 0, xp: 100, cooldown: 1.2,
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
                 hp: 3600, speed: 3.0, radius: 1.5, height: 5.4, tallHitbox: true,
                 aggro: 18, leash: 34, turnRate: 3.5, knockResist: 1, slowResist: 0.85, staggerImmune: true, stunResist: 0.7, stunnedDamageBonus: 0.35,
                 telegraph: true, respawn: 0, xp: 150, cooldown: 1.0,
                 flight: { hover: 2.4, high: 7.5, speed: 6.5, orbit: 10 },                   // phase 2 altitude (2.4 is still in reach), dive height, circling
                 transition: { time: 3.2, burstAt: 1.3, radius: 9, push: 14, damage: 8 },   // immune while it lasts; the burst throws the hero clear
                 attacks: {
                   // phase 1, grounded
                   combo:    { windup: 0.55, range: 5, radius: 4.4, arc: 140, reach: 2.2, slamRadius: 3.2, gap: 0.5, damage: 14, finisherDamage: 22, knockback: 6,
                               recover: 0.9, cooldown: 0.8 },
                   fissure:  { windup: 0.9, length: 16, width: 2.4, speed: 18, damage: 20, knockback: 10, recover: 0.8, cooldown: 1.2, reuse: 5 },
                   hellfire: { windup: 0.7, count: 4, radius: 2.6, delay: 1.2, stagger: 0.25, damage: 20, knockback: 6, recover: 0.6, cooldown: 1.2, reuse: 6 },
                   doom:     { windup: 2.0, maxRange: 10, reach: 2.5, radius: 6.5, damage: 999, lethal: true, recover: 2.2, cooldown: 1.2, reuse: 24 },   // ONE-HIT KILL: leave the circle
                   // phase 2, flying
                   dive:     { windup: 1.0, radius: 4.2, time: 0.45, damage: 21, knockback: 14, grounded: 2.4, recover: 0.4, cooldown: 0.9, reuse: 4 },
                   barrage:  { windup: 0.7, waves: 3, count: 5, spread: 60, gap: 0.45, speed: 12, homing: 0.9, damage: 8, recover: 0.6, cooldown: 1.0, reuse: 5 },
                   rain:     { windup: 0.8, count: 9, radius: 2.4, delay: 1.1, stagger: 0.18, scatter: 7, damage: 14, knockback: 5, recover: 0.6, cooldown: 1.2, reuse: 8 },
                   strafe:   { windup: 1.0, length: 22, width: 3, speed: 22, trail: 7, trailDelay: 0.5, damage: 16, knockback: 9, recover: 0.6, cooldown: 1.0, reuse: 7 },
                 },
                 phases: [
                   { below: 1.0, title: 'Grounded', attacks: ['combo', 'fissure', 'hellfire', 'doom'], speedMul: 1, cooldownMul: 1 },
                   { below: 0.5, title: 'Ascended', flying: true, enraged: true, attacks: ['dive', 'barrage', 'rain', 'strafe'], speedMul: 1.2, cooldownMul: 0.8 },
                 ] },
  },
};
