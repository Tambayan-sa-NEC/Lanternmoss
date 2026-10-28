// Optional real WebGL/UI verification for TODO 25a. Requires puppeteer-core and Edge (or CHROME).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8100;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, stderr = ''; server.stderr.on('data', d => { stderr += d; });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(stderr || `server exited ${code}`))); });
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.setDefaultTimeout(90000); await page.setViewport({ width: 1280, height: 720 });
  const ready = async () => { await page.waitForFunction(() => window.LANTERNMOSS); };
  const settled = async indoors => { await page.waitForFunction(async indoors => {
    const { ctx } = await import('/src/core/context.js'); return !ctx.transitioning && (!!ctx.indoors === indoors);
  }, {}, indoors); };
  const enter = async () => {
    await page.evaluate(() => { const L = window.LANTERNMOSS; L.player.placeAt(L.Home.cottage.door); L.player.invuln = 1000; });
    await page.keyboard.press('KeyE'); await settled(true);
  };
  const leave = async () => {
    await page.keyboard.press('Escape');
    await page.evaluate(async () => { const { Houses } = await import('/src/gameplay/Houses.js'); const s = Houses.inside;
      s.x = s.room.entrance.x; s.z = s.room.entrance.z; s.armed = false; s.vx = s.vz = 0; Houses.placeHero(); });
    await page.keyboard.press('KeyE'); await settled(false);
  };
  const menu = async () => {
    await page.evaluate(async () => { const { Houses } = await import('/src/gameplay/Houses.js'), { HOME } = await import('/src/config/home.js');
      Object.assign(Houses.inside, { x: HOME.sign.x, z: HOME.sign.z + 0.85, vx: 0, vz: 0 }); Houses.placeHero(); });
    await page.keyboard.press('KeyE'); await page.waitForFunction(() => window.LANTERNMOSS.HomeUI.isOpen);
  };
  const travel = async id => {
    await page.evaluate(() => { const L = window.LANTERNMOSS; L.player.placeAt(L.Portals.gate.dir); });
    await page.keyboard.press('KeyE'); await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
    await page.locator(`[data-destination="${id}"]`).click();
    await page.waitForFunction(async id => { const { ctx } = await import('/src/core/context.js'); return ctx.planetId === id && !ctx.transitioning; }, {}, id);
  };
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' }); await ready();
  await page.click('[data-act="play"]'); await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip();
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none');
  await enter(); await menu(); await page.screenshot({ path: shotPath('home-claim'), type: 'jpeg', quality: 85 });
  await page.keyboard.press('Tab'); await page.keyboard.press('Space');
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.Home.state.claimed));
  assert.equal(await page.$$eval('[data-home-action="place"]:disabled', buttons => buttons.length), 6);   // every furnishing, the pet basket (TODO 35) included
  await page.keyboard.press('Escape');
  // Leave using the actual door interaction (do not press Escape again and open the pause menu).
  await page.evaluate(async () => { const { Houses } = await import('/src/gameplay/Houses.js'); const s = Houses.inside;
    s.x = s.room.entrance.x; s.z = s.room.entrance.z; s.armed = false; s.vx = s.vz = 0; Houses.placeHero(); });
  await page.keyboard.press('KeyE'); await settled(false);
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { FURNISHINGS } = await import('/src/config/home.js');
    for (const f of Object.values(FURNISHINGS)) for (const [id, n] of f.needs) L.inventory.add(id, n);
    L.player.placeAt(L.Stations.list.find(s => s.id === 'workbench').dir);
  });
  await page.keyboard.press('KeyE'); await page.waitForFunction(() => window.LANTERNMOSS.InventoryUI.tab === 'craft' && window.LANTERNMOSS.InventoryUI.isOpen);
  await page.locator('[data-filter="all"]').click();
  for (const id of ['homeBed', 'homeTable', 'homeRug', 'homeLamp', 'homePlant']) await page.locator(`[data-recipe="${id}"]:not([data-batches])`).click();
  assert.ok(await page.evaluate(() => ['homeBed', 'homeTable', 'homeRug', 'homeLamp', 'homePlant'].every(id => window.LANTERNMOSS.inventory.count(id) === 1)));
  await page.keyboard.press('Escape'); await enter(); await menu();
  for (const id of ['homeBed', 'homeTable', 'homeRug', 'homeLamp', 'homePlant']) await page.locator(`[data-home-action="place"][data-item="${id}"]`).click();
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Home.state.furniture.length), 5);
  const compact = await page.$eval('.home-panel', e => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom, sh: e.scrollHeight, ch: e.clientHeight }));
  assert.ok(compact.top >= 18 && compact.bottom <= 702); assert.equal(compact.sh, compact.ch, '720p furniture panel fits without clipping or scrolling');
  await page.screenshot({ path: shotPath('home-furnishings'), type: 'jpeg', quality: 85 });
  await page.locator('[data-home-action="remove"][data-item="homeRug"]').click();
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('homeRug')), 1);
  await page.locator('[data-home-action="place"][data-item="homeRug"]').click();
  await page.keyboard.press('Escape'); await page.screenshot({ path: shotPath('home-interior'), type: 'jpeg', quality: 85 });
  console.log('PASS real door/sign/claim, keyboard focus/Space, five Craft buttons and furniture placement/removal');

  for (const hero of ['witch', 'knight', 'ranger']) {
    await page.evaluate(async hero => {
      const L = window.LANTERNMOSS, { applyCharacter } = await import('/src/gameplay/characters.js');
      const { Houses } = await import('/src/gameplay/Houses.js'), { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
      applyCharacter(hero); Object.assign(L.player, { hp: 10, mana: 5, energy: 7 }); dayClock.t = DAY.length * 0.8;
      Object.assign(Houses.inside, { x: 1.5, z: -1.7, vx: 0, vz: 0 }); Houses.placeHero();
    }, hero);
    await page.keyboard.press('KeyE');
    await page.waitForFunction(async () => {
      const { ctx } = await import('/src/core/context.js'), { dayClock } = await import('/src/gameplay/dayClock.js');
      return !ctx.transitioning && dayClock.phase === 'morning';
    });
    const rest = await page.evaluate(() => { const L = window.LANTERNMOSS; return { hp: L.player.hp, maxHp: L.player.stats.maxHp, mana: L.player.mana, maxMana: L.player.stats.maxMana, energy: L.player.energy }; });
    assert.equal(rest.hp, rest.maxHp); assert.equal(rest.mana, rest.maxMana); assert.ok(rest.energy > 99);
    console.log(`PASS ${hero}: actual own-bed E interaction restores health/resource/energy and reaches morning`);
  }
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'networkidle0' }); await ready(); await page.locator('[data-act="continue"]').click(); await settled(true);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Home.state.furniture.length), 5);
  await menu(); await page.setViewport({ width: 1920, height: 1080 });
  const layout = await page.$eval('.home-panel', e => ({ h: e.getBoundingClientRect().height, sh: e.scrollHeight, ch: e.clientHeight }));
  assert.ok(layout.h < 1080); assert.equal(layout.sh, layout.ch);
  await leave(); await page.evaluate(() => window.LANTERNMOSS.planets.defeated.add('lanternmoss')); await travel('emberfall');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Home.state.claimed), false);
  await enter(); await menu(); await page.locator('[data-home-action="claim"]').click(); await leave(); await travel('lanternmoss');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Home.state.furniture.length), 5);
  assert.deepEqual(errors, []); console.log('All home browser checks passed (720p/1080p, indoor Continue, independent portal homes, no page errors).');
} finally { if (browser) await browser.close(); server.kill(); }
