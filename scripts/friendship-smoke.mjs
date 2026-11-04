// Villager friendship (TODO 33) in a real browser: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// Real E to talk, the gift offer on a real line with a present held in hand, a real click that hands it over and
// raises a heart, the hearts on the talk prompt, the Journal's Friends page at 720p/1080p, the whole friendship
// surviving a full reload and Continue, and zero page or shader errors.
// Writes the friendship-gift and friends-page shots (npcs/, huds/).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8147;
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
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('stay');   // the pet waits out of the way, so E always means the villager
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  // Software rendering is far below 60 fps: drive time with explicit frames.
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);

  // a calm, bright noon and no monsters wandering into the shot
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    const { ctx } = await import('/src/core/context.js');
    dayClock.t = 0.4 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    for (const e of ctx.enemies) if (e.alive && e.def.respawn) e.vanish();
    L.player.invuln = 1e9;
  });
  /** Stands the hero in front of a villager, facing them, with the camera over their shoulder. */
  const walkUpTo = name => page.evaluate(async name => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    const { dirAlong, tangentToward } = await import('/src/utils/sphere.js');
    const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js');
    const npc = ctx.npcs.find(n => n.name === name); if (!npc) return null;
    L.Pets.command('stay');                                  // leave the pet where it is, not underfoot by the villager
    npc.asleep = false; npc.awakeT = 1e4;
    const toNpc = tangentToward(npc.up, L.planets.world.spawnDir);
    L.player.placeAt(dirAlong(npc.up, toNpc, 2.2)); L.player.vel.set(0, 0, 0);
    L.player.fwd.copy(tangentToward(L.player.up, npc.up));
    L.cam.pitch = 0.2; L.cam.dist = 5.2; resetView(L.player.fwd.clone()); snapCamera(L.player.up, L.player.fwd);
    return npc.name;
  }, name);
  const tidy = () => page.evaluate(() => {
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    const achv = document.getElementById('achv'); if (achv) achv.style.visibility = 'hidden';
    const notice = document.getElementById('save-notice'); if (notice) notice.style.opacity = 0;
  });

  // ---- a stranger first: no hearts on the prompt, nothing to give with empty hands --------------------------------
  assert.equal(await walkUpTo('Fern'), 'Fern'); await frames(30);
  const stranger = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { currentInteraction } = await import('/src/gameplay/Houses.js');
    L.inventory.clear?.();
    return { label: currentInteraction()?.label, hearts: L.Friendship.hearts('Fern'), offer: !!L.Friendship.giftChoice(null) };
  });
  assert.equal(stranger.hearts, 0); assert.match(stranger.label ?? '', /^Talk to Fern/);
  assert.ok(!/♥/.test(stranger.label), 'a stranger has no hearts on the prompt');
  console.log('PASS  a villager you have never spoken to is a stranger: no hearts on the prompt');

  // ---- real E opens the conversation, and the first chat of the day counts ----------------------------------------
  await page.keyboard.press('KeyE'); await frames(3);
  const talked = await page.evaluate(() => ({ open: window.LANTERNMOSS.Dialog.open, points: window.LANTERNMOSS.Friendship.points('Fern') }));
  assert.ok(talked.open && talked.points > 0, JSON.stringify(talked));
  await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE'); await frames(3);
  console.log(`PASS  real E opens the conversation and the first hello of the day is worth ${talked.points}`);

  // ---- a present held in hand puts the gift offer on the line, and a real click hands it over ---------------------
  const held = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { TASTES } = await import('/src/config/friendship.js');
    const fav = TASTES.Fern.favourite[0];
    L.inventory.add(fav, 1);
    L.Hotbar.selected = L.inventory.getSlots().findIndex(s => s?.itemId === fav);
    return { fav, inHand: L.Hotbar.held()?.itemId, name: L.items.get(fav).name };
  });
  assert.equal(held.inHand, held.fav, 'the present is in the hero\'s hand');
  await walkUpTo('Fern'); await frames(10);
  await page.keyboard.press('KeyE'); await frames(3);
  /** Reads the buttons once the line has finished typing (E skips the typewriter, as a player would). */
  const choiceNow = async () => {
    await page.keyboard.press('KeyE'); await frames(2);
    return page.evaluate(() => ({ open: window.LANTERNMOSS.Dialog.open,
      shown: document.getElementById('dlg-choices').classList.contains('show'),
      yes: document.querySelector('#dlg-choices .yes')?.textContent ?? '' }));
  };
  // she may have a quest to offer first: turn that down like a player would, and the gift offer follows on her next line
  let offered = await choiceNow();
  for (let i = 0; i < 3 && offered.open && offered.shown && !/Give /.test(offered.yes); i++) {
    await page.click('#dlg-choices .no'); await frames(3); offered = await choiceNow();
  }
  assert.ok(offered.open, 'the villager is talking');
  assert.ok(offered.shown, 'and the choice buttons are up');
  assert.match(offered.yes, new RegExp(`Give ${held.name}`), `the offer names what is in hand (${offered.yes})`);
  await tidy();
  await page.screenshot({ path: shotPath('friendship-gift'), type: 'jpeg', quality: 86 });
  const before = await page.evaluate(() => window.LANTERNMOSS.Friendship.points('Fern'));
  await page.click('#dlg-choices .yes'); await frames(20);
  const gave = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { FRIENDSHIP } = await import('/src/config/friendship.js');
    return { points: L.Friendship.points('Fern'), left: L.inventory.count(L.Hotbar.held()?.itemId ?? 'none'),
      worth: FRIENDSHIP.gift.points.favourite, reply: document.getElementById('dlg-text')?.textContent ?? '' };
  });
  assert.equal(gave.points - before, gave.worth, `a favourite is worth ${gave.worth} (${JSON.stringify(gave)})`);
  assert.ok(gave.reply.length > 0, 'she says something back');
  // one E finishes typing the reply, a second closes the dialog, same as a real player advancing it
  await page.keyboard.press('KeyE'); await frames(3);
  await page.keyboard.press('KeyE'); await frames(3);
  console.log(`PASS  holding a present offers it; a real click handed it over for +${gave.worth} and a reply`);

  // ---- hearts show on the talk prompt once there are any -----------------------------------------------------------
  const friend = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { FRIENDSHIP } = await import('/src/config/friendship.js');
    const { currentInteraction } = await import('/src/gameplay/Houses.js');
    L.Friendship.add('Fern', FRIENDSHIP.thresholds[4], { quiet: true });        // a well-made friendship, rewards and all
    L.Friendship.add('Pim', FRIENDSHIP.thresholds[2], { quiet: true });
    L.Friendship.add('Old Bramble', FRIENDSHIP.thresholds[1], { quiet: true });
    return { label: currentInteraction()?.label, hearts: L.Friendship.hearts('Fern'),
      keepsake: L.inventory.count('fernsCrown') };
  });
  assert.equal(friend.hearts, 4); assert.match(friend.label ?? '', /Talk to Fern.*♥♥♥♥/);
  assert.equal(friend.keepsake, 1, 'and the keepsake she made is in the bag');
  console.log(`PASS  hearts show on the talk prompt, and four hearts handed over her keepsake`);

  // ---- the Journal's Friends page, at both sizes --------------------------------------------------------------------
  await page.evaluate(() => window.LANTERNMOSS.JournalUI.open('friends')); await frames(3);
  const page1 = await page.evaluate(() => ({
    tab: document.querySelector('#journal .jtabs button.on')?.textContent,
    cards: [...document.querySelectorAll('#journal .frnd .frnd-top b')].map(e => e.textContent),
    hearts: document.querySelector('#journal .frnd .hrt')?.textContent ?? '',
    rewards: document.querySelectorAll('#journal .frnd-rw li.got').length,
  }));
  assert.equal(page1.tab, 'Friends');
  assert.deepEqual(page1.cards, ['Fern', 'Pim', 'Old Bramble'], 'everyone you know, friendliest first');
  assert.match(page1.hearts, /^♥♥♥♥♡$/, `four of five hearts (${page1.hearts})`);
  assert.ok(page1.rewards > 0, 'the rewards already earned are marked');
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width: w, height: h }); await frames(3);
    const fits = await page.$eval('#journal .jpanel', p => { const r = p.getBoundingClientRect();
      return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth; });
    assert.ok(fits, `${w}x${h}: the Friends page fits`);
  }
  await tidy();
  await page.screenshot({ path: shotPath('friends-page'), type: 'jpeg', quality: 86 });
  await page.keyboard.press('Escape'); await frames(3);
  assert.equal(await page.$eval('#journal', e => e.classList.contains('show')), false, 'Esc closes the journal');
  console.log(`PASS  the Journal's Friends page lists everyone you know with their hearts and rewards; 720p and 1080p fit`);

  // ---- a full reload and Continue keep the friendships ---------------------------------------------------------------
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  const restored = await page.evaluate(() => {
    const L = window.LANTERNMOSS;
    return { fern: L.Friendship.hearts('Fern'), pim: L.Friendship.hearts('Pim'), keepsake: L.inventory.count('fernsCrown'),
      friends: L.Friendship.friends() };
  });
  assert.equal(restored.fern, 4); assert.equal(restored.pim, 2); assert.equal(restored.keepsake, 1);
  assert.deepEqual(restored.friends, ['Fern', 'Pim', 'Old Bramble']);
  assert.deepEqual(errors, []);
  console.log('PASS  a full reload and Continue keep every friendship, its hearts and its keepsake; zero page or shader errors');
} finally { await close(); }
