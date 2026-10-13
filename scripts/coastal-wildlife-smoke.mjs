// Real browser checks for unreleased coastal flora/wildlife. Owns port 8108.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8108;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installCoastalFixture}=await import('/tests/sim/lib/coastalFixture.mjs');window.coastalFixture=installCoastalFixture();
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);window.LANTERNMOSS.goToPlanet('lanternmoss');
  });await install();await page.click('[data-act="play"]');
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');
    L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;dayClock.skip((.4*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');
    for(let i=0;i<180;i++)L.update(1/60);
  });await page.keyboard.press('KeyH');
  const flora=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,W=L.Mechanics.world,{offsetDir,tangentToward}=await import('/src/utils/sphere.js'),{snapCamera}=await import('/src/systems/CameraSystem.js');
    const tree=W.spots.trees.find(t=>t.kind==='lanternPalm');L.player.placeAt(offsetDir(tree.dir,0,3));L.player.vel.set(0,0,0);snapCamera(L.player.up,tangentToward(L.player.up,tree.dir));L.cam.dist=12;
    return {kinds:[...new Set(W.spots.trees.map(t=>t.kind))],critterCount:L.critters.length,fish:W.seaLife.reduce((n,s)=>n+s.count,0)};
  });assert.deepEqual(new Set(flora.kinds),new Set(['lanternPalm','kelp','coralFan']));assert.equal(flora.critterCount,14);assert.equal(flora.fish,32);
  await page.waitForFunction(()=>document.querySelector('.chip.tide')?.textContent.includes('Low tide'));
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,W=L.Mechanics.world,{ctx}=await import('/src/core/context.js'),{camera}=await import('/src/render/scene.js'),{groundHeight}=await import('/src/world/terrain.js'),{tangentFrame}=await import('/src/utils/sphere.js'),{dom}=await import('/src/ui/dom.js');
    const tree=W.spots.trees.find(t=>t.kind==='lanternPalm'),at=tree.dir.clone().multiplyScalar(groundHeight(tree.dir)+2.2);
    ctx.paused=true;L.player.root.visible=false;if(L.companion?.root)L.companion.root.visible=false;dom.challengeResult.classList.remove('show');dom.toast.style.opacity=0;
    camera.position.copy(at).addScaledVector(tangentFrame(tree.dir)[0],9).addScaledVector(tree.dir,3);camera.up.copy(tree.dir);camera.lookAt(at);camera.updateMatrixWorld();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  await page.screenshot({path:join(root,'docs/screenshots/tidewhisper-flora.jpg'),type:'jpeg',quality:88});
  await page.evaluate(async()=>{const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js');ctx.paused=false;L.player.root.visible=true;if(L.companion?.root)L.companion.root.visible=true;});
  const started=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,W=L.Mechanics.world,{offsetDir}=await import('/src/utils/sphere.js');const tree=W.spots.trees.find(t=>t.kind==='lanternPalm');
    L.inventory.add('woodAxe',1);L.player.placeAt(offsetDir(tree.dir,0,tree.r+1));L.player.vel.set(0,0,0);L.Gathering.work({scenery:'tree',spot:tree,index:W.spots.trees.indexOf(tree)});
    return !!L.Gathering.job;
  });assert.ok(started);await page.waitForFunction(()=>!window.LANTERNMOSS.Gathering.job&&window.LANTERNMOSS.inventory.count('wood')>0);
  assert.equal(await page.evaluate(()=>{const L=window.LANTERNMOSS,W=L.Mechanics.world,t=W.spots.trees.find(t=>t.kind==='coralFan');L.Gathering.work({scenery:'tree',spot:t,index:W.spots.trees.indexOf(t)});return L.Gathering.job;}),null);
  console.log('PASS  720p low: real coastal builders and kelp shader, bounded animals/fish, palm gathering and coral wood refusal');
  await page.setViewport({width:1920,height:1080});
  for(const key of ['hermitCrab','seaTurtle','harborSeal','pearlTurtle']){
    await page.evaluate(async key=>{
      const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js'),{camera}=await import('/src/render/scene.js'),{dom}=await import('/src/ui/dom.js'),c=L.critters.find(c=>c.defKey===key);
      ctx.paused=true;L.player.root.visible=false;if(L.companion?.root)L.companion.root.visible=false;dom.toast.style.opacity=0;dom.prompt.style.display='none';dom.heldName.classList.remove('show');
      for(const actor of L.critters)actor.root.visible=actor===c;
      const at=c.pos.clone().addScaledVector(c.up,.35);camera.position.copy(at).addScaledVector(c.fwd,2.5).addScaledVector(c.up,2.5);camera.up.copy(c.up);camera.lookAt(at);camera.updateMatrixWorld();
      window.coastalShot=c;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    },key);
    assert.ok(await page.evaluate(async()=>{const {camera}=await import('/src/render/scene.js');return camera.position.distanceTo(window.coastalShot.pos)>3&&window.coastalShot.root.visible;}));
    await page.screenshot({path:join(tmpdir(),`lanternmoss-${key}-1080.png`)});
    if(key==='pearlTurtle')await page.screenshot({path:join(root,'docs/screenshots/tidewhisper-pearl-turtle.jpg'),type:'jpeg',quality:88});
  }
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js'),{offsetDir}=await import('/src/utils/sphere.js'),{setShowcase}=await import('/src/systems/CameraSystem.js'),c=L.critters.find(c=>c.defKey==='pearlTurtle');
    ctx.paused=false;L.player.root.visible=true;if(L.companion?.root)L.companion.root.visible=true;for(const actor of L.critters)actor.root.visible=actor.away<=0;
    setShowcase(null);L.player.placeAt(offsetDir(c.up,0,1.5));L.player.vel.set(0,0,0);c.update(.1);
  });await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.inventory.count('pearlOfDeep')===1);
  const ledger=await page.evaluate(async()=>{const {RareGifts}=await import('/src/entities/wildlife/wildlife.js');return RareGifts.toJSON();});assert.ok(ledger.includes('pearlOfDeep'));
  await page.evaluate(()=>{if(!window.LANTERNMOSS.saves.save().ok)throw new Error('Save failed');});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');await page.waitForFunction(()=>window.LANTERNMOSS.inventory.count('pearlOfDeep')===1);
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{offsetDir}=await import('/src/utils/sphere.js'),c=L.critters.find(c=>c.defKey==='pearlTurtle');L.player.placeAt(offsetDir(c.up,0,1.5));L.player.vel.set(0,0,0);c.update(.1);
  });await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.critters.find(c=>c.defKey==='pearlTurtle').away>0);assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('pearlOfDeep')),1);
  await page.evaluate(async()=>{const {dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');dayClock.skip((.9*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');});
  await page.waitForFunction(()=>window.LANTERNMOSS.Mechanics.world.seaLife.find(s=>s.night).root.visible);
  const paused=await page.evaluate(async()=>{const {coastalWind}=await import('/src/render/coastalWind.js');return coastalWind.time.value;});assert.ok(paused>0);
  assert.deepEqual(errors,[]);console.log('PASS  1080p low: original crab/turtle/seal/Pearl Turtle models, actual E friendship, reload Continue without duplicate charm and night lanternfish; zero page/shader errors');
}finally{
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();},10000);})]);}finally{clearTimeout(timeout);}}
}
