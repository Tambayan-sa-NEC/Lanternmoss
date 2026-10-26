// TODO 31a (rematch lifecycle) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Checks: after the campaign win the lair really offers the fight again, a real
// `E` really starts it and the boss really comes back harder, winning it really leaves its own chest and no second
// trophy, and the lantern gate really shows the Rematch badge; 720p and 1080p overflow nothing, with zero page and
// shader errors. Writes the rematch-gate shot (huds/). Port 8144.
// The kit marker comes from the test-only fixture: no world ships one until its own stage (31b-31f).
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8144, quality: 'low', candidate: false });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'markers', 'tip', 'challenge', 'cresult', 'toast', 'achv'];
const clean = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, CLUTTER);
const restore = () => page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, CLUTTER);

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS;
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    L.player.invuln = 1e9;
    document.getElementById('hint').classList.add('collapsed');
    window.__heal = setInterval(() => { const P = L.player; P.hp = P.stats.maxHp; P.invuln = 1e9; L.Pets.petCool = 99; }, 30);
  });
  await frames(40);

  // ---- the campaign win first -------------------------------------------------------------------------------------
  const won = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const b = L.boss; L.wakeBoss();
    for (let i = 0; i < 20; i++) L.update(1 / 60);
    damageEnemy(b, b.def.hp * 3);
    for (let i = 0; i < 120; i++) L.update(1 / 60);
    return { beaten: L.BossGate.state, recorded: L.planets.defeated.has('lanternmoss'), hp: b.def.hp,
      trophyChest: !!L.Chests?.bossChest || !!window.LANTERNMOSS.Chests?.bossChest };
  });
  assert.equal(won.beaten, 'beaten'); assert.ok(won.recorded, 'the campaign records the first win');
  console.log('PASS  the campaign win lands as it always did');

  // ---- your treasure first, then the fight again -------------------------------------------------------------------
  const waiting = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Chests } = await import('/src/gameplay/Chests.js');
    const { Rematch } = await import('/src/gameplay/Rematch.js');
    L.player.placeAt(L.BossGate.lair); L.player.vel.set(0, 0, 0); L.companion?.snapToHero?.();
    for (let i = 0; i < 400; i++) L.update(1 / 60);                    // the chest falls and lands
    const held = Rematch.offered;
    for (const c of Chests.list) if (!c.opened) { L.player.placeAt(c.up); for (let i = 0; i < 12; i++) L.update(1 / 60); c.open(); }
    for (let i = 0; i < 30; i++) L.update(1 / 60);
    L.player.placeAt(L.BossGate.lair); L.player.vel.set(0, 0, 0);
    for (let i = 0; i < 20; i++) L.update(1 / 60);
    return { held, nowOffered: Rematch.offered };
  });
  assert.equal(waiting.held, false, 'the treasure lying at the lair comes first');
  assert.ok(waiting.nowOffered, 'and once it is collected the lair offers the fight again');
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(prompt, /Challenge .* again/, `the lair offers it (${prompt})`);
  assert.match(prompt, /rematch 1/);
  await page.keyboard.press('KeyE'); await frames(40);
  const started = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Rematch } = await import('/src/gameplay/Rematch.js');
    const { rematchTier } = await import('/src/config/rematch.js');
    const e = Rematch.fighting;   // a fresh challenger, never the lair's own beaten boss
    return { active: Rematch.active, fresh: !!e && e !== L.boss, alive: !!e?.alive,
      hp: e?.def.hp ?? 0, tier: rematchTier(0).hp };
  });
  assert.equal(started.active, 'lanternmoss', `real E starts the rematch: ${JSON.stringify(started)}`);
  assert.ok(started.alive && started.fresh, 'and a fresh challenger is on its feet, not the beaten lair boss');
  assert.ok(Math.abs(started.hp - Math.round(won.hp * started.tier)) <= 1, `at tier one's health (${started.hp} vs ${won.hp})`);
  console.log(`PASS  real E at the beaten lair brings the boss back at ${started.tier}x health`);

  // ---- winning it leaves its own chest, and no second trophy -----------------------------------------------------------
  const paid = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { damageEnemy } = await import('/src/combat/damage.js');
    const { Rematch } = await import('/src/gameplay/Rematch.js'), { Chests } = await import('/src/gameplay/Chests.js');
    const coins = L.player.coins, crowns = L.inventory.count('mossCrown'), defeated = L.planets.defeated.size;
    damageEnemy(Rematch.fighting, Rematch.fighting.def.hp * 3);
    for (let i = 0; i < 140; i++) L.update(1 / 60);
    return { wins: Rematch.won('gloomcap'), active: Rematch.active, coins, nowCoins: L.player.coins,
      crowns, nowCrowns: L.inventory.count('mossCrown'), defeated, nowDefeated: L.planets.defeated.size,
      chest: !!Chests.list.find(c => c.id === 'lanternmoss:rematch:gloomcap:1'),
      keys: L.inventory.count('lanternKey') };
  });
  assert.equal(paid.wins, 1, 'the rematch is counted');
  assert.equal(paid.active, null);
  assert.ok(paid.nowCoins > paid.coins, 'it pays coins of its own');
  assert.ok(paid.chest, 'and leaves its own chest');
  assert.equal(paid.nowCrowns, paid.crowns, 'with no second trophy');
  assert.equal(paid.nowDefeated, paid.defeated, 'and the campaign record unmoved');
  console.log('PASS  a rematch win pays its own way and repeats nothing of the first win');

  // ---- the lantern gate shows the badge -----------------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { Rematch } = await import('/src/gameplay/Rematch.js');
      Rematch.cool = {};
      L.player.placeAt(L.Portals.gate.dir); L.companion?.snapToHero?.();
      for (let i = 0; i < 20; i++) L.update(1 / 60);
      L.PortalUI.open();
    });
    await frames(4);
    const gate = await page.evaluate(() => {
      const open = document.querySelector('#portal-picker.show');
      const marked = [...document.querySelectorAll('#portal-picker button[data-rematch]')].map(b => b.dataset.destination);
      const badge = document.querySelector('#portal-picker .portal-rematch');
      const panel = document.querySelector('.portal-panel');
      return { open: !!open, marked, badge: badge?.textContent ?? null,
        fits: !!panel && panel.getBoundingClientRect().bottom <= innerHeight && panel.getBoundingClientRect().top >= 0 };
    });
    assert.ok(gate.open, 'the lantern gate opens');
    assert.deepEqual(gate.marked, ['lanternmoss'], `and marks the world with a waiting rematch: ${JSON.stringify(gate)}`);
    assert.equal(gate.badge, 'Rematch', 'with a badge the player can read');
    assert.ok(gate.fits, `${width}x${height}: the panel fits on screen`);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
    if (height === 1080) { await clean(); await page.screenshot({ path: shotPath('rematch-gate'), type: 'jpeg', quality: 88 }); await restore(); }
    await page.evaluate(() => window.LANTERNMOSS.PortalUI.close());
    await frames(4);
  }
  await page.evaluate(() => clearInterval(window.__heal));
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, the gate shot is saved, and there are zero page and shader errors');
} finally { await close(); }
