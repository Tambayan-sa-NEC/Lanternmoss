/* Versioned adventure saves. Pure cleaning and the registry have no browser or rendering dependency.
   Device preferences and the lifetime journal remain outside the adventure. */
import { CHARACTERS } from '../config/characters.js';
import { PLANETS } from '../config/planets.js';
import { LEVELING } from '../config/leveling.js';
import { EQUIP_SLOTS, HOTBAR, INVENTORY, RARITIES } from '../config/items.js';
import { PETS, PET_COMMANDS, PET_CARE } from '../config/pets.js';
import { QUESTS } from '../config/quests.js';
import { CHALLENGES } from '../config/challenges.js';
import { CROPS, FARM, NODE_KINDS, SCENERY } from '../config/resources.js';
import { NEEDS } from '../config/survival.js';
import { DAY } from '../config/day.js';
import { HOUSES } from '../config/houses.js';
import { COMBAT } from '../config/combat.js';
import { TUTORIAL_STEPS, HELP_TOPICS, GATHERING_TIPS } from '../config/tutorial.js';
import { CRITTER_DEFS } from '../config/critters.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { equipProblem } from '../items/gear.js';
import { RECIPES } from '../config/crafting.js';
import { RUNES } from '../config/magic.js';
import { xpToNext } from '../progression/leveling.js';

export const SAVE_KEY = 'lanternmoss.adventure';
export const SAVE_VERSION = 1;
export const SAVE_SLOT = 0;
export const AUTOSAVE_SECONDS = 120;
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const byteLength = text => new TextEncoder().encode(text).byteLength;

// Explicit ownership: additions to stateful gameplay modules must be classified by the coverage test.
export const SAVE_SYSTEMS = {
  player: 'adventure', inventory: 'adventure', equipment: 'adventure', hotbar: 'adventure',
  pets: 'adventure', quests: 'adventure', challenges: 'adventure', story: 'adventure',
  dayClock: 'adventure', buffs: 'adventure', houses: 'adventure', rareGifts: 'adventure',
  progression: 'adventure', combat: 'adventure', tutorial: 'adventure', crafting: 'adventure',
  farm: 'planet', gathering: 'planet', chests: 'planet', bossGate: 'planet', pickups: 'planet',
};
export const TRANSIENT_SYSTEMS = {
  'gameplay/Fishing.js': 'An unfinished cast is cancelled; fish are awarded only when reeled in.',
  'gameplay/Stations.js': 'Station models and proximity are rebuilt from the planet.',
  'gameplay/petAbilities.js': 'Visual scouting/fetch targets are transient; lasting buffs and cooldowns are saved.',
};
// The coverage test scans gameplay exports; every new state owner needs an explicit classification.
export const SAVE_OWNERS = {
  'entities/player/Player.js:Player': 'player', 'inventory/Inventory.js:Inventory': 'inventory',
  'entities/npc/NPC.js:NPC': 'story', 'entities/wildlife/wildlife.js:RareGifts': 'rareGifts',
  'combat/casting.js:CombatState': 'combat', 'combat/casting.js:spellState': 'combat',
  'gameplay/equipment.js:Equipment': 'equipment', 'gameplay/hotbar.js:Hotbar': 'hotbar',
  'gameplay/Pets.js:Pets': 'pets', 'gameplay/quests/Quests.js:Quests': 'quests',
  'gameplay/challenges/Challenges.js:Challenges': 'challenges', 'gameplay/challenges/kinds.js:CHALLENGE_KINDS': 'challenges',
  'gameplay/storyState.js:StoryMemory': 'story', 'gameplay/dayClock.js:dayClock': 'dayClock',
  'gameplay/buffs.js:buffs': 'buffs', 'gameplay/buffs.js:BuffState': 'buffs', 'gameplay/Needs.js:Needs': 'buffs',
  'gameplay/Houses.js:Houses': 'houses', 'gameplay/PlanetProgression.js:PlanetProgression': 'progression',
  'gameplay/Farm.js:Farm': 'farm', 'gameplay/Gathering.js:Gathering': 'gathering',
  'gameplay/Chests.js:Chests': 'chests', 'gameplay/BossGate.js:BossGate': 'bossGate', 'gameplay/pickups.js:Pickups': 'pickups',
  'gameplay/Tutorial.js:Tutorial': 'tutorial',
  'gameplay/RecipeBook.js:RecipeBook': 'crafting',
};
export const DEVICE_SYSTEMS = { 'gameplay/Journal.js:Journal': 'Lifetime journal, saved independently on this device.' };
export const STATELESS_EXPORTS = new Set(['BUFF_NAMES', 'REWARDS', 'TOOL_USES', 'ACTION_HANDLERS', 'PET_ABILITIES']);

export const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
export const number = (v, fallback = 0, min = 0, max = 1e9) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
export const integer = (v, fallback = 0, min = 0, max = 1e9) => Math.floor(number(v, fallback, min, max));
const list = (v, max = 1024) => Array.isArray(v) ? v.slice(0, max) : [];
const choice = (v, values, fallback) => values.includes(v) ? v : fallback;
const known = (v, table, fallback = null) => typeof v === 'string' && Object.hasOwn(table, v) ? v : fallback;
const bool = v => v === true;
const clone = v => JSON.parse(JSON.stringify(v));
const ids = new Set(PLANETS.map(p => p.id));
const buffKeys = ['moon', 'feather', 'howl', 'might', 'ward', 'swift', 'mend'];
export function direction(v) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e6)) return null;
  const length = Math.hypot(...v); return length > 1e-8 ? v.map(n => n / length) : null;
}
export function cleanProps(v, def = null) {
  const p = record(v), out = {};
  if (Object.hasOwn(RARITIES, p.rarity)) out.rarity = p.rarity;
  if (def?.equip && !def.equip.vanity && Object.hasOwn(RUNES, p.enchantment)) out.enchantment = p.enchantment;
  return Object.keys(out).length ? out : null;
}
export function cleanStack(v) {
  const s = record(v), def = itemRegistry.get(s.itemId);
  if (!def || !integer(s.quantity)) return null;
  return { itemId: def.id, quantity: integer(s.quantity, 0, 0, def.maxStack), props: cleanProps(s.props, def) };
}
const stringIds = (v, allowed) => [...new Set(list(v).filter(id => allowed(id)))];
const chestId = id => typeof id === 'string' && PLANETS.some(p => {
  const prefix = `${p.id}:`; if (!id.startsWith(prefix)) return false;
  const suffix = id.slice(prefix.length);
  return suffix === 'boss' || /^\d+$/.test(suffix) && +suffix < p.chests.reduce((n, c) => n + c.count, 0);
});
const houseId = id => typeof id === 'string' && PLANETS.some(p => id.startsWith(`${p.id}:`) &&
  /^\d+$/.test(id.slice(p.id.length + 1)) && +id.slice(p.id.length + 1) < HOUSES.length);
const numericMap = (v, allow, max = 1e9, min = 0) => Object.fromEntries(Object.entries(record(v)).slice(0, 1024)
  .filter(([key]) => allow(key)).map(([key, n]) => [key, number(n, 0, min, max)]));

/** Clean one system's plain snapshot before any runtime object sees it. */
export function cleanState(key, value, hero = 'witch') {
  const s = record(value);
  switch (key) {
    case 'crafting': {
      const learned = stringIds(s.learned, id => RECIPES.some(r => r.id === id && r.discovery));
      return { learned, favourites: stringIds(s.favourites, id => RECIPES.some(r => r.id === id && (!r.discovery || learned.includes(id)))) };
    }
    case 'tutorial': {
      const recap = record(s.recap);
      return { status: choice(s.status, ['idle', 'active', 'skipped', 'complete'], 'skipped'),
        done: stringIds(s.done, id => TUTORIAL_STEPS.some(step => step.id === id)),
        seen: stringIds(s.seen, id => HELP_TOPICS.some(t => t.id === id) || Object.hasOwn(GATHERING_TIPS, id)),
        moved: number(s.moved, 0, 0, 3), lifeStartedAt: number(s.lifeStartedAt),
        recap: s.recap ? { source: typeof recap.source === 'string' ? recap.source.slice(0, 120) : 'An unknown hazard',
          amount: integer(recap.amount), duration: number(recap.duration) } : null,
        remaining: number(s.remaining, 0, 0, COMBAT.player.respawnTime) };
    }
    case 'player': {
      const charId = known(s.charId, CHARACTERS, 'witch'), level = integer(s.level, 1, 1, LEVELING.maxLevel);
      return { charId, level, xp: integer(s.xp, 0, 0, Math.max(0, xpToNext(level) - 1)), coins: integer(s.coins),
        hp: number(s.hp, CHARACTERS[charId].stats.maxHp), mana: number(s.mana, CHARACTERS[charId].stats.maxMana),
        time: number(s.time), up: direction(s.up), fwd: direction(s.fwd),
        lastHurt: number(s.lastHurt, -99, -99),
        indoors: Number.isInteger(s.indoors) && HOUSES[s.indoors] ? s.indoors : null,
        roomX: number(s.roomX, 0, -50, 50), roomZ: number(s.roomZ, 0, -50, 50) };
    }
    case 'inventory': return Array.from({ length: HOTBAR.size + INVENTORY.slots }, (_, i) => cleanStack(list(value)[i]));
    case 'equipment': return Object.fromEntries(Object.keys(EQUIP_SLOTS).map(slot => {
      const w = record(s[slot]), def = itemRegistry.get(w.itemId);
      return [slot, def?.equip?.slot === EQUIP_SLOTS[slot].fits && !equipProblem(def, hero) ? { itemId: def.id, props: cleanProps(w.props, def) } : null];
    }));
    case 'hotbar': return { selected: integer(s.selected, 0, 0, HOTBAR.size - 1), cd: number(s.cd, 0, 0, 3) };
    case 'pets': {
      const unlocked = stringIds(value?.unlocked, id => Object.hasOwn(PETS, id));
      for (const [id, pet] of Object.entries(PETS)) if (!pet.unlock && !unlocked.includes(id)) unlocked.push(id);
      const active = unlocked.includes(s.active) ? s.active : CHARACTERS[hero].companion;
      return { unlocked, active, names: Object.fromEntries(Object.entries(record(s.names)).filter(([id, name]) => Object.hasOwn(PETS, id) && typeof name === 'string')
        .map(([id, name]) => [id, name.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, PET_CARE.nameLength)])),
        mode: known(s.mode, PET_COMMANDS, 'follow'), stayDir: direction(s.stayDir), hp: number(s.hp, PETS[active].hp),
        faintT: number(s.faintT, 0, 0, PET_CARE.faintTime), hurtAt: number(s.hurtAt, -99, -99),
        abilityCd: number(s.abilityCd, 0, 0, PETS[active].ability.cooldown), petCool: number(s.petCool, 0, 0, 2), swapCool: number(s.swapCool, 0, 0, 60),
        mend: s.mend ? { left: number(s.mend.left, 0, 0, 120), perSec: number(s.mend.perSec, 0, 0, 100) } : null };
    }
    case 'dayClock': return { t: number(s.t, DAY.startAt * DAY.length, 0, DAY.length - 1e-6), day: integer(s.day, 1, 1) };
    case 'buffs': return { timers: Object.fromEntries(buffKeys.map(k => [k, number(record(s.timers)[k], 0, 0, 3600)])),
      meal: ['might', 'ward', 'swift', 'mend'].includes(s.meal?.kind) && number(s.meal.seconds) > 0 ? { kind: s.meal.kind, seconds: number(s.meal.seconds, 0, 0, 3600) } : null,
      energy: number(s.energy, NEEDS.start, 0, NEEDS.max) };
    case 'quests': {
      const state = Object.fromEntries(Object.entries(record(s.state)).filter(([id]) => Object.hasOwn(QUESTS, id)).map(([id, raw]) => {
        const q = record(raw), status = choice(q.status, ['new', 'active', 'done', 'dropped'], 'new');
        return [id, { status, step: integer(q.step, 0, 0, QUESTS[id].steps.length - (status === 'done' ? 0 : 1)), n: integer(q.n), readyAt: number(q.readyAt) }];
      }));
      return { state, tracked: state[s.tracked]?.status === 'active' ? s.tracked : null };
    }
    case 'challenges': {
      const progress = Object.fromEntries(Object.entries(record(s.progress)).filter(([id]) => Object.hasOwn(CHALLENGES, id)).map(([id, raw]) => {
        const p = record(raw); return [id, { attempts: integer(p.attempts), wins: integer(p.wins), losses: integer(p.losses),
          best: p.best == null ? null : number(p.best), last: choice(p.last, ['success', 'timeout', 'left', 'fainted', 'abandoned'], null),
          readyAt: number(p.readyAt), reaction: choice(p.reaction, ['success', 'timeout', 'left', 'fainted', 'abandoned'], null) }];
      }));
      const r = record(s.run), def = CHALLENGES[r.id]; let run = null;
      if (def && direction(r.anchor)) run = { id: r.id, anchor: direction(r.anchor), t: number(r.t, -1.5, -1.5, def.timeLimit),
        items: list(r.items, def.params.count ?? 64).map(it => ({ dir: direction(it?.dir), got: bool(it?.got) })).filter(it => it.dir),
        idx: integer(r.idx, 0, 0, def.params.count ?? 0),
        foes: list(r.foes, 64).map(it => ({ type: known(it?.type, COMBAT.enemies), dir: direction(it?.dir), hp: number(it?.hp, 1), alive: bool(it?.alive) })).filter(it => it.type && it.dir) };
      if (run && (def.kind === 'defeat' ? !run.foes.length : !run.items.length)) run = null;
      if (run && def.kind === 'race') run.idx = Math.min(run.idx, run.items.length);
      return { progress, run };
    }
    case 'story': return Object.fromEntries(Object.entries(s).filter(([name]) => ['Old Bramble', 'Pim', 'Lio', 'Fern', 'Cinder', 'Tuva'].includes(name))
      .map(([name, raw]) => [name, { seen: stringIds(raw?.seen, n => Number.isInteger(n) && n >= 0 && n < 1000), last: integer(raw?.last, -1, -1, 999) }]));
    case 'houses': return { opened: stringIds(s.opened, houseId), lore: numericMap(s.lore, houseId, 100, -1), ovenDay: numericMap(s.ovenDay, houseId), teaAt: number(s.teaAt, -99, -99) };
    case 'rareGifts': return stringIds(value, id => Object.values(CRITTER_DEFS).some(c => c.rare?.gift === id));
    case 'progression': return { defeated: stringIds(s.defeated, id => ids.has(id)), introShown: bool(s.introShown),
      lairs: Object.fromEntries(Object.entries(record(s.lairs)).filter(([id, v]) => ids.has(id) && direction(v)).map(([id, v]) => [id, direction(v)])) };
    case 'combat': return Object.fromEntries(Object.keys(CHARACTERS[hero].abilities).map(id => [id, number(s[id], 0, 0, 3600)]));
    case 'farm': return { day: integer(s.day, 1, 1), plots: Array.from({ length: FARM.grid[0] * FARM.grid[1] }, (_, i) => {
      const p = record(list(s.plots)[i]), crop = known(p.crop, CROPS);
      return { tilled: bool(p.tilled) || !!crop, crop, growth: crop ? number(p.growth, 0, 0, 1) : 0, watered: bool(p.watered) };
    }) };
    case 'gathering': return {
      nodes: list(s.nodes, 1024).map(n => ({ id: typeof n?.id === 'string' ? n.id.slice(0, 120) : '', kind: known(n?.kind, NODE_KINDS), dir: direction(n?.dir),
        regrowT: number(n?.regrowT, 0, 0, NODE_KINDS[n?.kind]?.regrow ?? 600) })).filter(n => n.kind && n.dir && n.id),
      rest: numericMap(s.rest, key => /^(tree|rock):\d+$/.test(key), Math.max(...Object.values(SCENERY).map(c => c.rest))),
      tipsShown: stringIds(s.tipsShown, k => ['wood', 'stone', 'seed', 'copperOre'].includes(k)) };
    case 'chests': return { opened: stringIds(s.opened, chestId), sinceKey: integer(s.sinceKey, 0, 0, 100),
      list: list(s.list, 128).map(c => ({ id: c?.id, kind: choice(c?.kind, ['common', 'rare', 'boss'], null), dir: direction(c?.dir), fwd: direction(c?.fwd) }))
        .filter(c => chestId(c.id) && c.kind && c.dir && c.fwd) };
    case 'bossGate': return { awake: bool(s.awake), beaten: bool(s.beaten), broken: stringIds(s.broken, n => Number.isInteger(n) && n >= 0 && n < 10),
      hinted: stringIds(s.hinted, name => typeof name === 'string' && name.length < 80), praised: stringIds(s.praised, name => typeof name === 'string' && name.length < 80) };
    case 'pickups': return list(value, 4096).map(w => {
      const stack = cleanStack(w); return stack && direction(w.up) ? { ...stack, up: direction(w.up), bossLoot: bool(w.bossLoot),
        delay: number(w.delay, 0, 0, 5), stepAway: bool(w.stepAway), armed: bool(w.armed) } : null;
    }).filter(Boolean);
    default: throw new Error(`Unregistered save cleaner: ${key}`);
  }
}

/** Reject foreign/future files; clean known snapshots without changing the source object. */
export function sanitizeSave(data) {
  const s = record(data);
  if (s.game !== 'lanternmoss' || s.version !== SAVE_VERSION || !Object.hasOwn(record(s.systems), 'player')) return null;
  const player = cleanState('player', s.systems.player), systems = {}, planets = {};
  for (const [key, scope] of Object.entries(SAVE_SYSTEMS)) if (scope === 'adventure') systems[key] = cleanState(key, s.systems[key], player.charId);
  for (const [id, raw] of Object.entries(record(s.planets))) {
    if (!ids.has(id)) continue;
    const state = {}; for (const [key, scope] of Object.entries(SAVE_SYSTEMS)) if (scope === 'planet' && Object.hasOwn(record(raw), key)) state[key] = cleanState(key, raw[key], player.charId);
    planets[id] = state;
  }
  return { game: 'lanternmoss', version: SAVE_VERSION, slot: SAVE_SLOT,
    savedAt: typeof s.savedAt === 'string' && Number.isFinite(Date.parse(s.savedAt)) ? new Date(s.savedAt).toISOString() : null,
    planetId: ids.has(s.planetId) ? s.planetId : PLANETS[0].id, systems, planets };
}

export function parseSave(text) {
  if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || byteLength(text) > MAX_SAVE_BYTES) return { ok: false, message: 'That save file is too large or unreadable.' };
  try { const data = sanitizeSave(JSON.parse(text)); return data ? { ok: true, data } : { ok: false, message: 'This is not a supported Lanternmoss save.' }; }
  catch { return { ok: false, message: 'That save is damaged and could not be read.' }; }
}

export class SaveRegistry {
  constructor() { this.entries = new Map(); this.planets = {}; }
  register(key, system) {
    if (!Object.hasOwn(SAVE_SYSTEMS, key) || this.entries.has(key) || typeof system.toJSON !== 'function' || typeof system.load !== 'function') throw new Error(`Invalid save registration: ${key}`);
    this.entries.set(key, system); return this;
  }
  assertComplete() { for (const key of Object.keys(SAVE_SYSTEMS)) if (!this.entries.has(key)) throw new Error(`Missing save system: ${key}`); }
  capturePlanet(id) {
    if (!ids.has(id)) throw new Error(`Unknown planet: ${id}`);
    const state = {}; for (const [key, system] of this.entries) if (SAVE_SYSTEMS[key] === 'planet') state[key] = clone(system.toJSON());
    this.planets[id] = state;
  }
  restorePlanet(id) { const state = this.planets[id]; if (!state) return; for (const [key, system] of this.entries) if (SAVE_SYSTEMS[key] === 'planet' && Object.hasOwn(state, key)) system.load(clone(state[key])); }
  snapshot(id, savedAt = new Date().toISOString()) {
    this.assertComplete(); this.capturePlanet(id);
    const systems = {}; for (const [key, system] of this.entries) if (SAVE_SYSTEMS[key] === 'adventure') systems[key] = clone(system.toJSON());
    return sanitizeSave({ game: 'lanternmoss', version: SAVE_VERSION, slot: SAVE_SLOT, savedAt, planetId: id, systems, planets: this.planets });
  }
  load(data) { this.assertComplete(); this.planets = clone(data.planets); for (const [key, system] of this.entries) if (SAVE_SYSTEMS[key] === 'adventure') system.load(clone(data.systems[key])); }
  reset() { this.planets = {}; }
}

/** Storage access is injected for tests; blocked/full storage never claims a successful save. */
export class SaveStore {
  constructor(storage = () => globalThis.localStorage) { this.storage = storage; }
  read() { try { const text = this.storage()?.getItem(SAVE_KEY); return text == null ? { ok: false, empty: true } : parseSave(text); } catch { return { ok: false, message: 'Saving is unavailable on this device.' }; } }
  write(data) {
    try {
      const clean = sanitizeSave(data), storage = this.storage(); if (!clean || !storage) throw new Error('unavailable');
      const text = JSON.stringify(clean); if (byteLength(text) > MAX_SAVE_BYTES) throw new Error('too large');
      storage.setItem(SAVE_KEY, text); return { ok: true, data: clean };
    } catch { return { ok: false, message: 'Could not save. Device storage may be full or blocked. Export your adventure to keep a copy.' }; }
  }
  import(text) { const result = parseSave(text); return result.ok ? this.write(result.data) : result; }
}
