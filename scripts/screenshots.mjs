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
const shot = async (name, { keepToast = false, keepBanner = false } = {}) => {
  if (only && !only.has(name)) return;
  if (!keepToast) await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; });
  await page.evaluate(keep => { const a = document.getElementById('achv'); if (a) a.style.visibility = keep ? '' : 'hidden'; }, keepBanner);
  await page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 84 }); console.log('saved', name);
};
const run = (fn, ...args) => page.evaluate(fn, ...args);
/** Steps the game `secs` ahead at 30 fps (software rendering is too slow for the menu camera's swoop to settle). */
const ff = secs => run(s => { for (let i = 0; i < s * 30; i++) window.LANTERNMOSS.update(1 / 30); }, secs);

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await run(() => localStorage.setItem('lanternmoss.settings', JSON.stringify({ pauseOnBlur: false })));
  await wait(5000); await shot('title');
  await page.click('[data-act="play"]'); await ff(3); await wait(2500); await shot('select');
  await page.keyboard.press('Enter'); await ff(3); await wait(2500); await shot('select-pet');       // the pet step
  await run(() => { const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.setWeather('clear'); L.weather.timer = 1e9; });   // (weather pinned per scene)
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

  // swimming in a lake
  await run(() => { const L = window.LANTERNMOSS, P = L.player;
    import('/src/world/terrain.js').then(T => import('/src/utils/sphere.js').then(S => {
      const lake = T.ponds.filter(p => p.r >= 8).sort((a, b) => S.arcDist(a.dir, P.up) - S.arcDist(b.dir, P.up))[0] ?? T.ponds[0];
      P.placeAt(S.dirAlong(lake.dir, lake.t1, lake.r * 0.4)); window.__frame(lake.dir, { pitch: 0.3, dist: 7 }); L.cam.fwd.negate();
      L.keys.KeyW = true; setTimeout(() => { L.keys.KeyW = false; }, 2600); })); });
  await wait(2600); await shot('swim');

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

  // the bag: the equipment side (worn gear round the hero, the vanity slots), a full grid, the details window under it;
  // then the Craft tab
  await run(() => {
    const L = window.LANTERNMOSS, inv = L.inventory; L.player.coins = 140;
    for (const [id, n, r] of [['honeyBun', 4], ['pumpkinPie', 2], ['healingPotion', 2], ['woodAxe', 1], ['fishingRod', 1], ['starwater', 1], ['glowcap', 14], ['emberShard', 9],
      ['wood', 12], ['stone', 9], ['copperOre', 4], ['sweetleaf', 6], ['carrotSeeds', 3], ['moonberry', 7], ['starStaff', 1, 'legendary'], ['frostMantle', 1, 'rare'],
      ['mossHood', 1, 'uncommon'], ['wanderBoots', 1, 'uncommon'], ['lanternPendant', 1], ['strawHat', 1], ['leafCape', 1],
      ['emberRing', 1, 'rare'], ['frostLocket', 1, 'legendary'], ['glowStaff', 1, 'uncommon'], ['amethyst', 1], ['mossCrown', 1]]) inv.add(id, n, r ? { rarity: r } : null);
    L.InventoryUI.open();
    for (const id of ['starStaff', 'frostMantle', 'mossHood', 'wanderBoots', 'lanternPendant', 'strawHat', 'leafCape']) L.InventoryUI.use(inv.find(id));
    L.InventoryUI.selected = inv.find('emberRing'); L.InventoryUI.message = ''; L.InventoryUI.render();
  });
  await wait(2500); await shot('bag');
  await page.click('[data-tab="craft"]'); await wait(1500); await shot('crafting');
  await run(() => { const L = window.LANTERNMOSS; L.InventoryUI.setTab('bag'); L.InventoryUI.commands.unequip('hat'); L.InventoryUI.commands.unequip('back'); });
  await run(() => { const Pt = window.LANTERNMOSS.Pets; for (const id of ['fox', 'wisp', 'whelp']) Pt.unlocked.add(id); });
  // the pet menu (B): the world pauses, the camera holds on the pet
  await run(() => { const L = window.LANTERNMOSS; L.InventoryUI.close(); L.PetMenu.open(); L.PetMenu.pick('whelp'); });
  await ff(3); await wait(2500); await shot('pets');
  await run(() => { const L = window.LANTERNMOSS, P = L.player; L.PetMenu.close();     // and out with the whelp (pet card lower left)
    L.cam.fwd.copy(P.fwd).applyAxisAngle(P.up, 2.5); L.cam.pitch = 0.3; L.cam.dist = 6.5; L.cam.init = false; L.cam.lastDrag = 1e9; });
  await wait(5000); await shot('pet-field');

  // the journal: an achievement unlocking, then the Achievements and Bestiary tabs (a journal partway through)
  await run(() => {
    const J = window.LANTERNMOSS.Journal, d = J.data;
    Object.assign(d.defeated, { goblin: 31, ogre: 4, wisp: 9, slime: 12, slimeling: 20, puffcap: 6, ramhorn: 3, gloomcap: 1 });
    for (const t of ['goblin', 'ogre', 'wisp', 'slime', 'slimeling', 'puffcap', 'ramhorn', 'gloomcap', 'thornmole']) d.seen[t] = true;
    Object.assign(d.stats, { monsters: 24, bosses: 1, chests: 7, quests: 2, crafted: 3 }); d.flags.petless = true;
    for (const id of ['glowcap', 'emberShard', 'mossCloak', 'glowStaff', 'mossCrown', 'moonberryTart']) d.found[id] = true;
    J.changed();                                                     // unlocks what that adds up to (banners queue up)
    J.add('monsters');                                               // and the 25th monster: Monster Tamer
  });
  await wait(2500); await shot('achievement', { keepBanner: true });
  await run(() => { const L = window.LANTERNMOSS; L.JournalUI.open('achievements'); }); await wait(1500); await shot('journal');
  await run(() => { const L = window.LANTERNMOSS; L.JournalUI.page = 'ogre'; L.JournalUI.setTab('bestiary'); }); await wait(2000); await shot('bestiary');
  await run(() => window.LANTERNMOSS.JournalUI.close()); await wait(600);

  // the pause menu: Settings → Keys (remapping), and the Controls page
  await run(() => window.LANTERNMOSS.PauseMenu.open()); await wait(800);
  await page.click('[data-go="settings"]'); await wait(800);
  await run(() => document.querySelector('#pause .keys h4:nth-of-type(2)')?.scrollIntoView({ block: 'start' })); await wait(600); await shot('keys');
  await page.click('[data-go="main"]'); await wait(400); await page.click('[data-go="controls"]'); await wait(800); await shot('controls');
  await run(() => window.LANTERNMOSS.PauseMenu.close()); await wait(600);

  // TODO 15: a storm over the village, the wild meadows, a rare creature, the Hydra, the dragontoad
  await run(async () => { const S = await import('/src/utils/sphere.js'), L = window.LANTERNMOSS;
    window.__at = (dir, metres, turn = 0) => {          // stand `metres` from dir (along the surface), facing it
      const t = S.tangentFrame(dir)[0].applyAxisAngle(dir, turn), at = S.dirAlong(dir, t, metres);
      L.player.placeAt(at); L.player.fwd.copy(S.tangentToward(at, dir)); window.__frame(dir, { pitch: 0.36, dist: 8 }); };
    window.__put = (c, dir) => { c.up.copy(dir); c.home?.copy?.(dir); c.r = c.r ?? 0; c.pos.copy(dir).multiplyScalar(c.r); c.state = 'idle'; c.timer = 99; c.cool = 99; };
    window.__sky = kind => { L.setWeather(kind); L.weather.timer = 1e9; }; });
  await run(() => { const L = window.LANTERNMOSS, pim = L.npcs.find(n => n.name === 'Pim'); window.__sky('storm');
    window.__stand(pim.up, 6, 1.5); window.__frame(pim.up, { turn: 0.35, pitch: 0.3, dist: 9 }); });
  await ff(1); await wait(3000); await shot('storm');
  await run(async () => { const S = await import('/src/utils/sphere.js'), T = await import('/src/world/terrain.js'), L = window.LANTERNMOSS; window.__sky('breezy');
    const deer = L.critters.find(c => c.kind === 'deer'), bunnies = L.critters.filter(c => c.kind === 'bunny' && !c.rare).slice(0, 2);
    window.__put(deer, deer.up); bunnies.forEach((b, i) => { const d = S.offsetDir(deer.up, 1.2 + i * 1.1, 3 + i); b.r = T.groundHeight(d); window.__put(b, d); });
    window.__at(deer.up, 7, 2.1); window.__frame(deer.up, { turn: 0.4, pitch: 0.2, dist: 5.5 }); });
  await ff(0.4); await wait(3000); await shot('meadow');
  await run(() => { const L = window.LANTERNMOSS, r = L.critters.find(c => c.rare); window.__sky('clear');
    window.__at(r.up, 2.1, 0.3); L.player.vel.set(0, 0, 0); r.state = 'sit'; r.timer = 99; window.__frame(r.up, { turn: 1.2, pitch: 0.4, dist: 5.5 }); });
  await ff(0.4); await wait(2500); await shot('rare', { keepToast: true });
  await run(() => { const L = window.LANTERNMOSS, h = L.enemies.find(e => e.type === 'hydra'); L.Pets.command('passive');
    window.__at(h.up, 10, 0.4); L.player.invuln = 1e9; h.aggro(); });
  await ff(2.5); await run(() => { const L = window.LANTERNMOSS, h = L.enemies.find(e => e.type === 'hydra'); window.__frame(h.up, { turn: 0.55, pitch: 0.3, dist: 12 }); });
  await ff(0.3); await wait(2500); await shot('hydra');
  await run(async () => { const L = window.LANTERNMOSS, h = L.enemies.find(e => e.type === 'hydra'), { damageEnemy } = await import('/src/combat/damage.js');
    while (h.alive) { h.invulnerable = false; damageEnemy(h, 400); } });
  await ff(1.5); await run(() => { const L = window.LANTERNMOSS; L.player.invuln = 0; document.getElementById('cresult').classList.remove('show'); L.Pets.choose('dragontoad'); L.PetMenu.open(); L.PetMenu.pick('dragontoad'); });
  await ff(3); await wait(2500); await shot('dragontoad');
  await run(() => { const L = window.LANTERNMOSS; L.PetMenu.close(); L.Pets.command('follow'); }); await wait(600);

  // TODO 16: the farm (plots at every stage, the hero in the straw hat), fishing (the reeling meter), mining a vein
  await run(() => { const L = window.LANTERNMOSS, F = L.Farm, inv = L.inventory; window.__sky('clear');
    const looks = [{ tilled: true, crop: 'pumpkin', growth: 1, watered: false }, { tilled: true, crop: 'wheat', growth: 1, watered: false },
      { tilled: true, crop: 'carrot', growth: 1, watered: false }, { tilled: true, crop: 'carrot', growth: 0.7, watered: true },
      { tilled: true, crop: 'wheat', growth: 0.3, watered: true }, { tilled: false, crop: null, growth: 0, watered: false }];
    F.plots.forEach((p, i) => { Object.assign(p.s, looks[i]); p.stage = -1; F.look(p); });
    for (const k of ['hat', 'back']) { const id = k === 'hat' ? 'strawHat' : 'leafCape', s = inv.find(id); if (s >= 0) L.InventoryUI.commands.equip(s, k); }
    if (inv.find('wateringCan') < 0) inv.add('wateringCan', 1);
    const p = F.plots[3]; window.__at(p.dir, 1.6, 2.6); L.player.vel.set(0, 0, 0); L.Hotbar.selected = inv.find('wateringCan');
    for (const e of L.critters) if (e.up.distanceTo(F.center) < 0.25) e.root.visible = false;
    window.__frame(F.center, { turn: 2.2, pitch: 0.42, dist: 9 }); });
  await ff(0.5); await wait(3000); await shot('farm');
  await run(() => { const L = window.LANTERNMOSS, inv = L.inventory, p = L.ponds.filter(q => q.r < 6).sort((a, b) => a.dir.distanceTo(L.player.up) - b.dir.distanceTo(L.player.up))[0];
    if (inv.find('fishingRod') < 0) inv.add('fishingRod', 1);
    window.__at(p.dir, p.r + 0.9, 0.6); L.player.vel.set(0, 0, 0); L.Fishing.start(p); window.__pond = p; });
  await ff(0.8); await run(() => { const L = window.LANTERNMOSS, Fi = L.Fishing; Fi.s.biteAt = 0; L.update(1 / 30); Fi.press(); Fi.s.t = 0.35;
    Fi.drawMeter(0.42); window.__frame(Fi.s.dir, { turn: 1.3, pitch: 0.75, dist: 8 }); });
  await ff(0.1); await run(async () => { const Fi = window.LANTERNMOSS.Fishing, { ctx } = await import('/src/core/context.js');
    Fi.s.t = 0.2; Fi.s.centre = 0.5; Fi.showMeter(true); Fi.drawMeter(0.47); ctx.paused = true; });   // hold the moment (the world pauses, drawing goes on)
  await wait(2500); await shot('fishing');
  await run(async () => { const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js'); ctx.paused = false;
    L.Fishing.end(); const inv = L.inventory, G = L.Gathering;
    if (inv.find('stonePick') < 0) inv.add('stonePick', 1);
    const v = G.nodes.filter(n => n.kind === 'copperVein').sort((a, b) => a.up.distanceTo(L.player.up) - b.up.distanceTo(L.player.up))[0];
    window.__at(v.up, v.def.r + 0.7, 1.2); L.player.vel.set(0, 0, 0); window.__vein = v; });
  await ff(2); await run(() => { const L = window.LANTERNMOSS; L.Gathering.work({ node: window.__vein });
    window.__frame(window.__vein.up, { turn: 0.85, pitch: 0.36, dist: 6.5 }); });
  await ff(0.2);
  await ff(0.05); await run(async () => { (await import('/src/core/context.js')).ctx.paused = true; });
  await wait(2500); await shot('gathering');
  await run(async () => { (await import('/src/core/context.js')).ctx.paused = false; });
  await run(() => { const L = window.LANTERNMOSS; L.Gathering.stop(); L.InventoryUI.commands.unequip('hat'); L.InventoryUI.commands.unequip('back'); });

  // Gloomcap's sealed lair (the seals and the status chip), its waking (the name card), and the arena ring
  await run(async () => { const S = await import('/src/utils/sphere.js'), L = window.LANTERNMOSS, G = L.BossGate;
    window.__at = (dir, metres, turn = 0) => {          // stand `metres` from dir (along the surface), facing it
      const t = S.tangentFrame(dir)[0].applyAxisAngle(dir, turn), at = S.dirAlong(dir, t, metres);
      L.player.placeAt(at); L.player.fwd.copy(S.tangentToward(at, dir)); window.__frame(dir, { pitch: 0.36, dist: 8 }); };
    for (const e of L.enemies) if (e.alive && e !== L.boss && !e.def.object && S.arcDist(e.up, G.lair) < 40) e.vanish();
    window.__at(G.lair, 22, 0.6); window.__frame(G.lair, { turn: 0.2, pitch: 0.3, dist: 7 }); });
  await ff(1); await wait(2500); await shot('lair');
  await run(async () => { const L = window.LANTERNMOSS, G = L.BossGate, { damageEnemy } = await import('/src/combat/damage.js');
    L.player.level = Math.max(L.player.level, 2); for (const s of G.seals) while (s.alive) damageEnemy(s, 200); });
  await ff(0.5); await run(() => { document.getElementById('cresult').classList.remove('show'); window.__at(window.LANTERNMOSS.BossGate.lair, 14, 0.6); });
  await ff(2.0); await wait(900); await shot('summon');
  await ff(2.5); await run(() => { const L = window.LANTERNMOSS, B = L.boss; L.Pets.command('passive'); window.__at(B.home, 10, 2.2); B.aggro(); });
  await ff(1.5); await run(() => { const L = window.LANTERNMOSS; window.__frame(L.boss.up, { turn: 0.35, pitch: 0.5, dist: 16 }); });
  await ff(0.3); await wait(2500); await shot('arena');

  // bosses: Pyrrhax on Emberfall, then Malgrath on Frostveil
  for (const [planet, name, turn] of [[1, 'boss-dragon', -0.5], [2, 'boss-demon', 0.45]]) {
    await run(p => { window.LANTERNMOSS.goToPlanet(p); window.__sky('clear'); }, planet); await wait(4000);
    await run(turn => { const L = window.LANTERNMOSS, B = L.boss; L.wakeBoss(); window.__stand(B.home, 11); B.aggro(); window.__frame(B.home, { turn, pitch: 0.32, dist: 12 }); }, turn);
    await wait(9000);
    await run(turn => { const L = window.LANTERNMOSS; window.__frame(L.boss.up, { turn, pitch: 0.32, dist: 12 }); }, turn);
    await wait(3000); await shot(name);
    if (planet === 1) {                                                // Emberfall's mesas: look from low ground at the highest nearby
      await run(() => import('/src/world/terrain.js').then(T => import('/src/utils/sphere.js').then(S => {
        const L = window.LANTERNMOSS, P = L.player, base = S.offsetDir(L.planets.world.spawnDir, 2.2, 44);
        let best = base, bh = -1e9; for (let i = 0; i < 400; i++) { const d = S.offsetDir(base, i * 0.157, 10 + (i % 20) * 2); const h = T.groundHeight(d); if (h > bh) { bh = h; best = d; } }
        P.placeAt(base); window.__frame(best, { pitch: 0.16, dist: 9 }); })));
      await wait(5000); await shot('mesas');
      // the Basilisk, eyes blazing as its gaze winds up (turn away!)
      await run(() => { const L = window.LANTERNMOSS, B = L.enemies.find(e => e.type === 'basilisk'); window.__at(B.up, 9, 3.4); L.player.invuln = 1e9; B.aggro();
        for (let i = 0; i < 900 && !(B.state === 'windup' && B.attack === 'gaze'); i++) { B.cool = 0; B.moveCd.whip = B.moveCd.lunge = 9; B.lastAttack = 'whip'; L.update(1 / 30); }
        for (let i = 0; i < 28; i++) L.update(1 / 30);
        window.__frame(B.up, { turn: -0.45, pitch: 0.3, dist: 8 }); });
      await wait(2500); await shot('basilisk');
      await run(() => { window.LANTERNMOSS.player.invuln = 0; });
    }
    if (planet === 2) {                                                // a blizzard over Frostveil's village
      await run(() => { const L = window.LANTERNMOSS; window.__sky('blizzard'); const t = L.npcs.find(n => n.name === 'Tuva') ?? L.npcs[0];
        window.__stand(t.up, 6, 1.5); window.__frame(t.up, { turn: 0.4, pitch: 0.3, dist: 9 }); });
      await ff(1); await wait(3000); await shot('blizzard');
    }
  }
  console.log('errors:', errors.length ? errors : 'none');
} finally {
  await browser.close(); server.kill();
}
