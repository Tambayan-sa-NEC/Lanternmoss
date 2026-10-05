/* COINS AND THE SHOP. Coins (✦) come from defeating monsters, challenge rewards and quests, and are spent at the
   shopkeeper's (runtime: src/gameplay/wallet.js, src/ui/ShopUI.js). Prices come from each item's `value`
   (config/items.js) unless a stock entry names its own. Quest items (value 0) can't be sold. */

export const COINS = {
  perXp: 0.25,                  // coins for a defeated monster = its xp x this (rounded, at least 1); boss summons give none
};

export const SHOP = {
  keeper: 'Pim',                // the villager who runs it (npcDefs.js)
  name: "Pim's Bakery",
  openPhases: ['morning', 'noon', 'evening'],   // closed at night (config/day.js)
  buyMarkup: 1.5,               // buying price = value x this
  sellRate: 0.5,                // selling price = value x this (at least 1)
  stock: [
    { item: 'honeyBun' }, { item: 'moonberryTart' }, { item: 'moonberry' },
    { item: 'featherCharm' }, { item: 'moonHopCharm' },
  ],
  text: {
    greet: 'Welcome to the bakery, {hero}! Fresh buns, tarts and a charm or two. Want a look?',
    closed: "Mmh... the bakery's closed for the night. Come back in the morning, I'll have buns...",
    browse: 'Browse the shop', chat: 'Just chatting',
  },
};
