# Items and the bag

**Definitions vs. state.** `config/items.js` lists what each item *is* (id, name, description, category, icon, stack
size, rarity, value, use effects, tags). `items/ItemRegistry.js` validates them at load: unknown categories or effects
and duplicate ids are reported and skipped. The bag (`inventory/Inventory.js`, `player.inventory`) only stores what you
*have*: slots that are `null` or `{ itemId, quantity, props }`, where `props` holds per-copy data (durability, rolls)
and keeps differing copies from stacking. Reads return copies; every change goes through methods that validate it and
emit `change`, `itemadded`, `itemremoved`, `full` or `itemused`.

**Stacking and capacity.** `add` tops up compatible stacks first, then fills empty slots, one stack at a time, and
returns `{ added, remaining }`. Whatever doesn't fit is reported, never lost. `remove` is all-or-nothing, and emptied
stacks free their slot. `move` merges into a matching stack (any overflow stays behind) or swaps.

**Getting items.** Walk over items lying in the world (each planet's `forage`, or anything dropped). The world item only
shrinks by what the bag accepted, so with a full bag it stays put. Pim hands out buns and tarts, challenge "treats" are
Honey-moss Buns, chests hold loot, monsters sometimes drop something (`gameplay/drops.js`), and each boss's treasure
chest holds its crown and a piece of gear. Gifts that don't fit are set down at your feet.

**Gear and rarity.** Weapons (one hero each), armour and trinkets carry `equip: { slot, hero, tier, stats }`. A dropped
piece rolls its own rarity (`props.rarity`, odds in `GEAR_RARITY`), and `RARITIES[r].statMult` scales its stats, so a
Legendary Ember Ring is more than twice a Common one. Worn gear lives in `player.equipment` (not the bag), and the
hero's stats are always `computeStats()` = base stats, grown to their level, plus gear (`items/gear.js`, with caps per
stat in `STATS`): damage, max HP / mana, regeneration, armour and move speed, plus `setFx`: the bonuses of the sets being
worn (`items/sets.js`, data in `config/sets.js`; only distinct pieces the hero can wear count).

**Crafting.** The bag's Craft tab lists every recipe the hero can use (`config/crafting.js`): Glowcaps, Ember Shards
and Frost Petals become tonics, stews, draughts, Lantern Keys and gear. Crafted gear comes out at a set rarity.

**The hotbar.** The hero's inventory is one list of slots: the first nine are the hotbar along the bottom of the screen,
the rest is the bag (so counts for quests, crafting and keys cover both). Food, tonics and gear land on the hotbar first,
everything else in the bag (`hotbarFirst` in `inventory/Inventory.js`). `1`–`9` hold a slot; pressing the held slot's
number again, or a right click, uses it: food is eaten, gear equipped (whatever was worn takes its slot). Move things
between the bag and its hotbar row in the bag window.

**Using items.** `I` opens the bag. Movement still works, but abilities and talking pause. Click an item to select it,
click another slot to move, merge or swap, and double-click or **Use** / **Equip** to use it. Behaviour comes from
the category (`items/itemActions.js`): consumables are used (effects in `gameplay/itemUse.js`, never wasted when
they'd do nothing), equipment and weapons are worn (click a worn piece to take it off), materials are kept for crafting,
quest items are inspected and can't be dropped. **Drop** sets a stack on the ground.

**Extending it.** A new item = an entry in `ITEM_DEFINITIONS`. A new effect = a key in `ITEM_EFFECTS` plus a handler in
`itemUse.js`. A new item source calls `spawnWorldItem` or `grantItem` (or rolls a loot table: `gameplay/loot.js`).
A new picture = a drawing in `ui/itemArt.js` and a model in `models/items.js` under a new `ITEM_ART_KINDS` entry.
A new gear stat = an entry in `STATS` plus where it's read (like `damageBonus` in `combat/damage.js`). Save / load can use `inventory.toJSON()` and
`inventory.load()`. The bag is kept across planets, fainting and Continue, and emptied on a new adventure.
