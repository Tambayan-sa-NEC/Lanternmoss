// Pets end to end: hero's own pet, level growth, commands (follow / stay / attack / passive), abilities, health and
// fainting, petting, unlocking (quest, chest, boss chest), swapping and renaming, a new adventure.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { emit } = await imp('core/events.js');
const { Pets } = await imp('gameplay/Pets.js');
const { petEffects } = await imp('gameplay/petAbilities.js');
const { buffs } = await imp('gameplay/buffs.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { gainXp } = await imp('progression/experience.js');
const { damageEnemy } = await imp('combat/damage.js');
const { targeting } = await imp('combat/targeting.js');
const { InventoryUI } = await imp('ui/InventoryUI.js');
const { PETS, PET_CARE } = await imp('config/pets.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const { H, step, game } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const P = H.player;
step(1);
check(Pets.id === 'wolf' && ctx.companion?.petId === 'wolf' && Pets.nameOf() === 'Fang', `the knight starts with Fang the wolf (${Pets.nameOf()})`);
check(Pets.hp === Pets.maxHp() && Pets.maxHp() === PETS.wolf.hp, `full health (${Pets.hp})`);
// growing up
const d1 = Pets.damage(), hp1 = Pets.maxHp(); gainXp(400); step(0.1);
check(P.level > 1 && Pets.damage() > d1 && Pets.maxHp() > hp1 && Pets.hp === Pets.maxHp(), `levels with the hero (Lv ${P.level}: dmg ${d1} -> ${Pets.damage()}, hp ${hp1} -> ${Pets.maxHp()})`);
// ---- fighting: follow mode bites what you fight
const foe = ctx.enemies.find(e => e.alive && e !== ctx.boss);
const near = () => { P.placeAt(offsetDir(foe.up, 0.5, 5)); foe.hp = 1e4; foe.aggro(); step(0.1); };
near(); Pets.hurtAt = -99; let hp0 = foe.hp;
for (let i = 0; i < 60 && foe.hp === hp0; i++) { targeting.lastHit = foe; targeting.lastHitT = ctx.time; step(0.1); }
check(foe.hp < hp0 - 0.01, `follow: Fang bites what you're fighting (${(hp0 - foe.hp).toFixed(1)} damage)`);
// passive: never attacks
press('KeyT'); press('KeyT'); press('KeyT');
check(Pets.mode === 'passive', `T cycles commands (${Pets.mode})`);
foe.hp = 1e4; hp0 = foe.hp; for (let i = 0; i < 60; i++) { foe.aggro(); targeting.lastHit = foe; targeting.lastHitT = ctx.time; step(0.1); }
check(foe.hp > hp0 - 1, 'passive: no biting');
// stay: holds its spot while you walk away
Pets.command('stay'); const spot = ctx.companion.up.clone();
P.placeAt(offsetDir(P.up, 1.2, 14)); step(3);
check(arcDist(ctx.companion.up, spot) < 2.5 && arcDist(ctx.companion.up, P.up) > 8, `stay: waits where it was told (${arcDist(ctx.companion.up, spot).toFixed(1)} from its spot)`);
// attack: goes after your target even if it isn't fighting
Pets.command('attack'); const far = ctx.enemies.find(e => e.alive && e !== ctx.boss && e !== foe);
P.placeAt(offsetDir(far.up, 0.3, 6)); ctx.companion.snapToHero(); far.hp = 1e4; hp0 = far.hp; step(0.1);
targeting.aim = far; for (let i = 0; i < 80 && far.hp === hp0; i++) { targeting.aim = far; step(0.1); }
check(far.hp < hp0, 'attack: goes for your target');
Pets.command('follow');
// ---- health, fainting, coming back
Pets.hurt(9999); step(0.1);
check(Pets.fainted && !ctx.companion.root.visible, 'faints at 0 HP (hidden, not dead)');
press('KeyV'); check(Pets.abilityCd === 0, 'no ability while resting');
step(PET_CARE.faintTime + 0.5);
check(!Pets.fainted && ctx.companion.root.visible && Pets.hp === Pets.maxHp(), 'bounds back after a while, fully healed');
Pets.hurt(30); Pets.hurtAt = -99; step(2); check(Pets.hp > Pets.maxHp() - 30, 'heals up out of the fight');
// ---- abilities
press('KeyV'); step(0.1);
check(buffs.howl > 0 && Pets.abilityCd > 0, `V: Howl (+damage buff ${buffs.howl.toFixed(1)}s, cooldown ${Pets.abilityCd.toFixed(0)}s)`);
const e2 = ctx.enemies.find(e => e.alive && e !== ctx.boss); e2.hp = 1e4; damageEnemy(e2, 10); const howled = 1e4 - e2.hp;
buffs.howl = 0; e2.hp = 1e4; damageEnemy(e2, 10); check(howled > 1e4 - e2.hp, `Howl hits harder (${howled} vs ${1e4 - e2.hp})`);
press('KeyV'); check(Pets.abilityCd > 25, 'and then it cools down');
// ---- petting
P.placeAt(ctx.companion.up); P.vel.set(0, 0, 0); ctx.companion.state = 'idle'; Pets.petCool = 0;
let t = currentInteraction(); check(/Pet Fang/.test(t?.label ?? ''), `E prompt: "${t?.label}"`);
Pets.hurt(20); const before = Pets.hp; t?.run(); check(Pets.hp > before, 'petting cheers them up (a little health)');
// ---- unlocking
check(!Pets.unlocked.has('fox') && !Pets.choose('fox'), 'the fox is locked to begin with');
emit('chestopened', { kind: 'rare', planet: 0 }); check(Pets.unlocked.has('fox'), 'a Lantern chest: the fox');
emit('questcomplete', { id: 'humStones' }); check(Pets.unlocked.has('wisp'), 'the Humming Stones: the wisp');
emit('chestopened', { kind: 'boss', planet: 0 }); check(!Pets.unlocked.has('whelp'), "Gloomcap's chest isn't the dragon's");
emit('chestopened', { kind: 'boss', planet: 1 }); check(Pets.unlocked.has('whelp'), "Pyrrhax's chest: the whelp");
// ---- any hero, any pet, each with an ability that works
const abilityOk = {};
for (const id of ['owl', 'fox', 'wisp', 'whelp']) {
  check(Pets.choose(id) && ctx.companion.petId === id && Pets.hp === Pets.maxHp(), `the knight takes the ${id} along`);
  const e = ctx.enemies.find(x => x.alive && x !== ctx.boss); P.placeAt(offsetDir(e.up, 0.2, 4)); ctx.companion.snapToHero(); e.hp = 1e4; targeting.aim = e;
  if (id === 'fox') H.spawnItem('moonberry', 2, 6);
  P.hp = P.stats.maxHp * 0.4; Pets.abilityCd = 0; step(0.2);
  targeting.aim = e; const hpBefore = P.hp, eBefore = e.hp; abilityOk[id] = Pets.useAbility(); step(1);
  if (id === 'owl') check(petEffects.spotted.length > 0 && e.markT > 0, `Scout spots and marks (${petEffects.spotted.length})`);
  if (id === 'fox') check(abilityOk.fox && (petEffects.scent || ctx.worldItems.some(w => w.from)), 'Fetch brings things over and sniffs for chests');
  if (id === 'wisp') { step(5); check(P.hp > hpBefore + 10, `Mend heals (${Math.round(hpBefore)} -> ${Math.round(P.hp)})`); }
  if (id === 'whelp') check(e.hp < eBefore, `Flame Burst burns (${Math.round(eBefore - e.hp)})`);
  for (let i = 0; i < 30; i++) step(0.1);    // flies / walks about without trouble
}
check(Object.values(abilityOk).every(Boolean), `every pet's ability fires (${JSON.stringify(abilityOk)})`);
// ---- names and the pet menu
check(Pets.rename('whelp', '  Sparky<>!!{} ') === 'Sparky' && Pets.nameOf('whelp') === 'Sparky', `renaming is tidied (${Pets.nameOf('whelp')})`);
H.PetMenu.open(); H.PetMenu.close(); check(!ctx.paused, 'the pet menu renders and closes');
// ---- after travel and houses the pet comes along
H.goToPlanet(1); step(1); check(ctx.companion?.petId === 'whelp' && Pets.nameOf() === 'Sparky', 'travels to the next planet with you');
// ---- a new adventure
game.resetRun(); step(0.2);
check(!Pets.unlocked.has('fox') && Pets.mode === 'follow' && Pets.hp === null || Pets.id === 'wolf', 'a new adventure: back to the starter pets');
const { CharacterSelect } = await imp('ui/CharacterSelect.js'); CharacterSelect.pick('ranger'); step(0.2);
check(Pets.id === 'owl' && Pets.nameOf() === 'Wren' && ctx.companion?.petId === 'owl', `the ranger gets Wren the owl (${Pets.nameOf()})`);
console.log(fails ? `${fails} FAILED` : 'all passed');
