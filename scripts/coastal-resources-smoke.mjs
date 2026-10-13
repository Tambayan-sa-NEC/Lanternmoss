// Real browser checks for unreleased coastal resources/weather/music. Owns port 8109.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8109;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installCoastalResourceFixture}=await import('/tests/sim/lib/coastalResourceFixture.mjs');window.coastalFixture=installCoastalResourceFixture();
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);window.LANTERNMOSS.goToPlanet('lanternmoss');
  });await install();await page.click('[data-act="play"]');
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');
    L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;
    dayClock.skip((.4*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');
  });await page.keyboard.press('KeyH');
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{offsetDir}=await import('/src/utils/sphere.js'),{snapCamera}=await import('/src/systems/CameraSystem.js'),{tangentToward}=await import('/src/utils/sphere.js');
    const n=L.Gathering.nodes.find(n=>n.kind==='seaglass');L.player.placeAt(offsetDir(n.up,0,n.def.r+.5));L.player.vel.set(0,0,0);
    snapCamera(L.player.up,tangentToward(L.player.up,n.up));
  });await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.inventory.count('seaglass')>=2);
  const initial=await page.evaluate(()=>{const L=window.LANTERNMOSS,n=L.Gathering.nodes.find(n=>n.kind==='seaglass');if(!L.saves.save().ok)throw new Error('save');return {claimed:n.claimedCycle,count:L.inventory.count('seaglass'),nodes:L.Gathering.nodes.length};});assert.equal(initial.nodes,54);
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  const restored=await page.evaluate(()=>{const L=window.LANTERNMOSS,n=L.Gathering.nodes.find(n=>n.kind==='seaglass');L.Gathering.work({node:n});return {claimed:n.claimedCycle,count:L.inventory.count('seaglass'),job:!!L.Gathering.job,ready:n.ready};});
  assert.equal(restored.claimed,initial.claimed);assert.equal(restored.count,initial.count);assert.equal(restored.ready,false);assert.equal(restored.job,false);
  const audioState=await page.evaluate(async()=>{
    const {audio}=await import('/src/systems/AudioSystem.js');audio.init();const old=audio.melodyTimer;audio.setTheme('cozy');audio.setTheme('seaWaltz');
    window.coastalMusic=[];const tone=audio.tone.bind(audio);audio.tone=(...args)=>{if(args[6]===audio.music)window.coastalMusic.push({freq:args[0],vol:args[3]});return tone(...args);};
    return {theme:audio.theme,voices:audio.voices.length,timerChanged:old!==audio.melodyTimer};
  });assert.deepEqual(audioState,{theme:'seaWaltz',voices:5,timerChanged:true});
  await page.waitForFunction(()=>window.coastalMusic.length>=3);assert.equal(await page.evaluate(()=>window.coastalMusic.slice(0,3).map(n=>n.vol).join(',')),'0.035,0.02,0.02');
  for(const [width,height] of [[1280,720],[1920,1080]]){
    await page.setViewport({width,height});
    const state=await page.evaluate(async()=>{
      const L=window.LANTERNMOSS,W=L.Mechanics.world,{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js'),{dryGround,waterAt}=await import('/src/world/terrain.js');
      dayClock.skip((.9*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');W.weather.set('squall',true);for(let i=0;i<6;i++)L.update(1/60);
      return {whitecaps:W.waterMat.uniforms.uSquall.value,wet:!!waterAt(L.Gathering.nodes.find(n=>n.kind==='clamBed').up),farm:L.Farm.plots.every(p=>dryGround(p.dir,1,{high:true})),theme:(await import('/src/systems/AudioSystem.js')).audio.theme};
    });assert.ok(state.whitecaps>0&&state.wet&&state.farm);assert.equal(state.theme,'seaWaltz');
    await page.evaluate(async()=>{
      const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js'),{camera}=await import('/src/render/scene.js'),{tangentFrame}=await import('/src/utils/sphere.js');
      const n=L.Gathering.nodes.find(n=>n.kind==='shipwreckIron'),at=n.pos.clone().addScaledVector(n.up,.3);L.player.placeAt(n.up);L.player.root.visible=false;if(L.companion?.root)L.companion.root.visible=false;n.applyDensity();ctx.paused=true;
      const {dom}=await import('/src/ui/dom.js');dom.hint.style.display='none';dom.prompt.style.display='none';dom.toast.style.opacity=0;
      camera.position.copy(at).addScaledVector(tangentFrame(n.up)[0],6).addScaledVector(n.up,4);camera.up.copy(n.up);camera.lookAt(at);camera.updateMatrixWorld();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });await page.screenshot({path:join(tmpdir(),`lanternmoss-27c-squall-${height}.png`)});
    await page.evaluate(async()=>{(await import('/src/core/context.js')).ctx.paused=false;window.LANTERNMOSS.player.root.visible=true;if(window.LANTERNMOSS.companion?.root)window.LANTERNMOSS.companion.root.visible=true;});
    console.log(`PASS ${width}x${height} low: coastal models, high-tide beds, safe farm and squall shader`);
  }
  assert.deepEqual(errors,[]);console.log('PASS actual E gathering, reload Continue claim persistence, one travel-safe three-beat music loop and zero browser/shader errors');
}finally{
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();},10000);})]);}finally{clearTimeout(timeout);}}
}
