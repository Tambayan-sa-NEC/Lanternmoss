// Real browser checks for Tidewhisper's unreleased regular roster (TODO 27e). Owns port 8111.
// Actual keyboard attacks into a Shellback's plate and back, a Surf skipper ambush, 720p/1080p low rendering of
// every new body (and the sea-green wisp), and reload Continue; zero page/shader errors.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8111;
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
  const roster=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');
    (await import('/src/utils/random.js')).seedPlay(1); // seed before the roster spawns, including its initial facing
    L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;L.Pets.command('passive');
    (await import('/src/core/context.js')).ctx.paused=true;   // only the script's own 60 fps steps advance the game
    dayClock.skip((.4*DAY.length-dayClock.t+DAY.length)%DAY.length,'test');
    const n=t=>L.enemies.filter(e=>e.type===t).length;return [n('shellback'),n('jellybell'),n('surfSkipper'),n('wisp')];
  });assert.deepEqual(roster,[15,12,9,5]);
  // a Shellback: Z (Arcane Bolt) into its plate glances off; from behind it lands
  const bolt=async side=>{
    await page.evaluate(async side=>{
      const L=window.LANTERNMOSS,{dirAlong,tangentToward}=await import('/src/utils/sphere.js'),{encounterEvents}=await import('/src/combat/events.js');
      const c=window.crab??=L.enemies.find(e=>e.type==='shellback');for(const e of L.enemies)if(e!==c&&e.alive&&e!==L.boss&&e.up.distanceTo(c.up)*72<35)e.vanish();   // a quiet duel: nothing else for auto-aim to pick
      if(!window.refusals){window.refusals=0;encounterEvents.addEventListener('enemyrefused',()=>window.refusals++);}
      // Hold the plate's facing for both shots; an aggro turn can otherwise move the crab out of the rear bolt's path.
      c.def={...c.def,aggro:0};c.state='idle';c.timer=99;c.speed=0;const at=dirAlong(c.up,side==='front'?c.fwd:c.fwd.clone().negate(),4);
      L.player.placeAt(at);L.player.fwd.copy(tangentToward(at,c.up));L.cam.fwd.copy(L.player.fwd);window.before={hp:c.hp,refused:window.refusals};
      // Combat casts before it refreshes auto-aim each frame. Teleporting between the two shots leaves the old lock in place.
      const {targeting,updateAim}=await import('/src/combat/targeting.js');updateAim();
      if(targeting.aim!==c)throw new Error(`Shellback aim lost from ${side}`);
    },side);
    const frames=n=>page.evaluate(async n=>{const {ctx}=await import('/src/core/context.js');ctx.paused=false;for(let i=0;i<n;i++)window.LANTERNMOSS.update(1/60);ctx.paused=true;},n);
    await page.keyboard.down('KeyZ');await frames(2);await page.keyboard.up('KeyZ');await frames(50);
    return page.evaluate(()=>({hit:window.crab.hp<window.before.hp,refused:window.refusals>window.before.refused}));
  };
  assert.deepEqual(await bolt('front'),{hit:false,refused:true},'a bolt into the plate glances off');
  assert.deepEqual(await bolt('back'),{hit:true,refused:false},'a bolt into its back lands');
  console.log('PASS keyboard Arcane Bolt: refused by the Shellback plate from the front, lands from behind');
  // a Surf skipper ambush on a hero standing on the beach (fixed 60 fps steps of the running game)
  const ambush=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{dryGround}=await import('/src/world/terrain.js'),{offsetDir,dirAlong,tangentToward}=await import('/src/utils/sphere.js'),{encounterEvents}=await import('/src/combat/events.js');
    const s=L.enemies.find(e=>e.type==='surfSkipper');for(const e of L.enemies)if(e!==s&&e.alive&&e!==L.boss&&e.up.distanceTo(s.up)*72<35)e.vanish();/* nothing else to sting the hero first */let beach=null;for(let r=1;r<30&&!beach;r+=.5)for(let a=0;a<6.28&&!beach;a+=.2){const d=offsetDir(s.home,a,r);if(dryGround(d,.6))beach=d;}
    L.player.placeAt(dirAlong(beach,tangentToward(s.home,beach),1.5));L.player.invuln=0;const hurt=[];encounterEvents.addEventListener('playerhurt',e=>hurt.push(e.detail.source));
    const {ctx}=await import('/src/core/context.js');ctx.paused=false;
    const seen=new Set();for(let i=0;i<60*12&&!(seen.has('flee')&&s.hidden);i++){L.player.invuln=Math.min(L.player.invuln,.3);L.update(1/60);seen.add(s.state);}
    ctx.paused=true;
    L.player.invuln=10000;return {states:['windup','charge','recover','flee'].every(x=>seen.has(x)),bitten:hurt.includes('Surf skipper'),hidden:s.hidden};
  });assert.deepEqual(ambush,{states:true,bitten:true,hidden:true});
  console.log('PASS ambush: surfaces, leaps, bites the hero on the beach, stands exposed and slips back under');
  for(const [width,height] of [[1280,720],[1920,1080]]){
    await page.setViewport({width,height});
    const shown=await page.evaluate(async()=>{
      const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js'),{dom}=await import('/src/ui/dom.js');
      const {dryGround,waterAt}=await import('/src/world/terrain.js'),{offsetDir,dirAlong,tangentToward}=await import('/src/utils/sphere.js');
      const pick=t=>L.enemies.find(e=>e.type===t&&e.alive)??L.spawnEnemy(t);
      const crab=pick('shellback'),jelly=pick('jellybell'),skip=pick('surfSkipper'),wisp=pick('wisp');
      // a real beach: walk out from the middle of an outer island until the water starts; the sea lies straight ahead
      const isle=L.Mechanics.world.coast.islands[3];let shore=null;for(let r=5;r<60&&!shore;r+=.25){const d=offsetDir(isle.dir,0.6,r);if(!dryGround(d))shore=d;}
      const sea=tangentToward(isle.dir,shore),side=new (crab.up.constructor)().crossVectors(shore,sea).normalize();
      // posed for the picture: the others stay put (no aggro); the skipper holds its exposed stance on the waterline
      const place=(e,d,state='idle')=>{e.home.copy(d);e.spawn(d);e.state=state;e.timer=1e9;e.def={...e.def,aggro:state==='idle'?0:99,leash:99};};
      place(crab,dirAlong(dirAlong(shore,sea,-2.4),side,-1.8));place(wisp,dirAlong(dirAlong(shore,sea,-2.8),side,3.6));
      place(jelly,dirAlong(dirAlong(shore,sea,3),side,-0.6));place(skip,dirAlong(dirAlong(shore,sea,0.6),side,1.9),'recover');
      const {resetView}=await import('/src/systems/CameraSystem.js'),view=dirAlong(dirAlong(shore,sea,-5.5),side,0.6);
      L.player.placeAt(view);const look=tangentToward(view,dirAlong(shore,side,0.6));L.player.fwd.copy(look);resetView(look);L.cam.pitch=0.5;
      ctx.paused=false;for(let i=0;i<60;i++){L.player.fwd.copy(look);L.cam.fwd.copy(look);L.update(1/60);}ctx.paused=true;
      dom.hint.style.display='none';dom.prompt.style.display='none';dom.toast.style.opacity=0;
      for(const o of [L.player.root,L.player.shadow,L.companion?.root,L.companion?.shadow])if(o)o.visible=false;   // the monsters are the subject
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return {crab:crab.root.visible,jelly:jelly.root.visible&&!jelly.stranded&&!!waterAt(jelly.up),skip:skip.root.visible&&!skip.hidden,wisp:wisp.root.visible&&wisp.def.color===0x5fe8c0};
    });assert.deepEqual(shown,{crab:true,jelly:true,skip:true,wisp:true});
    await page.screenshot({path:join(tmpdir(),`lanternmoss-27e-roster-${height}.png`)});
    if(height===720)await page.screenshot({path:shotPath('tidewhisper-enemies'),type:'jpeg',quality:88});
    console.log(`PASS ${width}x${height} low: Shellback, floating Jellybell, surfaced Surf skipper and sea-green wisp render`);
  }
  await page.evaluate(()=>{if(!window.LANTERNMOSS.saves.save().ok)throw new Error('save');});
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await install();await page.click('[data-act="continue"]');
  const after=await page.evaluate(()=>{const L=window.LANTERNMOSS,n=t=>L.enemies.filter(e=>e.type===t).length;return [n('shellback'),n('jellybell'),n('surfSkipper'),n('wisp')];});
  assert.deepEqual(after,[15,12,9,5]);assert.deepEqual(errors,[]);
  console.log('PASS reload Continue rebuilds the full roster; zero page/shader errors');
}finally{
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();},10000);})]);}finally{clearTimeout(timeout);}}
}
