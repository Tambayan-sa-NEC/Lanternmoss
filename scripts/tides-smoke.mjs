// Browser acceptance for the unreleased 27a terrain/tide development fixture. Owns port 8107.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8107;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installTideFixture}=await import('/tests/sim/lib/tideFixture.mjs');window.tideFixture=installTideFixture();
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);
    window.LANTERNMOSS.goToPlanet('lanternmoss');
  });await install();await page.click('[data-act="play"]');
  await page.evaluate(()=>{const L=window.LANTERNMOSS;L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;});
  await page.keyboard.press('KeyH');
  await page.evaluate(()=>{for(let i=0;i<180;i++)window.LANTERNMOSS.update(1/60);});
  const phase=async f=>page.evaluate(async f=>{
    const {DAY}=await import('/src/config/day.js'),{dayClock}=await import('/src/gameplay/dayClock.js');
    dayClock.skip((f*DAY.length-dayClock.t+DAY.length)%DAY.length||DAY.length,'test');
  },f);
  const pose=async site=>page.evaluate(async site=>{
    const L=window.LANTERNMOSS,W=L.Mechanics.world,{snapCamera}=await import('/src/systems/CameraSystem.js'),{tangentToward}=await import('/src/utils/sphere.js');
    const dir=site==='causeway'?W.coast.causeway:W.coast.lagoon.dir;
    L.player.placeAt(dir);L.player.vy=0;L.player.vel.set(0,0,0);L.player.grounded=true;L.player.fwd.copy(tangentToward(dir,site==='causeway'?W.coast.lagoon.dir:W.coast.islands[1].dir));
    snapCamera(L.player.up,L.player.fwd);L.cam.dist=15;
  },site);
  await phase(.4);await pose('causeway');
  await page.waitForFunction(()=>document.querySelector('.chip.tide')?.textContent.includes('Causeway open'));
  const start=await page.evaluate(()=>window.LANTERNMOSS.player.up.toArray());await page.keyboard.down('KeyW');
  await page.waitForFunction(start=>window.LANTERNMOSS.player.up.toArray().some((v,i)=>Math.abs(v-start[i])>.004),{},start);await page.keyboard.up('KeyW');
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.player.swimming),false);
  await page.screenshot({path:join(tmpdir(),'lanternmoss-tides-low-720.png')});
  await page.screenshot({path:join(root,'docs/screenshots/tidewhisper-low.jpg'),type:'jpeg',quality:88});
  await phase(.9);await pose('causeway');await page.waitForFunction(()=>window.LANTERNMOSS.player.swimming&&document.querySelector('.chip.tide')?.textContent.includes('Causeway flooded'));
  const energy=await page.evaluate(()=>window.LANTERNMOSS.player.energy);await page.waitForFunction(e=>window.LANTERNMOSS.player.energy<e-.04,{},energy);
  const high=await page.evaluate(async()=>{const L=window.LANTERNMOSS,{dryGround}=await import('/src/world/terrain.js');return {farm:L.Farm.plots.length,dry:L.Farm.plots.every(p=>dryGround(p.dir,1,{high:true})),regions:L.Mechanics.world.water.regions.length};});
  assert.equal(high.farm,6);assert.ok(high.dry);assert.equal(high.regions,1);
  await page.screenshot({path:join(tmpdir(),'lanternmoss-tides-high-720.png')});
  await page.screenshot({path:join(root,'docs/screenshots/tidewhisper-high.jpg'),type:'jpeg',quality:88});
  console.log('PASS  720p low: visible sandbar/ocean/lagoon meshes, real keyboard movement, high-tide swimming/energy, protected farm and tide clock chip');
  await page.setViewport({width:1920,height:1080});await pose('lagoon');await page.waitForFunction(()=>window.LANTERNMOSS.player.swimming);
  await page.screenshot({path:join(tmpdir(),'lanternmoss-tides-lagoon-wet-1080.png')});
  const drained=await page.evaluate(()=>{const L=window.LANTERNMOSS;L.Mechanics.active.instance.drainLagoon();return L.Mechanics.world.water.ocean.scale.x;});
  await page.waitForFunction(()=>!window.LANTERNMOSS.player.swimming&&window.LANTERNMOSS.player.grounded&&document.querySelector('.chip.tide')?.textContent.includes('Lagoon drained'));
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Mechanics.world.water.regions[0].scale.x),68.8);
  assert.ok(Math.abs(await page.evaluate(()=>window.LANTERNMOSS.Mechanics.world.water.ocean.scale.x)-drained)<.01);
  await page.screenshot({path:join(tmpdir(),'lanternmoss-tides-lagoon-dry-1080.png')});
  await page.keyboard.press('Escape');const remaining=await page.evaluate(()=>{const L=window.LANTERNMOSS;if(!L.saves.save().ok)throw new Error('Save failed');return L.Mechanics.toJSON().state.drainRemaining;});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  await page.waitForFunction(()=>window.LANTERNMOSS.Mechanics.id==='tides'&&window.LANTERNMOSS.Mechanics.toJSON().state.drainRemaining>0);
  const restored=await page.evaluate(()=>{const L=window.LANTERNMOSS;return {timer:L.Mechanics.toJSON().state.drainRemaining,level:L.Mechanics.world.water.regions[0].scale.x};});
  assert.ok(restored.timer<=remaining&&restored.timer>remaining-1.2);assert.equal(restored.level,68.8);
  await page.evaluate(()=>{const L=window.LANTERNMOSS;L.inventory.add('wayfarerKey',1);L.player.invuln=10000;L.player.placeAt(L.Portals.gate.dir);});
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.PortalUI.isOpen);await page.click('[data-destination="emberfall"]');
  await page.waitForFunction(async()=>{const {ctx}=await import('/src/core/context.js');return ctx.planetId==='emberfall'&&!ctx.transitioning;});
  const reset=await page.evaluate(async()=>{const {seaLevel,waterRegions}=await import('/src/world/physics.js');return {id:window.LANTERNMOSS.Mechanics.id,sea:seaLevel(),regions:waterRegions().length};});
  assert.deepEqual(reset,{id:null,sea:null,regions:0});assert.deepEqual(errors,[]);
  console.log('PASS  1080p low: visible local drainage, ocean isolation, reload Continue and actual keyed portal UI reset; zero page/shader errors');
} finally {
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{
    const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();
  },10000);})]);}finally{clearTimeout(timeout);}}
}
