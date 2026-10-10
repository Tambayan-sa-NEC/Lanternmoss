// Optional real-browser check. npm i --no-save --no-package-lock puppeteer-core; CHROME selects a Chromium browser.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url)), port = 8096;
const shots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverError = '';
server.stderr.on('data', data => { serverError += data; });
const ready = new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('error', reject);
  server.once('exit', code => reject(new Error(serverError || `Test server exited (${code})`)));
});
let browser;
const wait = ms => new Promise(r => setTimeout(r, ms));
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
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin();
  });
  await page.waitForSelector('#tutorial', { visible: true });
  assert.match(await page.$eval('#tutorial', e => e.textContent), /A few steps/);
  await wait(3500); // Let the three-second arrival animation finish before taking the guide screenshot.
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  await page.screenshot({ path: shots + 'tutorial.jpg', type: 'jpeg', quality: 84 });
  await page.click('[data-tutorial="help"]'); await page.waitForSelector('#journal.show');
  assert.equal(await page.evaluate(async () => (await import('/src/core/context.js')).ctx.paused), true);
  for (const label of ['Energy and recovery', 'Gathering and tools', 'Crafting stations', 'Ore into metal', 'Fishing', 'Seeds and farming', 'Your companion', 'First finds'])
    assert.ok((await page.$eval('.help-page', e => e.textContent)).includes(label), label);
  await page.screenshot({ path: shots + 'help.jpg', type: 'jpeg', quality: 84 });
  await page.keyboard.press('Escape'); await page.click('[data-tutorial="skip"]');
  await page.reload({ waitUntil: 'networkidle0', timeout: 90000 }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Tutorial.state.status), 'skipped');
  await page.keyboard.press('Escape'); await page.click('[data-go="tutorial"]');
  await page.waitForSelector('#tutorial', { visible: true });
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Tutorial.step.id), 'move');
  for (const size of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width: size[0], height: size[1] });
    for (const hero of ['witch', 'knight', 'ranger']) {
      await page.evaluate(async hero => {
        const L = window.LANTERNMOSS, { applyCharacter } = await import('/src/gameplay/characters.js');
        const { TUTORIAL_STEPS } = await import('/src/config/tutorial.js');
        const { rebind } = await import('/src/core/keybinds.js');
        applyCharacter(hero); L.Tutorial.start();
        L.Tutorial.state.done = TUTORIAL_STEPS.slice(0, 6).map(s => s.id);
        const dodge = Object.values(L.CHARACTERS[hero].abilities).find(s => ['Blink', 'Shoulder Charge', 'Evasive Leap'].includes(s.name));
        rebind(`skill${dodge.slot}`, 'KeyL'); L.TutorialUI.render();
      }, hero);
      assert.match(await page.$eval('#tutorial', e => e.textContent), / on L\./);
      for (const id of ['dodge', 'aim', 'lair']) {
        await page.evaluate(async id => { const L = window.LANTERNMOSS, { TUTORIAL_STEPS } = await import('/src/config/tutorial.js');
          L.Tutorial.state.done = TUTORIAL_STEPS.slice(0, TUTORIAL_STEPS.findIndex(s => s.id === id)).map(s => s.id); L.TutorialUI.render(); }, id);
        assert.ok(await page.$eval('#tutorial', e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
        assert.ok(await page.evaluate(() => {
          const a = document.getElementById('tutorial').getBoundingClientRect(), b = document.getElementById('hint').getBoundingClientRect();
          return a.top >= b.bottom || a.left >= b.right || a.right <= b.left || a.bottom <= b.top;
        }), `${size}/${hero}/${id}: guide must not overlap controls`);
      }
    }
    await page.keyboard.press('Escape'); await wait(300);
    assert.ok(await page.$eval('#pause .panel', e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && e.scrollHeight <= e.clientHeight + 2; }), 'pause menu fits');
    for (const selector of ['[data-go="help"]', '[data-go="tutorial"]', '[data-go="quit"]']) assert.ok(await page.$eval(selector, e => e.getBoundingClientRect().bottom <= innerHeight));
    await page.click('[data-go="help"]'); await page.waitForSelector('#journal.show');
    assert.ok(await page.$eval('.jpanel', e => e.getBoundingClientRect().bottom <= innerHeight));
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  }
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { hurtPlayer } = await import('/src/combat/damage.js'), { ctx } = await import('/src/core/context.js');
    L.player.invuln = 0; L.Tutorial.state.lifeStartedAt = ctx.time - 73;
    L.player.hp = 1;
    hurtPlayer(L.boss.def.attacks.slam.damage, L.player.pos, 0, { source: L.boss }); L.TutorialUI.render();
  });
  await page.waitForSelector('#faint-screen', { visible: true });
  assert.match(await page.$eval('#faint-screen', e => e.textContent), /You fainted.*Gloomcap.*1m 13s.*Back home in/s);
  await page.screenshot({ path: shots + 'fainted.jpg', type: 'jpeg', quality: 84 });
  await page.evaluate(() => window.LANTERNMOSS.PauseMenu.open());
  const remaining = await page.evaluate(() => window.LANTERNMOSS.player.deadT); await wait(500);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.player.deadT), remaining);
  await page.evaluate(() => window.LANTERNMOSS.PauseMenu.close());
  await page.waitForFunction(() => !window.LANTERNMOSS.player.dead, { timeout: 60000 });
  assert.equal(await page.$eval('#faint-screen', e => getComputedStyle(e).display), 'none');
  assert.deepEqual(errors, []);
  console.log('PASS  browser guide, Help, skip/reload/replay, rebound hero prompts, menu bounds at 720p/1080p, fainting and paused countdown');
} finally {
  await browser?.close(); server.kill();
}
