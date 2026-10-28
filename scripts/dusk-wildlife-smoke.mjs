// TODO 30b (Duskhollow flora and wildlife) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow fixture, never on the authored unreleased world.
// Checks, on the lowest quality preset: the canopy and its animals render, a real E catches a firefly swarm for a
// jar, really using the jar pours oil into the lantern, the Moonmoth's charm widens the light, 720p and 1080p
// overflow nothing, and there are zero page and shader errors. Writes the duskhollow-canopy and duskhollow-wildlife
// shots (world/ and critters/). Port 8130.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8130, quality: 'low',
  bootstrap: "import {installDuskhollowFixture} from '/tests/sim/lib/duskhollowFixture.mjs'; installDuskhollowFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const hold = async (code, n) => { await page.keyboard.down(code); await frames(n); await page.keyboard.up(code); await frames(2); };
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast'];
const clean = ids => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } },
  CLUTTER);
const restore = ids => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } },
  CLUTTER);

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    dayClock.t = 0.95 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
  });
  await frames(30);

  // ---- the canopy renders where the dusk is deepest -----------------------------------------------------------------
  const world = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, w = L.planets.world;
    const { underCanopy } = await import('/src/world/mechanics/lantern.js');
    const caps = w.spots.trees.filter(t => t.kind === 'lumenCap');
    return { caps: caps.length, glowcaps: w.spots.trees.filter(t => t.kind === 'glowcap').length,
      roofed: caps.every(t => underCanopy(t.dir, w.canopy)), swarms: L.Fireflies.lit,
      critters: Object.fromEntries(['glowSnail', 'lanternBat', 'duskCricket', 'moonmoth'].map(k =>
        [k, L.critters.filter(c => c.defKey === k).length])) };
  });
  assert.ok(world.caps > 0 && world.glowcaps > 0 && world.roofed, `the canopy grows only over the closed dusk: ${JSON.stringify(world)}`);
  assert.ok(world.swarms > 0 && world.critters.moonmoth === 1, `the animals are here: ${JSON.stringify(world.critters)}`);
  console.log(`PASS  ${world.caps} lumen caps, ${world.glowcaps} glowcaps, ${world.swarms} firefly swarms and ${JSON.stringify(world.critters)} render`);

  // ---- a real E catches a swarm, and really using the jar pours oil ---------------------------------------------------
  await page.evaluate(() => {
    const L = window.LANTERNMOSS, swarm = L.Fireflies.swarms.find(s => s.away <= 0);
    L.player.placeAt(swarm.up); L.companion?.snapToHero?.();
    L.planets.world.mechanics.active.instance.burn(1e6);               // empty the tank, so the jar has work to do
  });
  await frames(10);
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(prompt, /Catch the fireflies/, `the E prompt offers the swarm (${prompt})`);
  await page.keyboard.press('KeyE'); await frames(6);
  const caught = await page.evaluate(() => ({ jars: window.LANTERNMOSS.inventory.count('fireflyJar'), lit: window.LANTERNMOSS.Fireflies.lit }));
  assert.equal(caught.jars, 1, 'real E catches the swarm for one jar');
  assert.equal(caught.lit, world.swarms - 1, 'and that swarm goes dark');
  const oiled = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { useItemInSlot } = await import('/src/gameplay/itemUse.js');
    const lamp = L.planets.world.mechanics.active.instance, before = lamp.status.oil;
    const used = useItemInSlot(L.inventory, L.inventory.find('fireflyJar'));
    return { ok: used.ok, before, after: lamp.status.oil, jars: L.inventory.count('fireflyJar'), radius: lamp.status.radius };
  });
  assert.ok(oiled.ok && oiled.after > oiled.before && oiled.jars === 0, `the jar pours oil: ${JSON.stringify(oiled)}`);
  console.log(`PASS  real E catches a swarm for a jar, and the jar pours the lantern from ${oiled.before.toFixed(0)} to ${oiled.after.toFixed(0)} oil`);

  // ---- the Moonmoth's charm widens the light ---------------------------------------------------------------------------
  const charm = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { equipFromSlot } = await import('/src/gameplay/equipment.js');
    const lamp = L.planets.world.mechanics.active.instance;
    lamp.refill(1e6); const plain = lamp.status.radius;
    L.inventory.add('moonmothWing', 1);
    const worn = equipFromSlot(L.inventory, L.inventory.find('moonmothWing'));
    L.update(1 / 60);
    return { ok: worn.ok, plain, wide: lamp.status.radius, hero: L.LocalLights.heroLight.source.radius };
  });
  assert.ok(charm.ok && charm.wide > charm.plain * 1.25, `the charm widens the lantern: ${JSON.stringify(charm)}`);
  assert.ok(Math.abs(charm.hero - charm.wide) < 0.3, 'and the hero actually carries that wider light');
  console.log(`PASS  the Moonmoth Wing widens the lantern from ${charm.plain.toFixed(1)} m to ${charm.wide.toFixed(1)} m`);

  // ---- both resolutions, and the two feature shots ----------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height !== 1080) continue;
    // Looking up at the canopy from under a giant cap.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, w = L.planets.world;
      const { offsetDir, tangentToward } = await import('/src/utils/sphere.js'), { snapCamera } = await import('/src/systems/CameraSystem.js');
      const cap = w.spots.trees.find(t => t.kind === 'lumenCap');
      L.player.placeAt(offsetDir(cap.dir, 1.2, 15)); L.companion?.snapToHero?.();
      L.player.fwd.copy(tangentToward(L.player.up, cap.dir));                    // face the stalk, then look up it
      L.cam.pitch = -0.26; L.cam.dist = 12; snapCamera(L.player.up, L.player.fwd);
    });
    await frames(10); await clean();
    await page.screenshot({ path: shotPath('duskhollow-canopy'), type: 'jpeg', quality: 88 });
    await restore();
    // The animals themselves: the Moonmoth, a glow snail and a lantern bat gathered around a firefly swarm, with the
    // hero walking in on a lit glowmoss trail. Staging moves them the way the showcase does; nothing else changes.
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, w = L.planets.world;
      const { offsetDir, tangentToward } = await import('/src/utils/sphere.js'), { groundHeight } = await import('/src/world/terrain.js');
      const { snapCamera } = await import('/src/systems/CameraSystem.js');
      const cap = w.spots.trees.find(t => t.kind === 'glowcap');
      const stand = offsetDir(cap.dir, 2.4, 6);
      const put = (critter, heading, metres) => {
        if (!critter) return;
        const d = offsetDir(stand, heading, metres);
        critter.away = 0; critter.root.visible = critter.shadow.visible = true; critter.selfCollider.active = true;
        critter.up.copy(d); critter.r = groundHeight(d) + critter.hover; critter.pos.copy(d).multiplyScalar(critter.r);
        critter.home.copy(d); critter.state = 'idle'; critter.timer = 6;
        critter.fwd.copy(tangentToward(critter.up, stand));
      };
      const find = key => L.critters.find(c => c.defKey === key);
      put(find('moonmoth'), 1.0, 2.4); put(find('glowSnail'), 2.1, 2.0); put(find('lanternBat'), 4.9, 3.0);
      if (L.companion) L.companion.root.visible = false;               // the pet steps out of its own screenshot
      const swarm = L.Fireflies.swarms.find(s => s.away <= 0); swarm.settle(offsetDir(stand, 3.1, 2.8));
      L.player.placeAt(offsetDir(stand, 3.6, 2.2)); L.companion?.snapToHero?.();
      L.player.fwd.copy(tangentToward(L.player.up, stand));
      L.cam.pitch = 0.3; L.cam.dist = 6.5; snapCamera(L.player.up, L.player.fwd);
    });
    await frames(40); await hold('KeyW', 14); await clean();
    await page.screenshot({ path: shotPath('duskhollow-wildlife'), type: 'jpeg', quality: 88 });
    await restore();
    await page.evaluate(() => { const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true; });
  }
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, both feature shots are saved, and there are zero page and shader errors');
} finally { await close(); }
