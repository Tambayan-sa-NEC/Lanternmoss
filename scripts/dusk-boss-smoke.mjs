// TODO 30g (Grandmother Gloomweaver) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow mini-boss fixture, never on the authored
// unreleased world. Checks, on the lowest quality preset: she renders hanging on three strands over the vein she
// guards and really refuses every blow up there; a strand really refuses a blade; really walking up to one with a
// lit lantern really burns it through (and an empty one does not); fire takes one in a touch; the last one drops
// her; she really re-anchors at a threshold; the beetle toggle really swaps her and her grandchildren together;
// 720p and 1080p overflow nothing; zero page and shader errors.
// Writes the duskhollow-grandweaver shot (bosses/): she hangs on her strands with one of them already charring.
// Port 8135.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8135, quality: 'low',
  bootstrap: "import {installDuskBossFixture} from '/tests/sim/lib/duskBossFixture.mjs'; installDuskBossFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const hold = async (code, n) => { await page.keyboard.down(code); await frames(n); await page.keyboard.up(code); await frames(2); };
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast', 'achv'];
const clean = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, CLUTTER);
const restore = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, CLUTTER);
const boss = () => page.evaluate(() => {
  const L = window.LANTERNMOSS, g = L.enemies.find(e => e.type === 'grandweaver');
  return { hp: g.hp, hung: !!g.hung, hover: g.hover, state: g.state, phase: g.bossPhase, spider: g.spider.visible,
    beetle: g.beetle.visible, strands: L.enemies.filter(e => e.type === 'gloomAnchor' && e.alive).length };
});

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    dayClock.t = 0.95 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    L.goToPlanet('lanternmoss');                                       // reload the borrowed slot so the mini boss is placed
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    window.__heal = setInterval(() => { const P = L.player; P.hp = P.stats.maxHp; L.Pets.petCool = 99; }, 30);
    window.__frame = (dir, { turn = 0, pitch = 0.3, dist = 7 } = {}) => {
      const P = L.player; L.cam.up.copy(P.up); L.cam.fwd.copy(dir).sub(P.up);
      L.cam.fwd.addScaledVector(P.up, -L.cam.fwd.dot(P.up)).normalize();
      L.cam.fwd.applyAxisAngle(P.up, turn); L.cam.pitch = pitch; L.cam.dist = dist; L.cam.init = false; L.cam.lastDrag = 1e9;
    };
  });
  await frames(40);

  // ---- she hangs over the vein she guards, and nothing reaches her ----------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const g = L.enemies.find(e => e.type === 'grandweaver');
    L.player.placeAt(offsetDir(g.home, 0, 7)); L.companion?.snapToHero?.();
    for (let i = 0; i < 90; i++) L.update(1 / 60);
  });
  const hung = await boss();
  assert.ok(hung.hung && hung.strands === 3, `she hangs on three strands: ${JSON.stringify(hung)}`);
  assert.ok(hung.hover > 4, `well out of reach (${hung.hover.toFixed(1)} m up)`);
  const guard = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { currentInteraction } = await import('/src/gameplay/Houses.js');
    const { arcDist } = await import('/src/utils/sphere.js');
    const g = L.enemies.find(e => e.type === 'grandweaver');
    const vein = L.Gathering.nodes.find(n => n.def.guardedBy);
    L.player.placeAt(vein.up); for (let i = 0; i < 12; i++) L.update(1 / 60);
    return { label: currentInteraction()?.label ?? '', near: arcDist(vein.up, g.home) };
  });
  assert.match(guard.label, /guarded/, `the vein is hers while she lives (${guard.label})`);
  const blocked = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const { offsetDir } = await import('/src/utils/sphere.js');
    const g = L.enemies.find(e => e.type === 'grandweaver');
    L.player.placeAt(offsetDir(g.home, 0, 5)); for (let i = 0; i < 12; i++) L.update(1 / 60);
    const hp = g.hp; damageEnemy(g, 500); damageEnemy(g, 500, { fire: true });
    return { hp, after: g.hp };
  });
  assert.equal(blocked.after, blocked.hp, 'every blow glances off a hanging spider');
  console.log(`PASS  she hangs ${hung.hover.toFixed(1)} m up on three strands over the vein she guards, and refuses every blow`);

  // ---- the strands: a blade will not do, an empty lantern will not do, a lit one will -----------------------------------
  // The strand is held on `window` rather than by index: ctx.enemies is spliced as things die, so an index taken now
  // would point at something else a moment later.
  const bladed = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const a = L.enemies.find(e => e.type === 'gloomAnchor' && e.alive);
    window.__strand = a;
    damageEnemy(a, 999);
    return { alive: a.alive };
  });
  assert.ok(bladed.alive, 'a blade glances off a cable that thick');

  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
    const a = window.__strand;
    L.planets.world.mechanics.active.instance.burn(1e6);                // an empty lantern first
    L.player.placeAt(offsetDir(a.up, 0.4, 5)); L.companion?.snapToHero?.();
    L.player.fwd.copy(tangentToward(L.player.up, a.up));
    window.__frame(a.up, { turn: 0, pitch: 0.24, dist: 7 });            // W walks away from the camera: aim it at the strand
    for (let i = 0; i < 12; i++) L.update(1 / 60);
  });
  await hold('KeyW', 80);
  const dry = await page.evaluate(async () => {
    const { burning, charOf } = await import('/src/entities/enemies/behaviors/anchor.js');
    const a = window.__strand;
    return { burning: burning(a), char: charOf(a), alive: a.alive };
  });
  assert.ok(!dry.burning && dry.char === 0 && dry.alive, `an empty lantern chars nothing: ${JSON.stringify(dry)}`);

  await page.evaluate(() => { window.LANTERNMOSS.planets.world.mechanics.active.instance.refill(1e6); });
  await frames(10);
  const lit = await page.evaluate(async () => {
    const { burning } = await import('/src/entities/enemies/behaviors/anchor.js');
    return burning(window.__strand);
  });
  assert.ok(lit, 'standing here with a lit lantern really is burning it');
  await frames(Math.ceil(2.6 * 60) + 40);
  const burnt = await page.evaluate(() => {
    const L = window.LANTERNMOSS;
    return { alive: window.__strand.alive, strands: L.enemies.filter(e => e.type === 'gloomAnchor' && e.alive).length };
  });
  assert.ok(!burnt.alive && burnt.strands === 2, `a lit lantern burns a strand through: ${JSON.stringify(burnt)}`);
  console.log('PASS  real W walking up with a lit lantern burns a strand through; a blade and an empty lantern do nothing');

  // ---- fire takes the rest, and she comes down -----------------------------------------------------------------------
  const down = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const g = L.enemies.find(e => e.type === 'grandweaver');
    for (const a of L.enemies.filter(e => e.type === 'gloomAnchor' && e.alive)) damageEnemy(a, 1, { fire: true });
    for (let i = 0; i < 12; i++) L.update(1 / 60);
    const fell = { hung: !!g.hung, state: g.state };
    for (let i = 0; i < 200; i++) L.update(1 / 60);                     // the fall and the daze
    const hp = g.hp; damageEnemy(g, 150);
    return { ...fell, hover: g.hover, hurt: g.hp < hp };
  });
  assert.ok(!down.hung && down.state === 'transition', `the last strand parts and she falls: ${JSON.stringify(down)}`);
  assert.ok(down.hover < 1 && down.hurt, 'and on the ground she takes everything');

  const again = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const g = L.enemies.find(e => e.type === 'grandweaver');
    damageEnemy(g, Math.max(1, g.hp - g.def.hp * 0.55));
    for (let i = 0; i < 30; i++) L.update(1 / 60);
    return { phase: g.bossPhase, hung: !!g.hung, strands: L.enemies.filter(e => e.type === 'gloomAnchor' && e.alive).length };
  });
  assert.ok(again.phase === 1 && again.hung && again.strands === 3, `she climbs back up on a fresh set: ${JSON.stringify(again)}`);
  console.log('PASS  fire takes a strand in one, the last drop leaves her open, and she re-anchors at her threshold');

  // ---- the beetle toggle covers the grandmother too ---------------------------------------------------------------------
  const look = on => page.evaluate(async on => {
    const L = window.LANTERNMOSS, { setSetting } = await import('/src/core/settings.js');
    setSetting('roundBeetles', on);
    for (let i = 0; i < 4; i++) L.update(1 / 60);
    const spiders = L.enemies.filter(e => e.alive && (e.type === 'grandweaver' || e.type === 'gloomweaver'));
    return { n: spiders.length, spider: spiders.filter(e => e.spider.visible).length, beetle: spiders.filter(e => e.beetle.visible).length };
  }, on);
  const asSpiders = await look(false), asBeetles = await look(true);
  assert.ok(asSpiders.n > 1 && asSpiders.spider === asSpiders.n, `spiders by default: ${JSON.stringify(asSpiders)}`);
  assert.equal(asBeetles.beetle, asBeetles.n, 'the grandmother and her grandchildren change together');
  await look(false);
  console.log(`PASS  the beetle setting swaps all ${asBeetles.n} spiders on screen, the mini boss among them`);

  // ---- both resolutions, and the two feature shots -----------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height !== 1080) continue;

    // Grandmother Gloomweaver up in her web on fresh strands, seen from below.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { anchorUp } = await import('/src/entities/enemies/behaviors/boss/grandweaver.js');
      const g = L.enemies.find(e => e.type === 'grandweaver');
      if (!g.hung) anchorUp(g, false);
      g.hangK = 1; g.cool = 1e9; g.state = 'chase'; g.hideTele();      // held between moves, so no warning disc shows
      const lit = L.enemies.find(e => e.type === 'gloomAnchor' && e.alive);
      if (lit) lit.char = 0.45;                                        // one strand already charring, embers and all
      L.planets.world.mechanics.active.instance.refill(1e6);
      if (L.companion) L.companion.root.visible = false;
      L.player.placeAt(offsetDir(g.home, 1.0, 3.6)); L.companion?.snapToHero?.();
      L.player.fwd.copy(tangentToward(L.player.up, g.home));
      for (let i = 0; i < 180; i++) { L.update(1 / 60); g.cool = 1e9; g.hideTele(); }   // the emotes and numbers fade
      window.__frame(g.home, { turn: 0.55, pitch: -0.52, dist: 5 });    // close under her, looking up into the canopy
      for (let i = 0; i < 4; i++) L.update(1 / 60);
    });
    await frames(2); await clean();
    await page.screenshot({ path: shotPath('duskhollow-grandweaver'), type: 'jpeg', quality: 88 });
    await restore();

    await page.evaluate(() => { const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true; });
  }
  await page.evaluate(() => clearInterval(window.__heal));
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, the feature shot is saved, and there are zero page and shader errors');
} finally { await close(); }
