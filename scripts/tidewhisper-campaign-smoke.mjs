// Actual fourth-world candidate, installed before save schemas load. Test profile only; production stays unreleased.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser();
const frames = n => page.evaluate(async n => {
  const { ctx } = await import('/src/core/context.js'); ctx.paused = false;
  for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1/60);
  ctx.paused = true;
}, n);
const reload = async () => {
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  await page.evaluate(async () => { (await import('/src/core/context.js')).ctx.paused = true; });
};
const travel = async id => {
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    ctx.paused = false; L.player.placeAt(L.Portals.gate.dir); L.player.invuln = 1e9;
  });
  await page.keyboard.press('KeyE'); await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
  await page.click(`[data-destination="${id}"]`); await frames(125);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.planetId), id);
};
try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9; L.player.level = 8;
    for (const id of ['lanternmoss','emberfall','frostveil']) L.planets.defeated.add(id);
    ctx.paused = true;
  });
  await travel('tidewhisper');
  const initial = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    const { ctx } = await import('/src/core/context.js');
    Quests.start('darkLighthouse');
    const node = L.Gathering.nodes[0]; node.deplete(); window.savedTideNode = node.id;
    if (!L.saves.save().ok) throw new Error('candidate save failed');
    return { id: L.planetId, index: ctx.planet, boss: ctx.boss.type, marlo: L.npcs.some(n => n.name === 'Marlo'), node: node.id };
  });
  assert.equal(initial.id, 'tidewhisper'); assert.equal(initial.index, 3); assert.equal(initial.boss, 'mirelure'); assert.ok(initial.marlo);
  await reload();
  assert.deepEqual(await page.evaluate(async id => {
    const { Quests } = await import('/src/gameplay/quests/Quests.js'), L = window.LANTERNMOSS;
    return { id: L.planetId, quest: Quests.st('darkLighthouse').status, depleted: !L.Gathering.nodes.find(n => n.id === id)?.ready };
  }, initial.node), { id: 'tidewhisper', quest: 'active', depleted: true });
  await travel('lanternmoss'); await travel('tidewhisper');
  console.log('PASS real portal UI into world 4, partial quest/node reload Continue, return travel and revisit');
  await page.keyboard.press('KeyH');
  await frames(60*6);
  for (const [width,height] of [[1280,720],[1920,1080]]) {
    await page.setViewport({ width,height });
    const state = await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
      const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js');
      const { tangentToward } = await import('/src/utils/sphere.js'), { ctx } = await import('/src/core/context.js');
      const { dom } = await import('/src/ui/dom.js');
      dayClock.t = .4 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
      L.player.placeAt(L.planets.world.coast.pier.start); L.player.fwd.copy(tangentToward(L.player.up,L.planets.world.coast.pier.end));
      L.cam.pitch=.45; L.cam.dist=13; resetView(L.player.fwd); snapCamera(L.player.up,L.player.fwd);
      ctx.paused=false;for(let i=0;i<30;i++)L.update(1/60);ctx.paused=true;
      document.getElementById('toast').style.opacity=0;
      dom.prompt.style.visibility='hidden'; dom.saveNotice.style.visibility='hidden';
      dom.challengeResult.classList.remove('show');
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        id: L.planetId, chests: L.Chests.list.length };
    });
    assert.equal(state.overflow, false); assert.equal(state.id, 'tidewhisper'); assert.equal(state.chests, 11);
    await page.screenshot({ path: shotPath(`tidewhisper-campaign-${height}`), type:'jpeg', quality:88 });
    await page.evaluate(async () => {
      const { dom } = await import('/src/ui/dom.js'); dom.prompt.style.visibility=''; dom.saveNotice.style.visibility='';
    });
  }
  console.log('PASS actual Tidewhisper 720p/1080p low screenshots and viewport bounds');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    const { ctx } = await import('/src/core/context.js'), { offsetDir } = await import('/src/utils/sphere.js');
    Quests.st('darkLighthouse').status = 'done'; L.player.placeAt(offsetDir(ctx.boss.home,.3,15.5));
  });
  await frames(60*9);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.BossGate.state), 'awake');
  await page.evaluate(async () => {
    const L=window.LANTERNMOSS, {ctx}=await import('/src/core/context.js'), {damageEnemy}=await import('/src/combat/damage.js');
    ctx.boss.mode='surfaced';ctx.boss.surfaceT=99;ctx.boss.hidden=false;damageEnemy(ctx.boss,ctx.boss.hp*100);
  });
  await frames(60*5);
  await page.evaluate(() => { const L=window.LANTERNMOSS; L.Chests.open(L.Chests.bossChest); });
  await frames(60);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok)); await reload();
  const win=await page.evaluate(async () => {
    const L=window.LANTERNMOSS, {ctx}=await import('/src/core/context.js'), {Quests}=await import('/src/gameplay/quests/Quests.js');
    return { id:L.planetId, dead:!ctx.boss.alive, complete:L.planets.complete, quest:Quests.st('darkLighthouse').status,
      crowns:L.inventory.count('tideCrown')+ctx.worldItems.filter(w=>w.itemId==='tideCrown').reduce((n,w)=>n+w.quantity,0),
      later:L.Portals.destinations().some(d=>d.id==='duskhollow'||d.id==='lanternMoon') };
  });
  assert.deepEqual(win,{id:'tidewhisper',dead:true,complete:true,quest:'done',crowns:1,later:false});
  assert.deepEqual(errors,[]);
  console.log('PASS low-tide/quest gate, four-world completion and one Tide Crown through full browser reload; zero page/shader errors');
} finally { await close(); }
