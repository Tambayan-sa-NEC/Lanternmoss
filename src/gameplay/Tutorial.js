/* Observes play without moving actors, pausing the game, granting rewards or consuming randomness. */
import { COMBAT } from '../config/combat.js';
import { TUTORIAL_STEPS, HELP_TOPICS, GATHERING_TIPS, TUTORIAL_EVASION } from '../config/tutorial.js';
import { CHARACTERS } from '../config/characters.js';
import { ctx } from '../core/context.js';
import { gameEvents } from '../core/events.js';
import { held } from '../core/keybinds.js';
import { cleanState } from '../core/save.js';
import { encounterEvents } from '../combat/events.js';
import { arcDist } from '../utils/sphere.js';

export const Tutorial = {
  state: null, previous: null, installed: false,
  reset() {
    this.state = { status: 'idle', done: [], seen: [], moved: 0, lifeStartedAt: 0, recap: null, remaining: 0 };
    this.previous = null;
  },
  init() {
    this.reset(); if (this.installed) return; this.installed = true;
    const on = (bus, type, fn) => bus.addEventListener(type, e => { if (ctx.started) fn(e.detail); });
    for (const [event, step] of [['cameradrag', 'camera'], ['talked', 'talk'], ['bagopened', 'bag'], ['hotbarselected', 'hotbar'], ['aimstarted', 'aim']])
      on(gameEvents, event, () => this.note(step));
    on(gameEvents, 'abilitycast', ({ id }) => {
      if (CHARACTERS[ctx.player.charId].abilities[id]?.slot === 1) this.note('attack');
      if (id === TUTORIAL_EVASION[ctx.player.charId]) this.note('dodge');
    });
    on(encounterEvents, 'enemydefeated', ({ enemy }) => { if (!enemy.def.object && !enemy.def.miniBoss && enemy.def.ai !== 'boss') this.note('fight'); });
    on(encounterEvents, 'playerfainted', ({ source, amount }) => {
      this.state.recap = { source, amount, duration: Math.max(0, ctx.time - this.state.lifeStartedAt) };
      this.state.remaining = ctx.player.deadT; this.remember('energy');
    });
    on(encounterEvents, 'playerrespawned', () => { this.state.lifeStartedAt = ctx.time; this.state.remaining = 0; });
    on(gameEvents, 'gathered', ({ items }) => {
      this.remember('tools');
      for (const drop of items) {
        const id = drop[0]; if (id === 'copperOre') this.remember('smelting');
        if (/Seed$/.test(id) || id.startsWith('seed')) this.remember('farming');
      }
    });
    on(gameEvents, 'gatheringtip', ({ key }) => this.remember(key));
    on(gameEvents, 'bagopened', ({ filter }) => { if (filter !== 'all') this.remember('stations'); if (filter === 'forge') this.remember('smelting'); });
    for (const [event, topic] of [['fishcaught', 'fishing'], ['harvested', 'farming'], ['petfound', 'pets']]) on(gameEvents, event, () => this.remember(topic));
  },
  begin() { if (this.state.status === 'idle') { this.state.lifeStartedAt = ctx.time; this.start(); } },
  start() { this.state.status = 'active'; this.state.done = []; this.state.moved = 0; this.previous = ctx.player.up.clone(); this.remember('energy'); this.remember('pets'); },
  skip() { this.state.status = 'skipped'; },
  get step() { return this.state?.status === 'active' ? TUTORIAL_STEPS.find(s => !this.state.done.includes(s.id)) ?? null : null; },
  note(id) {
    if (this.state.status !== 'active' || !TUTORIAL_STEPS.some(s => s.id === id) || this.state.done.includes(id)) return;
    this.state.done.push(id); if (!this.step) this.state.status = 'complete';
  },
  acknowledge() { if (this.step?.acknowledge) this.note(this.step.id); },
  remember(id) {
    if (![...HELP_TOPICS.map(t => t.id), ...Object.keys(GATHERING_TIPS)].includes(id) || this.state.seen.includes(id)) return;
    this.state.seen.push(id);
  },
  update(world, keys) {
    const P = ctx.player; if (!ctx.started || ctx.transitioning || ctx.cutscene || ctx.indoors || P.dead) { this.previous = null; return; }
    if (this.state.status === 'active') {
      if (this.previous && !ctx.inventoryOpen && ['moveForward', 'moveBack', 'moveLeft', 'moveRight'].some(id => held(id, keys))) {
        this.state.moved = Math.min(3, this.state.moved + Math.min(arcDist(P.up, this.previous), 1));
        if (this.state.moved >= 3) this.note('move');
      }
      if (arcDist(P.up, world.spawnDir) > COMBAT.player.safeRadius + 5) this.note('trail');
    }
    if (this.previous) this.previous.copy(P.up); else this.previous = P.up.clone();
  },
  toJSON() { return { ...this.state, remaining: ctx.player.dead ? Math.max(0, ctx.player.deadT) : 0 }; },
  load(data) { this.state = cleanState('tutorial', data); this.previous = null; },
};
