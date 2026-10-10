/* CHESTS: treasure out in the wilds (data: config/chests.js, placement per planet: PLANETS[i].chests).
     spawnFor(planet)  places a planet's chests (same spots every visit: their own seeded stream), already-opened
                       ones stay open: `opened` remembers them for the whole adventure
     spawnBossChest    the chest that falls where a boss is beaten (holds the trophy); PlanetProgression waits for
                       it to be opened before the journey goes on
     target()          the "E Open ..." prompt for the nearest closed chest (src/gameplay/Houses.js currentInteraction)
     key drops         Lantern Keys for locked chests drop from monsters while one waits (config KEYS)
   Loot is rolled by ./loot.js; coins go straight to the wallet, items hop out onto the ground around the chest. */
import { CHEST_KINDS, CHEST_REACH, KEYS, LOOT } from '../config/chests.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { encounterEvents } from '../combat/events.js';
import { Chest } from '../entities/Chest.js';
import { freeOfColliders } from '../physics/colliders.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { mr, mulberry32, rng } from '../utils/random.js';
import { arcDist, offsetDir, randomDir, tangentFrame, tangentToward } from '../utils/sphere.js';
import { spawnSpot } from '../world/placement.js';
import { ponds, slopeAt } from '../world/terrain.js';
import { SPAWN_DIR } from '../world/World.js';
import { lootName, rollLoot } from './loot.js';
import { grantItem, spawnWorldItem } from './pickups.js';
import { gainCoins } from './wallet.js';
import { RecipeBook } from './RecipeBook.js';

const MIN_APART = 8;          // chests keep at least this far (arc) from each other

export const Chests = {
  list: [],
  opened: new Set(),          // `${p.id}:${n}` / `${planet}:boss`, for the whole adventure
  bossChest: null,
  sinceKey: 0,                // kills since the last key drop (pity counter)

  toJSON() {
    return { opened: [...this.opened].filter(id => id.startsWith(`${ctx.planetId}:`)), sinceKey: this.sinceKey,
      list: this.list.map(c => ({ id: c.id, kind: c.kind, dir: c.up.toArray(), fwd: c.fwd.toArray() })) };
  },
  load(data) {
    this.clear(); this.sinceKey = data.sinceKey;
    for (const id of [...this.opened]) if (id.startsWith(`${ctx.planetId}:`)) this.opened.delete(id);
    for (const id of data.opened) if (id.startsWith(`${ctx.planetId}:`)) this.opened.add(id);
    for (const saved of data.list) {
      if (!saved.id.startsWith(`${ctx.planetId}:`)) continue;
      const chest = new Chest(saved.kind, ctx.player.up.clone().fromArray(saved.dir), ctx.player.up.clone().fromArray(saved.fwd), { id: saved.id, opened: this.opened.has(saved.id) });
      this.list.push(chest); if (saved.kind === 'boss') this.bossChest = chest;
    }
  },

  /** Places PLANETS[planet].chests (call right after the planet and its boss are spawned). lair = the boss's home. */
  spawnFor(planet, lair = null) {
    this.clear();
    const p = PLANETS[planet], rng = mulberry32((p.seed ^ 0x5eed1e) >>> 0);
    let n = 0;
    for (const { kind, count } of p.chests ?? []) {
      const def = CHEST_KINDS[kind];
      for (let i = 0; i < count; i++, n++) {
        const dir = this.findSpot(def, rng, lair); if (!dir) continue;
        const id = `${p.id}:${n}`, fwd = tangentFrame(dir)[0].applyAxisAngle(dir, rng() * Math.PI * 2);
        this.list.push(new Chest(kind, dir, fwd, { id, opened: this.opened.has(id) }));
      }
    }
  },
  findSpot(def, rng, lair) {
    for (let i = 0; i < 300; i++) {
      const d = randomDir(rng), relax = i > 200 ? 0.6 : 1;                // after many tries, accept a little closer
      if (arcDist(d, SPAWN_DIR) < def.minFromVillage * relax) continue;
      if (lair && arcDist(d, lair) < def.minFromLair * relax) continue;
      if (!freeOfColliders(d, 1.3) || ponds.some(p => arcDist(d, p.dir) < p.r + 1.5) || slopeAt(d) > 0.5) continue;
      if (this.list.some(c => arcDist(d, c.up) < MIN_APART * relax)) continue;
      return d;
    }
    return null;
  },

  /** A boss has fallen at `dir`: its treasure chest drops in. */
  spawnBossChest(dir) {
    const id = `${ctx.planetId}:boss`; if (this.opened.has(id)) return null;
    const at = spawnSpot(dir, 0, 2.5, 1.1), fwd = tangentToward(at, ctx.player.up);
    this.bossChest = new Chest('boss', at, fwd, { id, fall: true });
    this.list.push(this.bossChest);
    return this.bossChest;
  },

  /** Removes every chest (the planet is being replaced). The opened set stays. */
  clear() { for (const c of this.list) c.dispose(); this.list.length = 0; this.bossChest = null; },
  /** A fresh adventure: every chest full again. */
  resetRun() { this.opened.clear(); this.sinceKey = 0; },

  hasKey() { return ctx.player.inventory.count(KEYS.item) > 0; },
  /** A locked chest on this planet is still waiting to be opened. */
  lockedWaiting() { return this.list.some(c => c.def.locked && !c.opened); },

  // ---------------------------------------------------------------- what E does
  target() {
    const P = ctx.player; let best = null, bd = CHEST_REACH;
    for (const c of this.list) { if (c.opened || c.landing) continue; const d = arcDist(P.up, c.up); if (d < bd) { bd = d; best = c; } }
    if (!best) return null;
    const c = best, name = c.def.name;
    const label = !c.def.locked ? `Open the ${name}`
      : this.hasKey() ? `Unlock the ${name} <span class="ctag">(Lantern Key)</span>` : `${name} <span class="ctag">(locked)</span>`;
    return { dist: bd, label, at: c.top(0.9), run: () => this.open(c) };
  },

  open(c) {
    if (c.opened || c.landing) return;
    if (c.def.locked) {
      if (!this.hasKey()) { c.rattle(); toast('Locked tight. A Lantern Key would open it: monsters sometimes carry one.'); return; }
      ctx.player.inventory.remove(KEYS.item, 1); audio.unlock(); toast('The Lantern Key turns with a click!');
    }
    c.open(); this.opened.add(c.id); emit('chestopened', { kind: c.kind, planet: ctx.planet });
    const loot = rollLoot(c.def.loot, ctx.planet, rng, ctx.player.charId), names = [];
    const scroll = RecipeBook.scrollFor(ctx.planetId); if (scroll) loot.items.push({ item: scroll, qty: 1, props: null });
    if (loot.coins) { gainCoins(loot.coins, c.top(0.6)); names.push(`${loot.coins} coins`); }
    loot.items.forEach(({ item, qty, props }, i) => {
      const heading = (i / Math.max(1, loot.items.length)) * Math.PI * 2 + mr(-0.4, 0.4);
      const to = spawnSpot(offsetDir(c.up, heading, mr(...LOOT.popDistance)), 0, 0.4, 0.3);
      const w = spawnWorldItem(item, qty, to, { from: c.up, popTime: LOOT.popTime + i * 0.08, stepAway: false, props });
      if (w && c === this.bossChest) w.bossLoot = true;
      names.push(lootName(item, qty, props));
    });
    toast(`${c.def.name}: ${names.join(', ') || 'empty... just dust and a moth'}`);
  },

  /** Leaving the planet: whatever the boss chest gave that's still on the ground goes into the bag (never lose a trophy). */
  collectBossLoot() {
    for (let i = ctx.worldItems.length - 1; i >= 0; i--) {
      const w = ctx.worldItems[i]; if (!w.bossLoot) continue;
      grantItem(w.itemId, w.quantity, w.props); w.dispose(); ctx.worldItems.splice(i, 1);
    }
  },

  // ---------------------------------------------------------------- keys from monsters
  onEnemyDefeated(e) {
    if (e.owner || e === ctx.boss || !this.lockedWaiting() || this.hasKey()) return;
    if (ctx.worldItems.some(w => w.itemId === KEYS.item)) return;          // one's already lying around
    if (++this.sinceKey < KEYS.pity && rng() >= KEYS.dropChance) return;
    this.sinceKey = 0;
    spawnWorldItem(KEYS.item, 1, spawnSpot(e.up, 0.6, 1.4, 0.3), { from: e.up, popTime: 0.5, stepAway: false });
    toast(`The ${e.def.name?.split(",")[0] ?? e.type} dropped a Lantern Key!`); audio.sparkle();
  },

  update(dt) { for (const c of this.list) c.update(dt); },
};

encounterEvents.addEventListener('enemydefeated', ev => Chests.onEnemyDefeated(ev.detail.enemy));
