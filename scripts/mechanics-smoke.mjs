// Test-only mechanic in a real browser: ordinary gameplay never imports the fixture.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url)), port = 8104;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, stderr = '';
server.stderr.on('data', data => { stderr += data; });
try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve); server.once('error', reject);
    server.once('exit', code => reject(new Error(stderr || `server exited ${code}`)));
  });
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.setDefaultTimeout(90000);
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.LANTERNMOSS);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Mechanics.id), null);
  const install = () => page.evaluate(async () => {
    const { installMechanicFixture } = await import('/tests/sim/lib/mechanicFixture.mjs');
    const { PLANETS } = await import('/src/config/planets.js');
    window.mechanicProbe = installMechanicFixture();
    for (const p of PLANETS) p.mechanic = window.mechanicProbe.id;
    const { setSetting } = await import('/src/core/settings.js'); setSetting('quality', 'low'); setSetting('pauseOnBlur', false);
  });
  await install(); await page.evaluate(() => window.LANTERNMOSS.goToPlanet('lanternmoss'));
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Mechanics.active.instance.updates), 0);
  await page.click('[data-act="play"]');
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.player.invuln = 10000; });
  await page.waitForFunction(() => window.LANTERNMOSS.Mechanics.toJSON().state.elapsed > 0.1);
  await page.keyboard.press('Escape');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.paused);
  const paused = await page.evaluate(() => window.LANTERNMOSS.Mechanics.toJSON());
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
  assert.deepEqual(await page.evaluate(() => window.LANTERNMOSS.Mechanics.toJSON()), paused);
  await page.keyboard.press('Escape');
  const skip = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js');
    const before = L.Mechanics.toJSON().state.skipped, updates = L.Mechanics.active.instance.updates;
    dayClock.skip(20, 'nap'); L.Mechanics.active.instance.setMarker(11);
    return { delta: L.Mechanics.toJSON().state.skipped - before, updates: L.Mechanics.active.instance.updates - updates, saved: L.saves.save().ok };
  });
  assert.deepEqual(skip, { delta: 20, updates: 0, saved: true });
  console.log('PASS  720p low-preset module integration, inactive production defaults, title/pause freeze and one explicit time skip');

  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await install(); await page.setViewport({ width: 1920, height: 1080 }); await page.click('[data-act="continue"]');
  await page.waitForFunction(() => window.LANTERNMOSS.Mechanics.toJSON()?.state.marker === 11);
  assert.equal(await page.evaluate(() => window.mechanicProbe.live.size), 1);
  const travel = async id => {
    await page.evaluate(() => { const L = window.LANTERNMOSS; L.player.invuln = 10000; L.player.placeAt(L.Portals.gate.dir); });
    await page.keyboard.press('KeyE'); await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
    await page.click(`[data-destination="${id}"]`);
    await page.waitForFunction(async id => { const { ctx } = await import('/src/core/context.js'); return ctx.planetId === id && !ctx.transitioning; }, {}, id);
  };
  await page.evaluate(() => window.LANTERNMOSS.inventory.add('wayfarerKey', 2));
  await travel('emberfall');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Mechanics.toJSON().state.marker), 0);
  await page.evaluate(() => window.LANTERNMOSS.Mechanics.active.instance.setMarker(22));
  await travel('lanternmoss');
  const returned = await page.evaluate(() => ({ state: window.LANTERNMOSS.Mechanics.toJSON().state,
    other: window.LANTERNMOSS.saves.registry.planets.emberfall.mechanics.state.marker, live: window.mechanicProbe.live.size }));
  assert.equal(returned.state.marker, 11); assert.equal(returned.other, 22); assert.ok(returned.state.away > 0); assert.equal(returned.live, 1);
  console.log('PASS  1080p reload Continue and real keyed portal trips preserve independent state with exactly one active instance');

  await page.evaluate(async () => {
    const { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    const { Houses } = await import('/src/gameplay/Houses.js');
    dayClock.skip((DAY.length * 0.9 - dayClock.t + DAY.length) % DAY.length, 'testSetup'); Houses.rest();
  });
  await page.waitForFunction(async () => (await import('/src/gameplay/dayClock.js')).dayClock.phase === 'morning');
  assert.equal(await page.evaluate(() => window.mechanicProbe.records.filter(r => r[0] === 'advance' && r[2] === 'sleep').length), 1);
  const legacy = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { parseSave } = await import('/src/core/save.js');
    const raw = await (await fetch('/tests/fixtures/save-v1.json')).text(), parsed = parseSave(raw);
    if (!parsed.ok || !L.saves.restore(parsed.data)) throw new Error('Legacy restore failed');
    return { planet: L.planetId, state: L.Mechanics.toJSON().state, live: window.mechanicProbe.live.size };
  });
  assert.equal(legacy.planet, 'emberfall'); assert.deepEqual(legacy.state, { elapsed: 0, skipped: 0, away: 0, marker: 0 }); assert.equal(legacy.live, 1);
  assert.equal(await page.evaluate(() => { window.LANTERNMOSS.Mechanics.exit(); window.mechanicProbe.unregister(); return window.mechanicProbe.live.size; }), 0);
  assert.deepEqual(errors, []);
  console.log('All mechanic browser checks passed: night sleep, old v1 defaults and cleanup; zero page errors.');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) {
    let timeout;
    try {
      await Promise.race([browser.close(), new Promise(resolve => {
        timeout = setTimeout(() => {
          const child = browser.process(); child?.kill(); browser.disconnect();
          for (const stream of child?.stdio ?? []) stream?.destroy?.();
          child?.unref(); resolve();
        }, 10000);
      })]);
    } finally { clearTimeout(timeout); }
  }
}
