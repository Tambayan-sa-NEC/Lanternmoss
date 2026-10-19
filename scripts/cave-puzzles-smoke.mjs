// TODO 29e, port 8127. The last stretch of a cave in a real browser: real movement keys cannot walk through the
// warded door; real E lights the lantern switches, opens the chest they unseal and turns the Warden's Key; a real
// push shoulders a stone onto its plate; and the end room's guardian reads clearly once it wakes. 720p and 1080p,
// nothing overflowing, zero page/shader errors. Software frames are driven explicitly.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8127;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS|ERROR:/i.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 }); await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js');
    setSetting('pauseOnBlur', false); setSetting('quality', 'low'); setSetting('hitStop', false);
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('knight'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    L.player.invuln = 1e9; L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  const state = () => page.evaluate(async () => {
    const L = window.LANTERNMOSS, Q = L.CavePuzzles, { ctx } = await import('/src/core/context.js');
    const el = document.getElementById('prompt');
    return { prompt: getComputedStyle(el).display !== 'none' ? el.textContent : '',
      room: L.Dungeons.inside?.room ?? null, end: L.Dungeons.inside?.layout.end ?? null,
      lit: Q.switches.filter(s => s.lit).length, switches: Q.switches.length,
      pressed: Q.plates.filter(p => p.pressed).length, plates: Q.plates.length,
      solved: Q.solved, door: !!Q.door?.open, chest: !!Q.keyChest?.opened, shortcut: !!Q.shortcut?.open,
      blockers: ctx.room?.blockers.length ?? 0, keys: L.inventory.count('wardenKey'),
      guardian: Q.guardian ? { type: Q.guardian.type, elite: !!Q.guardian.elite, alive: Q.guardian.alive } : null,
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
  });
  /** Stand `d` metres from a piece along the line to its room's centre; a negative `d` stands on the far side,
      which keeps a lantern switch's prompt from competing with the key chest behind it. */
  const standBy = (what, index, d) => page.evaluate(async (what, index, d) => {
    const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
    const Q = L.CavePuzzles, piece = index === null ? Q[what] : Q[what][index];
    const at = piece.root?.position ?? piece.parts?.root.position ?? piece;
    const x = at.x ?? piece.x, z = at.z ?? piece.z;
    const r = L.Dungeons.inside.layout.rooms.find(r => r.id === (piece.room ?? Q.ending.puzzle.room));
    const dx = r.x - x, dz = r.z - z, len = Math.hypot(dx, dz) || 1;
    F.placeCaveHero(x + (dx / len) * d, z + (dz / len) * d);
    L.cam.init = false; ctx.companion.snapToHero();
    return { id: piece.id, x, z };
  }, what, index, d);

  await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
  const start = await state();
  assert.equal(start.blockers, 1, 'the cave starts with its ward up');
  assert.ok(start.switches > 0 && !start.solved && !start.door && !start.chest && !start.shortcut, 'and nothing done');

  // 720p walks Lanternmoss (lantern switches) and 1080p Emberfall (push stones), so both kinds of puzzle are
  // actually played with real input, at both sizes.
  for (const [width, height, planet] of [[1280, 720, 0], [1920, 1080, 1]]) {
    await page.setViewport({ width, height });
    await page.evaluate(() => { const L = window.LANTERNMOSS; L.Dungeons.leave(); L.CavePuzzles.resetRun(); });
    await frames(60);
    await page.evaluate(p => window.LANTERNMOSS.goToPlanet(p), planet); await frames(60);
    await page.evaluate(() => { const L = window.LANTERNMOSS; L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9; });
    await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);

    // ---- the ward really stops real movement keys ------------------------------------------------------------------
    const door = await page.evaluate(() => {
      const L = window.LANTERNMOSS, d = L.CavePuzzles.door, s = L.Dungeons.inside;
      const end = s.layout.rooms.find(r => r.id === s.layout.end), room = s.layout.rooms.find(r => r.id === d.room);
      return { x: d.x, z: d.z, dx: Math.sign(end.x - room.x), dz: Math.sign(end.z - room.z), end: end.id };
    });
    await page.evaluate(async d => {
      const F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
      F.placeCaveHero(d.x - d.dx * 2.2, d.z - d.dz * 2.2); window.LANTERNMOSS.cam.init = false; ctx.companion.snapToHero();
    }, door);
    await frames(6);
    const key = door.dz ? (door.dz < 0 ? 'KeyW' : 'KeyS') : (door.dx < 0 ? 'KeyA' : 'KeyD');
    await page.keyboard.down(key); await frames(180); await page.keyboard.up(key); await frames(4);
    const held = await state();
    assert.notEqual(held.room, held.end, `${width}: real keys cannot walk through the ward (room ${held.room})`);
    assert.ok(/locked|Warden/.test(held.prompt), `and E reads the door (got "${held.prompt.trim()}")`);

    // ---- solving the puzzle with real prompts -----------------------------------------------------------------------
    const kind = await page.evaluate(() => window.LANTERNMOSS.CavePuzzles.ending.puzzle.kind);
    if (kind === 'lanterns') {
      const n = await page.evaluate(() => window.LANTERNMOSS.CavePuzzles.switches.length);
      for (let i = 0; i < n; i++) {
        await standBy('switches', i, -1.0); await frames(6);
        const at = await state();
        assert.ok(/Light the lantern/.test(at.prompt), `${width}: E offers switch ${i} (got "${at.prompt.trim()}")`);
        await page.keyboard.press('KeyE'); await frames(10);
      }
    } else {
      const n = await page.evaluate(() => window.LANTERNMOSS.CavePuzzles.stones.length);
      for (let i = 0; i < n; i++) {
        await page.evaluate(async i => {
          const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
          const st = L.CavePuzzles.stones[i];
          F.placeCaveHero(st.root.position.x, st.root.position.z + 1.05);
          L.cam.init = false; ctx.companion.snapToHero();
        }, i);
        await frames(6);
        await page.keyboard.down('KeyW');
        for (let f = 0; f < 900; f += 10) { await frames(10); if ((await state()).pressed > i) break; }
        await page.keyboard.up('KeyW'); await frames(4);
        assert.ok((await state()).pressed > i, `${width}: a real push put stone ${i} on its plate`);
      }
    }
    const solved = await state();
    assert.ok(solved.solved, `${width}: the ${kind} puzzle is solved`);

    // ---- the key, and the ward it turns -------------------------------------------------------------------------------
    await standBy('keyChest', null, 1.4); await frames(6);
    const atChest = await state();
    assert.ok(/Open the/.test(atChest.prompt), `${width}: the chest now opens (got "${atChest.prompt.trim()}")`);
    await page.keyboard.press('KeyE'); await frames(30);
    assert.equal((await state()).keys, 1, "the Warden's Key is in the bag");
    await standBy('door', null, 1.5); await frames(6);
    await page.keyboard.press('KeyE'); await frames(30);
    const turned = await state();
    assert.ok(turned.door && turned.blockers === 0, `${width}: the ward is down`);
    assert.equal(turned.keys, 0, 'and the key was spent');
    assert.ok(!turned.overflow, `${width}x${height}: nothing overflows`);
    console.log(`PASS  ${width}x${height}: the ward stops real keys, a real ${kind} puzzle solves it, and E turns the key`);
  }

  // ---- the guardian wakes, and its fall opens the way home -------------------------------------------------------------
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.Dungeons.leave(); });
  await frames(60); await page.evaluate(() => window.LANTERNMOSS.goToPlanet(0)); await frames(60);
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9; L.Dungeons.enter(); });
  await frames(60);
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
    const s = L.Dungeons.inside, end = s.layout.rooms.find(r => r.id === s.layout.end);
    const g = L.CavePuzzles.ending.guardian;
    // Stand off to one side and a few metres back, so the warden and its halo sit well inside the frame.
    F.placeCaveHero(g.x - 1.6, g.z + 3.0); L.cam.init = false; ctx.companion.snapToHero();
    L.player.fwd.copy(ctx.room.toward(L.player.pos, s.built.toWorld(g.x, g.z)));
  });
  await frames(30);
  const woke = await state();
  assert.ok(woke.guardian?.alive && woke.guardian.elite, `the end room wakes an elite guardian (${JSON.stringify(woke.guardian)})`);
  assert.ok(!woke.shortcut, 'and the way home is still shut');
  // A calm frame of the warden before the fight: the subject is the guardian and the room it keeps.
  await page.evaluate(() => {
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    document.body.classList.add('photo');
  });
  await frames(90);
  // #cresult carries the planet-arrival card and #save-notice the autosave tick: neither belongs in the picture.
  await page.addStyleTag({ content: '#toast, #achv, #banner, #cresult, #save-notice { display: none !important; }' });
  await page.screenshot({ path: shotPath('cave-guardian'), type: 'jpeg', quality: 88 });
  await page.evaluate(() => document.body.classList.remove('photo'));

  await page.evaluate(async () => {
    const { damageEnemy } = await import('/src/combat/damage.js');
    damageEnemy(window.LANTERNMOSS.CavePuzzles.guardian, 1e9, { team: 'player' });
  });
  await frames(45);
  const beaten = await state();
  assert.ok(beaten.shortcut, 'beating the guardian opens the way home');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.worldItems.length), 0, 'its loot went to the bag, not the cave floor');
  await standBy('shortcut', null, 1.3); await frames(6);
  const atWay = await state();
  assert.ok(/way back/i.test(atWay.prompt), `E offers the way back (got "${atWay.prompt.trim()}")`);
  await page.keyboard.press('KeyE'); await frames(30);
  const home = await state();
  assert.ok(home.room && home.room !== home.end, `the way back carried the hero out of the end room (${home.room})`);
  assert.ok(!home.overflow);
  assert.deepEqual(errors, []);
  console.log('PASS  the guardian wakes and reads clearly, its fall opens the way back, and real E takes it; zero page/shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
}
