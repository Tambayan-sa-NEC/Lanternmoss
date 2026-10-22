// Real browser checks for Old Ironclaw (TODO 27f), Tidewhisper's unreleased mini boss. Owns port 8112.
// Actual Z (Arcane Bolt) presses into the bell (refused, then a ring that hurts) and into its face (lands), a low-tide
// charge that wedges it in the wet sand, 720p/1080p low rendering in and out of its shell, and its defeat persisting
// through reload Continue with the pearl beds freed; zero page/shader errors. The game stays paused except for the
// script's own fixed 60 fps steps and the play stream is seeded: software rendering is too slow for real time.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8112;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installCoastalEnemyFixture}=await import('/tests/sim/lib/coastalEnemyFixture.mjs');window.coastalFixture=installCoastalEnemyFixture();
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);window.LANTERNMOSS.goToPlanet('lanternmoss');
  });await install();await page.click('[data-act="play"]');
  const frames=n=>page.evaluate(async n=>{const {ctx}=await import('/src/core/context.js');ctx.paused=false;for(let i=0;i<n;i++)window.LANTERNMOSS.update(1/60);ctx.paused=true;},n);
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js'),{encounterEvents}=await import('/src/combat/events.js');
    (await import('/src/utils/random.js')).seedPlay(1); // seed before Ironclaw's initial facing is chosen
    L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;L.Pets.command('passive');
    (await import('/src/core/context.js')).ctx.paused=true;
    dayClock.skip((.4*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');   // afternoon low tide
    const ic=window.ic=L.enemies.find(e=>e.type==='ironclaw');for(const e of L.enemies)if(e!==ic&&e.alive&&e!==L.boss)e.vanish();
    window.hurts=[];encounterEvents.addEventListener('playerhurt',e=>window.hurts.push(e.detail.source));
  });await frames(30);
  /** Hero `side` ('face' | 'bell') of a calm Ironclaw, 5 m off, facing it. */
  const stand=side=>page.evaluate(async side=>{
    const L=window.LANTERNMOSS,ic=window.ic,{dirAlong,tangentToward}=await import('/src/utils/sphere.js');
    // Hold the target still and start each shot with casting resources after the earlier bell wave.
    ic.state='recover';ic.timer=99;ic.cool=99;ic.speed=0;const at=dirAlong(ic.up,side==='face'?ic.fwd:ic.fwd.clone().negate(),5);
    L.player.placeAt(at);L.player.mana=L.player.stats.maxMana;L.player.fwd.copy(tangentToward(at,ic.up));L.cam.fwd.copy(L.player.fwd);L.player.invuln=0;window.before={hp:ic.hp,hurts:window.hurts.length};
    // A cast precedes the frame's auto-aim refresh, so reset the lock after moving across Ironclaw.
    const {targeting,updateAim}=await import('/src/combat/targeting.js');updateAim();
    if(targeting.aim!==ic)throw new Error(`Ironclaw aim lost from ${side}`);
  },side);
  const bolt=async()=>{await page.keyboard.down('KeyZ');await frames(2);await page.keyboard.up('KeyZ');await frames(40);};
  await stand('bell');await bolt();
  assert.deepEqual(await page.evaluate(()=>({unhurt:window.ic.hp===window.before.hp,ringing:window.ic.ringAt>0||window.ic.waves.length>0})),{unhurt:true,ringing:true},'a bolt into the bell is refused and rings it');
  await page.evaluate(()=>{window.ic.state='recover';window.ic.timer=99;});await frames(90);
  assert.ok(await page.evaluate(()=>window.hurts.slice(window.before.hurts).some(s=>/Ironclaw/.test(s))),'the ring hurts the hero');
  await page.evaluate(()=>{window.LANTERNMOSS.player.petrifyT=0;});
  await stand('face');await bolt();
  const faceShot=await page.evaluate(async()=>{
    const {ctx}=await import('/src/core/context.js'),{spellState}=await import('/src/combat/casting.js'),{hitZone}=await import('/src/entities/enemies/behaviors/boss/ironclaw.js');
    return {hit:window.ic.hp<window.before.hp,zone:hitZone(window.ic,ctx.player.pos),cooldown:spellState.cd.bolt,projectiles:ctx.projectiles.length,petrify:ctx.player.petrifyT,ringAt:window.ic.ringAt};
  });assert.ok(faceShot.hit,`a bolt into its face lands: ${JSON.stringify(faceShot)}`);
  console.log('PASS keyboard Arcane Bolt: the bell refuses and rings a shockwave that hurts; its face takes the hit');
  // a low-tide charge across the pearl flat's wet sand wedges it
  const wedged=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,ic=window.ic,W=L.Mechanics.world,{dirAlong,tangentToward}=await import('/src/utils/sphere.js'),{ctx}=await import('/src/core/context.js');
    ic.spawn(ic.home);ic.aggro();L.player.invuln=10000;L.player.petrifyT=0;L.player.placeAt(dirAlong(W.coast.pearlBeach,tangentToward(ic.home,W.coast.pearlBeach),2.5));
    ic.state='chase';ic.cool=0;ic.moveCd={pinch:99,toll:99};ctx.paused=false;let stuck=false;for(let i=0;i<60*6&&!stuck;i++){L.update(1/60);stuck=ic.openT>0;}ctx.paused=true;return stuck;
  });assert.equal(wedged,true,'its low-tide charge ploughs into the wet sand');
  console.log('PASS a low-tide charge across the wet pearl flat wedges it');
  for(const [width,height] of [[1280,720],[1920,1080]]){
    await page.setViewport({width,height});
    for(const pose of ['shell','swap']){
      const shown=await page.evaluate(async pose=>{
        const L=window.LANTERNMOSS,ic=window.ic,W=L.Mechanics.world,{ctx}=await import('/src/core/context.js'),{dom}=await import('/src/ui/dom.js');
        const {dirAlong,tangentToward}=await import('/src/utils/sphere.js'),{resetView}=await import('/src/systems/CameraSystem.js');
        // posed down on the pearl flat among the beds it guards, seen from the sea side
        const look=tangentToward(W.coast.pearlBeach,ic.home),spot=dirAlong(W.coast.pearlBeach,look,1.5);
        ic.home.copy(spot);ic.spawn(spot);ic.state='idle';ic.timer=1e9;ic.def={...ic.def,aggro:pose==='swap'?99:0,leash:99};
        const view=dirAlong(dirAlong(spot,look,-8.5),look.clone().cross(spot).normalize(),2.5);
        L.player.placeAt(view);const toIc=tangentToward(view,spot);L.player.fwd.copy(toIc);resetView(toIc);L.cam.pitch=0.3;
        ctx.paused=false;for(let i=0;i<50;i++){ic.fwd.copy(tangentToward(ic.up,view).applyAxisAngle(ic.up,0.5));if(pose==='swap'){ic.state='transition';ic.swapT=99;}L.player.fwd.copy(toIc);L.cam.fwd.copy(toIc);L.update(1/60);}ctx.paused=true;
        dom.hint.style.display='none';dom.prompt.style.display='none';dom.toast.style.opacity=0;
        for(const o of [L.player.root,L.player.shadow,L.companion?.root,L.companion?.shadow])if(o)o.visible=false;
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const out=ic.body.position.z;if(pose==='swap'){ic.state='chase';ic.swapT=0;}
        return {visible:ic.root.visible,out:pose==='swap'?out>0.8:out<0.2};
      },pose);assert.deepEqual(shown,{visible:true,out:true});
      await page.evaluate(() => { for (const id of ['hud','compass','combat']) document.getElementById(id).style.visibility='hidden'; });
      await page.screenshot({path:join(tmpdir(),`lanternmoss-27f-ironclaw-${pose}-${height}.png`)});
      if(height===720&&pose==='shell')await page.screenshot({path:shotPath('tidewhisper-ironclaw'),type:'jpeg',quality:88});
      await page.evaluate(() => { for (const id of ['hud','compass','combat']) document.getElementById(id).style.visibility=''; });
    }
    console.log(`PASS ${width}x${height} low: Old Ironclaw in its bell and out of it`);
  }
  // defeat, then reload Continue: still beaten and the beds are free
  const freed=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,ic=window.ic,{damageEnemy}=await import('/src/combat/damage.js'),{guardOf}=await import('/src/gameplay/Gathering.js'),{ctx}=await import('/src/core/context.js');
    ic.openT=99;ctx.paused=false;for(let i=0;i<60&&ic.alive;i++){damageEnemy(ic,999,{});L.update(1/60);}for(let i=0;i<60;i++)L.update(1/60);ctx.paused=true;
    if(!L.saves.save().ok)throw new Error('save');return {dead:!ic.alive,beds:L.Gathering.nodes.filter(n=>n.def.guardedBy).every(n=>!guardOf(n))};
  });assert.deepEqual(freed,{dead:true,beds:true});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  const after=await page.evaluate(async()=>{const L=window.LANTERNMOSS,{guardOf}=await import('/src/gameplay/Gathering.js');
    return {beaten:!L.enemies.some(e=>e.type==='ironclaw'&&e.alive),beds:L.Gathering.nodes.filter(n=>n.def.guardedBy).length===2&&L.Gathering.nodes.filter(n=>n.def.guardedBy).every(n=>!guardOf(n))};});
  assert.deepEqual(after,{beaten:true,beds:true});assert.deepEqual(errors,[]);
  console.log('PASS defeat persists through reload Continue and the pearl beds stay free; zero page/shader errors');
}finally{
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();},10000);})]);}finally{clearTimeout(timeout);}}
}
