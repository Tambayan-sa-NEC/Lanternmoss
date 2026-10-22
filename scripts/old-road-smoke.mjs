// TODO 30d (Wick and the Old Road) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow village fixture, never on the authored
// unreleased world. Checks, on the lowest quality preset: the brazier, the waylamps and the three moonwells render,
// Wick is in the village and really offers his quest, real E takes the village flame and lights a waylamp, a lit
// waylamp hands out fire again, a flame that runs dry costs no health, a relit lamp visibly brightens the ground it
// stands on, 720p and 1080p overflow nothing, and there are zero page and shader errors.
// Writes the duskhollow-old-road and duskhollow-wick shots (world/ and npcs/). Port 8132.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8132, quality: 'low',
  bootstrap: "import {installDuskVillageFixture} from '/tests/sim/lib/duskVillageFixture.mjs'; installDuskVillageFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast'];
const clean = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, CLUTTER);
const restore = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, CLUTTER);
/** Stands the hero at a road object and presses E on it, checking the prompt the player would read first. */
const useAt = async (what, index, expect) => {
  await page.evaluate(async ([what, index]) => {
    const L = window.LANTERNMOSS, o = what === 'brazier' ? L.OldRoad.brazier : L.OldRoad[what][index];
    L.player.placeAt(o.dir); L.companion?.snapToHero?.();
    const { tangentToward } = await import('/src/utils/sphere.js');
    L.player.fwd.copy(tangentToward(L.player.up, L.planets.world.spawnDir));
  }, [what, index]);
  await frames(10);
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(prompt, expect, `the E prompt reads right at the ${what} (${prompt})`);
  await page.keyboard.press('KeyE'); await frames(6);
  return prompt;
};
const road = () => page.evaluate(() => {
  const L = window.LANTERNMOSS, m = L.planets.world.mechanics.active.instance;
  return { ...m.road, hp: L.player.hp, lamps: m.road.lamps.length ? m.road.lamps : [] };
});

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    L.goToPlanet('lanternmoss');                                       // reload the borrowed slot so its locals, houses and road are built
    dayClock.t = 0.95 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
  });
  await frames(30);

  // ---- the road is there, and so is its lamplighter --------------------------------------------------------------
  const built = await page.evaluate(() => {
    const L = window.LANTERNMOSS, R = L.OldRoad;
    return { lamps: R.lamps.length, wells: R.wells.length, brazier: !!R.brazier,
      dark: R.lamps.every(l => !l.glass.visible), wick: !!L.npcs.find(n => n.name === 'Wick') };
  });
  assert.ok(built.brazier && built.lamps > 0 && built.wells === 3, `the road renders: ${JSON.stringify(built)}`);
  assert.ok(built.dark, 'every waylamp starts dark');
  assert.ok(built.wick, 'Wick is in the village');
  const offer = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    const wick = L.npcs.find(n => n.name === 'Wick'), id = Quests.offerable(wick);
    if (id) Quests.offerFor(wick).choice.onYes();
    return { id, tracked: Quests.trackerInfo()?.text ?? null };
  });
  assert.equal(offer.id, 'oldRoad', 'Wick offers "Light the Old Road"');
  console.log(`PASS  ${built.lamps} waylamps, ${built.wells} moonwells and the brazier render, and Wick offers his quest`);

  // ---- real E: take the flame, light a waylamp, take fire from it again --------------------------------------------
  await useAt('brazier', 0, /Take the village flame/);
  assert.ok((await road()).carrying, 'real E takes the village flame');
  await useAt('lamps', 0, /Light the waylamp/);
  const lit = await page.evaluate(() => {
    const L = window.LANTERNMOSS, m = L.planets.world.mechanics.active.instance;
    return { lampsLit: m.road.lampsLit, glowing: L.OldRoad.lamps.filter(l => l.glass.visible).length,
      pooled: L.OldRoad.lampPool.filter(s => s.light.source.intensity > 0).length, sources: L.LocalLights.count };
  });
  assert.equal(lit.lampsLit, 1, 'real E lights the first waylamp');
  assert.equal(lit.glowing, 1, 'and its head glows');
  assert.equal(lit.pooled, 1, 'and it pools light on the ground beside it');
  assert.ok(lit.sources <= 16, `local light sources stay bounded (${lit.sources})`);

  // the flame runs dry out on the road: it only goes out, and the lit lamp is where the run starts again
  const dry = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, m = L.planets.world.mechanics.active.instance;
    const { OLD_ROAD } = await import('/src/config/oldRoad.js');
    L.player.placeAt(L.OldRoad.lamps[1].dir); L.companion?.snapToHero?.();
    const hp = L.player.hp;
    for (let i = 0; i < Math.ceil((OLD_ROAD.flame.seconds + 1) * 60); i++) L.update(1 / 60);
    return { carrying: m.road.carrying, lampsLit: m.road.lampsLit, hp, now: L.player.hp, prompt: document.getElementById('prompt').textContent };
  });
  assert.equal(dry.carrying, false, 'the carried flame gutters out');
  assert.equal(dry.hp, dry.now, 'and costs the hero no health');
  assert.equal(dry.lampsLit, 1, 'the lamp already lit stays lit');
  await useAt('lamps', 0, /Take fire from the waylamp/);
  await useAt('lamps', 1, /Light the waylamp/);
  assert.equal((await road()).lampsLit, 2, 'a lit waylamp is where the run starts again');
  console.log('PASS  real E carries the village flame, lights waylamps, and a flame that runs dry only costs the walk back');

  // ---- the village is safe light, and a relit waylamp really reaches the renderer ---------------------------------
  const safe = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, w = L.planets.world;
    L.player.placeAt(L.OldRoad.brazier.dir); L.companion?.snapToHero?.();
    L.update(1 / 60);
    const m = w.mechanics.active.instance;
    return { label: m.status.label, darkness: m.status.darkness };
  });
  assert.equal(safe.label, 'Village light', "the brazier burns in the village gap, the world's safe light");
  console.log(`PASS  the village flame stands in the village light (darkness ${safe.darkness.toFixed(2)})`);

  // A lit lamp has to be more than a glowing model: its light must reach the shader that draws the dark hollow.
  const deepest = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, w = L.planets.world, m = w.mechanics.active.instance;
    const { canopyCover } = await import('/src/world/mechanics/lantern.js');
    const { offsetDir, tangentToward } = await import('/src/utils/sphere.js'), { snapCamera } = await import('/src/systems/CameraSystem.js');
    const dark = L.OldRoad.lamps.filter(l => !m.lampLit(l.index))
      .sort((a, b) => canopyCover(b.dir, w.canopy) - canopyCover(a.dir, w.canopy))[0];
    m.burn(1e6);                                                       // the belt lantern down to its safe ember, so the lamp is the light
    L.player.placeAt(offsetDir(dark.dir, 1.4, 3.2)); L.companion?.snapToHero?.();
    L.player.fwd.copy(tangentToward(L.player.up, dark.dir));
    L.cam.pitch = 0.4; L.cam.dist = 6; snapCamera(L.player.up, L.player.fwd);
    return { index: dark.index, cover: canopyCover(dark.dir, w.canopy), darkness: m.status.darkness };
  });
  assert.ok(deepest.cover > 0.9 && deepest.darkness > 0.4,
    `the lamp measured stands in the deep dusk (cover ${deepest.cover.toFixed(2)}, darkness ${deepest.darkness.toFixed(2)})`);
  await frames(20);
  /** Is this lamp one of the lights the shader is actually given this frame, at its own radius? */
  const shaded = index => page.evaluate(index => {
    const L = window.LANTERNMOSS, lamp = L.OldRoad.lamps.find(l => l.index === index), U = L.LocalLights.uniforms;
    const spots = U.uLocalPos.value.slice(0, U.uLocalCount.value);
    return { glowing: lamp.glass.visible, strength: U.uLocalStrength.value,
      shaded: spots.some(v => Math.hypot(v.x - lamp.pos.x, v.y - lamp.pos.y, v.z - lamp.pos.z) < 0.01 && v.w === lamp.light?.radius) ||
        L.OldRoad.lampPool.some(s => s.light.source.intensity > 0 && s.at.distanceTo(lamp.pos) < 0.01
          && spots.some(v => Math.hypot(v.x - s.at.x, v.y - s.at.y, v.z - s.at.z) < 0.01)) };
  }, index);
  const dark = await shaded(deepest.index);
  assert.equal(dark.glowing, false, 'the lamp is dark before it is lit, and casts nothing');
  assert.equal(dark.shaded, false);
  await page.evaluate(index => {
    const L = window.LANTERNMOSS, m = L.planets.world.mechanics.active.instance;
    m.takeFlame(); m.lightLamp(index); m.dropFlame(); L.OldRoad.sync();
  }, deepest.index);
  await frames(20);
  const lamplit = await shaded(deepest.index);
  assert.ok(lamplit.glowing, 'a relit lamp head glows');
  assert.ok(lamplit.shaded, 'and its light is handed to the shader that draws the dark hollow');
  assert.ok(lamplit.strength > 0.4, `in a hollow that is genuinely dark (${lamplit.strength.toFixed(2)})`);
  console.log(`PASS  a relit waylamp glows and lights the ground it stands on, in dusk at strength ${lamplit.strength.toFixed(2)}`);

  // ---- both resolutions, and the two feature shots -------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height !== 1080) continue;

    // Staged the way the tour stages its shots: stand the hero near the subject, then turn the camera off the hero's
    // own shoulder so the subject is beside them rather than hidden behind them (scripts/screenshots.mjs __frame).
    await page.evaluate(() => {
      const L = window.LANTERNMOSS;
      window.__frame = (dir, { turn = 0, pitch = 0.3, dist = 7 } = {}) => {
        const P = L.player; L.cam.up.copy(P.up); L.cam.fwd.copy(dir).sub(P.up);
        L.cam.fwd.addScaledVector(P.up, -L.cam.fwd.dot(P.up)).normalize();
        L.cam.fwd.applyAxisAngle(P.up, turn); L.cam.pitch = pitch; L.cam.dist = dist; L.cam.init = false; L.cam.lastDrag = 1e9;
      };
    });

    // The road itself: a branch relit end to end, running out of the hollow to its burning moonwell.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, m = L.planets.world.mechanics.active.instance, R = L.OldRoad;
      const { OLD_ROAD } = await import('/src/config/oldRoad.js');
      const { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const branch = R.lamps.filter(l => l.branch === 0);
      m.takeFlame(); for (const l of branch) m.lightLamp(l.index); m.dropFlame(); R.sync();
      m.refill(1e6);                                                   // the hero's own lantern lit, walking the road
      if (L.companion) L.companion.root.visible = false;               // the pet steps out of its own screenshot
      const bearing = L.planets.planet.canopy.gaps[OLD_ROAD.branches.gaps[0]].angle;
      L.player.placeAt(offsetDir(L.planets.world.spawnDir, bearing, OLD_ROAD.branches.from + 3));
      L.player.fwd.copy(tangentToward(L.player.up, R.wells[0].dir));
      window.__frame(R.wells[0].dir, { turn: 0.2, pitch: 0.32, dist: 15 });   // down the road, the hero small and off centre
    });
    await frames(40); await clean();
    await page.screenshot({ path: shotPath('duskhollow-old-road'), type: 'jpeg', quality: 88 });
    await restore();

    // Wick himself, mid-sentence, with his lantern swinging and the village brazier burning beside him.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, R = L.OldRoad;
      const { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
      const { Dialog } = await import('/src/ui/Dialog.js');
      const wick = L.npcs.find(n => n.name === 'Wick');
      const stand = offsetDir(R.brazier.dir, 2.2, 2.4);
      wick.up.copy(stand); wick.placeAt?.(stand);
      L.player.placeAt(offsetDir(stand, 5.4, 2.6)); L.companion?.snapToHero?.();
      L.player.fwd.copy(tangentToward(L.player.up, stand));
      window.__frame(stand, { turn: 1.0, pitch: 0.26, dist: 5.5 });
      Dialog.close(); Dialog.start(wick);
    });
    await frames(30);
    await page.evaluate(async () => { const { Dialog } = await import('/src/ui/Dialog.js'); Dialog.finishTyping?.(); });
    await frames(20);
    await page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } },
      CLUTTER.filter(id => id !== 'prompt'));
    await page.screenshot({ path: shotPath('duskhollow-wick'), type: 'jpeg', quality: 88 });
    await restore();
    await page.evaluate(async () => {
      const { Dialog } = await import('/src/ui/Dialog.js'); Dialog.close();
      const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true;
    });
  }
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, both feature shots are saved, and there are zero page and shader errors');
} finally { await close(); }
