// TODO 33 (villager friendship): hearts, presents and the reward ladder, end to end in the running game.
// Talking to a villager for the first time each day is worth a little, and only the first time. A present comes out of
// the hero's hand, one a day per villager, and is worth what that villager thinks of it; a disliked one cools the
// friendship instead. Each heart hands over its reward there and then: a thank-you from their shelf, a recipe they
// know, the keeper's discount off every shop price, their own keepsake, and the personal quest they only ask a friend.
// Friends greet you by name, wave from across the square and leave presents at your cottage door. All of it survives a
// save and a Continue, and a crafted save cannot hand out rewards that were never earned.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { Friendship } = await imp('gameplay/Friendship.js');
const { FRIENDSHIP, TASTES } = await imp('config/friendship.js');
const { heartsFor } = await imp('gameplay/friendshipRules.js');
const { QUESTS } = await imp('config/quests.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { SHOP } = await imp('config/shop.js');
const { buyPrice } = await imp('gameplay/wallet.js');
const { Dialog } = await imp('ui/Dialog.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { cleanState } = await imp('core/save.js');
const P = H.player, inv = H.inventory, Hotbar = H.Hotbar;
const pass = m => console.log(`PASS  ${m}`);
const live = secs => step(secs, () => { P.hp = P.stats.maxHp; });
const nextDay = () => { dayClock.skip(DAY.length, 'test'); live(0.2); };
const quiet = () => { for (const e of ctx.enemies) if (e !== ctx.boss && e.alive && e.def.respawn) e.vanish(); };
const npcNamed = name => ctx.npcs.find(n => n.name === name);
/** Puts `id` in the hero's hand, the way a player picks a hotbar slot before giving it away. */
const hold = id => { inv.add(id, 1); const slots = inv.getSlots(); Hotbar.selected = slots.findIndex(s => s?.itemId === id); return Hotbar.held()?.itemId; };
/** One whole conversation: open the dialogue, decline anything else on offer (the shop, a quest) until the gift
    offer shows up, then take it or leave it. Returns the gift offer, or null if there was none. */
const talk = (npc, { give = false } = {}) => {
  Dialog.start(npc);
  let offer = null;
  for (let i = 0; i < 4 && Dialog.open && Dialog.choice; i++) {
    const c = Dialog.choice;
    if (/^Give /.test(c.yes)) { offer = c; Dialog.choose(give); break; }
    Dialog.choose(false);
  }
  Dialog.close(); return offer;
};

try {
  H.Tutorial.skip(); P.invuln = 1e5; quiet(); live(0.5);
  const pim = npcNamed('Pim'), bramble = npcNamed('Old Bramble');
  assert.ok(pim && bramble, 'the villagers are out in the square');
  assert.equal(Friendship.hearts('Pim'), 0, 'everyone starts a stranger');

  // ---- talking: the first chat of each day is worth something, the rest of the day's chatter is free ----------------
  const start = Friendship.points('Pim');
  talk(pim);
  assert.equal(Friendship.points('Pim'), start + FRIENDSHIP.talk.points, 'the first chat of the day counts');
  talk(pim); talk(pim);
  assert.equal(Friendship.points('Pim'), start + FRIENDSHIP.talk.points, 'talking again the same day is free');
  nextDay(); talk(pim);
  assert.equal(Friendship.points('Pim'), start + FRIENDSHIP.talk.points * 2, 'and worth something again tomorrow');
  pass(`saying hello is worth ${FRIENDSHIP.talk.points} once a day, no matter how often you talk`);

  // ---- presents: out of your hand, one a day, worth what they think of it -------------------------------------------
  const fav = TASTES.Pim.favourite[0], bad = TASTES.Pim.disliked[0];
  assert.equal(Friendship.giftChoice(pim), null, 'with empty hands there is nothing to offer');
  hold(fav);
  const offer = talk(pim, { give: false });
  assert.match(offer?.yes ?? '', /^Give /, 'holding a present puts the offer in the conversation');
  assert.equal(inv.count(fav), 1, 'declining keeps it');
  const before = Friendship.points('Pim');
  talk(pim, { give: true });
  assert.equal(inv.count(fav), 0, 'giving it takes it out of the bag');
  assert.equal(Friendship.points('Pim') - before, FRIENDSHIP.gift.points.favourite, 'a favourite is worth the most');
  hold(fav);
  const full = talk(pim, { give: true });
  assert.equal(full, null, 'one present a day, and the offer is simply not there again');
  assert.equal(inv.count(fav), 1, 'so nothing is taken');
  nextDay(); talk(pim);                                     // spend the new day's hello first, so only the present counts
  const cooled = Friendship.points('Pim'); hold(bad); talk(pim, { give: true });
  assert.equal(Friendship.points('Pim') - cooled, FRIENDSHIP.gift.points.disliked, 'a present they dislike cools things');
  assert.ok(Friendship.points('Pim') > 0, 'but it never undoes a friendship');
  pass(`presents come out of your hand, ${FRIENDSHIP.gift.perDay} a day: favourite +${FRIENDSHIP.gift.points.favourite}, disliked ${FRIENDSHIP.gift.points.disliked}`);

  // ---- a quest finished for a friend is worth more than any present -------------------------------------------------
  const qBefore = Friendship.points('Old Bramble');
  Quests.start('humStones'); while (!Quests.done().includes('humStones')) Quests.advance('humStones');
  live(0.2);
  assert.equal(Friendship.points('Old Bramble') - qBefore, FRIENDSHIP.quest.points, 'finishing their quest counts');
  pass(`finishing a villager's quest is worth ${FRIENDSHIP.quest.points}, more than any present`);

  // ---- the heart ladder: each heart hands its reward over as it is earned -------------------------------------------
  const ladder = TASTES.Pim.rewards;
  const thanks = ladder.find(r => r.kind === 'items'), keep = ladder.find(r => r.kind === 'keepsake');
  const quest = ladder.find(r => r.kind === 'quest');
  const fullPrice = buyPrice(SHOP.stock[0]);
  assert.equal(Friendship.discount(SHOP.keeper), 0, 'a stranger pays the asking price');
  assert.equal(Quests.offerable(pim), null, 'and is not asked for a personal favour');

  Friendship.add('Pim', FRIENDSHIP.thresholds[thanks.hearts] - Friendship.points('Pim'));
  assert.equal(Friendship.hearts('Pim'), thanks.hearts);
  for (const [id, n] of thanks.items) assert.ok(inv.count(id) >= n, `the thank-you arrives: ${n}x ${id}`);

  Friendship.add('Pim', FRIENDSHIP.thresholds[3] - Friendship.points('Pim'));
  const discount = Friendship.discount(SHOP.keeper);
  assert.ok(discount > 0 && buyPrice(SHOP.stock[0]) < fullPrice, `the keeper's friend pays less (${fullPrice} -> ${buyPrice(SHOP.stock[0])})`);

  Friendship.add('Pim', FRIENDSHIP.thresholds[keep.hearts] - Friendship.points('Pim'));
  assert.equal(inv.count(keep.item), 1, 'the keepsake she made is handed over');
  hold(keep.item);
  assert.equal(Friendship.pick(), null, 'and a keepsake can never be given away again');

  Friendship.add('Pim', FRIENDSHIP.thresholds[quest.hearts] - Friendship.points('Pim'));
  assert.equal(Friendship.hearts('Pim'), FRIENDSHIP.hearts, 'as close as friends get');
  assert.equal(Quests.offerable(pim), quest.quest, `now she asks: ${QUESTS[quest.quest].title}`);
  const second = inv.count(keep.item);
  Friendship.add('Pim', 500);
  assert.equal(inv.count(keep.item), second, 'a full friendship hands nothing over twice');
  pass(`the ladder pays out heart by heart: thank-you, ${Math.round(discount * 100)}% off the shop, a keepsake, then "${QUESTS[quest.quest].title}"`);

  // ---- a recipe a friend teaches is a second way to learn it --------------------------------------------------------
  const recipe = TASTES['Old Bramble'].rewards.find(r => r.kind === 'recipe');
  assert.equal(H.RecipeBook.knows(recipe.recipe), false, 'not known from anywhere else yet');
  Friendship.add('Old Bramble', FRIENDSHIP.thresholds[recipe.hearts] - Friendship.points('Old Bramble'));
  assert.ok(H.RecipeBook.knows(recipe.recipe), `a friend teaches you ${recipe.recipe}`);
  pass('a recipe learned from a friend is a second way to discover it, beside the book, scroll and bestiary');

  // ---- how friends behave: your name on the prompt, and a wave from across the square -------------------------------
  const { currentInteraction } = await imp('gameplay/Houses.js');
  P.placeAt(pim.up); live(0.3);
  assert.match(currentInteraction()?.label ?? '', /Talk to Pim.*♥/, 'the prompt shows how well you know them');
  Friendship.waveT.clear(); pim.gesture = 0;
  const { offsetDir } = await imp('utils/sphere.js');
  P.placeAt(offsetDir(pim.up, 0.7, (FRIENDSHIP.wave.near + FRIENDSHIP.wave.far) / 2)); pim.asleep = false;
  Friendship.waves(1 / 60);
  assert.ok(pim.gesture > 0, 'a friend waves when they spot you across the square');
  const strangerWave = (() => { const n = npcNamed('Lio'); n.gesture = 0; n.asleep = false;
    P.placeAt(offsetDir(n.up, 0.7, (FRIENDSHIP.wave.near + FRIENDSHIP.wave.far) / 2)); Friendship.waves(1 / 60); return n.gesture; })();
  assert.equal(strangerWave, 0, 'someone who barely knows you does not');
  pass(`friends greet you by name and wave from ${FRIENDSHIP.wave.near}-${FRIENDSHIP.wave.far}m; strangers do not`);

  // ---- presents left at your cottage door ---------------------------------------------------------------------------
  ctx.worldItems.length = 0; Friendship.state.doorDay = 0;
  let left = [];
  for (let i = 0; i < 40 && !left.length; i++) { Friendship.state.doorDay = 0; left = Friendship.doorGifts(); }
  assert.ok(left.length, 'a close friend leaves something at your door');
  assert.ok(left.every(g => Friendship.hearts(g.name) >= FRIENDSHIP.door.from), 'only friends who know you that well');
  assert.ok(ctx.worldItems.length >= left.length, 'and it is really there, on the doorstep');
  pass(`friends at ${FRIENDSHIP.door.from}+ hearts leave presents at your cottage door`);

  // ---- saves: the friendships survive a Continue, and a crafted save cannot inflate them -----------------------------
  const points = Friendship.points('Pim'), hearts = Friendship.hearts('Pim');
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); live(0.5);
  assert.equal(Friendship.points('Pim'), points, 'friendship survives a Continue');
  assert.equal(Friendship.hearts('Pim'), hearts);
  assert.equal(Quests.offerable(npcNamed('Pim')), quest.quest, 'and so does the personal quest it unlocked');
  const dirty = cleanState('friendship', { ...Friendship.toJSON(), points: { Pim: 1e9, Nobody: 400 }, claimed: { Pim: 99, Nobody: 3 } }, 'witch');
  assert.equal(dirty.points.Pim, FRIENDSHIP.thresholds.at(-1), 'a crafted total stops at the last heart');
  assert.equal(dirty.claimed.Pim, heartsFor(dirty.points.Pim), 'and claims no more rewards than those hearts earned');
  assert.ok(!('Nobody' in dirty.points), 'a villager who does not exist is dropped');
  pass('hearts, the day\'s gifts and the rewards handed over all survive a save and a Continue');

  game.resetRun();
  assert.equal(Friendship.points('Pim'), 0, 'a new adventure starts as strangers again');
  pass('starting over clears every friendship: a new adventure begins among strangers');
  console.log('all passed');
} finally { /* nothing to restore: no fixture */ }
