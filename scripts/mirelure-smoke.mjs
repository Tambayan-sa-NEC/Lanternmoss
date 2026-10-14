// Real browser checks for Mirelure (TODO 27g), Tidewhisper's unreleased boss. Owns port 8113.
// The configured gate wakes her inside a ring of surf; actual Z (Arcane Bolt) presses burst a false lure and surface
// her from the real one; 720p/1080p low rendering of the lit lagoon and of her beached on the drained floor; her win
// (one Tide Crown) survives reload Continue; zero page/shader errors. The game stays paused except for the script's own
// fixed 60 fps steps and the play stream is seeded: software rendering is too slow for real time.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8113;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  const install=()=>page.evaluate(async()=>{
    const {installMirelureFixture}=await import('/tests/sim/lib/mirelureFixture.mjs');window.mireFixture=installMirelureFixture();
    const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);
    window.LANTERNMOSS.planets.lairs={};   // the page booted the real Lanternmoss first: forget its lair, so hers is the lagoon
    window.LANTERNMOSS.goToPlanet('lanternmoss');
  });await install();await page.click('[data-act="play"]');
  const frames=n=>page.evaluate(async n=>{const {ctx}=await import('/src/core/context.js');ctx.paused=false;for(let i=0;i<n;i++)window.LANTERNMOSS.update(1/60);ctx.paused=true;},n);
  // the gate: level 8, the relit lighthouse and the afternoon low tide; walk into the lair
  const awake=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js'),{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');
    const {Quests}=await import('/src/gameplay/quests/Quests.js'),{offsetDir}=await import('/src/utils/sphere.js');
    L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.Pets.command('passive');
    (await import('/src/utils/random.js')).seedPlay(1);ctx.paused=true;
    dayClock.skip((.4*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');L.player.level=8;Quests.st('darkLighthouse').status='done';
    const B=window.B=ctx.boss;for(const e of L.enemies)if(e.def.respawn)e.vanish();
    L.player.invuln=1e5;L.player.placeAt(offsetDir(B.home,.3,15.5));ctx.paused=false;
    for(let i=0;i<60*8&&L.BossGate.state!=='awake';i++)L.update(1/60);B.aggro();for(let i=0;i<60*5&&!B.lures.length;i++)L.update(1/60);ctx.paused=true;
    return {state:L.BossGate.state,wall:L.BossGate.wall.kind,lures:B.lures.length,hidden:B.hidden};
  });assert.deepEqual(awake,{state:'awake',wall:'surf',lures:3,hidden:true});
  /** Faces the hero at a lure (real or false) from 4 m, so auto-aim picks it. */
  const faceLure=real=>page.evaluate(async real=>{
    const L=window.LANTERNMOSS,B=window.B,{dirAlong,tangentToward}=await import('/src/utils/sphere.js');
    const lure=B.lures.find(l=>l.real===real&&l.alive);if(!lure)return;window.target=lure;const at=dirAlong(lure.up,tangentToward(lure.up,B.home),-4);
    L.player.placeAt(at);L.player.fwd.copy(tangentToward(at,lure.up));L.cam.fwd.copy(L.player.fwd);L.player.invuln=1e5;
    for(const l of B.lures)if(l!==lure&&l.up.distanceTo(lure.up)*72<8){l.up.copy(dirAlong(l.up,tangentToward(lure.up,l.up),6));l.pos.copy(l.up).multiplyScalar(l.r);}   // nothing else in the aim
  },real);
  const bolt=async()=>{await page.keyboard.down('KeyZ');await frames(2);await page.keyboard.up('KeyZ');await frames(30);};
  await faceLure(false);await bolt();
  assert.deepEqual(await page.evaluate(()=>({gone:!window.target.alive,deep:window.B.mode==='deep'&&window.B.hidden})),{gone:true,deep:true},'a bolt bursts a false lure; she stays under');
  await faceLure(true);for(let i=0;i<3&&await page.evaluate(()=>window.target.alive);i++){await bolt();await faceLure(true).catch(()=>{});}   // like a player, press again if it missed
  assert.deepEqual(await page.evaluate(()=>({mode:window.B.mode,visible:window.B.root.visible&&!window.B.hidden})),{mode:'surfaced',visible:true},'a bolt into the real lure surfaces her');
  console.log('PASS gate wakes her in a ring of surf; keyboard Arcane Bolt bursts a false lure and surfaces her from the real one');
  await frames(60*9);                                                                                          // she dives and relights
  for(const pose of ['lures','beached']){                                  // the lit lagoon first: beaching her is one-way
    for(const [width,height] of [[1280,720],[1920,1080]]){
    await page.setViewport({width,height});
      const shown=await page.evaluate(async pose=>{
        const L=window.LANTERNMOSS,B=window.B,{ctx}=await import('/src/core/context.js'),{dom}=await import('/src/ui/dom.js');
        const {dirAlong,offsetDir,tangentToward}=await import('/src/utils/sphere.js'),{resetView}=await import('/src/systems/CameraSystem.js'),{activeTides}=await import('/src/world/mechanics/tides.js');
        ctx.paused=false;
        if(pose==='beached'&&B.mode!=='beached'){const {damageEnemy}=await import('/src/combat/damage.js');B.hp=B.def.hp*.51;B.mode='surfaced';B.hidden=false;damageEnemy(B,B.def.hp*.03,{});
          for(let i=0;i<60*15&&!B.sluice.broken;i++)L.update(1/60);}
        if(pose==='lures')for(let i=0;i<60*12&&!(B.mode==='deep'&&B.lures.length>=3);i++)L.update(1/60);
        const view=offsetDir(B.home,.3,21),look=tangentToward(view,pose==='beached'?B.up:B.home);   // on the rim, inside the ring
        L.player.placeAt(view);L.player.invuln=1e5;resetView(look);L.cam.pitch=.55;
        for(let i=0;i<40;i++){L.player.fwd.copy(look);L.cam.fwd.copy(look);L.player.hp=L.player.stats.maxHp;B.cool=9;if(pose==='beached'){B.state='recover';B.timer=9;}L.update(1/60);}ctx.paused=true;   // posed: no new moves
        dom.hint.style.display='none';dom.prompt.style.display='none';dom.toast.style.opacity=0;
        for(const o of [L.player.root,L.player.shadow,L.companion?.root,L.companion?.shadow])if(o)o.visible=false;
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        return pose==='lures'?{ok:B.lures.length>=3&&B.hidden&&L.BossGate.posts.some(p=>p.post.visible)}:{ok:B.mode==='beached'&&B.root.visible&&activeTides().status.lagoonDrained&&B.sluice.broken};
      },pose);assert.deepEqual(shown,{ok:true},`${pose} pose`);
      await page.screenshot({path:join(tmpdir(),`lanternmoss-27g-mirelure-${pose}-${height}.png`)});
      if(height===720)await page.screenshot({path:join(root,`docs/screenshots/tidewhisper-mirelure-${pose}.jpg`),type:'jpeg',quality:88});
      console.log(`PASS ${width}x${height} low: ${pose==='lures'?'the lit lagoon in its ring of surf':'Mirelure beached on the drained floor'}`);
    }
  }
  // the win: one Tide Crown, kept through reload Continue
  const won=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,B=window.B,{ctx}=await import('/src/core/context.js'),{damageEnemy}=await import('/src/combat/damage.js'),{Chests}=await import('/src/gameplay/Chests.js');
    const {currentInteraction}=await import('/src/gameplay/Houses.js');ctx.paused=false;
    for(let i=0;i<120&&B.alive;i++){B.mode='surfaced';B.hidden=false;damageEnemy(B,9999,{});L.update(1/60);}for(let i=0;i<60*7;i++)L.update(1/60);
    L.player.placeAt(Chests.bossChest.up);for(let i=0;i<6;i++)L.update(1/60);currentInteraction()?.run();for(let i=0;i<60;i++)L.update(1/60);
    for(const w of [...ctx.worldItems])if(w.itemId==='tideCrown'){L.player.placeAt(w.up);for(let i=0;i<60;i++)L.update(1/60);}
    ctx.paused=true;if(!L.saves.save().ok)throw new Error('save');return {dead:!B.alive,crowns:L.inventory.count('tideCrown')};
  });assert.deepEqual(won,{dead:true,crowns:1});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  const after=await page.evaluate(async()=>{const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js');
    return {beaten:L.BossGate.state==='beaten'&&!ctx.boss?.alive,crowns:L.inventory.count('tideCrown')};});
  assert.deepEqual(after,{beaten:true,crowns:1});assert.deepEqual(errors,[]);
  console.log('PASS the win gives one Tide Crown and stays won through reload Continue; zero page/shader errors');
}finally{
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();},10000);})]);}finally{clearTimeout(timeout);}}
}
