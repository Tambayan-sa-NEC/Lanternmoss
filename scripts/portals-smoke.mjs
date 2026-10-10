// Optional real browser check. Requires puppeteer-core and Edge (or CHROME pointing at Chromium).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8099;
const shots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, stderr = ''; server.stderr.on('data', d => { stderr += d; });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(stderr || `server exited ${code}`))); });
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.setDefaultTimeout(90000); await page.setViewport({ width: 1280, height: 720 });
  const ready = async () => { await page.waitForFunction(() => window.LANTERNMOSS); };
  const pickGate = async () => {
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
      ctx.paused = false; L.InventoryUI.close(); L.Dialog.close(); L.player.placeAt(L.Portals.gate.dir); L.player.invuln = 1000;
    });
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
  };
  const arrive = async id => { await page.waitForFunction(async id => {
    const { ctx } = await import('/src/core/context.js'); return ctx.planetId === id && !ctx.transitioning;
  }, {}, id); };
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' }); await ready();
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.inventory.add('wayfarerKey', 1);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none');
  await pickGate();
  assert.equal(await page.$eval('[data-destination="frostveil"]', e => e.disabled), true);
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.destination), 'emberfall');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.ok(await page.evaluate(() => document.activeElement.hasAttribute('data-portal-close')));
  await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('wayfarerKey')), 1);
  await pickGate(); await page.screenshot({ path: shots + 'portal-destinations.jpg', type: 'jpeg', quality: 85 });
  await page.keyboard.press('Tab'); await page.keyboard.press('Space'); await arrive('emberfall');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('wayfarerKey')), 0);
  await pickGate(); assert.equal(await page.$eval('[data-destination="lanternmoss"]', e => e.disabled), true);
  assert.match(await page.$eval('.portal-warning', e => e.textContent), /gate home is dark/);
  await page.screenshot({ path: shots + 'portal-one-way.jpg', type: 'jpeg', quality: 85 });
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'networkidle0' }); await ready(); await page.locator('[data-act="continue"]').click();
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none');
  await pickGate(); assert.equal(await page.$eval('[data-destination="lanternmoss"]', e => e.disabled), true);
  await page.keyboard.press('Escape'); await page.evaluate(() => window.LANTERNMOSS.inventory.add('wayfarerKey', 1));
  await pickGate(); await page.locator('[data-destination="lanternmoss"]').click(); await arrive('lanternmoss');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Portals.stranded), null);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('wayfarerKey')), 0);
  console.log('PASS real E/picker/keyboard/cancel, one-way key travel, reload restriction and keyed return');
  for (const hero of ['witch', 'knight', 'ranger']) {
    await page.evaluate(async hero => {
      const L = window.LANTERNMOSS, { applyCharacter } = await import('/src/gameplay/characters.js'); applyCharacter(hero);
      L.planets.defeated.add('lanternmoss'); L.planets.defeated.add('emberfall');
    }, hero);
    await pickGate(); await page.locator('[data-destination="frostveil"]').click(); await arrive('frostveil');
    assert.ok(await page.evaluate(() => window.LANTERNMOSS.npcs.some(n => n.name === 'Tuva') && !window.LANTERNMOSS.npcs.some(n => n.name === 'Cinder')));
    await pickGate(); await page.locator('[data-destination="emberfall"]').click(); await arrive('emberfall');
    assert.ok(await page.evaluate(() => window.LANTERNMOSS.npcs.some(n => n.name === 'Cinder') && !window.LANTERNMOSS.npcs.some(n => n.name === 'Tuva')));
    console.log(`PASS ${hero}: free destination buttons, world rebuilds and local villagers`);
  }
  await page.setViewport({ width: 1920, height: 1080 }); await pickGate();
  const layout = await page.$eval('.portal-panel', e => ({ h: e.getBoundingClientRect().height, sh: e.scrollHeight, ch: e.clientHeight }));
  assert.ok(layout.h < 1080); assert.equal(layout.sh, layout.ch);
  assert.deepEqual(errors, []); console.log('All portal browser checks passed (720p/1080p, real WebGL, no page errors).');
} finally { if (browser) await browser.close(); server.kill(); }
