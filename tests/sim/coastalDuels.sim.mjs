// TODO 27e: every hero can beat each new Tidewhisper monster with the counter its bestiary page teaches (the world
// stays unreleased; 27h owns the campaign's pacing targets). A level-8 bot with starting gear and its own pet:
//   Shellback  : get round its plate (to the side, then behind, close enough to out-turn it), then attack
//   Jellybell  : walk to the water's edge nearest it and attack once it drifts into reach
//   Surf skipper: wait on the beach near its water; attack whenever it shows itself
// HP is topped up below 30% (counted), so this measures access and time, not survival.
//   node coastalDuels.sim.mjs           all three heroes, each in its own process
//   node coastalDuels.sim.mjs knight    one hero (prints a RESULT line)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HEROES = ['witch', 'knight', 'ranger'], TYPES = ['shellback', 'jellybell', 'surfSkipper'], CAP = 90;

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
    const row = TYPES.map(t => { const m = r.fights[t]; return `${t} ${m.time == null ? `>${CAP}s (${Math.round(m.left * 100)}% left)` : `${m.time.toFixed(1)}s`} ${m.topUps}↑${m.deaths ? ' died' : ''}`; });
    const ok = TYPES.every(t => r.fights[t].time != null && !r.fights[t].deaths);
    failed ||= !ok; console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.hero.padEnd(6)} level ${r.level}: ${row.join(' · ')}`);
  }
  if (!failed) console.log('all passed');
  process.exit(failed ? 1 : 0);
}

async function child(hero) {
  const { installCoastalEnemyFixture } = await import('./lib/coastalEnemyFixture.mjs');
  const fixture = installCoastalEnemyFixture();
  const { boot, imp } = await import('./lib/boot.mjs');
  const { arcDist, dirAlong, offsetDir, tangentToward } = await imp('utils/sphere.js');
  const { tryCast, spellState, kit } = await imp('combat/casting.js');
  const { updateAim } = await imp('combat/targeting.js');
  const { computeStats } = await imp('gameplay/equipment.js');
  const { ctx } = await imp('core/context.js');
  const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
  const { dryGround, waterAt } = await imp('world/terrain.js');
  const { plateBlocks } = await imp('entities/enemies/behaviors/armoured.js');
  const { H, step } = await boot(hero, { wake: false });
  try {
    H.Tutorial.skip(); H.goToPlanet('lanternmoss');
    dayClock.skip((0.4 * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.2);   // afternoon low tide
    const P = H.player, keys = H.keys, level = 8;
    const pin = () => { P.level = level; P.xp = 0; P.stats = computeStats(P); };
    pin(); step(0.2);
    const abilities = Object.entries(kit()), basic = abilities[0][0];
    const skills = abilities.slice(1).filter(([, s]) => s.damage > 0 && !s.ult).map(([id]) => id);
    const reach = { witch: 7, knight: 1.8, ranger: 8 }[hero];
    const clearKeys = () => { for (const k in keys) keys[k] = false; };
    const head = (to, sprint = true) => { const t = tangentToward(P.up, to); H.cam.fwd.copy(t); P.fwd.copy(t); keys.KeyW = true; keys.ShiftLeft = sprint; };
    const attack = (e, d) => {
      P.fwd.copy(tangentToward(P.up, e.up)); H.cam.fwd.copy(P.fwd); updateAim();
      if (spellState.gcd > 0) return;
      for (const id of skills) { const s = kit()[id], range = s.range ?? s.radius ?? s.distance ?? Infinity; if (!spellState.cd[id] && P.mana >= s.cost && d < range + e.def.radius) { tryCast(id); return; } }
      tryCast(basic);
    };
    const picks = Object.fromEntries(TYPES.map(t => [t, ctx.enemies.find(e => e.type === t)]));
    for (const e of ctx.enemies) if (!Object.values(picks).includes(e) && e !== ctx.boss) e.vanish();
    step(1);
    // where to stand for the sea monsters: the nearest dry beach to where they live
    const beachBy = e => { for (let r = 1; r <= 30; r += 0.5) for (let a = 0; a < 6.28; a += 0.2) { const d = offsetDir(e.home, a, r); if (dryGround(d, 0.6)) return d; } return e.home; };
    const plans = {
      shellback(e, d) {
        const front = e.fwd.dot(tangentToward(e.up, P.up)) > -0.3, ring = hero === 'knight' ? 1.6 : 3.2;
        if (plateBlocks(e, P.pos) || front) {
          const side = tangentToward(e.up, P.up), across = side.clone().cross(e.up).negate();   // keep circling the same way
          head(dirAlong(e.up, side.clone().lerp(across, 0.8).normalize(), ring)); return;
        }
        if (d > reach + 0.3) { head(e.up, false); return; }
        attack(e, d);
      },
      jellybell(e, d) { if (d > reach) { const edge = e.edge ??= beachBy(e); head(arcDist(P.up, edge) > 1 ? edge : e.up, false); return; } attack(e, d); },
      surfSkipper(e, d) {
        const spot = e.spot ??= beachBy(e);
        if (!e.hidden && d < Math.max(reach, 2.5) + 2) { attack(e, d); return; }
        if (arcDist(P.up, spot) > 1.2) head(spot, false);
      },
    };
    const fights = {};
    for (const type of TYPES) {
      const e = picks[type]; P.placeAt(beachBy(e)); P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; e.aggro(); step(0.1);
      let t = 0, topUps = 0, deaths = 0;
      for (let f = 0; f < CAP * 60 && e.alive; f++) {
        clearKeys(); if (!P.dead) plans[type](e, arcDist(P.up, e.up));
        step(1 / 60); t += 1 / 60; pin();
        if (P.dead) { deaths++; break; }
        if (P.hp < P.stats.maxHp * 0.3) { P.hp = P.stats.maxHp; topUps++; }
        if (!waterAt(P.up) && e.state === 'return' && !e.hidden) e.aggro();    // a leashed monster turning home is called back
      }
      clearKeys(); fights[type] = { time: e.alive ? null : +t.toFixed(2), left: e.alive ? e.hp / e.def.hp : 0, topUps, deaths };
      step(1);
    }
    console.log('RESULT ' + JSON.stringify({ hero, level, fights }));
  } finally { H.Mechanics.exit(); fixture.restore(); }
}
