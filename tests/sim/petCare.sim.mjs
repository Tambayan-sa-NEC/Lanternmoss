// TODO 35 (pet care): feeding, outfits, finds and the cottage pet basket, end to end in the running game.
// Feeding takes one food from the bag, gives a little XP and some health, and a favourite makes the pet Happy (more
// damage, for a while); a pet eats at most PET_FOOD.perDay meals a day. A pet fed today sometimes brings back a find
// while you explore, at most PET_FINDS.perDay a day, and never when it has not been fed. An outfit leaves the bag while
// a pet wears it, is drawn on that pet's head, stays with that pet through a swap, and comes back when taken off. The
// pet basket in your cottage shows your pet asleep in it and heals it, a fainted one included. All of it survives a save
// and a Continue.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { Pets } = await imp('gameplay/Pets.js');
const { PET_BED, PET_FAVOURITES, PET_FINDS, PET_FOOD, PETS } = await imp('config/pets.js');
const { Houses, currentInteraction } = await imp('gameplay/Houses.js');
const { HOME } = await imp('config/home.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { cleanState } = await imp('core/save.js');
const P = H.player, inv = H.inventory, home = H.Home;
const pass = m => console.log(`PASS  ${m}`);
const live = secs => step(secs, () => { P.hp = P.stats.maxHp; });
const nextDay = () => { dayClock.skip(DAY.length, 'test'); step(0.1); };
const quiet = () => { for (const e of ctx.enemies) if (e !== ctx.boss && e.alive && e.def.respawn) e.vanish(); };

try {
  H.Tutorial.skip(); P.invuln = 1e5; quiet(); live(0.5);
  const id = Pets.id, favs = PET_FAVOURITES[id];
  assert.ok(ctx.companion && favs?.length, `${id} is out, with favourites`);

  // ---- feeding: one food from the bag, XP and health; a favourite makes it Happy and hit harder ----------------------------
  const fav = favs[0], liked = 'grilledFish';
  assert.ok(!favs.includes(liked), 'the liked food is not one of its favourites');
  inv.add(fav, 2); inv.add(liked, 2);
  Pets.hp = Pets.maxHp() * 0.4;
  const base = Pets.damage(), xp0 = P.xp + P.level * 1e6, hp0 = Pets.hp;
  const r1 = Pets.feed(liked);
  assert.ok(r1.ok && !r1.favourite, r1.message);
  assert.equal(inv.count(liked), 1, 'one food is taken from the bag');
  assert.ok(P.xp + P.level * 1e6 > xp0, 'it gives a little XP');
  assert.ok(Pets.hp > hp0, 'and some health back');
  assert.equal(Pets.happyT, 0, 'a liked food does not make it Happy');
  assert.equal(Pets.damage(), base, 'nor stronger');
  const r2 = Pets.feed(fav);
  assert.ok(r2.ok && r2.favourite, r2.message);
  assert.equal(Pets.happyT, PET_FOOD.happySeconds, 'a favourite makes it Happy');
  assert.ok(Pets.damage() > base, `and it hits harder while it lasts (${Pets.damage()} vs ${base})`);
  live(1); assert.ok(Pets.happyT < PET_FOOD.happySeconds, 'and Happy runs down');
  pass(`feeding takes one food, gives XP and health; a favourite (${fav}) makes it Happy: ${base} -> ${Pets.damage()} damage`);

  // ---- a pet eats only so much a day, and nothing it won't eat ---------------------------------------------------------------
  inv.add(fav, PET_FOOD.perDay);
  while (Pets.meals() < PET_FOOD.perDay) assert.ok(Pets.feed(fav).ok);
  const before = inv.count(fav), full = Pets.feed(fav);
  assert.equal(full.ok, false, 'a full pet refuses'); assert.match(full.message, /full/);
  assert.equal(inv.count(fav), before, 'and nothing is taken');
  inv.add('stone', 1); assert.equal(Pets.feed('stone').ok, false, 'a pet will not eat a stone');
  assert.equal(Pets.feed('honeyBun').ok, false, 'nor food you do not have');
  nextDay(); assert.equal(Pets.meals(), 0, 'a new day, a new appetite'); assert.ok(Pets.feed(fav).ok);
  pass(`a pet eats ${PET_FOOD.perDay} meals a day and is hungry again tomorrow; it refuses what it cannot eat`);

  // ---- finds: a pet fed today sometimes brings something back, at most perDay a day; an unfed one never ------------------------
  const snapshot = () => JSON.stringify(inv.getSlots()) + P.coins;
  let got = [];
  for (let i = 0; i < 400 && got.length < PET_FINDS.perDay + 2; i++) { const f = Pets.tryFind(); if (f) got.push(f); }
  assert.equal(got.length, PET_FINDS.perDay, `a well-fed pet finds up to ${PET_FINDS.perDay} things a day (${got.length})`);
  assert.ok(got.every(f => PET_FINDS.table.some(([w]) => w === f.what)), 'each from the finds table');
  nextDay();
  assert.equal(Pets.wellFed, false, 'the next morning it has not been fed yet');
  const s0 = snapshot(); let any = null;
  for (let i = 0; i < 200; i++) any ??= Pets.tryFind();
  assert.equal(any, null, 'an unfed pet finds nothing'); assert.equal(snapshot(), s0);
  // and in play, through its own timer: fed, out and following, it finds on its own
  Pets.feed(fav); Pets.command('follow'); Pets.findT = 1; const s1 = snapshot(), fd = Pets.findsToday;
  let waited = 0;                                                      // each try is a chance: wait for one, within reason
  for (; waited < 40 && Pets.findsToday === fd; waited++) live(waited ? PET_FINDS.interval : 1.5);
  assert.ok(Pets.findsToday > fd && snapshot() !== s1, `out exploring, a fed pet brings finds on its own (after ${waited} tries)`);
  pass(`a fed pet finds up to ${PET_FINDS.perDay} things a day from its table (on its own timer in play); an unfed one finds nothing`);

  // ---- outfits: from the bag onto this pet's head, kept per pet, back to the bag when taken off ------------------------------
  inv.add('petBow', 1); inv.add('petScarf', 1);
  assert.equal(Pets.wear('stone').ok, false, 'a stone is not an outfit');
  assert.ok(Pets.wear('petBow').ok);
  assert.equal(inv.count('petBow'), 0, 'the bow leaves the bag while it is worn');
  assert.ok(ctx.companion.outfit && ctx.companion.head.children.includes(ctx.companion.outfit), 'and is drawn on the pet\'s head');
  assert.ok(Pets.wear('petScarf').ok);
  assert.equal(inv.count('petBow'), 1, 'changing outfits gives the old one back'); assert.equal(inv.count('petScarf'), 0);
  const other = Object.keys(PETS).find(p => p !== id && Pets.unlocked.has(p));
  Pets.choose(other, true); live(0.2);
  assert.equal(ctx.companion.outfit ?? null, null, 'another pet does not wear it');
  Pets.choose(id, true); live(0.2);
  assert.ok(ctx.companion.outfit, 'and it is still on its own pet when that pet comes back');
  assert.ok(Pets.wear(null).ok); assert.equal(inv.count('petScarf'), 1, 'taking it off returns it');
  assert.equal(ctx.companion.outfit ?? null, null);
  for (const p of Object.keys(PETS)) { Pets.unlocked.add(p); assert.ok(Pets.wear('petBow', p).ok, p); assert.ok(Pets.wear(null, p).ok); }
  assert.equal(inv.count('petBow'), 1, 'every pet can wear one, and gives it back');
  Pets.wear('petBow');
  pass('an outfit leaves the bag while worn, sits on that pet\'s head, stays with that pet, and comes back when taken off');

  // ---- the cottage pet basket: your pet naps in it, and heals ----------------------------------------------------------------
  P.placeAt(home.cottage.door); live(0.2); currentInteraction().run(); live(1);
  assert.equal(Houses.inside?.index, HOME.houseIndex); assert.ok(home.claim().ok);
  inv.add('petBed', 1); assert.ok(home.place('petBed').ok, 'the basket is placed');
  live(0.3);
  assert.ok(Houses.inside.room.petBedAt, 'the room has its basket');
  assert.ok(Houses.inside.petLook?.root.parent, 'with your pet asleep in it');
  assert.ok(Houses.inside.petLook.outfit, 'wearing its outfit');
  assert.equal(Pets.resting, true);
  Pets.hp = 1; live(1);
  assert.ok(Pets.hp > 1 + Pets.maxHp() * PET_BED.heal * 0.8, `it heals quickly while it rests (${Math.round(Pets.hp)} / ${Pets.maxHp()})`);
  Pets.faint(); const left = Pets.faintT; live(1);
  assert.ok(left - Pets.faintT > PET_BED.faintRate * 0.8, `a fainted pet gets better ${PET_BED.faintRate}x faster there (${(left - Pets.faintT).toFixed(1)}s in 1s)`);
  Object.assign(Houses.inside, { x: HOME.petBed.x + 0.9, z: HOME.petBed.z + 0.4, vx: 0, vz: 0 }); Houses.placeHero(); live(0.1);
  assert.match(currentInteraction()?.label ?? '', /Check on your pet/, 'the basket can be used');
  live(PET_CARE_FAINT());
  Houses.leave(); live(1.5);
  assert.equal(Pets.resting, false, 'leaving ends the rest');
  assert.equal(Pets.fainted, false, 'and a pet that was resting comes out on its feet');
  pass(`the pet basket shows your pet asleep in it (outfit and all), heals it, and speeds a fainted pet's rest ${PET_BED.faintRate}x`);

  // ---- saves: care state survives a Continue, and the cleaner keeps only sane values ---------------------------------------------
  Pets.feed(fav); const meals = Pets.meals(), worn = Pets.outfits[id];
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); live(0.5);
  assert.equal(Pets.meals(), meals, 'meals today survive a Continue');
  assert.equal(Pets.outfits[id], worn, 'and the outfit');
  assert.ok(ctx.companion.outfit, 'drawn again on the rebuilt body');
  const dirty = cleanState('pets', { ...Pets.toJSON(), fed: { [id]: 99, ghost: 2 }, happyT: 1e9, findsToday: 50,
    outfits: { [id]: 'stone', ghost: 'petBow', [other]: 'petScarf' } }, 'witch');
  assert.deepEqual(dirty.fed, { [id]: PET_FOOD.perDay }, 'meals are clamped and unknown pets dropped');
  assert.equal(dirty.happyT, PET_FOOD.happySeconds); assert.equal(dirty.findsToday, PET_FINDS.perDay);
  assert.deepEqual(dirty.outfits, { [other]: 'petScarf' }, 'only real outfits on real pets survive');
  pass('meals, Happy, finds and outfits survive a save and a Continue, and a crafted save cannot inflate them');

  H.newGame?.();
  console.log('all passed');
} finally { /* nothing to restore: no fixture */ }

function PET_CARE_FAINT() { return Math.ceil(Pets.faintT / PET_BED.faintRate) + 0.5; }
