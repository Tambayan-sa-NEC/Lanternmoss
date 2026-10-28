// TODO 30f (Gloomweavers and Snuffers) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow roster fixture, never on the authored unreleased
// world. Checks, on the lowest quality preset: a weaver really renders and really spins webs; walking into one
// really slows the hero, cutting it really frees them and leaves spider silk; fire really burns one away; a snuffer
// really takes oil out of the Oil bar and really gives it back with interest; the accessibility toggle really swaps
// every spider on screen for a beetle without touching the fight; 720p and 1080p overflow nothing; zero page and
// shader errors. Writes the duskhollow-gloomweaver, duskhollow-beetles and duskhollow-snuffer shots (mobs/).
// Port 8134.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8134, quality: 'low',
  bootstrap: "import {installDuskMonsterFixture} from '/tests/sim/lib/duskMonsterFixture.mjs'; installDuskMonsterFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const hold = async (code, n) => { await page.keyboard.down(code); await frames(n); await page.keyboard.up(code); await frames(2); };
// 'achv' too: fighting through the checks unlocks achievements, whose banner would otherwise sit in every shot
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast', 'achv'];
const clean = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, CLUTTER);
const restore = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, CLUTTER);

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    dayClock.t = 0.95 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    L.goToPlanet('lanternmoss');                                       // reload the borrowed slot so its roster is built
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    window.__heal = setInterval(() => { const P = L.player; P.hp = P.stats.maxHp; L.Pets.petCool = 99; }, 30);
    window.__frame = (dir, { turn = 0, pitch = 0.3, dist = 7 } = {}) => {
      const P = L.player; L.cam.up.copy(P.up); L.cam.fwd.copy(dir).sub(P.up);
      L.cam.fwd.addScaledVector(P.up, -L.cam.fwd.dot(P.up)).normalize();
      L.cam.fwd.applyAxisAngle(P.up, turn); L.cam.pitch = pitch; L.cam.dist = dist; L.cam.init = false; L.cam.lastDrag = 1e9;
    };
  });
  await frames(30);

  // ---- a weaver renders, and really spins -----------------------------------------------------------------------
  const spun = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const { spin } = await import('/src/entities/enemies/behaviors/weaver.js');
    const e = L.enemies.find(x => x.type === 'gloomweaver');
    const far = offsetDir(L.planets.world.spawnDir, 2.2, 120);
    e.spawn(far); e.home.copy(far); e.webs = [];
    L.player.placeAt(offsetDir(far, 0, 25)); for (let i = 0; i < 20; i++) L.update(1 / 60);
    const made = []; for (let i = 0; i < e.def.web.max + 2; i++) { const w = spin(e); if (w) made.push(w); }
    return { weaver: L.enemies.indexOf(e), spider: e.spider.visible, legs: e.legs.length,
      made: made.length, cap: e.def.web.max, live: e.webs.filter(w => w.alive).length,
      webIndex: made[0] ? L.enemies.indexOf(made[0]) : -1, sheet: !!made[0]?.sheet.visible };
  });
  assert.ok(spun.spider && spun.legs === 8, `a gloomweaver renders as a spider: ${JSON.stringify(spun)}`);
  assert.equal(spun.made, spun.cap, 'it spins up to its own cap and no further');
  assert.ok(spun.sheet, 'and each web draws its sheet of silk');
  console.log(`PASS  a gloomweaver renders and spins ${spun.cap} sticky webs, never more`);

  // ---- real walking into a web slows the hero; cutting it frees them and leaves silk ------------------------------
  const stuck = await page.evaluate(async webIndex => {
    const L = window.LANTERNMOSS, { tangentToward } = await import('/src/utils/sphere.js'), { offsetDir } = await import('/src/utils/sphere.js');
    const w = L.enemies[webIndex];
    L.player.placeAt(offsetDir(w.up, 0, 4)); L.companion?.snapToHero?.();
    L.player.fwd.copy(tangentToward(L.player.up, w.up));
    window.__frame(w.up, { turn: 0, pitch: 0.26, dist: 7 });           // W walks away from the camera: aim it at the web
    for (let i = 0; i < 10; i++) L.update(1 / 60);
    return { before: L.player.mireK, gap: w.up.angleTo(L.player.up) };
  }, spun.webIndex);
  assert.equal(stuck.before, 1, 'outside the web the hero walks freely');
  await hold('KeyW', 70);                                              // really walk into it
  const inWeb = await page.evaluate(webIndex => {
    const L = window.LANTERNMOSS, w = L.enemies[webIndex];
    return { mire: L.player.mireK, mireDef: w.def.mire, silkBefore: L.inventory.count('spiderSilk') };
  }, spun.webIndex);
  assert.ok(inWeb.mire < 1 && Math.abs(inWeb.mire - inWeb.mireDef) < 1e-6, `walking into it really slows the hero (${inWeb.mire})`);
  const cut = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const { arcDist } = await import('/src/utils/sphere.js');
    // the weaver's webs overlap, so cut every one the hero is actually standing in
    const on = L.enemies.filter(e => e.alive && e.type === 'gloomweb' && arcDist(e.up, L.player.up) < e.def.radius);
    for (const w of on) damageEnemy(w, w.def.hp * 3);                  // a blade's worth
    for (let i = 0; i < 20; i++) L.update(1 / 60);
    return { n: on.length, alive: on.some(w => w.alive), mire: L.player.mireK,
      silk: L.inventory.count('spiderSilk') + L.worldItems.filter(i => i.itemId === 'spiderSilk').length };
  });
  assert.ok(cut.n > 0 && !cut.alive && cut.mire === 1, `cutting them frees the hero at once: ${JSON.stringify(cut)}`);
  assert.ok(cut.silk > inWeb.silkBefore, 'and leaves spider silk');
  console.log(`PASS  real W walking into a web slows the hero to ${(inWeb.mire * 100).toFixed(0)}%; a blade cuts it, frees them and leaves silk`);

  // ---- fire burns a web away in one --------------------------------------------------------------------------------
  const burnt = await page.evaluate(async weaverIndex => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const { spin } = await import('/src/entities/enemies/behaviors/weaver.js');
    const e = L.enemies[weaverIndex]; e.webs = [];
    const w = spin(e); if (!w) return { ok: false };
    const hp = w.hp; damageEnemy(w, 1, { fire: true });
    return { ok: true, hp, alive: w.alive, burnt: !!w.burnt };
  }, spun.weaver);
  assert.ok(burnt.ok && burnt.hp > 1 && !burnt.alive && burnt.burnt, `a touch of fire burns a whole web away: ${JSON.stringify(burnt)}`);
  console.log(`PASS  one hit of fire burns away a web a blade would have taken ${burnt.hp} damage to cut`);

  // ---- a snuffer really empties the Oil bar, and really pays it back ------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const e = L.enemies.find(x => x.type === 'snuffer');
    const far = offsetDir(L.planets.world.spawnDir, 3.6, 125);
    e.spawn(far); e.home.copy(far);
    L.planets.world.mechanics.active.instance.refill(1e6);
    L.player.placeAt(offsetDir(far, 0, 2)); L.companion?.snapToHero?.(); L.player.invuln = 0;
    e.aggro(); e.cool = 0; window.__thief = L.enemies.indexOf(e);
  });
  const oilBefore = await page.evaluate(() => document.querySelector('.bar.oil span:last-child')?.textContent ?? '');
  await frames(260);
  const robbed = await page.evaluate(() => {
    const L = window.LANTERNMOSS, e = L.enemies[window.__thief];
    return { stolen: e.stolen, oil: L.planets.world.mechanics.active.instance.status.oil,
      flask: e.flask.visible, bar: document.querySelector('.bar.oil span:last-child')?.textContent ?? '' };
  });
  assert.ok(robbed.stolen > 0, `a snuffer really takes oil: ${JSON.stringify(robbed)}`);
  assert.ok(robbed.flask, 'and carries it off in a flask you can see');
  assert.notEqual(robbed.bar, oilBefore, 'the Oil bar really moves');
  const repaid = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const e = L.enemies[window.__thief], before = L.planets.world.mechanics.active.instance.status.oil, took = e.stolen;
    damageEnemy(e, e.def.hp * 4);
    for (let i = 0; i < 10; i++) L.update(1 / 60);
    return { took, back: L.planets.world.mechanics.active.instance.status.oil - before, interest: e.def.steal.interest };
  });
  assert.ok(repaid.back > repaid.took, `catching it pays back more than it took (${repaid.back.toFixed(0)} for ${repaid.took.toFixed(0)})`);
  console.log(`PASS  a snuffer really drains the Oil bar and pays back ${repaid.interest}x when it is caught`);

  // ---- the accessibility toggle ---------------------------------------------------------------------------------------
  const look = async on => page.evaluate(async on => {
    const L = window.LANTERNMOSS, { setSetting } = await import('/src/core/settings.js');
    setSetting('roundBeetles', on);
    for (let i = 0; i < 4; i++) L.update(1 / 60);
    const spiders = L.enemies.filter(e => e.alive && e.type === 'gloomweaver');
    return { n: spiders.length, spider: spiders.filter(e => e.spider.visible).length, beetle: spiders.filter(e => e.beetle.visible).length,
      legs: spiders.every(e => e.legs.length === 8), hp: spiders.map(e => e.def.hp)[0] };
  }, on);
  const asSpiders = await look(false), asBeetles = await look(true);
  assert.ok(asSpiders.n > 0 && asSpiders.spider === asSpiders.n && asSpiders.beetle === 0, `by default they are spiders: ${JSON.stringify(asSpiders)}`);
  assert.ok(asBeetles.beetle === asBeetles.n && asBeetles.spider === 0, `the setting really swaps every one of them: ${JSON.stringify(asBeetles)}`);
  assert.ok(asBeetles.legs && asBeetles.hp === asSpiders.hp, 'and changes nothing about the fight');
  console.log(`PASS  "Draw spiders as beetles" swaps all ${asBeetles.n} of them on screen, and nothing else`);

  // ---- both resolutions, and the three feature shots ---------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height !== 1080) continue;

    /** Stages a monster a fixed distance from the hero, pinned so it cannot wander into the camera. */
    const stage = (index, { turn = 0.5, pitch = 0.26, dist = 6.5, metres = 3.2, settle = 150 } = {}) => page.evaluate(async ([index, turn, pitch, dist, metres, settle]) => {
      const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { groundHeight } = await import('/src/world/terrain.js');
      const e = L.enemies[index], stand = L.player.up.clone();
      const pin = () => {
        const d = offsetDir(stand, 1.0, metres);
        e.up.copy(d); e.r = groundHeight(d) + (e.def.hover ?? 0); e.pos.copy(d).multiplyScalar(e.r);
        e.home.copy(d); e.state = 'chase'; e.timer = 1e9; e.cool = 1e9; e.hideTele();
        e.fwd.copy(tangentToward(d, stand));
      };
      if (L.companion) L.companion.root.visible = false;
      pin(); L.player.fwd.copy(tangentToward(L.player.up, e.up));
      for (let i = 0; i < settle; i++) { L.update(1 / 60); pin(); }    // the emote bubbles and damage numbers fade
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, e.up));
      window.__frame(e.up, { turn, pitch, dist });
      for (let i = 0; i < 4; i++) { L.update(1 / 60); pin(); }
    }, [index, turn, pitch, dist, metres, settle]);

    // The weaver and its webs: the spider, then the very same scene drawn as a beetle. The webs go up around it
    // once it is pinned, so they are where the camera is looking, and the scene then settles until their spinning
    // sparkles have faded.
    const stageWeaver = (beetles, settle) => page.evaluate(async ([weaverIndex, beetles, settle]) => {
      const L = window.LANTERNMOSS, { setSetting } = await import('/src/core/settings.js');
      const { addEnemy } = await import('/src/combat/spawning.js');
      const { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { groundHeight } = await import('/src/world/terrain.js');
      setSetting('roundBeetles', beetles);
      const e = L.enemies[weaverIndex], stand = L.player.up.clone();
      const pin = () => {
        const d = offsetDir(stand, 1.0, 2.2);
        e.up.copy(d); e.r = groundHeight(d); e.pos.copy(d).multiplyScalar(e.r);
        e.home.copy(d); e.state = 'chase'; e.timer = 1e9; e.cool = 1e9; e.hideTele();
        e.fwd.copy(tangentToward(d, stand));
      };
      // The pet steps out; the hero stays (updatePlayerVitals rewrites their visibility every frame anyway), so the
      // camera looks down on the pair instead, which is how a creature this small reads at all.
      if (L.companion) L.companion.root.visible = false;
      pin();
      for (const w of e.webs ?? []) if (w.alive) w.die();              // re-strung each time, around where it now stands
      e.webs = [];
      for (const [angle, metres] of [[0.6, 2.2], [3.3, 2.0], [5.4, 2.4]]) e.webs.push(addEnemy(e.def.web.type, offsetDir(e.up, angle, metres)));
      L.planets.world.mechanics.active.instance.refill(1e6);
      L.player.fwd.copy(tangentToward(L.player.up, e.up));
      for (let i = 0; i < settle; i++) { L.update(1 / 60); pin(); }
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, e.up));
      window.__frame(e.up, { turn: 1.15, pitch: 0.5, dist: 4.6 });     // swung well round the hero: a gloomweaver is small
      for (let i = 0; i < 4; i++) { L.update(1 / 60); pin(); }
    }, [spun.weaver, beetles, settle]);

    await stageWeaver(false, 140);
    await clean();
    await page.screenshot({ path: shotPath('duskhollow-gloomweaver'), type: 'jpeg', quality: 88 });
    await restore();

    await stageWeaver(true, 140);
    await clean();
    await page.screenshot({ path: shotPath('duskhollow-beetles'), type: 'jpeg', quality: 88 });
    await restore();
    await page.evaluate(async () => { const { setSetting } = await import('/src/core/settings.js'); setSetting('roundBeetles', false); });

    // A snuffer running off with a full flask of stolen oil.
    const thiefIndex = await page.evaluate(async weaverIndex => {
      const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
      const weaver = L.enemies[weaverIndex];                           // its webs and its body step out of this shot
      for (const w of weaver.webs ?? []) if (w.alive) w.die();
      weaver.webs = [];
      const away = offsetDir(L.planets.world.spawnDir, 5.0, 150); weaver.spawn(away); weaver.home.copy(away);
      const e = L.enemies.find(x => x.type === 'snuffer' && x.alive);
      const near = offsetDir(L.player.up, 1.0, 3.2); e.spawn(near); e.home.copy(near);
      e.stolen = e.def.steal.oil; e.fleeT = 0;                         // caught mid-escape, flask full
      return L.enemies.indexOf(e);
    }, spun.weaver);
    await stage(thiefIndex, { turn: 1.15, pitch: 0.46, dist: 4.4, metres: 2.0 });
    await frames(2); await clean();
    await page.screenshot({ path: shotPath('duskhollow-snuffer'), type: 'jpeg', quality: 88 });
    await restore();
    await page.evaluate(() => { const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true; });
  }
  await page.evaluate(() => clearInterval(window.__heal));
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, all three feature shots are saved, and there are zero page and shader errors');
} finally { await close(); }
