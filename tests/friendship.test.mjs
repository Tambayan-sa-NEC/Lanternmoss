// Villager friendship rules (TODO 33): the authored tastes and reward ladders, hearts from points, what a present is
// worth, the personal-quest gate and the saved shape. Pure data and pure functions only. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TASTES, FRIENDSHIP, TASTES } from '../src/config/friendship.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { RECIPES } from '../src/config/crafting.js';
import { QUESTS } from '../src/config/quests.js';
import { PLANETS, PLANET_CATALOG } from '../src/config/planets.js';
import { cleanFriendshipState, clampPoints, emptyFriendship, giftKind, giftPoints, heartProgress, heartsFor,
  isVillager, questHearts, rewardLadder, rewardsBetween, shopDiscount, tastesFor, VILLAGER_NAMES } from '../src/gameplay/friendshipRules.js';

const ITEMS = new Set(ITEM_DEFINITIONS.map(d => d.id));
const KINDS = ['favourite', 'liked', 'neutral', 'disliked'];

test('the friendship numbers make a rising ladder of hearts', () => {
  const t = FRIENDSHIP.thresholds;
  assert.equal(t.length, FRIENDSHIP.hearts + 1, 'one threshold per heart, plus the start');
  assert.equal(t[0], 0);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1], `threshold ${i} rises`);
  assert.ok(FRIENDSHIP.gift.points.favourite > FRIENDSHIP.gift.points.liked, 'a favourite beats a liked present');
  assert.ok(FRIENDSHIP.gift.points.liked > FRIENDSHIP.gift.points.neutral, 'and a liked present beats any old thing');
  assert.ok(FRIENDSHIP.gift.points.disliked < 0, 'a disliked present costs');
  assert.ok(FRIENDSHIP.quest.points > FRIENDSHIP.gift.points.favourite, 'a finished quest is worth more than a present');
  assert.ok(FRIENDSHIP.gift.perDay >= 1 && FRIENDSHIP.door.from <= FRIENDSHIP.hearts && FRIENDSHIP.waveFrom <= FRIENDSHIP.hearts);
  // the whole ladder is reachable in a sane number of days: one chat, one favourite present
  const perDay = FRIENDSHIP.talk.points + FRIENDSHIP.gift.points.favourite * FRIENDSHIP.gift.perDay;
  assert.ok(t.at(-1) / perDay <= 10, `the last heart is about ${Math.ceil(t.at(-1) / perDay)} days of visiting away`);
});

test('every authored villager is real, likes real things, and has nothing on two lists at once', () => {
  for (const [name, t] of Object.entries(TASTES)) {
    assert.ok(isVillager(name), `${name} is a villager`);
    for (const list of ['favourite', 'liked', 'disliked']) {
      for (const id of t[list]) assert.ok(ITEMS.has(id), `${name}: ${list} ${id} is a real item`);
    }
    const all = [...t.favourite, ...t.liked, ...t.disliked];
    assert.equal(new Set(all).size, all.length, `${name}: nothing is both liked and not`);
    assert.ok(t.favourite.length && t.liked.length && t.disliked.length, `${name} has all three lists`);
    for (const k of KINDS) assert.ok(t.says[k]?.t, `${name}: a reaction line for a ${k} present`);
    assert.ok((t.chatter ?? []).length, `${name} has warm lines for a friend`);
  }
  for (const k of KINDS) assert.ok(DEFAULT_TASTES.says[k]?.t, `a villager nobody has written up still reacts to a ${k} present`);
});

test('every reward on a ladder can actually be handed over', () => {
  for (const [name, t] of Object.entries(TASTES)) {
    const seen = new Set();
    for (const r of t.rewards) {
      assert.ok(r.hearts >= 1 && r.hearts <= FRIENDSHIP.hearts, `${name}: ${r.hearts} is a real heart`);
      assert.ok(!seen.has(r.hearts), `${name}: one reward per heart (${r.hearts})`); seen.add(r.hearts);
      if (r.kind === 'items') for (const [id, n] of r.items) assert.ok(ITEMS.has(id) && n > 0, `${name}: gives ${id}`);
      else if (r.kind === 'keepsake') {
        const def = ITEM_DEFINITIONS.find(d => d.id === r.item);
        assert.ok(def, `${name}: keepsake ${r.item} exists`);
        assert.equal(def.props?.keepsake, name, `${name}: the keepsake is marked as theirs, so it is never given away again`);
        assert.deepEqual(def.equip?.stats, {}, `${name}: a keepsake only changes your look, it does not change the balance`);
      } else if (r.kind === 'recipe') {
        const rec = RECIPES.find(x => x.id === r.recipe);
        assert.ok(rec, `${name}: recipe ${r.recipe} exists`);
        assert.ok(rec.discovery, `${name}: ${r.recipe} is a recipe you have to discover, not one everybody knows`);
      } else if (r.kind === 'quest') {
        const q = QUESTS[r.quest];
        assert.ok(q, `${name}: quest ${r.quest} exists`);
        assert.equal(q.giver, name, `${name}: their personal quest is theirs to give`);
        assert.equal(q.hearts, r.hearts, `${name}: ${r.quest} waits for the same heart that unlocks it`);
      } else assert.equal(r.kind, 'discount', `${name}: ${r.kind} is a reward kind the runtime knows`);
    }
  }
});

test('a personal quest is only ever offered by a friend', () => {
  for (const [id, q] of Object.entries(QUESTS)) {
    if (!q.hearts) continue;
    assert.ok(q.hearts >= 1 && q.hearts <= FRIENDSHIP.hearts, `${id}: ${q.hearts} is a real heart`);
    assert.equal(questHearts(q.giver, id), q.hearts, `${id}: ${q.giver}'s ladder unlocks it`);
  }
  assert.equal(questHearts('Pim', 'humStones'), null, 'a quest that is not on their ladder is not theirs to unlock');
});

test('hearts follow the points, and never run past either end', () => {
  assert.equal(heartsFor(0), 0);
  assert.equal(heartsFor(-999), 0, 'points never go negative');
  assert.equal(heartsFor(1e9), FRIENDSHIP.hearts, 'nor past the last heart');
  FRIENDSHIP.thresholds.forEach((p, i) => {
    assert.equal(heartsFor(p), i, `${p} points is ${i} hearts`);
    if (i) assert.equal(heartsFor(p - 1), i - 1, `one point short of ${i} hearts is ${i - 1}`);
  });
  assert.equal(clampPoints(FRIENDSHIP.thresholds.at(-1) + 500), FRIENDSHIP.thresholds.at(-1));
  assert.equal(clampPoints('nonsense'), 0);
  const mid = heartProgress(FRIENDSHIP.thresholds[1]);
  assert.deepEqual([mid.hearts, mid.next, mid.have], [1, 2, 0], 'a fresh heart starts the next one from zero');
  assert.equal(mid.need, FRIENDSHIP.thresholds[2] - FRIENDSHIP.thresholds[1]);
  const top = heartProgress(1e9);
  assert.equal(top.next, null, 'the last heart has nothing left to work towards');
});

test('a present is worth what the villager thinks of it', () => {
  assert.equal(giftKind('Pim', 'sunWheat'), 'favourite');
  assert.equal(giftKind('Pim', 'moonberry'), 'liked');
  assert.equal(giftKind('Pim', 'seaweed'), 'disliked');
  assert.equal(giftKind('Pim', 'wood'), 'neutral');
  assert.equal(giftKind('Tuva', 'firePepper'), 'disliked', 'the snow keeper does not want a pepper');
  assert.equal(giftKind('Cinder', 'firePepper'), 'liked', 'the smith does');
  assert.ok(giftPoints('favourite') > giftPoints('neutral') && giftPoints('disliked') < 0);
  assert.equal(giftPoints('nonsense'), 0);
});

test('a villager nobody has written up takes their world\'s material and forage', () => {
  const planet = PLANETS.find(p => p.material && p.forage?.length) ?? PLANETS[0];
  const t = tastesFor('Nobody In Particular', planet);
  assert.deepEqual(t.favourite, [planet.material], 'their world\'s own material is the favourite');
  assert.ok(t.liked.length && t.liked.every(id => planet.forage.some(f => f.item === id)), 'and what grows there is liked');
  assert.ok(!t.liked.includes(planet.material), 'without repeating the favourite');
  assert.equal(giftKind('Nobody In Particular', planet.material, planet), 'favourite');
  assert.ok(tastesFor('Nobody In Particular', null).favourite.length === 0, 'and off-world they simply have no favourites');
  assert.deepEqual(tastesFor('Pim', planet), TASTES.Pim, 'an authored villager keeps their own tastes everywhere');
});

test('rewards are handed over once, in heart order, as the hearts are crossed', () => {
  const got = rewardsBetween('Pim', 0, FRIENDSHIP.hearts);
  assert.deepEqual(got.map(r => r.hearts), [...got.map(r => r.hearts)].sort((a, b) => a - b), 'in order');
  assert.equal(got.length, TASTES.Pim.rewards.length, 'the whole ladder for a friendship made all at once');
  assert.deepEqual(rewardsBetween('Pim', 2, 3).map(r => r.kind), ['discount'], 'only what the new heart unlocks');
  assert.deepEqual(rewardsBetween('Pim', 3, 3), [], 'standing still unlocks nothing');
  assert.deepEqual(rewardsBetween('Pim', 5, 2), [], 'and hearts never run backwards into a second payout');
  const ladder = rewardLadder('Pim', 3);
  assert.deepEqual(ladder.map(r => r.earned), ladder.map(r => r.hearts <= 3), 'the page marks what has been earned');
});

test('the keeper\'s discount grows with the friendship and then stops', () => {
  assert.equal(shopDiscount(0), 0);
  assert.equal(shopDiscount(1), FRIENDSHIP.shop.perHeart);
  assert.ok(shopDiscount(FRIENDSHIP.hearts) <= FRIENDSHIP.shop.max, 'never past the cap');
  assert.equal(shopDiscount(99), FRIENDSHIP.shop.max);
  assert.equal(shopDiscount(-3), 0);
  assert.ok(FRIENDSHIP.shop.max < 1, 'the shop is never free');
});

test('every villager in the catalog can be befriended, and none shares a name', () => {
  assert.equal(new Set(VILLAGER_NAMES).size, VILLAGER_NAMES.length, 'friendship is kept by name, so names are unique');
  for (const p of PLANET_CATALOG) for (const n of p.npcs?.locals ?? []) assert.ok(isVillager(n.name), `${p.id}: ${n.name}`);
  assert.equal(isVillager('Mirelure'), false, 'a monster is not a villager');
});

test('a saved friendship is cleaned: unknown villagers, impossible totals and unearned rewards are dropped', () => {
  const empty = emptyFriendship(3);
  assert.deepEqual(cleanFriendshipState(null), emptyFriendship(1), 'junk becomes a fresh, valid state');
  assert.deepEqual(cleanFriendshipState(empty), empty, 'a real one round-trips');
  const dirty = cleanFriendshipState({
    day: -4, points: { Pim: 1e9, Ghost: 50, Lio: -20, Fern: 30.7 },
    claimed: { Pim: 99, Fern: 5, Ghost: 2 },
    talked: ['Pim', 'Pim', 'Ghost'], gifts: { Pim: 99, Ghost: 1 }, doorDay: 'soon',
  });
  assert.equal(dirty.points.Pim, FRIENDSHIP.thresholds.at(-1), 'points stop at the last heart');
  assert.ok(!('Ghost' in dirty.points) && !('Ghost' in dirty.claimed) && !('Ghost' in dirty.gifts), 'a villager who does not exist is dropped');
  assert.ok(!('Lio' in dirty.points), 'and so are negative totals');
  assert.equal(dirty.points.Fern, 31);
  assert.equal(dirty.claimed.Pim, FRIENDSHIP.hearts, 'claimed rewards stop at the last heart');
  assert.equal(dirty.claimed.Fern, heartsFor(31), 'and can never be more than the hearts actually earned');
  assert.deepEqual(dirty.talked, ['Pim'], 'the day\'s chats are a set of real villagers');
  assert.equal(dirty.gifts.Pim, FRIENDSHIP.gift.perDay, 'nobody accepts more presents than a day allows');
  assert.deepEqual([dirty.day, dirty.doorDay], [1, 0]);
});
