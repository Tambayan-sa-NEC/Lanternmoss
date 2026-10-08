// The balance report (TODO 23): how long a simple bot takes to beat each planet's monsters, mini boss and boss with each
// hero, and how much damage it takes doing it. A report, not a check: it prints numbers to compare against the targets.
//   node balance.sim.mjs                 every hero x planet, in parallel child processes, as a table
//   node balance.sim.mjs knight 1        one hero on one planet (prints a RESULT line)
// The hero is at the planet's boss summon level (or the planet's index * 2 + 2), with starting gear and their own pet.
// The bot faces its target, closes to a hero-sized distance (it never backs off), uses every damaging skill on cooldown and the basic attack in
// between. It never dodges, so damage taken is a worst case. Each monster fight starts fresh (full HP and mana, skills
// ready) without the ultimate; boss and mini boss fights use the ultimate (aimed at the target) on its cooldown.
// Bosses and mini bosses: the bot is topped up below 25% HP ("top-ups") instead of dying, up to FIGHT_CAP seconds.
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const HEROES = ['witch', 'knight', 'ranger'], PLANETS_N = 3;
const TRIALS = 3, MONSTER_CAP = 60, FIGHT_CAP = 300;
const TARGETS = 'targets (TODO 23): monster 2-6 s · mini boss 90-180 s · boss 180-300 s';

if (process.argv[2]) await child(process.argv[2], Number(process.argv[3] ?? 0));
else await parent();

async function parent() {
  const jobs = [], results = [];
  for (let p = 0; p < PLANETS_N; p++) for (const h of HEROES) jobs.push([h, p]);
  const runOne = ([h, p]) => new Promise(done => {
    let out = '';
    const c = spawn(process.execPath, [fileURLToPath(import.meta.url), h, String(p)], { env: process.env });
    c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; });
    c.on('close', code => {
      const line = out.split('\n').find(l => l.startsWith('RESULT '));
      if (code !== 0 || !line) { console.log(`FAIL  ${h} on planet ${p}:\n${out.trim().split('\n').slice(-8).join('\n')}`); results.failed = true; }
      else results.push(JSON.parse(line.slice(7)));
      done();
    });
  });
  const queue = [...jobs];
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs.length, availableParallelism() - 1)) }, async () => { while (queue.length) await runOne(queue.shift()); }));

  const fmt = r => (r.time != null ? `${r.time.toFixed(1)}s` : r.left != null ? `>${r.cap}s (${Math.round(r.left * 100)}% left)` : `>${r.cap}s`);
  const cell = (r, extra) => (r ? `${fmt(r).padStart(7)} ${String(Math.round(r.taken)).padStart(5)} dmg${extra ? ` ${extra}` : ''}` : '—').padEnd(34);
  console.log(`Balance report (seed ${process.env.SIM_SEED ?? 1}) · ${TARGETS}`);
  console.log('Each cell: time to kill, damage the hero took. Monsters: median of 3 fights, † = the hero fell. Bosses: ↑ = HP');
  console.log('top-ups below 25%. The bot never dodges, turns from a gaze or steps out of fire: a very long fight with many');
  console.log('top-ups means "needs dodging" as much as "too strong". A >60s monster: the bot could not finish it.');
  for (let p = 0; p < PLANETS_N; p++) {
    const row = HEROES.map(h => results.find(r => r.hero === h && r.planet === p));
    if (!row[0]) continue;
    console.log(`\n${row[0].planetName} · hero level ${row[0].level}`);
    console.log(`  ${''.padEnd(26)}${HEROES.map(h => h.padEnd(34)).join('')}`);
    for (const type of Object.keys(row[0].monsters)) console.log(`  ${type.padEnd(26)}${row.map(r => cell(r?.monsters[type], r?.monsters[type]?.deaths ? `${r.monsters[type].deaths}†` : '')).join('')}`);
    for (const k of ['miniBoss', 'boss']) {
      if (!row[0][k]) continue;
      console.log(`  ${row[0][k].name.slice(0, 25).padEnd(26)}${row.map(r => cell(r?.[k], r?.[k] ? `${r[k].topUps}↑` : '')).join('')}`);
    }
  }
  process.exit(results.failed ? 1 : 0);
}

async function child(hero, planet) {
  const { boot, imp } = await import('./lib/boot.mjs');
  const { arcDist, offsetDir, tangentToward } = await imp('utils/sphere.js');
  const { tryCast, spellState, kit } = await imp('combat/casting.js');
  const { aim, updateAiming } = await imp('combat/aiming.js');
  const { computeStats } = await imp('gameplay/equipment.js');
  const { ENGAGED } = await imp('entities/enemies/states.js');
  const { COMBAT } = await imp('config/combat.js');
  const { ctx } = await imp('core/context.js');
  const { slopeAt, waterAt } = await imp('world/terrain.js');

  const { H, step, game } = await boot(hero);
  if (planet) H.goToPlanet(planet);
  step(1);
  const P = H.player, keys = H.keys, PL = H.PLANETS[planet];
  const level = PL.boss.summon?.level ?? planet * 2 + 2;
  /** Pins the hero to the planet's level (kills during the trials would level it up). */
  const pinLevel = () => { if (P.level !== level) { P.level = level; P.xp = 0; P.stats = computeStats(P); } };
  pinLevel(); step(0.2);

  const abilities = Object.entries(kit()), basic = abilities[0][0];
  const skills = abilities.slice(1).filter(([, s]) => s.damage > 0 && !s.ult).map(([id]) => id);
  const ult = abilities.find(([, s]) => s.ult)?.[0];
  const reach = { witch: 8, knight: 2, ranger: 10 }[hero] ?? 6;
  const clearKeys = () => { for (const k in keys) keys[k] = false; };
  const refill = () => { P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; for (const id in spellState.cd) spellState.cd[id] = 0; };
  const revive = () => { if (P.dead) step(COMBAT.player.respawnTime + 0.3); pinLevel(); refill(); P.invuln = 0; };
  const isFight = e => e.def.miniBoss || e === ctx.boss;
  for (const e of ctx.enemies) if (!isFight(e)) e.vanish();
  step(0.5);

  /** One frame of the bot against `e`: steer to its distance, face it, and attack (useUlt: the aimed ultimate too). */
  function bot(e, useUlt) {
    clearKeys();
    const d = arcDist(P.up, e.up), toward = tangentToward(P.up, e.up);
    H.cam.fwd.copy(toward);
    if (d > reach + 1.5) keys.KeyW = true;                               // closes in; never backs off (that would face away)
    P.fwd.copy(toward);
    if (spellState.gcd > 0) return;
    if (useUlt && ult && !spellState.cd[ult] && d < kit()[ult].range) {
      tryCast(ult);
      if (aim.id) { aim.reach = Math.min(1, d / aim.s.range); updateAiming(); tryCast(ult); }
      return;
    }
    for (const id of skills) if (!spellState.cd[id] && P.mana >= kit()[id].cost) { tryCast(id); return; }
    tryCast(basic);
  }

  /** Fights `e` until it falls or `cap` seconds pass. topUp: refill below 25% HP instead of dying. */
  function fight(e, cap, { topUp = false, engage, useUlt = false } = {}) {
    let t = 0, taken = 0, last = P.hp, deaths = 0, topUps = 0, done = false;
    step(cap, () => {
      if (done) return;
      t += 1 / 60;
      if (!e.alive) { done = true; return; }
      if (P.dead) { if (topUp) { revive(); topUps++; } else { deaths++; done = true; return; } }
      engage?.(t);
      bot(e, useUlt);
      if (P.hp < last) taken += last - P.hp;
      if (topUp && P.hp < P.stats.maxHp * 0.25) { P.hp = P.stats.maxHp; topUps++; }
      last = P.hp;
    });
    clearKeys();
    return { time: !e.alive ? +t.toFixed(2) : null, cap, taken, deaths, topUps, left: e.alive ? +(e.hp / e.def.hp).toFixed(2) : 0 };
  }

  // Monsters never fight near the village (COMBAT.player.safeRadius), so the trials happen out in the wilds: flat, dry
  // ground well away from the village, the lair and the mini boss.
  const village = game.world.spawnDir, away = [ctx.boss, ...ctx.enemies.filter(e => e.def.miniBoss)].filter(Boolean).map(e => e.home ?? e.up);
  let arena = null;
  for (let i = 0; i < 400 && !arena; i++) {
    const d = offsetDir(village, i * 2.39996, 32 + (i % 20));
    if (!waterAt(d) && slopeAt(d) < 0.3 && away.every(a => arcDist(d, a) > 40)) arena = d;
  }
  const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const monsters = {};
  for (const type of [...new Set(PL.roster.map(r => r.type))]) {
    const runs = [];
    for (let i = 0; i < TRIALS; i++) {
      revive(); P.placeAt(arena); step(0.2);
      const e = H.spawnEnemy(type, 6); e.temporary = true; e.aggro();
      const r = fight(e, MONSTER_CAP);
      if (e.alive) e.vanish();
      runs.push(r);
    }
    const times = runs.map(r => r.time ?? Infinity), m = median(times);
    monsters[type] = { time: Number.isFinite(m) ? m : null, cap: MONSTER_CAP, taken: median(runs.map(r => r.taken)), deaths: runs.reduce((s, r) => s + r.deaths, 0) };
  }

  /** A big fight: walk in next to its home, and walk back in whenever it drops out of the fight. */
  function bigFight(e) {
    revive();
    const home = e.home ?? e.up;
    P.placeAt(offsetDir(home, 0.3, 8)); e.aggro(); step(0.2);
    let back = -9;
    const r = fight(e, FIGHT_CAP, { topUp: true, useUlt: true, engage: t => {
      if (e.alive && !ENGAGED.has(e.state) && t - back > 3) { back = t; P.placeAt(offsetDir(home, Math.random() * 6.28, 6)); e.aggro(); }
    } });
    return { ...r, name: e.def.name ?? e.type };
  }
  const mini = ctx.enemies.find(e => e.def.miniBoss && e.alive);
  const miniBoss = mini ? bigFight(mini) : null;
  const boss = ctx.boss ? bigFight(ctx.boss) : null;

  console.log('RESULT ' + JSON.stringify({ hero, planet, planetName: PL.name, level, monsters, miniBoss, boss }));
  process.exit(0);
}
