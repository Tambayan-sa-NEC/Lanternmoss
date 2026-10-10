// Optional real WebGL/HUD smoke check for the tuned bosses and seed shop.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8098;
const shots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, stderr = ''; server.stderr.on('data', d => { stderr += d; });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(stderr || `server exited ${code}`))); });
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip();
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  for (const hero of ['witch', 'knight', 'ranger']) for (const planet of [1, 2]) {
    const result = await page.evaluate(async ({ hero, planet }) => {
      const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
      const { applyCharacter } = await import('/src/gameplay/characters.js');
      const { offsetDir } = await import('/src/utils/sphere.js');
      ctx.paused = true; L.goToPlanet(planet); L.wakeBoss(); applyCharacter(hero);
      const B = L.boss; L.player.placeAt(offsetDir(B.home, 0.3, 8)); L.player.invuln = 100; B.aggro();
      B.hp = B.def.hp * 0.49;
      ctx.paused = false; for (let i = 0; i < 240; i++) L.update(1 / 60); ctx.paused = true;
      return { name: document.querySelector('#bossbar .bn').textContent, pct: document.querySelector('#bossbar .pct').textContent,
        phase: B.bossPhase, flying: B.flying, immune: B.invulnerable, visible: getComputedStyle(document.getElementById('bossbar')).display,
        health: B.def.hp, dead: L.player.dead };
    }, { hero, planet });
    assert.equal(result.phase, 1); assert.equal(result.dead, false); assert.equal(result.visible, 'block');
    assert.ok(Number.parseInt(result.pct) >= 49 && Number.parseInt(result.pct) <= 50);
    assert.match(result.name, planet === 1 ? /Pyrrhax.*Inferno/ : /Malgrath.*Ascended/);
    if (planet === 2) { assert.equal(result.flying, true); assert.equal(result.immune, false); }
    console.log(`PASS ${hero}/${planet}: ${JSON.stringify(result)}`);
  }
  await page.screenshot({ path: shots + 'balance-flight.jpg', type: 'jpeg', quality: 84 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ShopUI } = await import('/src/ui/ShopUI.js');
    L.player.coins = 20; ShopUI.open(L.npcs.find(n => n.name === 'Pim'));
  });
  for (const [id, price] of [['carrotSeeds', 3], ['wheatSeeds', 3], ['pumpkinSeeds', 5]]) {
    const row = await page.$eval(`[data-buy="${id}"]`, e => e.parentElement.textContent);
    assert.match(row, new RegExp(`✦\\s*${price}`));
  }
  await page.click('[data-buy="carrotSeeds"]');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.player.coins), 17);
  await page.screenshot({ path: shots + 'balance-shop.jpg', type: 'jpeg', quality: 84 });
  assert.deepEqual(errors, []);
  console.log('All balance browser checks passed (720p, real WebGL).');
} finally { if (browser) await browser.close(); server.kill(); }
