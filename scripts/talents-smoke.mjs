// Talents (TODO 28b) in a real browser, on the test-only fixture tree (tests/sim/lib/talentFixture.mjs; the real trees
// stay unreleased until 28c-28e): npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// Unreleased: the pause menu has no Talents button. With the fixture: real Esc opens the pause menu, a real click opens
// Talents on top of it, real Learn clicks spend points and change the kit, Esc comes back to the pause menu; 720p/1080p
// fit; a full reload and Continue keep the ranks; real E with Old Bramble resets them for free; zero page or shader
// errors. Writes the talents shot (huds/), a development preview of the page.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8119;
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
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  // Software rendering is far below 60 fps: drive time with explicit frames.
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  const pauseHasTalents = () => page.evaluate(() => !!document.querySelector('#pause [data-go="talents"]'));
  await frames(20);

  // ---- unreleased: no Talents button --------------------------------------------------------------------------------
  await page.keyboard.press('Escape'); await frames(1);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.PauseMenu.isOpen)); assert.equal(await pauseHasTalents(), false);
  await page.keyboard.press('Escape'); await frames(1);
  console.log('PASS  with the real, unreleased tree the pause menu has no Talents button');

  // ---- the fixture tree: Esc, a click on Talents, Learn clicks --------------------------------------------------------
  const install = () => page.evaluate(async () => { const { installTalentFixture } = await import('/tests/sim/lib/talentFixture.mjs'); window.talentFixture = installTalentFixture('witch'); });
  await install();
  await page.evaluate(async () => { const L = window.LANTERNMOSS, { xpToNext } = await import('/src/progression/leveling.js'); while (L.player.level < 6) L.gainXp(xpToNext(L.player.level) - L.player.xp); });
  await frames(2); await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; });
  await page.keyboard.press('Escape'); await frames(1);
  assert.ok(await pauseHasTalents(), 'the pause menu lists Talents');
  await page.click('#pause [data-go="talents"]'); await frames(1);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.TalentUI.isOpen));
  const learnBtn = id => `#talent-menu button[data-learn="${id}"]`;
  await page.click(learnBtn('sharpBolt')); await page.click(learnBtn('sharpBolt')); await page.click(learnBtn('quickNova'));
  const state = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { kit } = await import('/src/combat/casting.js');
    return { ranks: { ...L.Talents.ranks }, available: L.Talents.available, damage: kit().bolt.damage, base: L.CHARACTERS.witch.abilities.bolt.damage,
      locked: document.querySelector('#talent-menu button[data-learn="cheapBolt"]').disabled, points: document.querySelector('#talent-menu .tl-points').textContent,
      message: document.querySelector('#talent-menu .home-message').textContent };
  });
  assert.deepEqual(state.ranks, { sharpBolt: 2, quickNova: 1 }); assert.equal(state.available, 0); assert.equal(state.damage, state.base * 1.3);
  assert.ok(state.locked && /0 to spend/.test(state.points) && /Learned Quick Frost/.test(state.message), JSON.stringify(state));
  console.log(`PASS  real Esc, a click on Talents and Learn clicks spent 3 points (level 6); Arcane Bolt ${state.base} -> ${+state.damage.toFixed(2)} damage; out of points, the rest are disabled`);

  // ---- 720p and 1080p fit; the shot; Esc comes back to the pause menu -------------------------------------------------
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width: w, height: h }); await frames(1);
    const fits = await page.$eval('#talent-menu .talent-panel', p => { const r = p.getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0 && document.documentElement.scrollWidth <= innerWidth; });
    assert.ok(fits, `${w}x${h}: the talent page fits`);
  }
  await page.screenshot({ path: shotPath('talents'), type: 'jpeg', quality: 86 });
  await page.keyboard.press('Escape'); await frames(1);
  const back = await page.evaluate(() => ({ talents: window.LANTERNMOSS.TalentUI.isOpen, pause: window.LANTERNMOSS.PauseMenu.isOpen }));
  assert.deepEqual(back, { talents: false, pause: true }, 'Esc closes the page and leaves the pause menu');
  await page.keyboard.press('Escape'); await frames(1);
  assert.equal(await page.evaluate(async () => (await import('/src/core/context.js')).ctx.paused), false);
  console.log('PASS  720p and 1080p fit; Esc closes the page back to the pause menu, then resumes');

  // ---- a full reload and Continue keep the ranks -----------------------------------------------------------------------
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await install();                                          // the fixture tree again, before the save is read
  await page.click('[data-act="continue"]');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  await page.evaluate(() => { window.LANTERNMOSS.player.invuln = 1e9; }); await frames(5);
  assert.deepEqual(await page.evaluate(() => ({ ...window.LANTERNMOSS.Talents.ranks })), { sharpBolt: 2, quickNova: 1 });
  console.log('PASS  a full reload and Continue keep the learned ranks');

  // ---- real E with Old Bramble: the free reset --------------------------------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dirAlong, tangentToward } = await import('/src/utils/sphere.js'), b = L.npcs.find(n => n.name === 'Old Bramble');
    const away = tangentToward(b.up, L.planets.world.spawnDir); L.player.placeAt(dirAlong(b.up, away, 1.3)); L.player.vel.set(0, 0, 0);

  });
  await frames(2);
  assert.match(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label ?? ''), /Old Bramble/);
  const coins = await page.evaluate(() => window.LANTERNMOSS.player.coins);
  await page.keyboard.press('KeyE'); await frames(2);
  assert.match(await page.evaluate(() => window.LANTERNMOSS.Dialog.text), /unpick them all/);
  await page.keyboard.press('KeyE'); await frames(1);          // finishes the typing
  await page.keyboard.press('KeyE'); await frames(2);          // "Reset my talents"
  const reset = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { kit } = await import('/src/combat/casting.js');
    return { ranks: { ...L.Talents.ranks }, base: kit() === L.CHARACTERS.witch.abilities, coins: L.player.coins, text: L.Dialog.text };
  });
  assert.deepEqual(reset.ranks, {}); assert.ok(reset.base); assert.equal(reset.coins, coins); assert.match(reset.text, /3 points back/);
  assert.deepEqual(errors, []);
  console.log('PASS  real E with Old Bramble: a free reset, 3 points back and the base kit; zero page or shader errors');
} finally { await close(); }
