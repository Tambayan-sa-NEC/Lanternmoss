// Retakes the README screenshots (docs/screenshots/*.jpg) by playing through staged scenes in headless Chrome.
// Run after every major update:   node scripts/screenshots.mjs
// Needs Google Chrome and puppeteer-core (not a project dependency: `npm i --no-save puppeteer-core`, or point
// PUPPETEER at an installed copy's entry file). CHROME overrides the browser path. Software rendering is slow
// (a few frames a second), so the waits below are generous; the whole run takes a few minutes.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8093;
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;   // e.g. node scripts/screenshots.mjs boss,bag

const puppeteer = (await import(process.env.PUPPETEER ? pathToFileURL(process.env.PUPPETEER).href : 'puppeteer-core')
  .catch(() => { console.error('puppeteer-core not found: npm i --no-save puppeteer-core (or set PUPPETEER)'); process.exit(1); })).default;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { cwd: root, stdio: 'ignore' });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name, { keepToast = false } = {}) => {
  if (only && !only.has(name)) return;
  if (!keepToast) await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; });
  await page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 84 }); console.log('saved', name);
};
const run = (fn, ...args) => page.evaluate(fn, ...args);

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await run(() => localStorage.setItem('lanternmoss.settings', JSON.stringify({ pauseOnBlur: false })));
  await wait(5000); await shot('title');
  await page.click('[data-act="play"]'); await wait(4500); await shot('select');
  await run(() => { const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); });
  await wait(2500); await page.keyboard.press('KeyH'); await wait(500);       // fold the controls panel away

  // helpers in the page: frame the camera on a surface point, keep the hero safe while scenes are staged
  await run(() => {
    const L = window.LANTERNMOSS;
    window.__frame = (dir, { turn = 0, pitch = 0.42, dist = 7 } = {}) => {
      const P = L.player; L.cam.up.copy(P.up); L.cam.fwd.copy(dir).sub(P.up); L.cam.fwd.addScaledVector(P.up, -L.cam.fwd.dot(P.up)).normalize();
      L.cam.fwd.applyAxisAngle(P.up, turn); L.cam.pitch = pitch; L.cam.dist = dist; L.cam.init = false; L.cam.lastDrag = 1e9;
    };
    window.__stand = (dir, back = 4, side = 0) => {   // stand `back` units before dir (toward the village), looking at it
      const P = L.player, t = L.player.up.clone().sub(dir); t.addScaledVector(dir, -t.dot(dir)); if (t.lengthSq() < 1e-8) t.set(1, 0, 0); t.normalize();
      const s = new dir.constructor().crossVectors(dir, t).normalize();
      P.placeAt(dir.clone().addScaledVector(t, back / 40).addScaledVector(s, side / 40).normalize());
      P.fwd.copy(dir).sub(P.up).normalize(); window.__frame(dir);
    };
    setInterval(() => { L.player.invuln = Math.max(L.player.invuln, 1); L.player.hp = Math.max(L.player.hp, L.player.stats.maxHp * 0.6); L.Pets.petCool = 99; }, 200);   // (no "Pet ..." prompt in shots)
  });

  // the village by day
  await run(() => { const L = window.LANTERNMOSS, pim = L.npcs.find(n => n.name === 'Pim'); window.__stand(pim.up, 6, 1.5); window.__frame(pim.up, { turn: 0.35, pitch: 0.38, dist: 8 }); });
  await wait(4000); await shot('village');
  // a villager to talk to
  await run(async () => { const L = window.LANTERNMOSS, n = L.npcs.find(x => x.name === 'Fern');
    window.__stand(n.up, 2.6); window.__frame(n.up, { turn: 1.0, pitch: 0.3, dist: 5.5 }); L.Dialog.close(); L.Dialog.start(n); });
  await wait(3000); await run(() => window.LANTERNMOSS.Dialog.finishTyping()); await wait(500); await shot('dialogue');
  await run(() => window.LANTERNMOSS.Dialog.close());
  // inside a house
  await run(async () => { const { Houses } = await import('/src/gameplay/Houses.js'); Houses.enter(1); });
  await page.waitForFunction(async () => { const { Houses } = await import('/src/gameplay/Houses.js'); return Houses.inside && !Houses.fade; }, { timeout: 60000, polling: 500 });
  await wait(1500); await shot('house');
  await run(async () => { const { Houses } = await import('/src/gameplay/Houses.js'); Houses.reset(); const L = window.LANTERNMOSS; L.player.placeAt(L.player.up); });
  await wait(1500);
  // the village at night
  await run(async () => { const { dayClock } = await import('/src/gameplay/dayClock.js'); dayClock.t = 0.88 * 300;
    const L = window.LANTERNMOSS, house = L.planets.world.houses[1]; window.__stand(house.door, 7, 2); window.__frame(house.door, { turn: 0.3, pitch: 0.3, dist: 8 }); });
  await wait(5000); await shot('night');
  await run(async () => { const { dayClock } = await import('/src/gameplay/dayClock.js'); dayClock.t = 0.25 * 300; });

  // a fight: the hero among goblins, mid-spell
  await run(() => {
    const L = window.LANTERNMOSS, g = L.enemies.filter(e => e.alive && e.type === 'goblin');
    const e = g[0]; window.__stand(e.home, 6); for (const x of L.enemies) if (x.alive && x.home.distanceTo(e.home) < 0.3) x.aggro();
    for (let i = 0; i < 3; i++) L.spawnEnemy(['goblin', 'wisp', 'slime'][i], 0.15);
    window.__frame(e.home, { turn: 0.5, pitch: 0.5, dist: 9 });
  });
  await wait(5000);
  await run(() => { const L = window.LANTERNMOSS; L.tryCast('fireball'); });
  await wait(1200); await shot('combat');

  // a treasure chest opening (a locked Lantern chest, with a key)
  await run(() => { const L = window.LANTERNMOSS, c = L.Chests.list.find(x => x.kind === 'rare' && !x.opened);
    L.inventory.add('lanternKey', 1); for (const e of L.enemies) if (e.alive && e !== L.boss && e.up.distanceTo(c.up) < 0.4) e.vanish();
    window.__stand(c.up, 2.2); window.__frame(c.up, { turn: 0.9, pitch: 0.55, dist: 5.5 }); window.__chest = c; });
  await wait(3500); await run(() => window.LANTERNMOSS.Chests.open(window.__chest)); await wait(2600); await shot('chest', { keepToast: true });

  // the bag: gear, a full grid, then the Craft and Pets tabs
  await run(() => {
    const L = window.LANTERNMOSS, inv = L.inventory; L.player.coins = 140;
    for (const [id, n, r] of [['honeyBun', 4], ['moonberryTart', 2], ['glowTonic', 2], ['emberStew', 1], ['frostDraught', 1], ['glowcap', 14], ['emberShard', 9],
      ['frostPetal', 6], ['moonberry', 7], ['starStaff', 1, 'legendary'], ['frostMantle', 1, 'rare'], ['emberRing', 1, 'rare'], ['glowStaff', 1, 'uncommon'],
      ['mossCloak', 1, 'uncommon'], ['lanternPendant', 1], ['frostLocket', 1, 'legendary'], ['featherCharm', 1], ['mossCrown', 1]]) inv.add(id, n, r ? { rarity: r } : null);
    L.InventoryUI.open(); L.InventoryUI.use(inv.find('starStaff')); L.InventoryUI.use(inv.find('frostMantle'));
    L.InventoryUI.selected = inv.find('emberRing'); L.InventoryUI.message = ''; L.InventoryUI.render();
  });
  await wait(2000); await shot('bag');
  await page.click('[data-tab="craft"]'); await wait(1500); await shot('crafting');
  await run(() => { const Pt = window.LANTERNMOSS.Pets; for (const id of ['fox', 'wisp', 'whelp']) Pt.unlocked.add(id); });
  await page.click('[data-tab="pets"]'); await wait(1500); await shot('pets');
  await run(() => { const L = window.LANTERNMOSS; L.InventoryUI.close(); L.Pets.choose('whelp'); });

  // bosses: Pyrrhax on Emberfall, then Malgrath on Frostveil
  for (const [planet, name, turn] of [[1, 'boss-dragon', -0.5], [2, 'boss-demon', 0.45]]) {
    await run(p => window.LANTERNMOSS.goToPlanet(p), planet); await wait(4000);
    await run(turn => { const L = window.LANTERNMOSS, B = L.boss; window.__stand(B.home, 11); B.aggro(); window.__frame(B.home, { turn, pitch: 0.32, dist: 12 }); }, turn);
    await wait(9000);
    await run(turn => { const L = window.LANTERNMOSS; window.__frame(L.boss.up, { turn, pitch: 0.32, dist: 12 }); }, turn);
    await wait(3000); await shot(name);
  }
  console.log('errors:', errors.length ? errors : 'none');
} finally {
  await browser.close(); server.kill();
}
