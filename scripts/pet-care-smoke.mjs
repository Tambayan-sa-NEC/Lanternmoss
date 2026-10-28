// Real browser checks for pet care (TODO 35). Owns port 8146. npm i --no-save --no-package-lock puppeteer-core; CHROME
// overrides the browser (Edge by default). A real B opens the pet menu; real clicks feed a favourite (Happy, one food
// gone), dress the owl in a bow and the fox in a party hat; the Care panel fits at 720p and 1080p with nothing
// overflowing; in the claimed cottage the pet sleeps in its basket and a real E checks on it; zero page and shader
// errors. Writes pets/pet-care, pets/pet-outfits and pets/pet-bed.
// The game stays paused except for the script's own fixed 60 fps steps: software rendering is too slow for real time.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8146;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, stderr = ''; server.stderr.on('data', d => { stderr += d; });
const CLUTTER = ['hud', 'compass', 'combat', 'ebars', 'markers', 'tip', 'achv', 'toast', 'hint', 'prompt', 'save-notice'];
/** Steps the pet menu's own showcase (the pet trots round in front, the camera eases in) with explicit frames: this is
    what the game loop runs while the menu is open, and real time is far too slow under software rendering. */
let showcase;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(stderr || `server exited ${code}`))); });
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
  page.setDefaultTimeout(120000);
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    const { ctx } = await import('/src/core/context.js'); ctx.paused = true;
    (await import('/src/utils/random.js')).seedPlay(1);
    for (const e of L.enemies) if (e.def.respawn) e.vanish();
    L.player.invuln = 1e9; L.Pets.unlocked.add('fox');
    for (const [id, n] of [['pondPerch', 2], ['grilledFish', 1], ['moonberry', 2], ['petBow', 1], ['petHat', 1], ['petScarf', 1]]) L.inventory.add(id, n);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none');
  const frames = n => page.evaluate(async n => { const { ctx } = await import('/src/core/context.js'); const was = ctx.paused; ctx.paused = false;
    for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); ctx.paused = was; }, n);
  showcase = n => page.evaluate(async n => { const { PetMenu } = await import('/src/ui/PetMenu.js'); for (let i = 0; i < n; i++) PetMenu.update(1 / 60); }, n);
  const hide = on => page.evaluate((ids, on) => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = on ? 'hidden' : ''; } }, CLUTTER, on);
  await frames(30);

  // ---- a real B opens the pet menu; real clicks feed a favourite and dress the owl ---------------------------------------
  await page.evaluate(async () => { (await import('/src/core/context.js')).ctx.paused = false; });   // the menu won't open over a pause; it pauses itself
  await page.keyboard.press('KeyB'); await page.waitForFunction(() => document.body.classList.contains('petmenu'));
  await page.waitForSelector('.pet-care [data-feed="pondPerch"]');
  const before = await page.evaluate(() => ({ perch: window.LANTERNMOSS.inventory.count('pondPerch'), happy: window.LANTERNMOSS.Pets.happyT }));
  await page.click('.pet-care [data-feed="pondPerch"]');
  const fed = await page.evaluate(() => ({ perch: window.LANTERNMOSS.inventory.count('pondPerch'), happy: window.LANTERNMOSS.Pets.happyT, meals: window.LANTERNMOSS.Pets.meals() }));
  assert.equal(fed.perch, before.perch - 1, 'a click feeds one perch'); assert.ok(fed.happy > 0, 'and the owl is Happy'); assert.equal(fed.meals, 1);
  await page.click('.pet-care [data-outfit="petBow"]');
  const bow = await page.evaluate(async () => { const { ctx } = await import('/src/core/context.js');
    return { worn: window.LANTERNMOSS.Pets.outfits.owl, drawn: !!ctx.companion.outfit, bag: window.LANTERNMOSS.inventory.count('petBow') }; });
  assert.deepEqual(bow, { worn: 'petBow', drawn: true, bag: 0 }, 'a click puts the bow on the owl');
  const shown = await page.evaluate(() => ({ meals: /1 \/ 3 meals/.test(document.querySelector('.pet-care').textContent),
    happy: !!document.querySelector('.pet-care .happy'), bow: !!document.querySelector('.pet-care [data-outfit="petBow"].on') }));
  assert.deepEqual(shown, { meals: true, happy: true, bow: true }, 'and the panel says so straight away');
  console.log('PASS  a real B opens the pet menu; clicks feed a favourite (Happy) and put a bow on the owl');

  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height }); await showcase(240);
    const fit = await page.evaluate(() => {
      const panel = document.querySelector('#petmenu .sel-detail').getBoundingClientRect(), care = document.querySelector('.pet-care').getBoundingClientRect();
      return { inside: panel.top >= 0 && panel.bottom <= innerHeight && panel.left >= 0 && panel.right <= innerWidth,
        careShown: care.height > 0, x: document.documentElement.scrollWidth > innerWidth, y: document.documentElement.scrollHeight > innerHeight };
    });
    assert.deepEqual(fit, { inside: true, careShown: true, x: false, y: false }, `${width}x${height}: the Care panel fits and nothing overflows`);
    if (height === 720) { await hide(true); await page.screenshot({ path: shotPath('pet-care'), type: 'jpeg', quality: 88 }); await hide(false); }
    console.log(`PASS  ${width}x${height}: the pet menu's Care panel fits, nothing overflows`);
  }

  // ---- the fox in a party hat, shown off with the menu out of the way --------------------------------------------------------
  await page.setViewport({ width: 1280, height: 720 });
  await page.click('[data-pet="fox"]'); await showcase(60);
  await page.waitForSelector('.pet-care [data-outfit="petHat"]');
  await page.click('.pet-care [data-outfit="petHat"]'); await showcase(240);
  const hat = await page.evaluate(async () => { const { ctx } = await import('/src/core/context.js'); return { id: window.LANTERNMOSS.Pets.id, worn: window.LANTERNMOSS.Pets.outfits.fox, drawn: !!ctx.companion.outfit }; });
  assert.deepEqual(hat, { id: 'fox', worn: 'petHat', drawn: true }, 'the fox comes along and wears the party hat');
  await hide(true);
  await page.evaluate(() => { for (const sel of ['#petmenu .sel-detail', '#petmenu .sel-cards', '#petmenu h2', '#petmenu .back', '#petmenu .keys']) { const el = document.querySelector(sel); if (el) el.style.visibility = 'hidden'; } });
  await page.screenshot({ path: shotPath('pet-outfits'), type: 'jpeg', quality: 88 });
  await page.evaluate(() => { for (const sel of ['#petmenu .sel-detail', '#petmenu .sel-cards', '#petmenu h2', '#petmenu .back', '#petmenu .keys']) { const el = document.querySelector(sel); if (el) el.style.visibility = ''; } });
  await hide(false);
  await page.keyboard.press('KeyB'); await page.waitForFunction(() => !document.body.classList.contains('petmenu'));
  await page.evaluate(async () => { (await import('/src/core/context.js')).ctx.paused = true; });
  console.log('PASS  a click on the fox brings it along, and a click dresses it in the party hat');

  // ---- the cottage pet basket: the pet sleeps in it, and a real E checks on it --------------------------------------------------
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.player.placeAt(L.Home.cottage.door); });
  await frames(10); await page.keyboard.press('KeyE');
  await page.waitForFunction(async () => { const { ctx } = await import('/src/core/context.js'); return !!ctx.indoors && !ctx.transitioning; }, { polling: 200 })
    .catch(() => null);
  await frames(60);
  const placed = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Houses } = await import('/src/gameplay/Houses.js');
    if (!Houses.inside) return { inside: false };
    L.Home.claim(); L.inventory.add('petBed', 1); const r = L.Home.place('petBed');
    return { inside: true, placed: r.ok };
  });
  assert.deepEqual(placed, { inside: true, placed: true }, 'the hero is in the cottage and the basket is placed');
  await frames(30);
  const bed = await page.evaluate(async () => {
    const { Houses } = await import('/src/gameplay/Houses.js'), { HOME } = await import('/src/config/home.js'), L = window.LANTERNMOSS;
    Object.assign(Houses.inside, { x: HOME.petBed.x + 2.6, z: HOME.petBed.z + 1.9, vx: 0, vz: 0 }); Houses.placeHero();   // stood back: the basket in clear view
    L.Pets.hp = 5;
    return { look: !!Houses.inside.petLook?.root.parent, outfit: !!Houses.inside.petLook?.outfit, resting: L.Pets.resting };
  });
  assert.deepEqual(bed, { look: true, outfit: true, resting: true }, 'the fox sleeps in its basket, hat and all');
  await frames(60);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.Pets.hp > 5 + window.LANTERNMOSS.Pets.maxHp() * 0.2), 'and heals while it rests');
  await hide(true); await page.screenshot({ path: shotPath('pet-bed'), type: 'jpeg', quality: 88 }); await hide(false);
  await page.evaluate(async () => { const { Houses } = await import('/src/gameplay/Houses.js'), { HOME } = await import('/src/config/home.js');
    Object.assign(Houses.inside, { x: HOME.petBed.x + 1.0, z: HOME.petBed.z + 1.0, vx: 0, vz: 0 }); Houses.placeHero(); });
  await frames(5); await page.keyboard.press('KeyE'); await frames(30);
  const checked = await page.evaluate(async () => { const { Dialog } = await import('/src/ui/Dialog.js'); return Dialog.open && /basket/i.test(Dialog.npc?.name ?? ''); });
  assert.ok(checked, 'a real E at the basket checks on the pet');
  console.log('PASS  in the cottage the pet sleeps in its basket in its outfit, heals, and a real E checks on it');
  assert.deepEqual(errors, []);
  console.log('PASS  zero page and shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) {
    let timeout;
    try {
      await Promise.race([browser.close(), new Promise(resolve => {
        timeout = setTimeout(() => { const child = browser.process(); child?.kill(); browser.disconnect(); for (const stream of child?.stdio ?? []) stream?.destroy?.(); child?.unref(); resolve(); }, 10000);
      })]);
    } finally { clearTimeout(timeout); }
  }
}
