// TODO 30e (Shadelings and Mosslurks) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow roster fixture, never on the authored
// unreleased world. Checks, on the lowest quality preset: both kinds render; a shadeling out in the dusk draws its
// shadow and nothing else, and really cannot be hit; walking up with a lit lantern stands it up solid and hittable;
// lighting a waylamp beside one really drives it off; a real `E` on a mosslurk's caps springs the ambush and its
// warning circle is really on the ground before the bite; 720p and 1080p overflow nothing; zero page and shader
// errors. Writes the duskhollow-shadeling and duskhollow-mosslurk shots (mobs/). Port 8133.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8133, quality: 'low',
  bootstrap: "import {installDuskMonsterFixture} from '/tests/sim/lib/duskMonsterFixture.mjs'; installDuskMonsterFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast'];
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
  });
  await frames(30);
  // Keep the hero on their feet without making them invulnerable: a blow that lands still has to register.
  await page.evaluate(() => { window.__heal = setInterval(() => {
    const L = window.LANTERNMOSS; L.player.hp = L.player.stats.maxHp; L.Pets.petCool = 99;   // and no "Pet ..." prompt in the way
  }, 30); });

  // ---- both kinds render, and a shadow is only a shadow -------------------------------------------------------------
  const world = await page.evaluate(() => {
    const L = window.LANTERNMOSS;
    const of = t => L.enemies.filter(e => e.type === t);
    return { shades: of('shadeling').length, lurks: of('mosslurk').length,
      shadows: of('shadeling').filter(e => e.hidden && e.stain.visible && !e.solid.visible).length,
      disguised: of('mosslurk').filter(e => e.disguised && e.caps.visible && !e.mouth.visible).length };
  });
  assert.ok(world.shades > 0 && world.lurks > 0, `both kinds spawn: ${JSON.stringify(world)}`);
  assert.equal(world.shadows, world.shades, 'every shadeling draws its shadow and nothing else');
  assert.equal(world.disguised, world.lurks, 'every mosslurk draws only its caps');
  console.log(`PASS  ${world.shades} shadelings render as shadows and ${world.lurks} mosslurks as glowcap patches`);

  // ---- the lantern decides whether there is a fight at all -----------------------------------------------------------
  const dark = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const { damageEnemy } = await import('/src/combat/damage.js');
    const e = L.enemies.find(x => x.type === 'shadeling');
    const far = offsetDir(L.planets.world.spawnDir, 2.2, 130);
    e.spawn(far); e.home.copy(far);
    L.player.placeAt(offsetDir(far, 0, 40)); for (let i = 0; i < 20; i++) L.update(1 / 60);
    const hp = e.hp; damageEnemy(e, 60);
    return { lit: L.OldRoad.litAt(e.up), hidden: e.hidden, bound: !!e.bound, hp, after: e.hp, index: L.enemies.indexOf(e) };
  });
  assert.equal(dark.lit, 0, 'out there nothing lights the ground');
  assert.ok(dark.hidden && !dark.bound && dark.after === dark.hp, `a shadow cannot be touched: ${JSON.stringify(dark)}`);

  const lit = await page.evaluate(async index => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const { damageEnemy } = await import('/src/combat/damage.js');
    const e = L.enemies[index];
    L.planets.world.mechanics.active.instance.refill(1e6);
    L.player.placeAt(offsetDir(e.up, 1.1, 2.4)); L.companion?.snapToHero?.();
    for (let i = 0; i < 30; i++) L.update(1 / 60);
    const hp = e.hp; damageEnemy(e, 20);
    return { lit: L.OldRoad.litAt(e.up), hidden: e.hidden, bound: !!e.bound, solid: e.solid.visible, stain: e.stain.visible, hp, after: e.hp };
  }, dark.index);
  assert.ok(lit.bound && !lit.hidden && lit.solid && !lit.stain, `the lantern stands it up solid: ${JSON.stringify(lit)}`);
  assert.ok(lit.after < lit.hp, 'and now it can be fought');
  console.log(`PASS  a shadeling is untouchable in the dark (lit 0.00) and solid in the lantern (lit ${lit.lit.toFixed(2)})`);

  // ---- a waylamp catching really drives one off ------------------------------------------------------------------------
  const flared = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const m = L.planets.world.mechanics.active.instance, lamp = L.OldRoad.lamps.find(l => !m.lampLit(l.index));
    const e = L.enemies.filter(x => x.type === 'shadeling')[1];
    const spot = offsetDir(lamp.dir, 1.2, 3); e.spawn(spot); e.home.copy(spot);
    L.player.placeAt(offsetDir(L.planets.world.spawnDir, 3.0, 140));    // far from the village, so nothing calls the chase off
    for (let i = 0; i < 20; i++) L.update(1 / 60);
    const before = e.state;
    m.takeFlame(); L.OldRoad.lightLamp(lamp);
    for (let i = 0; i < 10; i++) L.update(1 / 60);
    return { before, after: e.state, why: e.fledFrom };
  });
  assert.notEqual(flared.before, 'flee');
  assert.equal(flared.after, 'flee', `a waylamp catching drives it off: ${JSON.stringify(flared)}`);
  assert.equal(flared.why, 'light');
  console.log('PASS  a waylamp coming on beside a shadeling really sends it running');

  // ---- a real E on the caps springs the ambush, and the warning circle comes first --------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir } = await import('/src/utils/sphere.js');
    const e = L.enemies.find(x => x.type === 'mosslurk');
    L.player.placeAt(offsetDir(e.up, 0.4, 2.0)); L.companion?.snapToHero?.();
    for (let i = 0; i < 12; i++) L.update(1 / 60);
    window.__lurk = L.enemies.indexOf(e);
  });
  const capPrompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(capPrompt, /Pick the glowcap patch/, `the caps offer what real caps offer (${capPrompt})`);
  await page.keyboard.press('KeyE'); await frames(6);
  const sprung = await page.evaluate(() => {
    const e = window.LANTERNMOSS.enemies[window.__lurk];
    return { disguised: e.disguised, hidden: e.hidden, state: e.state, warning: e.tele.visible, mouth: e.mouth.visible, hp: e.hp };
  });
  assert.ok(!sprung.disguised && !sprung.hidden && sprung.mouth, `real E springs the ambush: ${JSON.stringify(sprung)}`);
  assert.equal(sprung.state, 'windup');
  assert.ok(sprung.warning, 'and the warning circle is on the ground before the first bite');
  const bitten = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, e = L.enemies[window.__lurk], hp = L.player.hp;
    let hurt = false; const seen = { n: 0 };
    const { encounterEvents } = await import('/src/combat/events.js');
    encounterEvents.addEventListener('playerhurt', () => { hurt = true; });
    L.player.invuln = 0;
    for (let i = 0; i < Math.ceil((e.def.windup + 0.4) * 60); i++) L.update(1 / 60);
    return { hurt, hp, seen: seen.n };
  });
  assert.ok(bitten.hurt, 'then it bites');
  console.log('PASS  real E on a mosslurk springs it, shows its warning circle, and only then does it bite');

  // ---- both resolutions, and the two feature shots -----------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height !== 1080) continue;
    await page.evaluate(() => {
      const L = window.LANTERNMOSS;
      window.__frame = (dir, { turn = 0, pitch = 0.3, dist = 7 } = {}) => {
        const P = L.player; L.cam.up.copy(P.up); L.cam.fwd.copy(dir).sub(P.up);
        L.cam.fwd.addScaledVector(P.up, -L.cam.fwd.dot(P.up)).normalize();
        L.cam.fwd.applyAxisAngle(P.up, turn); L.cam.pitch = pitch; L.cam.dist = dist; L.cam.init = false; L.cam.lastDrag = 1e9;
      };
      window.__stand = (dir, back = 4, side = 0) => {                  // stand `back` before dir, `side` to one side
        const P = L.player, t = P.up.clone().sub(dir); t.addScaledVector(dir, -t.dot(dir));
        if (t.lengthSq() < 1e-8) t.set(1, 0, 0); t.normalize();
        const s = new dir.constructor().crossVectors(dir, t).normalize();
        P.placeAt(dir.clone().addScaledVector(t, back / 40).addScaledVector(s, side / 40).normalize());
        P.fwd.copy(dir).sub(P.up).normalize();
      };
      if (L.companion) L.companion.root.visible = false;               // the pet steps out of both screenshots
    });

    // The rule in one frame: a shadeling solid and lit in front of the hero, two still shadows out past the edge of
    // the lantern's reach. They are held still for the portrait (idle, not chasing), the way the showcase holds a pet.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { groundHeight } = await import('/src/world/terrain.js');
      const m = L.planets.world.mechanics.active.instance; m.refill(1e6);
      const stand = offsetDir(L.planets.world.spawnDir, 1.3, 90);
      L.player.placeAt(stand);
      for (let i = 0; i < 90; i++) L.update(1 / 60);                   // let the damage numbers from the checks fade first
      const shades = L.enemies.filter(e => e.type === 'shadeling');
      const b = 1.0;                                                   // one bearing out of the hollow: the hero faces it
      const put = (e, heading, metres) => {
        const d = offsetDir(stand, heading, metres);
        e.spawn(d); e.home.copy(d); e.state = 'idle'; e.timer = 1e9;    // held still, so it keeps its distance for the shot
        e.fwd.copy(tangentToward(d, stand)); e.r = groundHeight(d); e.pos.copy(d).multiplyScalar(e.r);
      };
      put(shades[0], b, 3.2);                                          // solid: inside the lantern
      put(shades[1], b - 0.55, 9.5); put(shades[2], b + 0.5, 10);      // still shadows, just past the edge of the light
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, shades[0].up));
      for (let i = 0; i < 110; i++) L.update(1 / 60);                  // held still: the emote bubbles and damage numbers fade
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, shades[0].up));
      window.__frame(shades[0].up, { turn: 0.55, pitch: 0.22, dist: 5.5 });   // off the hero's shoulder, so both are in frame
      for (let i = 0; i < 4; i++) L.update(1 / 60);
    });
    await frames(4); await clean();
    await page.screenshot({ path: shotPath('duskhollow-shadeling'), type: 'jpeg', quality: 88 });
    await restore();

    // A sprung mosslurk rearing up beside the real glowcaps it was pretending to be, held still for the portrait.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { groundHeight } = await import('/src/world/terrain.js');
      const e = L.enemies[window.__lurk], stand = L.player.up.clone();
      const place = () => {
        const d = offsetDir(stand, 1.0, 3.4);
        e.up.copy(d); e.r = groundHeight(d); e.pos.copy(d).multiplyScalar(e.r);
        // 'chase' rather than 'idle': an idle monster this close is re-noticed every frame, and its "!" never fades
        e.home.copy(d); e.state = 'chase'; e.timer = 1e9; e.cool = 1e9; e.hideTele();
        e.fwd.copy(tangentToward(d, stand));
      };
      place(); L.player.fwd.copy(tangentToward(L.player.up, e.up));
      for (let i = 0; i < 170; i++) { L.update(1 / 60); place(); }     // held in place while the warning circle and its "!" fade
      L.player.placeAt(stand); L.player.fwd.copy(tangentToward(L.player.up, e.up));
      window.__frame(e.up, { turn: 0.5, pitch: 0.34, dist: 7 });       // off the shoulder, looking down on the patch
      for (let i = 0; i < 4; i++) { L.update(1 / 60); place(); }
    });
    await frames(2); await clean();
    await page.screenshot({ path: shotPath('duskhollow-mosslurk'), type: 'jpeg', quality: 88 });
    await restore();
    await page.evaluate(() => { const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true; });
  }
  await page.evaluate(() => clearInterval(window.__heal));
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, both feature shots are saved, and there are zero page and shader errors');
} finally { await close(); }
