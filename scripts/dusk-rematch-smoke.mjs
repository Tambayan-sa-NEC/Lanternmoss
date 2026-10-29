// TODO 31f: the unreleased Dusk pair's real E rematch offers, visible new warnings, beetle setting and bounds.
// Uses the 30i test fixture only. Edge is the default; CHROME overrides it. Port 8149.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';

const { page, errors, close } = await tidewhisperBrowser({ port: 8149, quality: 'low',
  bootstrap: "import {installDuskUmbraFixture} from '/tests/sim/lib/duskUmbraFixture.mjs'; installDuskUmbraFixture();" });
const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
const view = () => page.evaluate(() => ({
  fits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
  width: innerWidth, height: innerHeight,
}));
try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'),
      { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    dayClock.t = 0.95 * DAY.length; L.goToPlanet('lanternmoss'); L.setWeather('clear'); L.weather.timer = 1e9;
    L.player.invuln = 1e9;
  });
  await frames(35);
  await page.evaluate(() => {
    const L = window.LANTERNMOSS, g = L.enemies.find(e => e.type === 'grandweaver');
    L.planets.miniDefeated.add(g.portalId); g.vanish();
    L.player.placeAt(g.home); L.player.vel.set(0, 0, 0);
  });
  await frames(8);
  assert.match(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label ?? ''),
    /Challenge Grandmother Gloomweaver again/);
  await page.keyboard.press('KeyE'); await frames(100);
  const mini = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Rematch } = await import('/src/gameplay/Rematch.js'),
      { setSetting } = await import('/src/core/settings.js');
    const g = Rematch.fighting;
    if (!g || g.type !== 'grandweaver') return { type: g?.type };
    L.player.placeAt(g.home); g.def.phases.forEach(p => { p.attacks = ['silkRing']; });
    g.cool = 0; g.lastAttack = null; g.state = 'chase'; g.moveCd = {};
    for (let i = 0; i < 35; i++) L.update(1 / 60);
    const marks = g.silkMarks?.filter(m => m.mesh.visible).length ?? 0;
    setSetting('roundBeetles', true); for (let i = 0; i < 4; i++) L.update(1 / 60);
    const beetle = g.beetle.visible && !g.spider.visible;
    setSetting('roundBeetles', false); for (let i = 0; i < 4; i++) L.update(1 / 60);
    return { type: g.type, marks, beetle, spider: g.spider.visible };
  });
  assert.deepEqual(mini, { type: 'grandweaver', marks: 3, beetle: true, spider: true });
  assert.ok((await view()).fits, 'the marked silk ring fits at 720p');
  console.log('PASS  real E starts Grandmother rematch; its silk ring and beetle accessibility look render at 720p');

  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Rematch } = await import('/src/gameplay/Rematch.js'),
      { Quests } = await import('/src/gameplay/quests/Quests.js');
    Rematch.cancel();
    L.player.level = 11; Quests.st('oldRoad').status = 'done';
    L.planets.defeated.add('lanternmoss'); L.BossGate.state = 'beaten';
    const b = L.boss; b.vanish(); L.player.placeAt(b.home); L.player.vel.set(0, 0, 0);
  });
  await frames(8);
  assert.match(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label ?? ''),
    /Challenge Umbra again/);
  await page.keyboard.press('KeyE'); await frames(95);
  assert.equal(await page.evaluate(async () => (await import('/src/gameplay/Rematch.js')).Rematch.fighting?.type), 'umbra');

  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const state = await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { Rematch } = await import('/src/gameplay/Rematch.js'),
        { lightLamp, isLit } = await import('/src/entities/enemies/behaviors/arenaLamp.js'),
        { startMove } = await import('/src/entities/enemies/behaviors/boss/umbra.js'),
        { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const b = Rematch.fighting, lamp = L.enemies.find(e => e.type === 'arenaLantern' && e.alive && !e.drained);
      lamp.relightT = 0; L.planets.world.mechanics.active.instance.refill(1e6); lightLamp(lamp);
      b.cool = 1e9; b.def.phases.forEach(p => { p.attacks = ['eclipse']; });
      L.player.placeAt(offsetDir(b.home, 0, 10)); L.player.vel.set(0, 0, 0);
      L.player.fwd.copy(tangentToward(L.player.up, b.up));
      L.cam.up.copy(L.player.up); L.cam.fwd.copy(b.up).sub(L.player.up);
      L.cam.fwd.addScaledVector(L.player.up, -L.cam.fwd.dot(L.player.up)).normalize();
      L.cam.pitch = 0.2; L.cam.dist = 11; L.cam.init = false; L.cam.lastDrag = 1e9;
      startMove(b, 'eclipse');
      for (let i = 0; i < 38; i++) L.update(1 / 60);
      return { lit: isLit(lamp), dots: b.mothAim.eclipse.lane.dots.filter(d => d.visible).length,
        attacking: b.attack, fog: b.fogT };
    });
    assert.equal(state.attacking, 'eclipse'); assert.equal(state.lit, false);
    assert.equal(state.dots, 10, 'the committed moth-dive lane is visibly marked');
    assert.ok((await view()).fits, `${width}x${height} has no overflow`);
    if (height === 1080) {
      await page.evaluate(() => {
        const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = false;
        for (const e of L.enemies) if (e.beacon) e.beacon.visible = false;
        for (const id of ['combat', 'petcard', 'hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'toast', 'achv', 'hint', 'save-notice']) {
          const el = document.getElementById(id); if (el) el.style.visibility = 'hidden';
        }
      });
      await frames(2);
      await page.screenshot({ path: shotPath('duskhollow-rematch'), type: 'jpeg', quality: 88 });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS  real E starts Umbra rematch; the new moth dive renders at 720p/1080p with zero page/shader errors');
} finally { await close(); }
