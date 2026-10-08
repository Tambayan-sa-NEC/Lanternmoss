/* THE SHOP (config/shop.js): talk to the shopkeeper during opening hours and pick "Browse the shop".
   Buy tab: the stock with prices; Sell tab: what's in your bag with what it fetches (quest items can't be sold).
   Abilities and talking pause while it's open (like the bag); walking away, nightfall or Esc closes it. */
import { SHOP } from '../config/shop.js';
import { ctx } from '../core/context.js';
import { dayClock } from '../gameplay/dayClock.js';
import { buyPrice, gainCoins, sellPrice, spendCoins } from '../gameplay/wallet.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { audio } from '../systems/AudioSystem.js';
import { dom } from './dom.js';
import { InventoryUI } from './InventoryUI.js';
import { itemIconHtml } from './itemTooltip.js';

export const isShopOpenNow = () => SHOP.openPhases.includes(dayClock.phase);

/** Dialog line: the shopkeeper greets you with the choice to browse (or says the shop is closed), or null for
    anyone else. chat(npc) supplies what "Just chatting" leads to (their offers or ordinary chatter). */
export function shopLineFor(npc, chat = n => n.nextLine()) {
  if (npc.name !== SHOP.keeper) return null;
  if (!isShopOpenNow()) return { t: SHOP.text.closed, e: 'sleepy' };
  return { t: SHOP.text.greet, e: 'happy', choice: { yes: SHOP.text.browse, no: SHOP.text.chat,
    onYes: () => { ShopUI.open(npc); return null; }, onNo: () => chat(npc) } };
}

export const ShopUI = {
  isOpen: false, tab: 'buy', npc: null, msg: '',
  init() { dom.shop.addEventListener('click', e => this.onClick(e)); },
  open(npc) { this.isOpen = true; this.npc = npc; this.tab = 'buy'; this.msg = ''; ctx.inventoryOpen = true; dom.shop.style.display = 'flex'; this.render(); },
  close() { if (!this.isOpen) return; this.isOpen = false; ctx.inventoryOpen = InventoryUI.isOpen; dom.shop.style.display = 'none'; },
  /** Closes when the hero walks off or the shop shuts for the night. */
  update() { if (this.isOpen && (ctx.player.pos.distanceTo(this.npc.pos) > 7 || !isShopOpenNow() || ctx.player.dead)) this.close(); },
  render() {
    const P = ctx.player, bag = P.inventory, coin = n => `<span class="coin">✦ ${n}</span>`;
    let rows;
    if (this.tab === 'buy') rows = SHOP.stock.map(s => {
      const def = itemRegistry.get(s.item), price = buyPrice(s), can = P.coins >= price && bag.spaceFor(s.item) > 0;
      return `<div class="srow"><span class="si">${itemIconHtml(def)}</span><span class="sn"><b>${def.name}</b><small>${def.description}</small></span>` +
        `${coin(price)}<button type="button" data-buy="${s.item}" class="${can ? 'primary' : ''}"${can ? '' : ' disabled'}>Buy</button></div>`;
    }).join('');
    else {
      const owned = [...new Set(bag.getSlots().filter(Boolean).map(s => s.itemId))];
      rows = owned.map(id => {
        const def = itemRegistry.get(id), price = sellPrice(id), n = bag.count(id);
        return `<div class="srow"><span class="si">${itemIconHtml(def)}</span><span class="sn"><b>${def.name} <small class="qty">x${n}</small></b>` +
          `<small>${price ? `${price} ✦ each` : "Can't be sold"}</small></span>` +
          (price ? `<button type="button" data-sell="${id}">Sell 1</button><button type="button" data-sellall="${id}">All (${price * n})</button>` : '') + '</div>';
      }).join('') || '<p class="empty">Your bag is empty.</p>';
    }
    dom.shop.innerHTML = `<div class="panel shop"><h2>${SHOP.name}</h2>
      <div class="sub">You have ${coin(P.coins)} coins${this.msg ? ` · <span class="msg">${this.msg}</span>` : ''}</div>
      <div class="tabs"><button type="button" data-tab="buy" class="${this.tab === 'buy' ? 'on' : ''}">Buy</button><button type="button" data-tab="sell" class="${this.tab === 'sell' ? 'on' : ''}">Sell</button></div>
      <div class="scroll">${rows}</div>
      <div class="menu"><button type="button" class="primary" data-close>Done</button></div><div class="foot"><kbd>Esc</kbd> close</div></div>`;
  },
  onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const P = ctx.player, bag = P.inventory, d = b.dataset;
    if ('close' in d) { this.close(); return; }
    if (d.tab) { this.tab = d.tab; this.msg = ''; }
    else if (d.buy) {
      const s = SHOP.stock.find(x => x.item === d.buy), price = buyPrice(s), name = itemRegistry.get(d.buy).name;
      if (bag.spaceFor(d.buy) < 1) this.msg = 'Your bag is full!';
      else if (!spendCoins(price)) { this.msg = 'Not enough coins.'; audio.fizzle(); }
      else { bag.add(d.buy, 1); this.msg = `Bought ${name}!`; audio.coin(); }
    } else if (d.sell || d.sellall) {
      const id = d.sell || d.sellall, n = d.sellall ? bag.count(id) : 1, price = sellPrice(id);
      if (price && bag.remove(id, n)) { gainCoins(price * n); this.msg = `Sold ${n} ${itemRegistry.get(id).name}.`; }
    }
    this.render();
  },
};
