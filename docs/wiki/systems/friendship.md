# Villager friendship (TODO 33)

The villagers become friends you care about, not only quest givers and a shop. Rules: `src/config/friendship.js`
(the numbers and every villager's tastes) and `src/gameplay/friendshipRules.js` (pure heart math). Runtime:
`src/gameplay/Friendship.js`. Screen: the journal's **Friends** tab (`src/ui/JournalUI.js`).

## Earning hearts

Each villager has a point total that maps onto five hearts (`FRIENDSHIP.thresholds`). Points come from:
- **Talking.** The first conversation of each day is worth `FRIENDSHIP.talk.points`; talking again the same day is free.
- **Gifts.** Hold an item and talk to a villager: if it is giftable (no quest items, no keepsakes), the dialogue
  offers to give it. A favourite, liked, neutral or disliked item is worth a different amount
  (`FRIENDSHIP.gift.points`), with its own reaction line, portrait expression and emote. One gift a day per villager.
- **Quests.** Finishing a quest for its giver is worth more than any present (`FRIENDSHIP.quest.points`), handled by
  the `questcomplete` event.

## Tastes and rewards

`TASTES` in `src/config/friendship.js` lists each traveller and released world's local: their favourite, liked and
disliked items, a reaction line and emote for each, warm chatter lines unlocked at the first heart, and a reward
ladder. A villager with no entry (a new world's local before anyone has written their tastes) still makes friends:
`DEFAULT_TASTES` gives them their planet's material and food and plain reactions, so a local arriving with a new
world works before its tastes are authored.

Each reward ladder rung fires once, at its heart:
- `items` — handed straight to the bag.
- `recipe` — a second way to discover an advanced recipe, beside the book, scroll and bestiary (`RecipeBook.discover`).
- `discount` — the keeper's shop takes `FRIENDSHIP.shop.perHeart` off every price per heart, capped at `.max`
  (`src/gameplay/wallet.js`).
- `keepsake` — a vanity piece made just for that friend; keepsakes can never be given away or sold.
- `quest` — unlocks a personal quest only a real friend is asked (`Friendship.questUnlocked`, checked in
  `src/gameplay/quests/Quests.js`).

## How friends behave

- **Greeting and waving.** From `FRIENDSHIP.greetFrom` hearts, a friend's opening line uses your name and mixes in
  their chatter instead of their ordinary line. From `FRIENDSHIP.waveFrom` hearts, they wave and emote when they spot
  you across the square (`FRIENDSHIP.wave`: near/far band, a cooldown per friend).
- **Door gifts.** From `FRIENDSHIP.door.from` hearts, a new day has a chance (`FRIENDSHIP.door.chance`) that a friend
  leaves one of their favourite or liked items at your cottage door.
- **The talk prompt.** `Houses.currentInteraction()` appends a villager's current hearts to the "Talk to" prompt
  (`Friendship.tagFor`), so a stranger's prompt carries no hearts.

## The Friends page

The journal's Friends tab (`JournalUI.friendsHtml`) lists every villager with any points, friendliest first: their
hearts, progress to the next, the tastes you have learned so far (tastes reveal as hearts rise, so a stranger's
dislikes stay unknown), and their full reward ladder with rewards already earned marked.

## Saving

Friendship is saved with the adventure (`SAVE_SYSTEMS.friendship` in `src/core/save.js`): points per villager, which
rewards were claimed, and the day's talking, gifts and door presents. A new adventure starts with every villager a
stranger (`src/core/AdventureSave.js`).

## Checks

`tests/friendship.test.mjs` covers the pure heart and reward math. `tests/sim/friendship.sim.mjs` drives the runtime:
talking, gifting, quest completion, the reward ladder, recipe discovery, greeting/waving, door gifts, and saving
across a Continue. `scripts/friendship-smoke.mjs` is the real-browser check: a real `E` to talk, a held item offered
and handed over with a real click, hearts on the talk prompt, the Friends tab at 720p/1080p, and a full reload and
Continue — zero page or shader errors. It retakes `npcs/friendship-gift.jpg` and `huds/friends-page.jpg`.
