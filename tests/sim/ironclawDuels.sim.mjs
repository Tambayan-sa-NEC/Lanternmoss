// TODO 27f: fair access to Old Ironclaw for every hero (Tidewhisper stays unreleased; 27h owns campaign pacing).
// A level-8 bot with starting gear, its own pet, and the plan the bestiary page teaches: wait on the wet sand of the
// pearl flat at low tide (backing off when it closes in) so its charges plough in, strike its face while it is tucked in its shell, and hit from
// anywhere while it is open (wedged or swapping shells). It never strikes the bell, never jumps a shockwave and never
// dodges: HP is topped up below 50% (counted), like the balance report. Fights start at the afternoon low tide.
//   node ironclawDuels.sim.mjs          all three heroes, each in its own process
//   node ironclawDuels.sim.mjs ranger   one hero (prints a RESULT line)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BALANCE } from '../../src/config/balance.js';

const HEROES = ['witch', 'knight', 'ranger'], CAP = 300, [MIN, MAX] = BALANCE.seconds.miniBoss;

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
      + ` · ${r.topUps} top-ups · wedged ${r.wedges}x · ${r.swaps} shell swaps · bell rung ${r.rings}x${band ? '' : ` · outside the ${MIN}-${MAX} s mini boss target`}`);
  }
  if (!failed) console.log('all passed');
  process.exit(failed ? 1 : 0);
}

async function child(hero) {
  const { installCoastalEnemyFixture } = await import('./lib/coastalEnemyFixture.mjs');
  const fixture = installCoastalEnemyFixture();
  const { boot, imp } = await import('./lib/boot.mjs');
  const { arcDist, dirAlong, tangentToward } = await imp('utils/sphere.js');
  const { tryCast, spellState, kit } = await imp('combat/casting.js');
  const { updateAim } = await imp('combat/targeting.js');
  const { computeStats } = await imp('gameplay/equipment.js');
  const { ctx } = await imp('core/context.js');
  const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
  const { hitZone, isOpen, wedgeable } = await imp('entities/enemies/behaviors/boss/ironclaw.js');
  const { H, step, game } = await boot(hero, { wake: false });
  try {
    H.Tutorial.skip(); H.goToPlanet('lanternmoss');
    dayClock.skip((0.33 * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.2);   // just before low tide
    const P = H.player, keys = H.keys, level = 8;
    const pin = () => { P.level = level; P.xp = 0; P.stats = computeStats(P); };
    pin(); step(0.2);
    const ic = ctx.enemies.find(e => e.type === 'ironclaw');
    for (const e of ctx.enemies) if (e !== ic && e.def.respawn) e.vanish();
    step(1);
    const abilities = Object.entries(kit()), basic = abilities[0][0];
    const skills = abilities.slice(1).filter(([, s]) => s.damage > 0 && !s.ult).map(([id]) => id);
    const reach = { witch: 7, knight: 3.5, ranger: 8 }[hero];          // the axe reaches 2.7 m plus Ironclaw's 1.5 m body
    // two bait spots on the wet sand either side of the pearl flat: run to the other one when it closes in, so its
    // charge crosses the flat (and the fight stays by the beds, inside its leash)
    const flat = game.world.coast.pearlBeach, sea = tangentToward(ic.home, flat), side = sea.clone().cross(flat).normalize();
    const baits = [1, -1].map(k => dirAlong(dirAlong(flat, sea, 0.5), side, 4 * k)); let bait = baits[0];
    const clearKeys = () => { for (const k in keys) keys[k] = false; };
    const head = (to, sprint = false) => { const t = tangentToward(P.up, to); H.cam.fwd.copy(t); P.fwd.copy(t); keys.KeyW = true; keys.ShiftLeft = sprint; };
    const attack = d => {
      P.fwd.copy(tangentToward(P.up, ic.up)); H.cam.fwd.copy(P.fwd); updateAim();
      if (spellState.gcd > 0) return;
      for (const id of skills) { const s = kit()[id], range = s.range ?? s.radius ?? s.distance ?? Infinity; if (!spellState.cd[id] && P.mana >= s.cost && d < range + ic.def.radius) { tryCast(id); return; } }
      tryCast(basic);
    };
    let rings = 0, wedges = 0, swaps = 0, wasWedged = false, wasSwap = false;
    const nearHome = d => arcDist(d, ic.home) < 12;                    // keep the fight by the beds (its leash is 20 m)
    const bot = () => {
      const d = arcDist(P.up, ic.up), open = isOpen(ic), face = hitZone(ic, P.pos) === 'face';
      if (open) { if (d > reach) head(ic.up, true); else attack(d); return; }
      if (baits.some(wedgeable)) {                                       // low tide: bait charges across the wet sand
        const there = arcDist(P.up, bait) < 1.2;
        if (there && d < 5) bait = bait === baits[0] ? baits[1] : baits[0];
        if (!there || d < 5) { head(bait, true); return; }
        if (face && d <= reach + 0.5) attack(d);
        return;
      }
      if (face && d <= reach + 0.5) { attack(d); return; }               // high tide: chip at its face
      const front = dirAlong(ic.up, ic.fwd, Math.max(reach, 3));
      head(nearHome(front) ? front : flat, true);
    };
    P.placeAt(bait); ic.aggro(); step(0.1);
    let t = 0, topUps = 0, deaths = 0;
    for (let f = 0; f < CAP * 60 && ic.alive; f++) {
      clearKeys(); if (!P.dead && !(P.petrifyT > 0)) bot();
      const ringing = ic.ringAt > 0; step(1 / 60); t += 1 / 60; pin();
      if (!ringing && ic.ringAt > 0) rings++;
      const wedged = ic.openT > 0 && ic.state !== 'transition'; if (wedged && !wasWedged) wedges++; wasWedged = wedged;
      const swap = ic.state === 'transition'; if (swap && !wasSwap) swaps++; wasSwap = swap;
      if (P.dead) { deaths++; break; }
      if (P.hp < P.stats.maxHp * 0.5) { P.hp = P.stats.maxHp; topUps++; }
    }
    clearKeys();
    console.log('RESULT ' + JSON.stringify({ hero, level, time: ic.alive ? null : +t.toFixed(1), left: ic.alive ? ic.hp / ic.def.hp : 0, topUps, deaths, wedges, swaps, rings }));
  } finally { H.Mechanics.exit(); fixture.restore(); }
}
