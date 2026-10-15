// Gear sets (TODO 28a) in a real browser: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// The real I key opens the bag; real clicks (the piece, then Equip) equip a Moss and an Ember set; the equipment side lists each worn set
// with its bonuses lit as pieces go on; a piece's tooltip shows its set; 720p/1080p fit; zero page or shader errors.
// Writes the gear-sets shot (huds/).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8118;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
const close = async () => {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
};
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'medium');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('knight'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    for (const id of ['mossHood', 'mossCloak', 'wanderBoots', 'emberHelm', 'emberMail']) L.inventory.add(id, 1);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  // Software rendering is far below 60 fps: drive time with explicit frames.
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  await frames(20);

  // ---- the real I key opens the bag; real clicks put the pieces on ------------------------------------------
  await page.keyboard.press('KeyI'); await frames(2);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.InventoryUI.isOpen), 'I opens the bag');
  // bag slot i is a button in the hotbar row (the first HOTBAR.size slots) or the grid above it
  const slotEl = id => page.evaluate(async id => {
    const { HOTBAR } = await import('/src/config/items.js'), i = window.LANTERNMOSS.inventory.getSlots().findIndex(s => s?.itemId === id);
    return i < HOTBAR.size ? `#inventory .inv-hot-grid .inv-slot:nth-child(${i + 1})` : `#inventory .inv-grid .inv-slot:nth-child(${i - HOTBAR.size + 1})`;
  }, id);
  // a real click selects the piece, a real click on the bag's first button (Equip) puts it on
  const equip = async id => { await page.click(await slotEl(id)); await frames(1); await page.click('#inventory .inv-use'); await frames(2); };
  const sets = () => page.$$eval('#inventory .inv-set', els => els.map(e => ({ name: e.querySelector('b').textContent, on: [...e.querySelectorAll('.on')].length, off: [...e.querySelectorAll('.off')].length })));
  await equip('mossHood');
  assert.deepEqual(await sets(), [{ name: 'Moss set 1/3', on: 0, off: 2 }]);
  await equip('mossCloak');
  assert.deepEqual(await sets(), [{ name: 'Moss set 2/3', on: 1, off: 1 }]);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.player.stats.setFx.healing), 0.15);
  await equip('wanderBoots');
  assert.deepEqual(await sets(), [{ name: 'Moss set 3/3', on: 2, off: 0 }]);
  await equip('emberHelm');   // the same head slot: the Moss Hood goes back in the bag and Moss drops to two pieces
  assert.deepEqual(await sets(), [{ name: 'Ember set 1/3', on: 0, off: 2 }, { name: 'Moss set 2/3', on: 1, off: 1 }]);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.inventory.count('mossHood') === 1));
  console.log('PASS  real I and clicks (piece, then Equip) equip the pieces; the equipment side lists each set and lights its bonuses at 2 and 3 pieces; swapping a piece for another set steps the bonus back down');

  // ---- a piece's tooltip names its set and bonuses -------------------------------------------------------------------
  await page.hover(await slotEl('emberMail')); await frames(1);
  const tip = await page.$eval('#inventory .inv-detail', e => e.querySelector('.inv-d-set')?.textContent ?? '');
  assert.match(tip, /Ember set \(3\): 2 worn: Hits burn.* · 3 worn: Hits burn/);
  console.log(`PASS  the Ember Mail tooltip shows "${tip}"`);

  // ---- 720p and 1080p fit; the shot ----------------------------------------------------------------------------------
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width: w, height: h }); await frames(2);
    const fits = await page.$eval('#inventory', inv => {
      const panel = inv.querySelector('.inv-equip').getBoundingClientRect(), stats = inv.querySelector('.inv-gear-stats');
      const detail = inv.querySelector('.inv-detail').getBoundingClientRect();   // the hovered Ember Mail's details, set line included
      return panel.right <= innerWidth && panel.bottom <= innerHeight && detail.bottom <= innerHeight && stats.scrollWidth <= stats.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth;
    });
    assert.ok(fits, `${w}x${h}: the equipment side and its set lines fit`);
  }
  await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed'); const a = document.getElementById('achv'); if (a) a.style.visibility = 'hidden'; });
  await page.screenshot({ path: shotPath('gear-sets'), type: 'jpeg', quality: 86 });
  assert.deepEqual(errors, []);
  console.log('PASS  720p and 1080p fit; zero page or shader errors');
} finally { await close(); }
