// Real browser coverage for extracted module paths, existing campaign UI, keys and version-1 Continue.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url)), port = 8103;
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
  assert.deepEqual(await page.$$eval('#title .campaign .planet[data-released="true"] strong', nodes => nodes.map(n => n.textContent)), ['Lanternmoss', 'Emberfall', 'Frostveil', 'Tidewhisper']);
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.player.invuln = 10000;
    L.inventory.add('wayfarerKey', 2); L.player.placeAt(L.Portals.gate.dir);
  });
  const openGate = async () => {
    await page.evaluate(() => window.LANTERNMOSS.player.placeAt(window.LANTERNMOSS.Portals.gate.dir));
    await page.keyboard.press('KeyE'); await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
    assert.deepEqual(await page.$$eval('#portal-picker [data-destination]', nodes => nodes.map(n => n.dataset.destination)), ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']);
  };
  await openGate();
  assert.equal(await page.$eval('[data-destination="emberfall"]', node => node.disabled), false);
  assert.equal(await page.$eval('[data-destination="frostveil"]', node => node.disabled), true);
  await page.click('[data-destination="emberfall"]');
  await page.waitForFunction(async () => { const { ctx } = await import('/src/core/context.js'); return ctx.planetId === 'emberfall' && !ctx.transitioning; });
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('wayfarerKey')), 1);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.npcs.find(n => n.def.local)?.name), 'Cinder');
  assert.equal(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).houseDef(4).owner), 'Cinder');
  await openGate(); await page.click('[data-destination="lanternmoss"]');
  await page.waitForFunction(async () => { const { ctx } = await import('/src/core/context.js'); return ctx.planetId === 'lanternmoss' && !ctx.transitioning; });
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('wayfarerKey')), 0);
  console.log('PASS  720p low-preset campaign UI, actual portal picker, early keyed trip/return and configured Cinder home');

  await page.evaluate(() => {
    const L = window.LANTERNMOSS; L.goToPlanet('frostveil'); L.player.invuln = 10000;
    const n = L.npcs.find(n => n.name === 'Old Bramble'); n.seen.add(n.def.lines.findIndex(line => line.t.startsWith('Frostveil. My beard')));
    if (!L.saves.save().ok) throw new Error('Save refused');
  });
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.click('[data-act="continue"]');
  await page.waitForFunction(() => window.LANTERNMOSS.planetId === 'frostveil');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.npcs.find(n => n.def.local)?.name), 'Tuva');
  assert.equal(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).houseDef(5).owner), 'Tuva');
  assert.equal(await page.evaluate(() => {
    const n = window.LANTERNMOSS.npcs.find(n => n.name === 'Old Bramble');
    return n.seen.has(n.def.lines.findIndex(line => line.t.startsWith('Frostveil. My beard')));
  }), true);
  const blocked = await page.evaluate(() => {
    const L = window.LANTERNMOSS;
    return ['duskhollow', 'lanternMoon'].map(id => [L.Portals.travel(id), L.planets.travelTo(id)]);
  });
  assert.deepEqual(blocked, [[false, false], [false, false]]);
  await openGate();
  const bounds = await page.$eval('.portal-panel', node => ({ bottom: node.getBoundingClientRect().bottom, right: node.getBoundingClientRect().right,
    top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left, overflow: node.scrollWidth > node.clientWidth }));
  assert.ok(bounds.top >= 0 && bounds.left >= 0 && bounds.bottom <= 1080 && bounds.right <= 1920 && !bounds.overflow);
  await page.keyboard.press('Escape');
  console.log('PASS  1080p Continue restores Tuva/home and numeric arrival memory; unreleased worlds stay absent and refuse direct travel');

  const restored = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { parseSave } = await import('/src/core/save.js');
    const raw = await (await fetch('/tests/fixtures/save-v1.json')).text(), result = parseSave(raw);
    if (!result.ok || !L.saves.restore(result.data)) throw new Error('Version-1 fixture failed to restore');
    return { planet: L.planetId, level: L.player.level, local: L.npcs.find(n => n.def.local)?.name,
      worlds: L.PLANETS.map(p => p.id) };
  });
  assert.deepEqual(restored.worlds, ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']);
  assert.equal(restored.planet, 'emberfall'); assert.equal(restored.local, 'Cinder');
  assert.deepEqual(errors, []);
  console.log('All planet-catalog browser checks passed, including legacy version-1 restoration; zero page errors.');
} finally {
  server.kill();
  server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) {
    // Edge can stall during software-WebGL teardown; keep this helper's shutdown bounded.
    let timeout;
    try {
      await Promise.race([browser.close(), new Promise(resolve => {
        timeout = setTimeout(() => {
          const child = browser.process();
          child?.kill(); browser.disconnect();
          for (const stream of child?.stdio ?? []) stream?.destroy?.();
          child?.unref(); resolve();
        }, 10000);
      })]);
    } finally { clearTimeout(timeout); }
  }
}
