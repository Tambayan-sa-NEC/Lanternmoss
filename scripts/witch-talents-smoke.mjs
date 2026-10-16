// Production Witch talents (TODO 28c): real learning, live HUD/Controls, reload Continue and village reset.
// Edge by default, low preset at 720p/1080p; no fixture tree or release flag changes. Port 8120.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8120;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await page.addStyleTag({ content: 'body.talent-proof > :not(canvas):not(#talent-menu) { display: none !important; }' });
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS;
    L.CharacterSelect.pick('ranger'); if (L.Talents.open) throw new Error('Ranger tree exposed before 28e');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    const { xpToNext } = await import('/src/progression/leveling.js'); while (L.player.level < 16) L.gainXp(xpToNext(L.player.level) - L.player.xp);
    L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  await frames(200); await page.keyboard.press('Escape'); await page.click('#pause [data-go="talents"]');
  const button = id => `#talent-menu button[data-learn="${id}"]`;
  assert.ok(await page.$eval(button('seekingFlame'), b => b.disabled), 'Seeking Flame starts gated');
  for (const id of ['brightBolt', 'brightBolt', 'quickFrost', 'quickFrost', 'seekingFlame', 'deepFreeze', 'deepFreeze']) await page.click(button(id));
  const ranks = await page.evaluate(() => ({ ...window.LANTERNMOSS.Talents.ranks }));
  assert.deepEqual(ranks, { brightBolt: 2, quickFrost: 2, seekingFlame: 1, deepFreeze: 2 });
  assert.match(await page.$eval('#talent-menu .tl-points', e => e.textContent), /0 to spend/);
  assert.ok(await page.$eval(button('lightStep'), b => b.disabled));
  for (const [width, height] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width, height }); await frames(1);
    assert.ok(await page.$eval('#talent-menu .talent-panel', p => {
      const r = p.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && p.scrollWidth <= p.clientWidth && document.documentElement.scrollWidth <= innerWidth;
    }), `${width}x${height}: panel and contents fit`);
    await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; });
    await page.evaluate(() => document.body.classList.add('talent-proof'));
    await page.screenshot({ path: shotPath(width === 1280 ? 'talents' : 'witch-talents-1080'), type: 'jpeg', quality: 86 });
    await page.evaluate(() => document.body.classList.remove('talent-proof'));
  }
  console.log('PASS  production Witch tree: real Learn clicks, prerequisites, eight-point budget, 720p/1080p low layout');
  await page.keyboard.press('Escape'); assert.ok(await page.evaluate(() => window.LANTERNMOSS.PauseMenu.isOpen));
  await page.click('#pause [data-go="controls"]');
  assert.match(await page.$eval('#pause', e => e.textContent), /Seeking Fireball/);
  assert.match(await page.$eval('#pause', e => e.textContent), /Follows the foe/);
  assert.match(await page.$eval('#pause', e => e.textContent), /6s cooldown/);
  for (const [width, height] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width, height }); await frames(1);
    assert.ok(await page.$eval('#pause .panel', p => {
      const r = p.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && p.scrollWidth <= p.clientWidth;
    }), `${width}x${height}: learned Controls page fits`);
  }
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await frames(2);
  assert.match(await page.$eval('#spells', e => e.textContent), /Seeking Fireball/);
  assert.ok(await page.$eval('#spells .slot:nth-child(2)', p => {
    const name = p.querySelector('.nm').getBoundingClientRect(), box = p.getBoundingClientRect();
    return name.left >= box.left && name.right <= box.right && name.bottom <= box.bottom;
  }), 'Seeking Fireball name fits its spell slot');
  await page.hover('#spells .slot:nth-child(2)');
  assert.match(await page.$eval('#tip', e => e.textContent), /Follows the foe/);
  assert.match(await page.$eval('#tip', e => e.textContent), /2.8 radius/);
  await page.mouse.move(10, 10);
  // Rebinding while a talent kit is cached must update the HUD and the cast's key labels.
  await page.evaluate(async () => { (await import('/src/core/keybinds.js')).rebind('skill2', 'KeyZ'); });
  assert.equal(await page.$eval('#spells .slot:nth-child(2) kbd', e => e.textContent), 'Z');
  await page.evaluate(async () => { (await import('/src/core/keybinds.js')).resetBinds(); });
  console.log('PASS  live Controls/HUD/tooltip describe the learned variant and timings; remapped keys refresh');

  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  await frames(4); assert.deepEqual(await page.evaluate(() => ({ ...window.LANTERNMOSS.Talents.ranks })), ranks);
  assert.match(await page.$eval('#spells', e => e.textContent), /Seeking Fireball/);
  console.log('PASS  full reload + Continue restores production ranks and live spell bar without a fixture');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dirAlong, tangentToward } = await import('/src/utils/sphere.js'), b = L.npcs.find(n => n.name === 'Old Bramble');
    L.player.invuln = 1e9; L.player.placeAt(dirAlong(b.up, tangentToward(b.up, L.planets.world.spawnDir), 1.3));
  });
  await frames(2); const coins = await page.evaluate(() => window.LANTERNMOSS.player.coins);
  await page.keyboard.press('KeyE'); await frames(1); await page.keyboard.press('KeyE'); await frames(1); await page.keyboard.press('KeyE'); await frames(2);
  assert.deepEqual(await page.evaluate(() => ({ ...window.LANTERNMOSS.Talents.ranks })), {});
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Talents.available), 8);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.player.coins), coins);
  assert.doesNotMatch(await page.$eval('#spells', e => e.textContent), /Seeking Fireball/);
  await page.evaluate(() => window.LANTERNMOSS.Dialog.close());
  await page.keyboard.press('Escape'); await page.click('#pause [data-go="talents"]');
  await page.click(button('lightStep')); await page.click(button('lightStep'));
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await frames(2);
  assert.equal(await page.$eval('#spells .slot:nth-child(4) .mc', e => e.textContent), '11');
  await page.hover('#spells .slot:nth-child(4)'); assert.match(await page.$eval('#tip', e => e.textContent), /11 Mana/);
  assert.deepEqual(errors, []);
  console.log('PASS  real E with Old Bramble resets for free, base name returns; learning Light Step updates HUD cost and tooltip; zero page/shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
}
