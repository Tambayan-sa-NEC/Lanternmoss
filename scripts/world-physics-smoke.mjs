// Real Chromium integration for development-only physics rules; owns port 8105.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)), port=8105;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser, stderr=''; server.stderr.on('data',d=>{stderr+=d;});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(), errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());}); page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720}); await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installPhysicsFixture}=await import('/tests/sim/lib/physicsFixture.mjs');
    const {PLANETS}=await import('/src/config/planets.js');
    window.physicsProbe=installPhysicsFixture(); PLANETS[0].mechanic=window.physicsProbe.id;
    PLANETS[0].physics={waterMaxOffset:1,seaMaxLevel:70}; PLANETS[1].physics={gravity:0.65};
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);
  });
  await install(); await page.evaluate(()=>window.LANTERNMOSS.goToPlanet('lanternmoss'));
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Mechanics.active.instance.updates),0);
  await page.click('[data-act="play"]'); await page.evaluate(()=>{const L=window.LANTERNMOSS;L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;});
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,p=L.ponds.find(p=>p.r>=8);L.Mechanics.active.instance.set({gravity:0.4,waterOffset:0.6});
    L.player.placeAt(p.dir);L.player.vy=0;L.player.grounded=true;
    const {snapCamera}=await import('/src/systems/CameraSystem.js');snapCamera(L.player.up,L.player.fwd);
    window.physicsFramesStart=L.Mechanics.active.instance.updates;
  });
  await page.waitForFunction(()=>window.LANTERNMOSS.player.swimming&&window.LANTERNMOSS.Mechanics.active.instance.updates>=window.physicsFramesStart+5);
  const swimmer=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{waterAt}=await import('/src/world/terrain.js'),p=L.ponds.find(p=>p.r>=8),w=waterAt(L.player.up);
    return {gap:Math.abs(L.player.r-(w.level-1)),meshGap:Math.abs(L.Mechanics.world.water.meshes[L.ponds.indexOf(p)].position.length()-(p.water+0.6))};
  });
  assert.ok(swimmer.gap<0.02);assert.ok(swimmer.meshGap<1e-8);
  await page.screenshot({path:join(tmpdir(),'lanternmoss-physics-720.png')});
  await page.evaluate(()=>window.LANTERNMOSS.Mechanics.active.instance.set({waterOffset:-5}));
  await page.waitForFunction(()=>!window.LANTERNMOSS.player.swimming&&window.LANTERNMOSS.player.grounded);
  await page.keyboard.press('Escape'); await page.waitForFunction(async()=>(await import('/src/core/context.js')).ctx.paused);
  const updates=await page.evaluate(()=>window.LANTERNMOSS.Mechanics.active.instance.updates);
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,250)));
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Mechanics.active.instance.updates),updates);
  await page.keyboard.press('Escape');
  const moon=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,P=L.player,{PLAYER,BUFFS}=await import('/src/config/game.js');
    P.placeAt(L.Mechanics.world.spawnDir);P.r+=8;P.vy=8;P.grounded=false;P.jumpBuf=0;P.motion=null;L.buffs.moon=5;
    P.update(1/60,{keys:{Space:true},viewFwd:L.cam.fwd,enabled:true});
    const delta=Math.abs(P.vy-(8-PLAYER.gravityRise*BUFFS.moonGravity*0.4/60));
    L.buffs.moon=0;P.placeAt(L.Mechanics.world.spawnDir);P.vy=0;
    L.Mechanics.active.instance.set({gravity:0.4,waterOffset:0.55,seaLevel:69.5});
    return {delta,saved:L.saves.save().ok};
  });
  assert.ok(moon.delta<1e-8);assert.ok(moon.saved);
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{configurePhysics}=await import('/src/world/physics.js');
    const {snapCamera}=await import('/src/systems/CameraSystem.js');
    configurePhysics({waterMaxOffset:1,seaMaxLevel:76});L.Mechanics.active.instance.set({seaLevel:74});
    L.player.placeAt(L.Mechanics.world.spawnDir);L.player.vy=0;L.player.grounded=true;snapCamera(L.player.up,L.player.fwd);
    window.physicsFramesStart=L.Mechanics.active.instance.updates;
  });
  await page.waitForFunction(()=>window.LANTERNMOSS.player.swimming&&window.LANTERNMOSS.Mechanics.active.instance.updates>=window.physicsFramesStart+5);
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Mechanics.world.water.ocean.scale.x),74);
  await page.screenshot({path:join(tmpdir(),'lanternmoss-physics-sea-720.png')});
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{configurePhysics}=await import('/src/world/physics.js');
    configurePhysics({waterMaxOffset:1,seaMaxLevel:70});L.Mechanics.active.instance.set({gravity:0.4,waterOffset:0.55,seaLevel:69.5});
    L.player.placeAt(L.Mechanics.world.spawnDir);L.player.vy=0;
    if(!L.saves.save().ok)throw new Error('Saving restored rule state failed');
  });
  console.log('PASS  720p low preset: live pond/sea meshes and swimming, recession, title/pause gates and real Moon-Hop composition');
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();
  await page.setViewport({width:1920,height:1080});await page.click('[data-act="continue"]');
  await page.waitForFunction(()=>window.LANTERNMOSS.Mechanics.toJSON()?.state.seaLevel===69.5);
  const restored=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{gravityAt,pondLevel}=await import('/src/world/physics.js');
    return {gravity:gravityAt(L.player.up,24),offset:pondLevel(L.ponds[0])-L.ponds[0].water,sea:L.Mechanics.world.water.ocean.scale.x,live:window.physicsProbe.live.size};
  });
  assert.ok(Math.abs(restored.gravity-9.6)<1e-8);assert.ok(Math.abs(restored.offset-0.55)<1e-8);assert.equal(restored.sea,69.5);assert.equal(restored.live,1);
  const travel=async id=>{
    await page.evaluate(()=>{const L=window.LANTERNMOSS;L.player.invuln=10000;L.player.placeAt(L.Portals.gate.dir);L.player.vy=0;});
    await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.PortalUI.isOpen);
    await page.click(`[data-destination="${id}"]`);
    await page.waitForFunction(async id=>{const {ctx}=await import('/src/core/context.js');return ctx.planetId===id&&!ctx.transitioning;},{},id);
  };
  await page.evaluate(()=>window.LANTERNMOSS.inventory.add('wayfarerKey',2));await travel('emberfall');
  const defaults=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{gravityAt,seaLevel,pondLevel}=await import('/src/world/physics.js');
    return {gravity:gravityAt(L.player.up,24),sea:seaLevel(),offset:pondLevel(L.ponds[0])-L.ponds[0].water,ocean:L.Mechanics.world.water.ocean,live:window.physicsProbe.live.size};
  });
  assert.ok(Math.abs(defaults.gravity-15.6)<1e-8);assert.equal(defaults.sea,null);assert.equal(defaults.offset,0);assert.equal(defaults.ocean,null);assert.equal(defaults.live,0);
  await travel('lanternmoss');assert.deepEqual(await page.evaluate(()=>window.LANTERNMOSS.Mechanics.toJSON().state),{gravity:0.4,waterOffset:0.55,seaLevel:69.5});
  await page.screenshot({path:join(tmpdir(),'lanternmoss-physics-1080.png')});
  assert.equal(await page.evaluate(()=>{window.LANTERNMOSS.Mechanics.exit();window.physicsProbe.unregister();return window.physicsProbe.live.size;}),0);
  assert.deepEqual(errors,[]);console.log('PASS  1080p Continue and actual keyed portal UI restore independent rules, dispose the old sea and reset destination defaults; zero page errors');
} finally {
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{
    const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();
  },10000);})]);}finally{clearTimeout(timeout);}}
}
