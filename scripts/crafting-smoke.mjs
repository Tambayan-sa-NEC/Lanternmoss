// Optional real Chromium check: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8097;
const shots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'medium');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('knight'); L.begin(); L.Tutorial.skip();
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    ctx.paused = true; L.inventory.clear(); L.inventory.add('glowcap', 15); L.InventoryUI.open('craft');
  });
  assert.equal(await page.$eval('[data-card="glowTonic"] [data-batches="5"]', e => e.disabled), false);
  await page.click('[data-card="glowTonic"] [data-batches="5"]');
  await page.waitForFunction(() => window.LANTERNMOSS.inventory.count('glowTonic') === 5);
  const firstCraft = await page.evaluate(() => { const L = window.LANTERNMOSS; return { count: L.inventory.count('glowTonic'), ingredients: L.inventory.count('glowcap'), message: L.InventoryUI.message, open: L.InventoryUI.isOpen, dead: L.player.dead }; });
  assert.equal(firstCraft.count, 5, JSON.stringify(firstCraft));
  await page.click('[data-favourite="glowTonic"]');
  assert.equal(await page.$eval('[data-card]', e => e.dataset.card), 'glowTonic');
  assert.equal(await page.$eval('[data-favourite="glowTonic"]', e => e.getAttribute('aria-pressed')), 'true');
  assert.ok(await page.$eval('[data-card="perchChowder"]', e => e.textContent.includes('Read a bookshelf') && e.querySelector('[data-recipe]').disabled));
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Houses, houseDef } = await import('/src/gameplay/Houses.js');
    Houses.goInside(0, houseDef(0)); Houses.use({ kind: 'bookshelf' }); L.Dialog.close(); Houses.goOutside(); L.InventoryUI.render();
  });
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.RecipeBook.knows('perchChowder')));
  assert.ok(!(await page.$eval('[data-card="perchChowder"]', e => e.textContent)).includes('Learn first'));
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dirAlong, tangentToward } = await import('/src/utils/sphere.js');
    const forge = L.Stations.list.find(s => s.id === 'forge'); L.player.placeAt(dirAlong(forge.dir, tangentToward(forge.dir, L.planets.world.spawnDir), 1.4));
    L.inventory.clear(); L.inventory.add('copperOre', 14); L.inventory.add('charcoal', 2); L.InventoryUI.open('craft', { filter: 'forge' });
  });
  await page.click('[data-card="copperIngot"] [data-batches="all"]');
  await page.waitForFunction(() => window.LANTERNMOSS.inventory.count('copperIngot') === 7);
  assert.deepEqual(await page.evaluate(() => { const i = window.LANTERNMOSS.inventory; return [i.count('copperIngot'), i.count('copperOre'), i.count('charcoal')]; }), [7, 0, 0]);
  await page.evaluate(() => {
    const L = window.LANTERNMOSS; L.inventory.add('wood', 30); L.inventory.add('ironOre', 12); L.inventory.add('emberShard', 15); L.player.coins = 500;
    L.InventoryUI.render();
  });
  await page.screenshot({ path: shots + 'crafting.jpg', type: 'jpeg', quality: 84 });

  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js'), { ctx } = await import('/src/core/context.js');
    L.Journal.meet('ogre'); damageEnemy(L.spawnEnemy('ogre', 8), 10000);
    ctx.paused = false; L.update(0.1); ctx.paused = true;
    L.JournalUI.open('bestiary'); L.JournalUI.page = 'ogre'; L.JournalUI.render();
  });
  assert.equal(await page.$eval('[data-learn-recipe]', e => e.disabled), false);
  await page.locator('[data-page="goblin"]').click();
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.JournalUI.page), 'goblin');
  await page.locator('[data-page="ogre"]').click();
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.JournalUI.page), 'ogre');
  await page.locator('[data-learn-recipe]').click();
  await page.waitForFunction(() => window.LANTERNMOSS.RecipeBook.knows('mossRune'));
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.RecipeBook.knows('mossRune')));
  await page.evaluate(() => window.LANTERNMOSS.JournalUI.close());
  assert.ok(!(await page.$eval('[data-card="mossRune"]', e => e.textContent)).includes('Learn first'), 'bestiary learning refreshes the open Craft tab');

  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { bagCommands } = await import('/src/gameplay/bagCommands.js');
    L.inventory.clear(); L.inventory.add('emberAxe', 1, { rarity: 'rare' }); L.inventory.add('mossRune', 1); L.inventory.add('emberRune', 2);
    bagCommands(L.inventory).equip(L.inventory.find('emberAxe'), 'weapon');
  });
  await page.click('[data-tab="enchant"]');
  await page.select('[data-enchant-target]', 'worn:weapon');
  const hp = await page.evaluate(() => window.LANTERNMOSS.player.stats.maxHp);
  await page.click('[data-enchant="mossRune"]');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.player.stats.maxHp), hp + 12);
  await page.click('[data-enchant="emberRune"]');
  assert.deepEqual(await page.evaluate(() => window.LANTERNMOSS.player.equipment.weapon.props), { rarity: 'rare', enchantment: 'emberRune' });
  assert.ok(await page.$eval('[data-enchant="emberRune"]', e => e.disabled));
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.inventory.count('emberRune')), 1);
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height });
    for (const tab of ['craft', 'enchant']) {
      await page.click(`[data-tab="${tab}"]`);
      assert.ok(await page.$eval('#inventory', e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), `${width}x${height}/${tab}: menu bounds`);
      assert.ok(await page.$eval('.inv-craft', e => e.scrollWidth <= e.clientWidth), `${width}x${height}/${tab}: no horizontal overflow`);
    }
  }
  await page.setViewport({ width: 1280, height: 720 });
  await page.screenshot({ path: shots + 'enchanting.jpg', type: 'jpeg', quality: 84 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS; L.InventoryUI.close(); const { ctx } = await import('/src/core/context.js'); ctx.paused = false;
    if (!L.saves.save().ok) throw new Error('Crafting smoke save failed');
  });
  await page.reload({ waitUntil: 'networkidle0', timeout: 90000 }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  assert.ok(await page.evaluate(() => { const L = window.LANTERNMOSS; return L.RecipeBook.knows('perchChowder') && L.RecipeBook.favourites.has('glowTonic') && L.player.equipment.weapon.props.enchantment === 'emberRune'; }));
  assert.deepEqual(errors, []);
  console.log('PASS  browser Craft x5, Smelt all, favourites, book/bestiary learning, worn enchanting, replacement, 720p/1080p bounds and reload persistence');
} finally { await browser?.close(); server.kill(); }
