/* BOSS GATE: a planet's boss sleeps in its sealed lair until the planet's conditions are met (PLANETS[i].boss.summon,
   config/bossSummon.js), then wakes in a short sequence when the hero comes to the lair, and fights inside a ring it
   won't let you leave.
     sealed     the boss is dormant (hidden, untouchable); the lair's rune ring is grey; a status chip, the compass and
                villagers say what's still needed
     ready      everything is done (a night-only boss slips back to sealed if day comes first): the lair glows
     summoning  the hero walked into the lair: camera on the lair, the boss rises, its name card, battle music
     awake      the fight is on: while the boss is engaged and the hero stands, a ring of thorns / fire closes the arena
     beaten     after the win (PlanetProgression takes over)
   Seals are lair objects (COMBAT.enemies, object: true) placed around the lair; elites are some of the planet's own
   monsters made tougher (Enemy.makeElite), each dropping a sigil. */
import * as THREE from 'three';
import { ARENA, ARENA_WALLS, ELITE, SUMMON, SUMMON_HINTS } from '../config/bossSummon.js';
import { COMBAT } from '../config/combat.js';
import { PLANETS } from '../config/planets.js';
import { QUESTS } from '../config/quests.js';
import { cancelAim } from '../combat/aiming.js';
import { encounterEvents } from '../combat/events.js';
import { addEnemy } from '../combat/spawning.js';
import { ctx } from '../core/context.js';
import { ENGAGED } from '../entities/enemies/states.js';
import { fxMaterial } from '../fx/combatFx.js';
import { GroundDecal } from '../fx/groundDecals.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { setShowcase, shakeCamera } from '../systems/CameraSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { showBanner } from '../ui/banner.js';
import { Dialog } from '../ui/Dialog.js';
import { toast } from '../ui/toast.js';
import { clamp } from '../utils/math.js';
import { arcDist, dirAlong, frameQuat, offsetDir, tangentFrame, tangentToward } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { dayClock } from './dayClock.js';
import { Quests } from './quests/Quests.js';
import { spawnWorldItem } from './pickups.js';
import { fillStory } from './storyState.js';
import { rng } from '../utils/random.js';

const shortName = def => def.name.split(',')[0];
const epithet = def => def.name.split(', ')[1] ?? '';
const easeOutBack = k => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
const _v = new THREE.Vector3(), _t = new THREE.Vector3();

/** The conditions of `summon` as readable lines (the bestiary uses this too). */
export function describeSummon(summon = {}) {
  const out = [];
  if (summon.level) out.push(`Reach level ${summon.level}`);
  if (summon.seals) out.push(`Break the ${summon.seals.count} ${COMBAT.enemies[summon.seals.type]?.name ?? 'seal'}s around its lair`);
  if (summon.sigils) out.push(`Bring ${summon.sigils.count} ${itemRegistry.get(summon.sigils.item)?.name ?? 'sigil'}s from the planet's elites`);
  if (summon.quest) out.push(`Help ${QUESTS[summon.quest].giver}: ${QUESTS[summon.quest].title}`);
  if (summon.night) out.push('Come at night');
  return out;
}

export const BossGate = {
  state: 'sealed', boss: null, lair: null, summon: {}, wall: null, seals: [], elites: [], hinted: new Set(), praised: new Set(),
  seqT: 0, cardShown: false, ring: null, ringK: 0, posts: [], arenaGroup: null, card: null, buzzT: 0, warned: false, lastMet: null,

  toJSON() { return { awake: ['summoning', 'awake'].includes(this.state), beaten: this.state === 'beaten',
    broken: this.seals.flatMap((e, i) => e.alive ? [] : [i]), hinted: [...this.hinted], praised: [...this.praised] }; },
  load(data) {
    for (const i of data.broken) this.seals[i]?.vanish();
    this.hinted = new Set(data.hinted); this.praised = new Set(data.praised);
    if (data.beaten) {
      this.boss?.vanish(); this.state = 'beaten'; this.ring?.hide(); this.styleBeacon();
      audio.battle(false);
    } else if (data.awake) this.wake();   // sigils were already consumed; don't offer them a second time
    else { this.state = 'sealed'; this.styleBeacon(); }
  },

  /** A new planet (or a fresh adventure): the boss goes to sleep in its lair, the seals and elites appear. */
  setup(planetIndex, boss) {
    this.teardown();
    const p = PLANETS[planetIndex].boss;
    Object.assign(this, { state: 'sealed', boss, lair: boss.home.clone(), summon: p.summon ?? {}, wall: ARENA_WALLS[p.arena?.wall ?? 'thorns'],
      seals: [], elites: [], seqT: 0, cardShown: false, ringK: 0, warned: false, lastMet: null });
    this.hinted.clear(); this.praised.clear();
    boss.dormant = true; boss.hidden = true; boss.selfCollider.active = false; boss.arenaRadius = ARENA.radius;
    const s = this.summon;
    if (s.seals) for (let i = 0; i < s.seals.count; i++) {
      const e = addEnemy(s.seals.type, offsetDir(this.lair, 0.6 + i / s.seals.count * Math.PI * 2, SUMMON.sealRing)); e.lairSeal = true; this.seals.push(e);
    }
    if (s.sigils) {                                                      // the planet's farthest-out monsters become its elites
      const far = ctx.enemies.filter(e => e !== boss && !e.def.object && !e.owner && e.def.ai !== 'hopper')
        .sort((a, b) => arcDist(b.home, ctx.player.up) - arcDist(a.home, ctx.player.up));
      const picked = [];
      for (const e of far) { if (picked.length >= s.sigils.elites) break; if (picked.every(o => arcDist(o.home, e.home) > 25)) picked.push(e); }
      for (const e of picked) { e.makeElite(ELITE); this.elites.push(e); }
    }
    this.ring = new GroundDecal('ring', 0x9a8aa0, { k: 1, lift: 0.1, order: 3 }); this.ring.place(this.lair, null, ARENA.radius); this.ring.opacity = 0.35;
    this.buildArena();
    this.styleBeacon();
  },
  /** Removes what setup made (the seals and elites go with the planet's enemies). */
  teardown() {
    this.ring?.dispose(); this.ring = null;
    if (this.arenaGroup) { scene.remove(this.arenaGroup); this.arenaGroup.traverse(o => o.geometry?.dispose()); this.arenaGroup = null; this.posts = []; }
    this.hideCard();
    if (this.state === 'summoning') { ctx.cutscene = false; document.body.classList.remove('cutscene'); setShowcase(null); }
    if (this.state === 'summoning' || this.state === 'awake') audio.battle(false);
    this.state = 'sealed'; this.boss = null;
  },

  // ---------------------------------------------------------------- the conditions
  /** [{ kind, text, done, have, need }] for this planet's boss. */
  requirements() {
    const s = this.summon, P = ctx.player, out = [];
    if (s.level) out.push({ kind: 'level', text: `Reach level ${s.level}`, have: Math.min(P.level, s.level), need: s.level, done: P.level >= s.level });
    if (s.seals) { const broken = this.seals.filter(e => !e.alive).length; out.push({ kind: 'seals', text: `Break the ${COMBAT.enemies[s.seals.type].name}s`, have: broken, need: s.seals.count, done: broken >= s.seals.count }); }
    if (s.sigils) { const have = P.inventory.count(s.sigils.item); out.push({ kind: 'sigils', text: `Bring ${itemRegistry.get(s.sigils.item).name}s (elites carry them)`, have: Math.min(have, s.sigils.count), need: s.sigils.count, done: have >= s.sigils.count }); }
    if (s.quest) { const done = Quests.st(s.quest).status === 'done'; out.push({ kind: 'quest', text: `Help ${QUESTS[s.quest].giver}: ${QUESTS[s.quest].title}`, have: +done, need: 1, done }); }
    if (s.night) { const night = dayClock.phase === 'night'; out.push({ kind: 'night', text: 'Wait for night', have: +night, need: 1, done: night }); }
    return out;
  },
  get met() { return this.requirements().every(r => r.done); },
  get bossName() { return this.boss ? shortName(this.boss.def) : ''; },

  // ---------------------------------------------------------------- every frame
  update(dt) {
    const b = this.boss; if (!b || ctx.transitioning) return;
    const P = ctx.player;
    if ((this.state === 'sealed' || this.state === 'ready') && ctx.started) {
      const met = this.met;
      if (met && this.state === 'sealed') {
        this.state = 'ready'; this.styleBeacon(); audio.roar();
        if (SUMMON.readyBanner) showBanner(`${this.bossName} stirs...`, `Its lair is open. Go there when you're ready.`);
      } else if (!met && this.state === 'ready') { this.state = 'sealed'; this.styleBeacon(); toast(`${this.bossName} sinks back to sleep... for now.`); }
      if (this.state === 'ready' && !P.dead && !ctx.indoors && arcDist(P.up, this.lair) < SUMMON.trigger) this.beginSummon();
    }
    if (this.state === 'summoning') this.sequence(dt);
    if (this.state === 'ready' && this.ring) this.ring.opacity = 0.45 + 0.25 * Math.sin(ctx.time * 3);
    this.updateArena(dt);
  },

  // ---------------------------------------------------------------- the waking sequence
  beginSummon() {
    const s = this.summon, P = ctx.player;
    if (s.sigils) P.inventory.remove(s.sigils.item, s.sigils.count);       // the sigils are offered up
    this.state = 'summoning'; this.seqT = 0; this.cardShown = false;
    ctx.cutscene = true; document.body.classList.add('cutscene'); releaseAllKeys(); cancelAim(); if (Dialog.open) Dialog.close();
    const c = SUMMON.camera, face = tangentToward(this.lair, P.up), up = this.lair.clone();
    setShowcase({ at: out => out.copy(up).multiplyScalar(groundHeight(up) + c.lift), up, face, dist: c.dist, pitch: c.pitch });
    audio.battle(true); audio.doomCharge(); shakeCamera(0.3);
    this.ring?.hide();
  },
  sequence(dt) {
    const b = this.boss, P = ctx.player, t = (this.seqT += dt), [r0, r1] = SUMMON.rise, [c0, c1] = SUMMON.card;
    P.invuln = Math.max(P.invuln, 0.5);
    if (t >= r0 && b.dormant === true) {                                  // it appears, facing the hero
      b.dormant = 'show'; b.fwd.copy(tangentToward(b.up, P.up)); b.root.scale.setScalar(0.001);
      sparkles.emit(b.pos, { count: 60, color: this.glow, speed: 4, up: b.up, upBias: 1.2, life: 1.4, size: 0.5 }); audio.roar(); shakeCamera(0.5);
    }
    if (b.dormant === 'show') {
      const k = clamp((t - r0) / (r1 - r0), 0, 1); b.root.scale.setScalar(b.baseScale * Math.max(0.001, easeOutBack(k)));
      if (k < 1 && rng() < dt * 30) sparkles.emit(b.pos, { count: 3, color: this.glow, speed: 2.5, up: b.up, upBias: 1, life: 0.8, size: 0.4 });
    }
    if (t >= c0 && !this.cardShown) { this.cardShown = true; this.showCard(); }
    if (t >= c1) this.hideCard();
    if (t >= SUMMON.sequence) this.wake();
  },
  /** The fight begins (also the debug shortcut, skipping the sequence). */
  wake() {
    const b = this.boss; if (!b) return;
    if (this.state !== 'summoning') audio.battle(true);
    b.dormant = false; b.hidden = false; b.selfCollider.active = true; b.root.scale.setScalar(b.baseScale); b.root.visible = b.shadow.visible = true;
    this.state = 'awake'; ctx.cutscene = false; document.body.classList.remove('cutscene'); setShowcase(null); this.hideCard(); this.ring?.hide(); this.styleBeacon();
    if (arcDist(ctx.player.up, this.lair) < SUMMON.trigger + 6) b.aggro();
  },
  onBeaten(boss) {
    if (boss !== this.boss) return;
    this.state = 'beaten'; audio.battle(false); this.styleBeacon();
  },

  showCard() {
    const def = this.boss.def;
    if (!this.card) { this.card = document.createElement('div'); this.card.id = 'bosscard'; document.body.appendChild(this.card); }
    this.card.innerHTML = `<small>Planet ${ctx.planet + 1} · ${PLANETS[ctx.planet].name}</small><b>${shortName(def)}</b><span>${epithet(def)}</span>`;
    this.card.style.setProperty('--c', `#${new THREE.Color(this.glow).getHexString()}`);
    this.card.classList.remove('show'); void this.card.offsetWidth; this.card.classList.add('show');
  },
  hideCard() { this.card?.classList.remove('show'); },
  get glow() { const d = this.boss?.def; return d ? d.capColor ?? d.color : 0xffffff; },

  /** The beacon over the lair: dim and grey while sealed, the boss's colour once it can be woken; gone once it's up. */
  styleBeacon() {
    const beam = this.boss?.beacon; if (!beam) return;
    const sealed = this.state === 'sealed';
    beam.visible = this.state === 'sealed' || this.state === 'ready';
    beam.material.color.set(sealed ? 0x9a8aa0 : this.glow).multiplyScalar(sealed ? 0.6 : 0.9);
    if (this.ring) { this.ring.setColor(sealed ? 0x9a8aa0 : this.glow, sealed ? 1 : 1.6); this.ring.opacity = sealed ? 0.35 : 0.6; }
  },

  // ---------------------------------------------------------------- the arena ring
  buildArena() {
    const w = this.wall, g = this.arenaGroup = new THREE.Group(); this.posts = [];
    const tan = tangentFrame(this.lair)[0];
    for (let i = 0; i < ARENA.posts; i++) {
      const dir = dirAlong(this.lair, _t.copy(tan).applyAxisAngle(this.lair, i / ARENA.posts * Math.PI * 2), ARENA.radius);
      const post = new THREE.Group(); post.position.copy(dir).multiplyScalar(groundHeight(dir) - 0.1);
      frameQuat(dir, tangentToward(dir, this.lair), post.quaternion);
      const h = w.height * (0.75 + ((i * 37) % 10) / 20);
      if (w.kind === 'thorn') {
        const vine = new THREE.Mesh(new THREE.ConeGeometry(0.28, h, 5), new THREE.MeshToonMaterial({ color: w.color })); vine.position.y = h / 2; vine.rotation.z = ((i % 3) - 1) * 0.18; post.add(vine);
        const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), fxMaterial(w.glow, 1.8)); tip.position.y = h; post.add(tip);
      } else {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, h, 6, 1, true), fxMaterial(w.color, 1.6)); flame.position.y = h / 2; post.add(flame);
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.2, h * 0.6, 5, 1, true), fxMaterial(w.glow, 2.2)); core.position.y = h * 0.3; post.add(core);
      }
      post.scale.set(1, 0.001, 1); post.visible = false; g.add(post); this.posts.push({ post, h, seed: i * 1.7 });
    }
    scene.add(g);
  },
  /** Raises the ring while the boss fights and the hero stands; keeps the hero inside it. */
  updateArena(dt) {
    const b = this.boss, P = ctx.player;
    const up = this.state === 'awake' && b?.alive && !b.dormant && ENGAGED.has(b.state) && !P.dead && !ctx.indoors;
    this.ringK = clamp(this.ringK + (up ? dt : -dt * 1.5) / ARENA.rise, 0, 1);
    for (const p of this.posts) {
      p.post.visible = this.ringK > 0.01;
      if (p.post.visible) p.post.scale.set(1, Math.max(0.001, this.ringK * (this.wall.kind === 'flame' ? 0.85 + 0.15 * Math.sin(ctx.time * 9 + p.seed) : 1)), 1);
    }
    if (up && this.ringK > 0.3) this.keepInside(P, dt);
    if (!up) this.warned = false;
  },
  keepInside(P, dt) {
    const limit = ARENA.radius - P.radius - 0.1, d = arcDist(P.up, this.lair);
    this.buzzT -= dt;
    if (d <= limit) return;
    const out = tangentToward(this.lair, P.up);
    P.up.copy(dirAlong(this.lair, out, limit)); P.r = Math.max(P.r, groundHeight(P.up)); P.pos.copy(P.up).multiplyScalar(P.r);
    _v.copy(tangentToward(P.up, this.lair));                               // no more pushing outward
    for (const v of [P.vel, P.knock]) { const away = -v.dot(_v); if (away > 0) v.addScaledVector(_v, away); }
    if (this.buzzT <= 0) {
      this.buzzT = 0.5; audio.fizzle();
      sparkles.emit(P.pos.clone().addScaledVector(P.up, 1), { count: 14, color: this.wall.glow, speed: 2.2, up: P.up, upBias: 0.6, life: 0.5, size: 0.32 });
      if (!this.warned) { this.warned = true; toast(`The ${this.wall.kind === 'thorn' ? 'thorns hold' : 'flames hold'} you in: no leaving until ${this.bossName} falls!`); }
    }
  },

  // ---------------------------------------------------------------- villagers
  /** A villager's word about the boss: once per villager, what's still needed (or that it stirs); after the win, praise. */
  lineFor(npc) {
    if (!this.boss) return null;
    if (this.state === 'beaten' || this.state === 'awake') {
      if (this.state !== 'beaten' || this.praised.has(npc.name)) return null;
      this.praised.add(npc.name);
      return { t: fillStory(`You did it, {hero}! ${this.bossName} is gone, and ${PLANETS[ctx.planet].name} can breathe again.`), e: 'excited' };
    }
    if (this.hinted.has(npc.name)) return null;
    const r = this.requirements().find(x => !x.done), kind = r?.kind ?? 'ready';
    this.hinted.add(npc.name);
    const giver = this.summon.quest ? QUESTS[this.summon.quest].giver : '';
    const text = SUMMON_HINTS[kind].replace(/\{boss\}/g, this.bossName).replace(/\{need\}/g, r?.need ?? '').replace(/\{giver\}/g, giver);
    return { t: fillStory(text), e: kind === 'ready' ? 'excited' : 'thinking' };
  },

  /** The status chip: what the lair still needs (or that it's open). */
  chipHtml() {
    if (!this.boss || !ctx.started) return '';
    if (this.state === 'ready') return `<div class="chip lair ready"><b>${this.bossName} stirs</b><span>Go to its lair</span></div>`;
    if (this.state !== 'sealed') return '';
    const rows = this.requirements().map(r => `<span class="${r.done ? 'ok' : ''}">${r.done ? '✓' : '·'} ${r.text}${r.need > 1 ? ` <i>${r.have}/${r.need}</i>` : ''}</span>`).join('');
    return `<div class="chip lair"><b>${this.bossName}'s lair · sealed</b>${rows}</div>`;
  },
  /** Compass points: the sealed lair (instead of the hidden boss) and, while sigils are needed, the elites. */
  waypoints() {
    if (!this.boss) return [];
    const list = [];
    if (this.boss.dormant) list.push({ key: 'boss', dir: this.lair, icon: 'boss', label: `${this.bossName}'s lair${this.state === 'ready' ? '' : ' (sealed)'}`, edge: this.state === 'ready', far: true,
      point: _v.copy(this.lair).multiplyScalar(groundHeight(this.lair) + 3).clone() });
    const s = this.summon.sigils;
    if (s && this.state === 'sealed' && ctx.player.inventory.count(s.item) < s.count)
      this.elites.forEach((e, i) => { if (e.alive) list.push({ key: `elite:${i}`, dir: e.up, icon: 'gem', label: 'Elite (carries a sigil)' }); });
    return list;
  },
};

// an elite's sigil, a seal's crumbling, the boss's fall
encounterEvents.addEventListener('enemydefeated', ev => {
  const e = ev.detail.enemy, g = BossGate;
  if (e.elite && g.summon.sigils) spawnWorldItem(g.summon.sigils.item, 1, e.up, { from: e.up, popTime: 0.5, stepAway: false });
  if (e.lairSeal) {
    const left = g.seals.filter(s => s.alive).length;
    audio.chestOpen?.(true); shakeCamera(0.3);
    toast(left ? `A seal crumbles! ${left} to go.` : 'The last seal crumbles...');
  }
});
encounterEvents.addEventListener('bossdefeated', ev => BossGate.onBeaten(ev.detail.boss));
