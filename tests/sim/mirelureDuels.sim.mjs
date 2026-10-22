// TODO 27g: fair access to Mirelure for every hero (Tidewhisper stays unreleased; 27h owns campaign pacing).
// A level-8 bot with starting gear and its own pet plays the bestiary's plan: while she is deep, watch her breath and
// strike the lure that dims on it; while she is surfaced or beached, attack her. It never dodges a geyser, a bite or
// a roll: HP is topped up below 50% (counted), like the balance report. It starts at the afternoon low tide.
//   node mirelureDuels.sim.mjs          all three heroes, each in its own process
//   node mirelureDuels.sim.mjs knight   one hero (prints a RESULT line)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BALANCE } from '../../src/config/balance.js';

const HEROES = ['witch', 'knight', 'ranger'], CAP = 420, [MIN, MAX] = BALANCE.seconds.boss;

if (process.argv[2]) await child(process.argv[2]);
else {
  const results = await Promise.all(HEROES.map(h => new Promise(done => {
    let out = ''; const c = spawn(process.execPath, [fileURLToPath(import.meta.url), h], { env: process.env });
    c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; });
    c.on('close', code => { const line = out.split('\n').find(l => l.startsWith('RESULT ')); done(code === 0 && line ? JSON.parse(line.slice(7)) : { hero: h, error: out.trim().split('\n').slice(-6).join('\n') }); });
  })));
  let failed = false;
  for (const r of results) {
    if (r.error) { failed = true; console.log(`FAIL  ${r.hero}:\n${r.error}`); continue; }
    const ok = r.time != null && !r.deaths, band = ok && r.time >= MIN && r.time <= MAX;
    failed ||= !ok;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.hero.padEnd(6)} level ${r.level}: ${r.time == null ? `>${CAP}s (${Math.round(r.left * 100)}% left)` : `${r.time.toFixed(1)}s`}`
      + ` · ${r.topUps} top-ups · surfaced ${r.surfaced}x · false lures ${r.falseHits} · drained ${r.drained ? 'yes' : 'no'}${band ? '' : ` · outside the ${MIN}-${MAX} s boss target`}`);
  }
  if (!failed) console.log('all passed');
  process.exit(failed ? 1 : 0);
}

async function child(hero) {
  const { installMirelureFixture } = await import('./lib/mirelureFixture.mjs');
  const fixture = installMirelureFixture();
  const { boot, imp } = await import('./lib/boot.mjs');
  const { arcDist, offsetDir, tangentToward } = await imp('utils/sphere.js');
  const { tryCast, spellState, kit } = await imp('combat/casting.js');
  const { updateAim, targeting } = await imp('combat/targeting.js');
  const { computeStats } = await imp('gameplay/equipment.js');
  const { ctx } = await imp('core/context.js');
  const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
  const { Quests } = await imp('gameplay/quests/Quests.js'), { encounterEvents } = await imp('combat/events.js');
  const { H, step } = await boot(hero, { wake: false });
  try {
    H.Tutorial.skip(); H.goToPlanet('lanternmoss');
    dayClock.skip((0.4 * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.2);
    const P = H.player, keys = H.keys, level = 8, B = ctx.boss;
    const pin = () => { P.level = level; P.xp = 0; P.stats = computeStats(P); };
    pin(); Quests.st('darkLighthouse').status = 'done';
    for (const e of ctx.enemies) if (e.def.respawn) e.vanish();
    P.invuln = 1e5; P.placeAt(offsetDir(B.home, 0.3, 15.5)); for (let i = 0; i < 60 * 8 && H.BossGate.state !== 'awake'; i++) step(1 / 60);
    P.invuln = 0; step(0.5);
    const abilities = Object.entries(kit()), basic = abilities[0][0];
    const skills = abilities.slice(1).filter(([, s]) => s.damage > 0 && !s.ult).map(([id]) => id);
    const reach = { witch: 7, knight: 3, ranger: 8 }[hero];
    const clearKeys = () => { for (const k in keys) keys[k] = false; };
    const head = (to, sprint = false) => { const t = tangentToward(P.up, to); H.cam.fwd.copy(t); P.fwd.copy(t); keys.KeyW = true; keys.ShiftLeft = sprint; };
    const attack = (target, d, basicOnly = false) => {
      P.fwd.copy(tangentToward(P.up, target.up)); H.cam.fwd.copy(P.fwd); updateAim(); targeting.aim = target;
      if (spellState.gcd > 0) return;
      if (!basicOnly) for (const id of skills) { const s = kit()[id], range = s.range ?? s.radius ?? s.distance ?? Infinity; if (!spellState.cd[id] && P.mana >= s.cost && d < range + target.def.radius) { tryCast(id); return; } }
      tryCast(basic);
    };
    // the bot's eye: on each breath, the lure whose lamp is dimmest is hers
    let guess = null, surfaced = 0, falseHits = 0, drained = false;
    encounterEvents.addEventListener('enemydefeated', ev => { const l = ev.detail.enemy; if (l.type === 'mireLure' && !l.real) falseHits++; });
    const bot = () => {
      const lures = B.lures.filter(l => l.alive);
      if (B.mode === 'deep') {
        const beat = Math.pow(Math.max(0, Math.cos(((ctx.time / B.def.lures.breath) % 1) * Math.PI * 2)), 6) > 0.95;
        if (beat && lures.length) guess = lures.reduce((a, b) => (b.lamp.scale.x < a.lamp.scale.x ? b : a));
        if (!guess?.alive) return;
        const d = arcDist(P.up, guess.up);
        if (d > reach) head(guess.up, true); else attack(guess, d, true);                                    // one clean hit, no splash
        return;
      }
      const d = arcDist(P.up, B.up);
      if (d > reach + B.def.radius) head(B.up, true); else attack(B, d);
    };
    let t = 0, topUps = 0, deaths = 0, wasUp = false;
    for (let f = 0; f < CAP * 60 && B.alive; f++) {
      clearKeys(); if (!P.dead) bot();
      step(1 / 60); t += 1 / 60; pin();
      const up = B.mode === 'surfaced' && B.state !== 'transition'; if (up && !wasUp) surfaced++; wasUp = up; drained ||= B.mode === 'beached';
      if (P.dead) { deaths++; break; }
      if (P.hp < P.stats.maxHp * 0.5) { P.hp = P.stats.maxHp; topUps++; }
    }
    clearKeys();
    console.log('RESULT ' + JSON.stringify({ hero, level, time: B.alive ? null : +t.toFixed(1), left: B.alive ? B.hp / B.def.hp : 0, topUps, deaths, surfaced, falseHits, drained }));
  } finally { H.Mechanics.exit(); fixture.restore(); }
}
