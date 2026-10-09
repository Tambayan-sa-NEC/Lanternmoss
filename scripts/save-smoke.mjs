// Optional real-Chrome save/reload/file smoke test and menu screenshots. Same prerequisites as screenshots.mjs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url)), port = 8094;
const downloads = mkdtempSync(join(tmpdir(), 'lanternmoss-save-'));
const shots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
let browser;
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const session = await page.createCDPSession(); await session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  assert.equal(await page.$eval('[data-act="continue"]', e => e.hidden), true);
  await wait(1500); await page.screenshot({ path: join(shots, 'title.jpg'), type: 'jpeg', quality: 84 });
  await page.click('[data-act="play"]');
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.PauseMenu.open();
    L.player.level = 3; L.player.coins = 421; L.player.hp = 73; L.PauseMenu.show('main');
    document.getElementById('achv').style.visibility = 'hidden'; });
  await page.click('[data-go="save"]');
  assert.equal(await page.$eval('#save-notice', e => e.textContent), 'Saved');
  await wait(700); await page.screenshot({ path: join(shots, 'save-menu.jpg'), type: 'jpeg', quality: 84 });
  // Menus must fit the viewport after adding actions.
  assert.ok(await page.$eval('#pause .panel', e => e.getBoundingClientRect().bottom <= innerHeight));
  await page.click('[data-go="export"]');
  let exported;
  for (let i = 0; i < 30 && !exported; i++) { exported = readdirSync(downloads).find(f => f.endsWith('.json')); if (!exported) await wait(100); }
  assert.ok(exported, 'export download');
  const exportedPath = join(downloads, exported), data = JSON.parse(readFileSync(exportedPath, 'utf8'));
  assert.equal(data.systems.player.coins, 421); assert.equal(data.slot, 0);
  await page.click('[data-go="quit"]'); await page.click('[data-go="confirm-quit"]');
  await wait(1800); await page.screenshot({ path: join(shots, 'continue.jpg'), type: 'jpeg', quality: 84 });
  assert.ok(await page.$eval('#title .campaign', e => e.getBoundingClientRect().bottom <= innerHeight));
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  assert.equal(await page.$eval('[data-act="continue"]', e => e.hidden), false);
  await page.click('[data-act="continue"]');
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.PauseMenu.open();
    if (L.player.coins !== 421 || L.player.level !== 3 || L.player.hp < 73 || L.player.hp > 75) throw new Error('Reload lost adventure values'); });
  await page.click('[data-go="quit"]'); await page.click('[data-go="confirm-quit"]');
  await page.click('[data-act="play"]'); assert.ok(await page.$('#pause .new'));
  await page.click('[data-go="main"]'); // cancelling New Adventure keeps the saved slot
  const damagedPath = join(downloads, 'damaged.json'); writeFileSync(damagedPath, '{broken');
  const badChooser = page.waitForFileChooser(); await page.click('[data-act="import"]'); await (await badChooser).accept([damagedPath]);
  await page.waitForFunction(() => document.getElementById('toast').textContent.includes('damaged'));
  assert.equal(await page.$eval('#toast', e => getComputedStyle(e).visibility), 'visible');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lanternmoss.adventure')).systems.player.coins), 421);
  const chooser = page.waitForFileChooser(); await page.click('[data-act="import"]'); await (await chooser).accept([exportedPath]);
  await page.waitForSelector('#pause .import');
  await page.click('[data-go="confirm-import"]'); await page.waitForFunction(() => window.LANTERNMOSS.MainMenu.screen === null);
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.PauseMenu.open(); if (L.player.coins !== 421 || L.player.level !== 3) throw new Error('Import lost adventure'); });
  assert.deepEqual(errors, []);
  console.log('PASS  Chrome reload, Continue, manual Save, quit, new-adventure confirmation, export and import; menus fit 1280x720');
} finally {
  await browser?.close(); server.kill(); rmSync(downloads, { recursive: true, force: true });
}
