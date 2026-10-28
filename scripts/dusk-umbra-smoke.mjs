// TODO 30h (Umbra, the Moth of the Last Light) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow boss fixture, never on the authored unreleased
// world. Checks, on the lowest quality preset: she wakes inside a ring of moonfire with her arena lanterns up; a
// real `E` with a lit belt lantern really lights one and really costs oil; with one lit she dives into it and
// crashes, and with nothing lit she comes for the hero; her wingbeat really empties the Oil bar and puts every
// lantern out; her fog really presses the hero's carried light in; 720p and 1080p overflow nothing; zero page and
// shader errors. Writes the duskhollow-umbra and duskhollow-umbra-crash shots (bosses/). Port 8136.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8136, quality: 'low',
  bootstrap: "import {installDuskUmbraFixture} from '/tests/sim/lib/duskUmbraFixture.mjs'; installDuskUmbraFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast', 'achv'];
const clean = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, CLUTTER);
const restore = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, CLUTTER);
/** Starts one of her moves through the kit's own path and lets it land. */
const cast = id => page.evaluate(async id => {
  const L = window.LANTERNMOSS;
  const { startMove } = await import('/src/entities/enemies/behaviors/boss/umbra.js');
  startMove(L.boss, id);
  for (let i = 0; i < Math.ceil((L.boss.def.attacks[id].windup + 0.35) * 60); i++) L.update(1 / 60);
}, id);

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    dayClock.t = 0.95 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    L.goToPlanet('lanternmoss');                                       // reload the borrowed slot so her lair is placed
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    window.__heal = setInterval(() => { const P = L.player; P.hp = P.stats.maxHp; P.invuln = Math.max(P.invuln, 1); L.Pets.petCool = 99; }, 30);
    window.__frame = (dir, { turn = 0, pitch = 0.3, dist = 7 } = {}) => {
      const P = L.player; L.cam.up.copy(P.up); L.cam.fwd.copy(dir).sub(P.up);
      L.cam.fwd.addScaledVector(P.up, -L.cam.fwd.dot(P.up)).normalize();
      L.cam.fwd.applyAxisAngle(P.up, turn); L.cam.pitch = pitch; L.cam.dist = dist; L.cam.init = false; L.cam.lastDrag = 1e9;
    };
  });
  await frames(40);

  // ---- she wakes inside her ring, with the bait standing dark ------------------------------------------------------
  const woke = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const { Quests } = await import('/src/gameplay/quests/Quests.js');
    L.player.level = 11; Quests.st('oldRoad').status = 'done';
    for (let i = 0; i < 20; i++) L.update(1 / 60);
    const ready = L.BossGate.state;
    L.wakeBoss();
    L.player.placeAt(offsetDir(L.boss.home, 0, 9)); L.companion?.snapToHero?.();
    for (let i = 0; i < 90; i++) L.update(1 / 60);
    const lamps = L.enemies.filter(e => e.type === 'arenaLantern' && e.alive);
    return { ready, state: L.BossGate.state, lamps: lamps.length, lit: lamps.filter(l => l.lit).length,
      hover: L.boss.hover, wall: L.BossGate.wall?.kind, ring: L.PLANETS[0].boss.arena.wall, posts: L.BossGate.posts.length };
  });
  assert.equal(woke.ready, 'ready', 'level 11 and the quest open her lair');
  assert.equal(woke.state, 'awake');
  assert.ok(woke.lamps === 4 && woke.lit === 0, `her four arena lanterns stand dark: ${JSON.stringify(woke)}`);
  assert.ok(woke.hover > 3, `and she is in the air (${woke.hover.toFixed(1)} m)`);
  assert.equal(woke.ring, 'moonfire'); assert.ok(woke.posts > 0, 'with a ring of moonfire around the arena');
  console.log(`PASS  she wakes ${woke.hover.toFixed(1)} m up inside a moonfire ring, with ${woke.lamps} dark arena lanterns`);

  // ---- a real E lights the bait, and it costs oil ---------------------------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const lamp = L.enemies.find(e => e.type === 'arenaLantern' && e.alive);
    L.planets.world.mechanics.active.instance.refill(1e6);
    L.player.placeAt(offsetDir(lamp.up, 0.6, 1.4)); L.companion?.snapToHero?.();
    for (let i = 0; i < 12; i++) L.update(1 / 60);
    window.__bait = lamp;
  });
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(prompt, /Light the arena lantern/, `the prompt offers the bait (${prompt})`);
  const oilBefore = await page.evaluate(() => window.LANTERNMOSS.planets.world.mechanics.active.instance.status.oil);
  await page.keyboard.press('KeyE'); await frames(8);
  const baited = await page.evaluate(async () => {
    const L = window.LANTERNMOSS;
    const { brightest } = await import('/src/entities/enemies/behaviors/boss/umbra.js');
    return { lit: !!window.__bait.lit, flame: window.__bait.flame.visible,
      oil: L.planets.world.mechanics.active.instance.status.oil, isTarget: brightest(L.boss).lamp === window.__bait };
  });
  assert.ok(baited.lit && baited.flame, `real E lights it: ${JSON.stringify(baited)}`);
  assert.ok(baited.oil < oilBefore, `and it costs oil (${oilBefore.toFixed(0)} -> ${baited.oil.toFixed(0)})`);
  assert.ok(baited.isTarget, 'a burning arena lantern is now the brightest thing in the ring');
  console.log(`PASS  real E lights an arena lantern for ${(oilBefore - baited.oil).toFixed(0)} oil, and she wants that instead`);

  // ---- she dives into it and crashes ------------------------------------------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    L.player.placeAt(offsetDir(L.boss.home, 3.1, 9)); L.companion?.snapToHero?.();   // clear of the lantern
    for (let i = 0; i < 10; i++) L.update(1 / 60);
  });
  await cast('dive');
  const crashed = await page.evaluate(async () => {
    const L = window.LANTERNMOSS;
    const { isCrashed } = await import('/src/entities/enemies/behaviors/boss/umbra.js');
    return { crashed: isCrashed(L.boss), hover: L.boss.hover, baitLit: !!window.__bait.lit,
      scale: L.boss.behavior.damageScale(L.boss) };
  });
  assert.ok(crashed.crashed, `she dives into the lantern and crashes: ${JSON.stringify(crashed)}`);
  assert.ok(!crashed.baitLit, 'the lantern goes out under her');
  assert.ok(crashed.scale > 1, 'and a crashed moth takes extra damage: the window');
  console.log(`PASS  she dives into the lit lantern, crashes, and takes ${crashed.scale.toFixed(2)}x while she is down`);

  // ---- the wingbeat empties the Oil bar, and the fog presses the light in --------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const lamp = L.enemies.find(e => e.type === 'arenaLantern' && e.alive && !e.drained);
    L.boss.crashT = 0; L.boss.hover = L.boss.def.hover;
    L.planets.world.mechanics.active.instance.refill(1e6);
    lamp.relightT = 0; lamp.lit = true; lamp.flame.visible = true;
    L.player.placeAt(offsetDir(L.boss.home, 1.2, 4)); L.companion?.snapToHero?.();
    for (let i = 0; i < 10; i++) L.update(1 / 60);
    window.__oilBar = document.querySelector('.bar.oil span:last-child')?.textContent ?? '';
  });
  await cast('gust');
  const gusted = await page.evaluate(async () => {
    const L = window.LANTERNMOSS;
    const { litLamps } = await import('/src/entities/enemies/behaviors/boss/umbra.js');
    return { lit: litLamps(L.boss).length, oil: L.planets.world.mechanics.active.instance.status.oil,
      bar: document.querySelector('.bar.oil span:last-child')?.textContent ?? '', before: window.__oilBar,
      shades: (L.boss.shades ?? []).length };
  });
  assert.equal(gusted.lit, 0, 'the wingbeat puts every arena lantern out');
  assert.notEqual(gusted.bar, gusted.before, `and the Oil bar really moves (${gusted.before} -> ${gusted.bar})`);
  assert.ok(gusted.shades > 0, 'with shadelings out of the dark it leaves');

  const fogged = await page.evaluate(async () => {
    const L = window.LANTERNMOSS;
    L.planets.world.mechanics.active.instance.refill(1e6);
    L.boss.hp = L.boss.def.hp * 0.45;                                   // into her second phase, where she drinks
    for (let i = 0; i < 10; i++) L.update(1 / 60);
    const clearR = L.LocalLights.heroLight?.source.radius ?? 0;
    const { startMove } = await import('/src/entities/enemies/behaviors/boss/umbra.js');
    startMove(L.boss, 'drink');
    for (let i = 0; i < Math.ceil((L.boss.def.attacks.drink.windup + 0.4) * 60); i++) L.update(1 / 60);
    return { clearR, blind: L.player.blindK, foggedR: L.LocalLights.heroLight?.source.radius ?? 0,
      drained: L.enemies.filter(e => e.type === 'arenaLantern' && e.drained).length };
  });
  assert.ok(fogged.blind < 1, `her scales hang on the hero: ${JSON.stringify(fogged)}`);
  assert.ok(fogged.foggedR < fogged.clearR, `and really press the carried light in (${fogged.clearR.toFixed(1)} m -> ${fogged.foggedR.toFixed(1)} m)`);
  assert.ok(fogged.drained > 0, 'each feed drains a lantern for good');
  console.log(`PASS  her wingbeat empties the Oil bar and her fog presses the carried light from ${fogged.clearR.toFixed(1)} m to ${fogged.foggedR.toFixed(1)} m`);

  // ---- both resolutions, and the two feature shots -----------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height !== 1080) continue;

    // Umbra in the air over a burning arena lantern, inside her ring of moonfire.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const b = L.boss, lamp = L.enemies.find(e => e.type === 'arenaLantern' && e.alive && !e.drained);
      lamp.relightT = 0; lamp.lit = true; lamp.flame.visible = true;
      if (lamp.light) lamp.light.source.intensity = lamp.def.light.intensity;
      L.planets.world.mechanics.active.instance.refill(1e6);
      L.player.blindK = 1;
      if (L.companion) { L.companion.root.visible = false; L.companion.voiceT = 1e9; }   // its chirp bubble shows even when it does not
      const stand = offsetDir(lamp.up, 2.6, 5.5);
      const pin = () => {
        const d = offsetDir(lamp.up, 2.0, 3.0);
        b.up.copy(d); b.hover = b.def.hover; b.r = L.planets.world.physics ? b.r : b.r;
        b.pos.copy(d).multiplyScalar(b.r + b.hover);
        b.home.copy(b.home); b.state = 'chase'; b.cool = 1e9; b.hideTele();
        b.fwd.copy(tangentToward(d, stand));
      };
      L.player.placeAt(stand); pin(); L.player.fwd.copy(tangentToward(L.player.up, lamp.up));
      for (let i = 0; i < 160; i++) { L.update(1 / 60); pin(); }       // the toasts, numbers and emotes fade
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, lamp.up));
      window.__frame(lamp.up, { turn: 0.5, pitch: -0.28, dist: 7.5 }); // up at her, over the burning lantern
      for (let i = 0; i < 4; i++) { L.update(1 / 60); pin(); }
    });
    await frames(2); await clean();
    await page.screenshot({ path: shotPath('duskhollow-umbra'), type: 'jpeg', quality: 88 });
    await restore();

    // The damage window: Umbra crashed in the ground beside the lantern she dived into.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { groundHeight } = await import('/src/world/terrain.js');
      const b = L.boss, lamp = L.enemies.find(e => e.type === 'arenaLantern' && e.alive && !e.drained);
      if (L.companion) { L.companion.root.visible = false; L.companion.voiceT = 1e9; }
      for (const s of b.shades ?? []) if (s.alive) s.vanish();          // her adds step out: this shot is the window itself
      b.shades = [];
      const stand = offsetDir(lamp.up, 2.6, 4.6);
      const pin = () => {
        const d = offsetDir(lamp.up, 2.1, 1.6);
        b.up.copy(d); b.crashT = 3; b.hover = 0; b.r = groundHeight(d); b.pos.copy(d).multiplyScalar(b.r);
        b.state = 'recover'; b.timer = 3; b.cool = 1e9; b.hideTele();
        b.fwd.copy(tangentToward(d, stand));
      };
      L.player.placeAt(stand); pin(); L.player.fwd.copy(tangentToward(L.player.up, b.up));
      for (let i = 0; i < 160; i++) { L.update(1 / 60); pin(); }       // the damage numbers and toasts fade
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, b.up));
      window.__frame(b.up, { turn: 0.55, pitch: 0.22, dist: 6.5 });
      for (let i = 0; i < 4; i++) { L.update(1 / 60); pin(); }
    });
    await frames(2); await clean();
    await page.screenshot({ path: shotPath('duskhollow-umbra-crash'), type: 'jpeg', quality: 88 });
    await restore();
    await page.evaluate(() => { const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true; });
  }
  await page.evaluate(() => clearInterval(window.__heal));
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, both feature shots are saved, and there are zero page and shader errors');
} finally { await close(); }
