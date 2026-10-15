// Real browser checks for unreleased coastal village/lighthouse. Owns port 8110.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8110;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installCoastalVillageFixture}=await import('/tests/sim/lib/coastalVillageFixture.mjs');window.coastalFixture=installCoastalVillageFixture();
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);window.LANTERNMOSS.goToPlanet('lanternmoss');
  });await install();await page.click('[data-act="play"]');
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');
    L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;
    dayClock.skip((.15*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');
  });
  const talk=async()=>{
    await page.evaluate(async()=>{
      const L=window.LANTERNMOSS,{Dialog}=await import('/src/ui/Dialog.js'),{offsetDir}=await import('/src/utils/sphere.js');Dialog.close();
      const n=L.npcs.find(n=>n.name==='Marlo');if(!n)throw new Error('Missing keeper');const {currentInteraction}=await import('/src/gameplay/Houses.js');let found=false;
      for(let angle=0;angle<6.28;angle+=.78){L.player.placeAt(offsetDir(n.up,angle,1.3));L.player.vel.set(0,0,0);for(let i=0;i<6;i++)L.update(1/60);if(currentInteraction()?.label.startsWith('Talk to Marlo')){found=true;break;}}
      if(!found)throw new Error(`Keeper prompt unavailable: ${currentInteraction()?.label}`);
    });await page.keyboard.press('KeyE');await page.waitForFunction(async()=>{const {Dialog}=await import('/src/ui/Dialog.js');return Dialog.open&&Dialog.npc.name==='Marlo';},{timeout:10000});
  };
  await talk();await page.evaluate(async()=>{(await import('/src/ui/Dialog.js')).Dialog.finishTyping();});await page.keyboard.press('KeyE');await page.waitForFunction(async()=>(await import('/src/gameplay/quests/Quests.js')).Quests.st('darkLighthouse').status==='active',{timeout:10000});
  await page.evaluate(async()=>{const L=window.LANTERNMOSS,{Dialog}=await import('/src/ui/Dialog.js'),{Quests}=await import('/src/gameplay/quests/Quests.js');Dialog.close();L.inventory.add('seaglass',6);Quests.check('darkLighthouse');});
  await talk();await page.evaluate(async()=>{(await import('/src/ui/Dialog.js')).Dialog.close();if(!window.LANTERNMOSS.saves.save().ok)throw new Error('save');});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  assert.equal(await page.evaluate(async()=>(await import('/src/gameplay/quests/Quests.js')).Quests.st('darkLighthouse').step),2);
  await page.evaluate(async()=>{const L=window.LANTERNMOSS,{Quests}=await import('/src/gameplay/quests/Quests.js');L.inventory.add('wood',6);Quests.check('darkLighthouse');});
  await talk();await page.evaluate(async()=>{(await import('/src/ui/Dialog.js')).Dialog.close();});await talk();
  await page.waitForFunction(()=>window.LANTERNMOSS.Mechanics.world.lighthouseLamp.visible);
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('coastalChowder')),2);
  for(const [width,height] of [[1280,720],[1920,1080]]){
    await page.setViewport({width,height});
    const result=await page.evaluate(async()=>{
      const L=window.LANTERNMOSS,W=L.Mechanics.world,{Dialog}=await import('/src/ui/Dialog.js'),{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js'),{supportHeight}=await import('/src/physics/colliders.js'),{waterAt}=await import('/src/world/terrain.js');
      Dialog.close();dayClock.skip((.9*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');L.player.placeAt(W.pier.end);L.player.invuln=10000;for(let i=0;i<12;i++)L.update(1/60);
      return {dry:!L.player.swimming,support:supportHeight(W.pier.end)>waterAt(W.pier.end).level+.5,stilt:W.houses.slice(0,6).every(h=>h.kind==='stilt'),outfits:L.npcs.filter(n=>!n.def.local).every(n=>n.outfit)};
    });assert.deepEqual(result,{dry:true,support:true,stilt:true,outfits:true});
    await page.evaluate(async()=>{
      const L=window.LANTERNMOSS,W=L.Mechanics.world,{ctx}=await import('/src/core/context.js'),{camera}=await import('/src/render/scene.js'),{groundHeight}=await import('/src/world/terrain.js'),{tangentFrame}=await import('/src/utils/sphere.js'),{dom}=await import('/src/ui/dom.js');
      const d=W.houses[4].dir,at=d.clone().multiplyScalar(groundHeight(d)+4);ctx.paused=true;dom.challengeResult.classList.remove('show');dom.hint.style.display='none';dom.prompt.style.display='none';dom.toast.style.opacity=0;
      camera.position.copy(at).addScaledVector(tangentFrame(d)[0],13).addScaledVector(d,6);camera.up.copy(d);camera.lookAt(at);camera.updateMatrixWorld();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });await page.screenshot({path:join(tmpdir(),`lanternmoss-27d-lighthouse-${height}.png`)});
    if(height===720)await page.screenshot({path:shotPath('tidewhisper-village'),type:'jpeg',quality:88});
    await page.evaluate(async()=>{(await import('/src/core/context.js')).ctx.paused=false;});
    console.log(`PASS ${width}x${height} low: stilt village, lit lighthouse, beach outfits and dry high-water pier`);
  }
  for(const index of [1,4]){
    await page.evaluate(async index=>{const L=window.LANTERNMOSS,{Dialog}=await import('/src/ui/Dialog.js');Dialog.close();L.player.placeAt(L.Mechanics.world.houses[index].door);},index);
    await page.keyboard.press('KeyE');await page.waitForFunction(async index=>(await import('/src/gameplay/Houses.js')).Houses.inside?.index===index,{},index);
    await page.waitForFunction(async()=>!(await import('/src/gameplay/Houses.js')).Houses.fade);
    await page.screenshot({path:join(tmpdir(),`lanternmoss-27d-interior-${index}.png`)});
    await page.evaluate(async()=>{
      const {Houses}=await import('/src/gameplay/Houses.js'),{Dialog}=await import('/src/ui/Dialog.js');const chest=Houses.inside.room.spots.find(s=>s.kind==='chest');Houses.use(chest);Dialog.close();Houses.leave();
    });await page.waitForFunction(async()=>!(await import('/src/gameplay/Houses.js')).Houses.inside&&!(await import('/src/gameplay/Houses.js')).Houses.fade);
  }
  await page.evaluate(()=>{if(!window.LANTERNMOSS.saves.save().ok)throw new Error('save');});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  const state=await page.evaluate(async()=>{const {Houses}=await import('/src/gameplay/Houses.js'),{Quests}=await import('/src/gameplay/quests/Quests.js');return {done:Quests.st('darkLighthouse').status,gifts:[...Houses.opened],chowder:window.LANTERNMOSS.inventory.count('coastalChowder')};});
  assert.equal(state.done,'done');assert.equal(state.chowder,2);assert.ok(state.gifts.includes('lanternmoss:1')&&state.gifts.includes('lanternmoss:4'));
  assert.deepEqual(errors,[]);console.log('PASS actual E dialogue accept/hand-ins, partial and completed reload Continue, both interior doors and one-time gifts; zero page/shader errors');
}finally{
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();},10000);})]);}finally{clearTimeout(timeout);}}
}
